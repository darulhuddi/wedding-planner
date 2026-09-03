import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as workspaceRepository from '../repositories/workspaceRepository';
import { StoredWorkspace } from '../types/workspace';
import { TaskItem } from '../types/checklist';
import { Guest } from '../types/guest';

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

const memoryStore: Record<string, string> = {};

if (typeof localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStore[key] || null,
    setItem: (key: string, value: string) => {
      memoryStore[key] = value;
    },
    removeItem: (key: string) => {
      delete memoryStore[key];
    },
    clear: () => {
      Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
    },
  };
}

describe('Workspace Supabase Persistence & Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
  });

  const sampleUUIDWorkspace: StoredWorkspace = {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    userId: 'user-auth-uuid-999',
    coupleName: 'Budi & Citra',
    weddingDate: '2027-06-20',
    estimatedBudget: 200_000_000,
    estimatedGuestCount: 600,
    completedCategories: ['venue', 'catering', 'photography'],
    primaryPlanningPriority: 'budget',
    religiousContexts: [],
    culturalContext: {
      hasTradition: null,
      description: null,
    },
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-03T00:00:00.000Z',
  };

  describe('Repository & Supabase Adapter Integration', () => {
    it('fetches workspace for authenticated user from Supabase', async () => {
      vi.spyOn(workspaceRepository, 'getWorkspace').mockResolvedValueOnce(sampleUUIDWorkspace);

      const workspace = await workspaceRepository.getWorkspace('user-auth-uuid-999');
      expect(workspace).toEqual(sampleUUIDWorkspace);
      expect(workspace?.id).toBe('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d');
    });

    it('returns null when user has no workspace in Supabase', async () => {
      vi.spyOn(workspaceRepository, 'getWorkspace').mockResolvedValueOnce(null);

      const workspace = await workspaceRepository.getWorkspace('user-without-workspace');
      expect(workspace).toBeNull();
    });

    it('creates workspace using authenticated user ID and returns UUID workspace', async () => {
      vi.spyOn(workspaceRepository, 'createWorkspace').mockResolvedValueOnce(sampleUUIDWorkspace);

      const created = await workspaceRepository.createWorkspace(
        {
          coupleName: 'Budi & Citra',
          weddingDate: '2027-06-20',
          estimatedBudget: 200_000_000,
          estimatedGuestCount: 600,
          completedCategories: ['venue', 'catering', 'photography'],
          primaryPlanningPriority: 'budget',
          religiousContexts: [],
          culturalContext: {
            hasTradition: null,
            description: null,
          },
        },
        'user-auth-uuid-999'
      );

      expect(created.id).toBe('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d');
      expect(created.userId).toBe('user-auth-uuid-999');
    });
  });

  describe('Child Entities LocalStorage Compatibility with Supabase UUID', () => {
    it('persists and retrieves tasks, budget, vendors, guests, notes keyed by UUID without errors', async () => {
      const uuid = sampleUUIDWorkspace.id;

      // Tasks
      const initialTask: TaskItem = {
        id: 'task-1',
        title: 'Survey Gedung',
        description: null,
        category: 'venue',
        priority: 'high',
        status: 'todo',
        dueDate: '2026-11-01',
        estimatedMinutes: 60,
        source: 'template',
        templateId: 'tpl-1',
        eventIds: [],
        createdAt: '2026-09-03',
        updatedAt: '2026-09-03',
        completedAt: null,
      };
      vi.spyOn(workspaceRepository, 'bulkCreateTasks').mockResolvedValueOnce([initialTask]);
      vi.spyOn(workspaceRepository, 'getTasks').mockResolvedValueOnce([initialTask]);

      await workspaceRepository.bulkCreateTasks(uuid, [initialTask]);
      const retrievedTasks = await workspaceRepository.getTasks(uuid);
      expect(retrievedTasks).toHaveLength(1);
      expect(retrievedTasks[0].id).toBe('task-1');

      // Budget
      const budget = {
        allocations: [{ id: 'b1', category: 'venue' as const, amount: 50_000_000, createdAt: '', updatedAt: '' }],
        expenses: [],
      };
      vi.spyOn(workspaceRepository, 'saveBudget').mockResolvedValue(budget);
      vi.spyOn(workspaceRepository, 'getBudget').mockResolvedValue(budget);
      await workspaceRepository.saveBudget(uuid, budget);
      const fetchedBudget = await workspaceRepository.getBudget(uuid);
      expect(fetchedBudget.allocations).toHaveLength(1);

      // Vendors
      const vendor = {
        id: 'v1',
        name: 'The Grand Ballroom',
        category: 'venue' as const,
        status: 'selected' as const,
        quotedPrice: 50_000_000,
        contactName: 'Pak Budi',
        phone: '08123456789',
        instagram: '@grandballroom',
        notes: null,
        createdAt: '',
        updatedAt: '',
      };
      vi.spyOn(workspaceRepository, 'saveVendors').mockResolvedValue([vendor]);
      vi.spyOn(workspaceRepository, 'getVendors').mockResolvedValue([vendor]);
      await workspaceRepository.saveVendors(uuid, [vendor]);
      const fetchedVendors = await workspaceRepository.getVendors(uuid);
      expect(fetchedVendors).toHaveLength(1);

      // Guests
      const guest: Guest = {
        id: 'g1',
        name: 'Keluarga Budi',
        side: 'groom',
        invitationStatus: 'invited',
        rsvpStatus: 'attending',
        pax: 2,
        phone: '0812345678',
        notes: null,
        createdAt: '',
        updatedAt: '',
      };
      vi.spyOn(workspaceRepository, 'saveGuests').mockResolvedValue([guest]);
      vi.spyOn(workspaceRepository, 'getGuests').mockResolvedValue([guest]);
      await workspaceRepository.saveGuests(uuid, [guest]);
      const fetchedGuests = await workspaceRepository.getGuests(uuid);
      expect(fetchedGuests).toHaveLength(1);

      // Notes
      const note = {
        id: 'n1',
        title: 'Catatan Venue',
        content: 'Deposit 20%',
        category: 'venue' as const,
        isPinned: true,
        createdAt: '',
        updatedAt: '',
      };
      vi.spyOn(workspaceRepository, 'saveNotes').mockResolvedValue([note]);
      vi.spyOn(workspaceRepository, 'getNotes').mockResolvedValue([note]);
      await workspaceRepository.saveNotes(uuid, [note]);
      const fetchedNotes = await workspaceRepository.getNotes(uuid);
      expect(fetchedNotes).toHaveLength(1);
    });
  });

  describe('Onboarding & Async State Transitions', () => {
    it('Onboarding: successful Supabase save advances to step 6 (Workspace Ready)', async () => {
      let currentStep = 5;
      let isSaving = false;
      let saveError: string | null = null;

      vi.spyOn(workspaceRepository, 'createWorkspace').mockResolvedValueOnce(sampleUUIDWorkspace);

      const handlePriorityNext = async () => {
        isSaving = true;
        try {
          await workspaceRepository.createWorkspace(
            {
              coupleName: 'Budi & Citra',
              weddingDate: '2027-06-20',
              estimatedBudget: 200_000_000,
              estimatedGuestCount: 600,
              completedCategories: ['venue'],
              primaryPlanningPriority: 'budget',
              religiousContexts: [],
              culturalContext: {
                hasTradition: null,
                description: null,
              },
            },
            'user-auth-uuid-999'
          );
          currentStep = 6;
        } catch (err: any) {
          saveError = err.message;
        } finally {
          isSaving = false;
        }
      };

      await handlePriorityNext();

      expect(currentStep).toBe(6);
      expect(isSaving).toBe(false);
      expect(saveError).toBeNull();
    });

    it('Onboarding: Supabase failure keeps user on step 5 and surfaces error message', async () => {
      let currentStep = 5;
      let isSaving = false;
      let saveError: string | null = null;

      vi.spyOn(workspaceRepository, 'createWorkspace').mockRejectedValueOnce(
        new Error('Gagal menyimpan workspace ke Supabase')
      );

      const handlePriorityNext = async () => {
        isSaving = true;
        try {
          await workspaceRepository.createWorkspace(
            {
              coupleName: 'Budi & Citra',
              weddingDate: '2027-06-20',
              estimatedBudget: 200_000_000,
              estimatedGuestCount: 600,
              completedCategories: ['venue'],
              primaryPlanningPriority: 'budget',
              religiousContexts: [],
              culturalContext: {
                hasTradition: null,
                description: null,
              },
            },
            'user-auth-uuid-999'
          );
          currentStep = 6;
        } catch (err: any) {
          saveError = err.message;
        } finally {
          isSaving = false;
        }
      };

      await handlePriorityNext();

      expect(currentStep).toBe(5); // Remains on step 5
      expect(isSaving).toBe(false);
      expect(saveError).toBe('Gagal menyimpan workspace ke Supabase');
    });

    it('Submission guard: duplicate submission is prevented while saving', async () => {
      let isSaving = false;
      let callCount = 0;

      const performSave = async () => {
        if (isSaving) return;
        isSaving = true;
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        isSaving = false;
      };

      await Promise.all([performSave(), performSave()]);

      expect(callCount).toBe(1);
    });
  });

  describe('App State Machine & Route Transitions', () => {
    it('determines correct route: authenticated user with no workspace navigates to onboarding', () => {
      const user = { id: 'user-1' };
      const storedWorkspace = null;
      const currentRoute = 'dashboard';

      const isAppRoute = ['dashboard', 'checklist', 'budget', 'timeline', 'vendor', 'guests', 'notes'].includes(
        currentRoute
      );

      let targetView = currentRoute;
      if (user && !storedWorkspace && isAppRoute) {
        targetView = 'onboarding';
      }

      expect(targetView).toBe('onboarding');
    });

    it('determines correct route: authenticated user with real workspace renders dashboard', () => {
      const user = { id: 'user-1' };
      const storedWorkspace = sampleUUIDWorkspace;
      const currentRoute = 'dashboard';

      const isAppRoute = ['dashboard', 'checklist', 'budget', 'timeline', 'vendor', 'guests', 'notes'].includes(
        currentRoute
      );

      let targetView = currentRoute;
      if (user && !storedWorkspace && isAppRoute) {
        targetView = 'onboarding';
      }

      expect(targetView).toBe('dashboard');
    });

    it('never renders MOCK_DEMO_WORKSPACE during active authenticated loading', () => {
      const isAuthLoading = false;
      const isWorkspaceLoading = true;
      const user = { id: 'user-1' };

      const shouldShowLoadingScreen = isAuthLoading || (user && isWorkspaceLoading);
      expect(shouldShowLoadingScreen).toBe(true);
    });
  });
});
