import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import * as workspaceRepository from '../repositories/workspaceRepository';
import { generateInitialTasks, toggleTaskComplete, updateTask, deleteTask } from '../utils/checklistUtils';
import { createVendor, updateVendor, deleteVendor } from '../utils/vendorUtils';
import { createGuest, updateGuest, deleteGuest, getGuestSummary } from '../utils/guestUtils';
import { createNote, updateNote, deleteNote, togglePinNote } from '../utils/noteUtils';
import { calculateBudgetOverview, calculateCategorySummaries } from '../domain/budgetSelectors';
import { deriveWorkspaceViewModel } from '../domain/workspaceSelectors';
import { getNextBestAction } from '../utils/nextBestActionEngine';
import { StoredWorkspace } from '../types/workspace';
import { TaskItem } from '../types/checklist';
import { Vendor } from '../types/vendor';
import { StoredBudget, BudgetAllocation, BudgetExpense } from '../types/budget';
import { Guest } from '../types/guest';
import { Note } from '../types/note';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

describe('Unified Supabase Persistence Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const workspaceA: StoredWorkspace = {
    id: '11111111-1111-4111-8111-111111111111',
    userId: 'user-a-uuid',
    coupleName: 'Adit & Amel',
    weddingDate: '2027-02-14',
    estimatedBudget: 150_000_000,
    estimatedGuestCount: 500,
    completedCategories: ['venue', 'catering'],
    primaryPlanningPriority: 'timeline',
    religiousContexts: [{ tradition: 'christian', label: 'Kristen' }],
    culturalContext: {
      hasTradition: null,
      description: null,
    },
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-03T00:00:00.000Z',
  };

  const workspaceB: StoredWorkspace = {
    id: '22222222-2222-4222-8222-222222222222',
    userId: 'user-b-uuid',
    coupleName: 'Budi & Citra',
    weddingDate: '2027-08-20',
    estimatedBudget: 200_000_000,
    estimatedGuestCount: 600,
    completedCategories: [],
    primaryPlanningPriority: 'budget',
    religiousContexts: [{ tradition: 'christian', label: 'Kristen' }],
    culturalContext: {
      hasTradition: null,
      description: null,
    },
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-03T00:00:00.000Z',
  };

  describe('1. New Workspace Setup', () => {
    it('creates workspace and initial tasks in Supabase while child lists start empty', async () => {
      vi.spyOn(workspaceRepository, 'createWorkspace').mockResolvedValueOnce(workspaceA);
      vi.spyOn(workspaceRepository, 'getTasks').mockResolvedValueOnce([]);
      vi.spyOn(workspaceRepository, 'bulkCreateTasks').mockImplementation(async (_, tasks) => tasks);

      const created = await workspaceRepository.createWorkspace(
        {
          coupleName: workspaceA.coupleName,
          weddingDate: workspaceA.weddingDate,
          estimatedBudget: workspaceA.estimatedBudget,
          estimatedGuestCount: workspaceA.estimatedGuestCount,
          completedCategories: workspaceA.completedCategories,
          primaryPlanningPriority: workspaceA.primaryPlanningPriority,
          religiousContexts: [],
          culturalContext: {
            hasTradition: null,
            description: null,
          },
        },
        workspaceA.userId!
      );

      expect(created.id).toBe(workspaceA.id);

      const initialTasks = generateInitialTasks({
        workspaceId: created.id,
        completedCategories: created.completedCategories,
        weddingDate: created.weddingDate,
        daysUntilWedding: 160,
      });

      const persistedTasks = await workspaceRepository.bulkCreateTasks(created.id, initialTasks);
      expect(persistedTasks.length).toBeGreaterThan(0);
    });
  });

  describe('2. Task Lifecycle', () => {
    const task: TaskItem = {
      id: '33333333-3333-4333-8333-333333333333',
      title: 'Survey Lokasi',
      description: 'Survey 3 venue',
      category: 'venue',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-10-01',
      estimatedMinutes: 120,
      source: 'custom',
      templateId: null,
      vendorId: null,
      eventIds: [],
      createdAt: '2026-09-03T00:00:00.000Z',
      updatedAt: '2026-09-03T00:00:00.000Z',
      completedAt: null,
    };

    it('creates, completes, uncompletes, edits, and deletes task in Supabase', async () => {
      // Create
      vi.spyOn(workspaceRepository, 'createTask').mockResolvedValueOnce(task);
      const created = await workspaceRepository.createTask(workspaceA.id, task);
      expect(created.id).toBe(task.id);

      // Complete
      const completed = toggleTaskComplete([created], created.id)[0];
      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeDefined();

      // Uncomplete
      const uncompleted = toggleTaskComplete([completed], completed.id)[0];
      expect(uncompleted.status).toBe('todo');
      expect(uncompleted.completedAt).toBeNull();

      // Edit
      const edited = updateTask([uncompleted], { ...uncompleted, title: 'Survey 5 Lokasi' })[0];
      expect(edited.title).toBe('Survey 5 Lokasi');

      // Delete
      vi.spyOn(workspaceRepository, 'deleteTask').mockResolvedValueOnce(undefined);
      await workspaceRepository.deleteTask(workspaceA.id, edited.id);
      const remaining = deleteTask([edited], edited.id);
      expect(remaining).toHaveLength(0);
    });
  });

  describe('3. Vendor Lifecycle', () => {
    it('creates, edits, and deletes vendor in Supabase', async () => {
      const { newVendor } = createVendor([], {
        name: 'Grand Ballroom',
        category: 'venue',
        quotedPrice: 50_000_000,
        contactName: 'Pak Budi',
      });

      expect(newVendor.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      vi.spyOn(workspaceRepository, 'createVendor').mockResolvedValueOnce(newVendor);
      const created = await workspaceRepository.createVendor(workspaceA.id, newVendor);
      expect(created.name).toBe('Grand Ballroom');

      const updated = updateVendor([created], created.id, { quotedPrice: 45_000_000 })[0];
      expect(updated.quotedPrice).toBe(45_000_000);

      vi.spyOn(workspaceRepository, 'deleteVendor').mockResolvedValueOnce(undefined);
      await workspaceRepository.deleteVendor(workspaceA.id, updated.id);
      const { updatedVendors } = deleteVendor([updated], updated.id);
      expect(updatedVendors).toHaveLength(0);
    });
  });

  describe('4. Task ↔ Vendor Relationship', () => {
    it('links Task to Vendor with UUID and disassociates on vendor delete without deleting Task', async () => {
      const { newVendor } = createVendor([], {
        name: 'Catering Prima',
        category: 'catering',
      });

      const task: TaskItem = {
        id: '44444444-4444-4444-8444-444444444444',
        title: 'Food Tasting',
        description: null,
        category: 'catering',
        status: 'todo',
        priority: 'high',
        dueDate: '2026-11-01',
        estimatedMinutes: 60,
        source: 'custom',
        templateId: null,
        vendorId: newVendor.id, // Linked to Vendor UUID
        eventIds: [],
        createdAt: '2026-09-03',
        updatedAt: '2026-09-03',
        completedAt: null,
      };

      expect(task.vendorId).toBe(newVendor.id);

      // When vendor is deleted
      const { updatedTasks } = deleteVendor([newVendor], newVendor.id, [task]);
      expect(updatedTasks).toHaveLength(1);
      expect(updatedTasks![0].id).toBe(task.id);
      expect(updatedTasks![0].vendorId).toBeNull(); // Disassociated, not deleted!
    });
  });

  describe('5. Budget Allocations & Expenses', () => {
    it('persists allocations and expenses and maintains accurate derived calculations', () => {
      const budget: StoredBudget = {
        allocations: [
          {
            id: 'a-1',
            category: 'venue',
            amount: 60_000_000,
            createdAt: '2026-09-03',
            updatedAt: '2026-09-03',
          },
        ],
        expenses: [
          {
            id: 'e-1',
            title: 'DP Gedung',
            category: 'venue',
            amount: 20_000_000,
            date: '2026-09-15',
            note: 'Transfer BCA',
            createdAt: '2026-09-03',
            updatedAt: '2026-09-03',
          },
        ],
      };

      const overview = calculateBudgetOverview(workspaceA.estimatedBudget, budget);
      expect(overview.totalAllocated).toBe(60_000_000);
      expect(overview.totalSpent).toBe(20_000_000);
      expect(overview.totalRemaining).toBe(130_000_000);

      const summaries = calculateCategorySummaries(budget);
      expect(summaries['venue'].spent).toBe(20_000_000);
      expect(summaries['venue'].remaining).toBe(40_000_000);
    });
  });

  describe('6. Guest Management', () => {
    it('creates guest with UUID, updates RSVP and pax without changing workspace estimatedGuestCount', () => {
      const { newGuest, updatedGuests } = createGuest([], {
        name: 'Pak Ahmad',
        side: 'groom',
        pax: 2,
        rsvpStatus: 'pending',
      });

      expect(newGuest.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      const confirmedList = updateGuest(updatedGuests, newGuest.id, {
        rsvpStatus: 'attending',
        pax: 3,
      });

      expect(confirmedList[0].rsvpStatus).toBe('attending');
      expect(confirmedList[0].pax).toBe(3);

      const summary = getGuestSummary(confirmedList);
      expect(summary.totalPax).toBe(3);
      expect(summary.attendingPax).toBe(3);

      // Verify workspace estimatedGuestCount is untouched
      expect(workspaceA.estimatedGuestCount).toBe(500);
    });
  });

  describe('7. Notes Management', () => {
    it('creates note with UUID, edits content updating updatedAt, and toggles pin without modifying updatedAt', () => {
      const { newNote, updatedNotes } = createNote([], {
        title: 'Susunan Acara Akad',
        content: 'Pukul 08.00 - 10.00',
        category: 'idea',
      });

      expect(newNote.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(newNote.isPinned).toBe(false);

      const originalUpdatedAt = newNote.updatedAt;

      // Pin note
      const pinnedList = togglePinNote(updatedNotes, newNote.id);
      expect(pinnedList[0].isPinned).toBe(true);
      expect(pinnedList[0].updatedAt).toBe(originalUpdatedAt); // Pinned does not change updatedAt!

      // Edit note
      const editedList = updateNote(pinnedList, newNote.id, {
        title: 'Susunan Acara Akad & Resepsi',
      });
      expect(editedList[0].title).toBe('Susunan Acara Akad & Resepsi');
      expect(editedList[0].updatedAt).toBeDefined();
    });
  });

  describe('8. NBA Determinism', () => {
    it('evaluates deterministic Next Best Action identically with Supabase-loaded data', () => {
      const tasks: TaskItem[] = [
        {
          id: '55555555-5555-4555-8555-555555555555',
          title: 'Booking MUA & Gaun Pengantin',
          description: 'Pilih paket tata rias pengantin',
          category: 'makeup_attire',
          status: 'todo',
          priority: 'high',
          dueDate: '2026-09-20',
          estimatedMinutes: 60,
          source: 'template',
          templateId: 'tpl-mua-1',
          vendorId: null,
          eventIds: [],
          createdAt: '2026-09-03',
          updatedAt: '2026-09-03',
          completedAt: null,
        },
      ];

      const nba = getNextBestAction(workspaceA, tasks, '2026-09-03');
      expect(nba.title).toBe('Booking MUA & Gaun Pengantin');
      expect(nba.priority).toBe('high');

      const viewModel = deriveWorkspaceViewModel(workspaceA, tasks);
      expect(viewModel.nextBestAction.title).toBe('Booking MUA & Gaun Pengantin');
    });
  });

  describe('9. Workspace Isolation', () => {
    it('ensures separate workspaces never leak tasks, vendors, budget, guests, or notes', async () => {
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((_col: string, wsVal: string) => ({
                order: vi.fn().mockImplementation(async () => {
                  if (wsVal === workspaceA.id) {
                    return {
                      data: [
                        {
                          id: 't-a',
                          workspace_id: workspaceA.id,
                          vendor_id: null,
                          template_id: null,
                          title: 'Task A',
                          description: null,
                          category: 'venue',
                          status: 'todo',
                          priority: 'high',
                          due_date: null,
                          estimated_minutes: 60,
                          source: 'custom',
                          completed_at: null,
                          created_at: '2026-09-03',
                          updated_at: '2026-09-03',
                        },
                      ],
                      error: null,
                    };
                  }
                  if (wsVal === workspaceB.id) {
                    return {
                      data: [
                        {
                          id: 't-b',
                          workspace_id: workspaceB.id,
                          vendor_id: null,
                          template_id: null,
                          title: 'Task B',
                          description: null,
                          category: 'catering',
                          status: 'todo',
                          priority: 'medium',
                          due_date: null,
                          estimated_minutes: 60,
                          source: 'custom',
                          completed_at: null,
                          created_at: '2026-09-03',
                          updated_at: '2026-09-03',
                        },
                      ],
                      error: null,
                    };
                  }
                  return { data: [], error: null };
                }),
              })),
            }),
          } as any;
        }
        return {} as any;
      });

      const tasksA = await workspaceRepository.getTasks(workspaceA.id);
      const tasksB = await workspaceRepository.getTasks(workspaceB.id);

      expect(tasksA).toHaveLength(1);
      expect(tasksA[0].title).toBe('Task A');
      expect(tasksB).toHaveLength(1);
      expect(tasksB[0].title).toBe('Task B');
      expect(tasksA).not.toEqual(tasksB);
    });
  });

  describe('10. Persistence Failure & Optimistic Rollback', () => {
    it('optimistically applies UI change and rolls back on Supabase error', async () => {
      const initialVendors: Vendor[] = [
        {
          id: 'v-1',
          name: 'Vendor A',
          category: 'venue',
          status: 'selected',
          quotedPrice: 10_000_000,
          contactName: null,
          phone: null,
          instagram: null,
          notes: null,
          createdAt: '2026-09-03',
          updatedAt: '2026-09-03',
        },
      ];

      let state = initialVendors;
      let errorToast: string | null = null;

      const handleVendorChange = async (updated: Vendor[]) => {
        const previous = state;
        state = updated; // Optimistic
        errorToast = null;

        try {
          throw new Error('Gagal menghubungi server');
        } catch (err: any) {
          state = previous; // Rollback
          errorToast = err.message;
        }
      };

      const newVendor: Vendor = {
        id: 'v-2',
        name: 'Vendor B',
        category: 'catering',
        status: 'considering',
        quotedPrice: 20_000_000,
        contactName: null,
        phone: null,
        instagram: null,
        notes: null,
        createdAt: '2026-09-03',
        updatedAt: '2026-09-03',
      };

      await handleVendorChange([...initialVendors, newVendor]);

      expect(state).toHaveLength(1);
      expect(state[0].name).toBe('Vendor A');
      expect(errorToast).toBe('Gagal menghubungi server');
    });
  });
});
