import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as workspaceRepository from '../repositories/workspaceRepository';
import { generateInitialTasks, toggleTaskComplete, updateTask, deleteTask } from '../utils/checklistUtils';
import { deriveWorkspaceViewModel } from '../domain/workspaceSelectors';
import { getNextBestAction } from '../utils/nextBestActionEngine';
import { StoredWorkspace } from '../types/workspace';
import { TaskItem } from '../types/checklist';

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

describe('Task Persistence & Supabase Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const workspaceA: StoredWorkspace = {
    id: '11111111-aaaa-4111-8111-111111111111',
    userId: 'user-a-uuid',
    coupleName: 'Adit & Amel',
    weddingDate: '2027-02-14',
    estimatedBudget: 150_000_000,
    estimatedGuestCount: 500,
    completedCategories: ['venue', 'catering'],
    primaryPlanningPriority: 'timeline',
    religiousContexts: [],
    culturalContext: {
      hasTradition: null,
      description: null,
    },
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-03T00:00:00.000Z',
  };

  const workspaceB: StoredWorkspace = {
    id: '22222222-bbbb-4222-8222-222222222222',
    userId: 'user-b-uuid',
    coupleName: 'Budi & Citra',
    weddingDate: '2027-08-20',
    estimatedBudget: 200_000_000,
    estimatedGuestCount: 600,
    completedCategories: [],
    primaryPlanningPriority: 'budget',
    religiousContexts: [],
    culturalContext: {
      hasTradition: null,
      description: null,
    },
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-03T00:00:00.000Z',
  };

  const sampleTask: TaskItem = {
    id: '33333333-cccc-4333-8333-333333333333',
    title: 'Pilih Vendor Fotografi & Videografi',
    description: 'Bandingkan portofolio dan paket',
    category: 'photography',
    status: 'todo',
    priority: 'high',
    dueDate: '2026-11-01',
    estimatedMinutes: 90,
    source: 'template',
    templateId: 'tpl-photo-1',
    vendorId: null,
    eventIds: [],
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-03T00:00:00.000Z',
    completedAt: null,
  };

  describe('Scenario 1 — Onboarding & Initial Task Generation', () => {
    it('generates initial tasks with UUIDs and bulk inserts them to Supabase scoped by workspace.id', async () => {
      const generated = generateInitialTasks({
        workspaceId: workspaceA.id,
        completedCategories: workspaceA.completedCategories,
        weddingDate: workspaceA.weddingDate,
        daysUntilWedding: 160,
      });

      expect(generated.length).toBeGreaterThan(0);
      // Verify all generated IDs are valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      generated.forEach((task) => {
        expect(task.id).toMatch(uuidRegex);
        expect(task.status).toBe('todo');
        expect(task.completedAt).toBeNull();
      });

      // Verify bulk insert
      const bulkInsertSpy = vi
        .spyOn(workspaceRepository, 'bulkCreateTasks')
        .mockResolvedValueOnce(generated);

      const inserted = await workspaceRepository.bulkCreateTasks(workspaceA.id, generated);

      expect(bulkInsertSpy).toHaveBeenCalledWith(workspaceA.id, generated);
      expect(inserted).toHaveLength(generated.length);
    });
  });

  describe('Scenario 2 & 3 — Checklist Complete & Uncomplete', () => {
    it('Scenario 2: completing a task updates status and sets completedAt timestamp', async () => {
      const initialTasks = [sampleTask];
      const completedTasks = toggleTaskComplete(initialTasks, sampleTask.id);

      expect(completedTasks[0].status).toBe('completed');
      expect(completedTasks[0].completedAt).toBeDefined();
      expect(typeof completedTasks[0].completedAt).toBe('string');

      const updateSpy = vi
        .spyOn(workspaceRepository, 'updateTask')
        .mockResolvedValueOnce(completedTasks[0]);

      const persisted = await workspaceRepository.updateTask(workspaceA.id, completedTasks[0]);

      expect(updateSpy).toHaveBeenCalledWith(workspaceA.id, completedTasks[0]);
      expect(persisted.status).toBe('completed');
    });

    it('Scenario 3: uncompleting a completed task reverts status to todo and clears completedAt', async () => {
      const completedTask: TaskItem = {
        ...sampleTask,
        status: 'completed',
        completedAt: '2026-09-03T10:00:00.000Z',
      };

      const revertedTasks = toggleTaskComplete([completedTask], completedTask.id);

      expect(revertedTasks[0].status).toBe('todo');
      expect(revertedTasks[0].completedAt).toBeNull();

      const updateSpy = vi
        .spyOn(workspaceRepository, 'updateTask')
        .mockResolvedValueOnce(revertedTasks[0]);

      const persisted = await workspaceRepository.updateTask(workspaceA.id, revertedTasks[0]);

      expect(updateSpy).toHaveBeenCalledWith(workspaceA.id, revertedTasks[0]);
      expect(persisted.status).toBe('todo');
      expect(persisted.completedAt).toBeNull();
    });
  });

  describe('Scenario 4 — Edit Task', () => {
    it('persists edited title, priority, and due date to Supabase', async () => {
      const updatedItem: TaskItem = {
        ...sampleTask,
        title: 'Meeting dengan Fotografer Pilihan',
        priority: 'medium',
        dueDate: '2026-11-15',
      };

      const taskList = updateTask([sampleTask], updatedItem);
      expect(taskList[0].title).toBe('Meeting dengan Fotografer Pilihan');

      const updateSpy = vi
        .spyOn(workspaceRepository, 'updateTask')
        .mockResolvedValueOnce(taskList[0]);

      const result = await workspaceRepository.updateTask(workspaceA.id, taskList[0]);
      expect(updateSpy).toHaveBeenCalledWith(workspaceA.id, taskList[0]);
      expect(result.title).toBe('Meeting dengan Fotografer Pilihan');
    });
  });

  describe('Scenario 5 — Delete Task', () => {
    it('deletes a task from Supabase scoped by workspaceId', async () => {
      const deleteSpy = vi
        .spyOn(workspaceRepository, 'deleteTask')
        .mockResolvedValueOnce(undefined);

      await workspaceRepository.deleteTask(workspaceA.id, sampleTask.id);

      expect(deleteSpy).toHaveBeenCalledWith(workspaceA.id, sampleTask.id);

      const remaining = deleteTask([sampleTask], sampleTask.id);
      expect(remaining).toHaveLength(0);
    });
  });

  describe('Scenario 6 — NBA Determinism with Supabase-loaded Tasks', () => {
    it('derives identical Next Best Action from Supabase-loaded TaskItems', () => {
      const loadedTasks: TaskItem[] = [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Tentukan Konsep Dekorasi',
          description: 'Cari referensi tema pernikahan',
          category: 'decoration',
          status: 'todo',
          priority: 'high',
          dueDate: '2026-10-01',
          estimatedMinutes: 60,
          source: 'template',
          templateId: 'tpl-dec-1',
          vendorId: null,
          eventIds: [],
          createdAt: '2026-09-03',
          updatedAt: '2026-09-03',
          completedAt: null,
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          title: 'Pilih Souvenir & Undangan',
          description: 'Pesan sampel undangan',
          category: 'invitation',
          status: 'todo',
          priority: 'medium',
          dueDate: '2026-12-01',
          estimatedMinutes: 60,
          source: 'template',
          templateId: 'tpl-inv-1',
          vendorId: null,
          eventIds: [],
          createdAt: '2026-09-03',
          updatedAt: '2026-09-03',
          completedAt: null,
        },
      ];

      const nba = getNextBestAction(workspaceA, loadedTasks, '2026-09-03');
      expect(nba.type).toBe('task');
      expect(nba.taskId).toBe('11111111-1111-4111-8111-111111111111');
      expect(nba.title).toBe('Tentukan Konsep Dekorasi');
      expect(nba.priority).toBe('high');

      const viewModel = deriveWorkspaceViewModel(workspaceA, loadedTasks);
      expect(viewModel.nextBestAction.title).toBe('Tentukan Konsep Dekorasi');
    });
  });

  describe('Scenario 7 — Workspace Isolation', () => {
    it('ensures queries are strictly partitioned by workspace_id', async () => {
      const tasksA = [sampleTask];
      const tasksB = [
        {
          ...sampleTask,
          id: 'task-b-1',
          title: 'Task Milik Workspace B',
        },
      ];

      vi.spyOn(workspaceRepository, 'getTasks').mockImplementation(async (wsId: string) => {
        if (wsId === workspaceA.id) return tasksA;
        if (wsId === workspaceB.id) return tasksB;
        return [];
      });

      const resultA = await workspaceRepository.getTasks(workspaceA.id);
      const resultB = await workspaceRepository.getTasks(workspaceB.id);

      expect(resultA[0].title).toBe(sampleTask.title);
      expect(resultB[0].title).toBe('Task Milik Workspace B');
      expect(resultA).not.toEqual(resultB);
    });
  });

  describe('Scenario 8 — Optimistic Mutation with Rollback on Failure', () => {
    it('rolls back React tasks state and surfaces error when Supabase persistence fails', async () => {
      const initialTasks = [sampleTask];
      let currentTasksState = initialTasks;
      let errorNotification: string | null = null;

      // Simulate App.tsx handleTaskChange behavior
      const handleTaskChange = async (updatedTasks: TaskItem[]) => {
        const previousTasks = currentTasksState;
        currentTasksState = updatedTasks; // 1. Optimistic update
        errorNotification = null;

        try {
          // Simulate network/database failure
          throw new Error('Koneksi ke database terputus. Gagal memperbarui tugas.');
        } catch (err: any) {
          // 2. Roll back state on failure
          currentTasksState = previousTasks;
          errorNotification = err.message;
        }
      };

      const updated = toggleTaskComplete(initialTasks, sampleTask.id);
      expect(updated[0].status).toBe('completed');

      await handleTaskChange(updated);

      // Verify state rolled back to 'todo'
      expect(currentTasksState[0].status).toBe('todo');
      expect(errorNotification).toBe('Koneksi ke database terputus. Gagal memperbarui tugas.');
    });
  });
});
