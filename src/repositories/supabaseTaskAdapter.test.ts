import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import {
  mapRowToTaskItem,
  mapTaskItemToRow,
  fetchTasksByWorkspaceId,
  insertTask,
  updateTaskInDb,
  deleteTaskFromDb,
  bulkInsertTasks,
  SupabaseTaskRow,
} from './supabaseTaskAdapter';
import { TaskItem } from '../types/checklist';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('supabaseTaskAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleWorkspaceId = 'w1111111-1111-4111-8111-111111111111';

  const sampleRow: SupabaseTaskRow = {
    id: 't2222222-2222-4222-8222-222222222222',
    workspace_id: sampleWorkspaceId,
    vendor_id: null,
    template_id: 'tpl-venue-1',
    title: 'Survey & Pilih Lokasi / Venue',
    description: 'Kunjungi minimal 3 lokasi pilihan',
    category: 'venue',
    status: 'todo',
    priority: 'high',
    due_date: '2026-11-01',
    estimated_minutes: 120,
    source: 'template',
    event_ids: [],
    completed_at: null,
    created_at: '2026-09-03T00:00:00.000Z',
    updated_at: '2026-09-03T00:00:00.000Z',
  };

  const sampleTaskItem: TaskItem = {
    id: 't2222222-2222-4222-8222-222222222222',
    title: 'Survey & Pilih Lokasi / Venue',
    description: 'Kunjungi minimal 3 lokasi pilihan',
    category: 'venue',
    status: 'todo',
    priority: 'high',
    dueDate: '2026-11-01',
    estimatedMinutes: 120,
    source: 'template',
    templateId: 'tpl-venue-1',
    vendorId: null,
    eventIds: [],
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-03T00:00:00.000Z',
    completedAt: null,
  };

  describe('Row Mapping Functions', () => {
    it('1. maps database snake_case row to frontend TaskItem model', () => {
      const result = mapRowToTaskItem(sampleRow);
      expect(result).toEqual(sampleTaskItem);
      expect(result.dueDate).toBe('2026-11-01');
      expect(result.estimatedMinutes).toBe(120);
      expect(result.vendorId).toBeNull();
    });

    it('2. maps frontend TaskItem to database snake_case row with workspace_id and vendor_id', () => {
      const taskWithVendor: TaskItem = {
        ...sampleTaskItem,
        vendorId: 'v2222222-2222-4222-8222-222222222222',
      };

      const result = mapTaskItemToRow(taskWithVendor, sampleWorkspaceId);
      expect(result).toEqual({
        id: sampleTaskItem.id,
        workspace_id: sampleWorkspaceId,
        vendor_id: 'v2222222-2222-4222-8222-222222222222',
        template_id: 'tpl-venue-1',
        title: 'Survey & Pilih Lokasi / Venue',
        description: 'Kunjungi minimal 3 lokasi pilihan',
        category: 'venue',
        status: 'todo',
        priority: 'high',
        due_date: '2026-11-01',
        estimated_minutes: 120,
        source: 'template',
        event_ids: [],
        completed_at: null,
        created_at: '2026-09-03T00:00:00.000Z',
        updated_at: '2026-09-03T00:00:00.000Z',
      });
    });

    it('3. handles null and optional fields correctly during mapping', () => {
      const rowWithNulls: SupabaseTaskRow = {
        id: 't3333333-3333-4333-8333-333333333333',
        workspace_id: sampleWorkspaceId,
        vendor_id: null,
        template_id: null,
        title: 'Custom Task Tanpa Deadline',
        description: null,
        category: 'general',
        status: 'todo',
        priority: 'low',
        due_date: null,
        estimated_minutes: null,
        source: 'custom',
        completed_at: null,
        created_at: '2026-09-03T00:00:00.000Z',
        updated_at: '2026-09-03T00:00:00.000Z',
      };

      const mapped = mapRowToTaskItem(rowWithNulls);
      expect(mapped.description).toBeNull();
      expect(mapped.dueDate).toBeNull();
      expect(mapped.estimatedMinutes).toBeNull();
      expect(mapped.templateId).toBeNull();
      expect(mapped.vendorId).toBeNull();
      expect(mapped.completedAt).toBeNull();
    });

    it('4. maps completed task with completed_at timestamp correctly', () => {
      const completedRow: SupabaseTaskRow = {
        ...sampleRow,
        status: 'completed',
        completed_at: '2026-09-03T12:00:00.000Z',
      };

      const mapped = mapRowToTaskItem(completedRow);
      expect(mapped.status).toBe('completed');
      expect(mapped.completedAt).toBe('2026-09-03T12:00:00.000Z');
    });
  });

  describe('fetchTasksByWorkspaceId', () => {
    it('queries tasks strictly scoped by workspace_id and ordered by created_at', async () => {
      const orderMock = vi.fn().mockResolvedValueOnce({
        data: [sampleRow],
        error: null,
      });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const tasks = await fetchTasksByWorkspaceId(sampleWorkspaceId);

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(selectMock).toHaveBeenCalledWith('*');
      expect(eqMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: true });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe(sampleRow.id);
    });

    it('returns empty array if workspaceId is empty', async () => {
      const tasks = await fetchTasksByWorkspaceId('');
      expect(tasks).toEqual([]);
    });

    it('throws error when database query fails', async () => {
      const orderMock = vi.fn().mockResolvedValueOnce({
        data: null,
        error: new Error('Network error'),
      });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      await expect(fetchTasksByWorkspaceId(sampleWorkspaceId)).rejects.toThrow('Network error');
    });
  });

  describe('insertTask', () => {
    it('inserts a single task into Supabase and returns mapped TaskItem', async () => {
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: sampleRow,
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

      const result = await insertTask(sampleWorkspaceId, sampleTaskItem);

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: sampleWorkspaceId,
          vendor_id: null,
          title: sampleTaskItem.title,
        })
      );
      expect(result).toEqual(sampleTaskItem);
    });
  });

  describe('updateTaskInDb', () => {
    it('updates task scoped by id and workspace_id', async () => {
      const updatedRow = { ...sampleRow, status: 'completed', completed_at: '2026-09-03T10:00:00Z' };
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: updatedRow,
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqWorkspaceMock = vi.fn().mockReturnValue({ select: selectMock });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqWorkspaceMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

      const result = await updateTaskInDb(sampleWorkspaceId, {
        ...sampleTaskItem,
        status: 'completed',
        completedAt: '2026-09-03T10:00:00Z',
      });

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(eqIdMock).toHaveBeenCalledWith('id', sampleTaskItem.id);
      expect(eqWorkspaceMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
      expect(result.status).toBe('completed');
    });
  });

  describe('deleteTaskFromDb', () => {
    it('deletes task scoped by id and workspace_id', async () => {
      const eqWorkspaceMock = vi.fn().mockResolvedValueOnce({ error: null });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqWorkspaceMock });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      vi.mocked(supabase.from).mockReturnValue({ delete: deleteMock } as any);

      await deleteTaskFromDb(sampleWorkspaceId, sampleTaskItem.id);

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(eqIdMock).toHaveBeenCalledWith('id', sampleTaskItem.id);
      expect(eqWorkspaceMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
    });
  });

  describe('bulkInsertTasks', () => {
    it('bulk inserts tasks and returns mapped array', async () => {
      const selectMock = vi.fn().mockResolvedValueOnce({
        data: [sampleRow],
        error: null,
      });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

      const result = await bulkInsertTasks(sampleWorkspaceId, [sampleTaskItem]);

      expect(supabase.from).toHaveBeenCalledWith('tasks');
      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({
          workspace_id: sampleWorkspaceId,
          vendor_id: null,
        }),
      ]);
      expect(result).toHaveLength(1);
    });

    it('returns empty array if input tasks array is empty', async () => {
      const result = await bulkInsertTasks(sampleWorkspaceId, []);
      expect(result).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });
});
