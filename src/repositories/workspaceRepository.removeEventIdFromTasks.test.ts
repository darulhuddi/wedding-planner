import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as workspaceRepository from './workspaceRepository';
import * as supabaseTaskAdapter from './supabaseTaskAdapter';
import * as supabaseEventAdapter from './supabaseEventAdapter';
import { TaskItem } from '../types/checklist';

describe('workspaceRepository: removeEventIdFromTasks and deleteEvent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockTasks: TaskItem[] = [
    {
      id: 'task-1',
      title: 'Tugas 1',
      description: null,
      category: 'venue',
      status: 'todo',
      priority: 'high',
      dueDate: '2027-01-01',
      estimatedMinutes: null,
      source: 'custom',
      templateId: null,
      vendorId: null,
      eventIds: ['evt-1'],
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      completedAt: null,
    },
    {
      id: 'task-2',
      title: 'Tugas 2',
      description: null,
      category: 'catering',
      status: 'todo',
      priority: 'medium',
      dueDate: '2027-02-01',
      estimatedMinutes: null,
      source: 'custom',
      templateId: null,
      vendorId: null,
      eventIds: ['evt-2'],
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      completedAt: null,
    },
  ];

  it('removes eventId from referencing tasks and leaves non-referencing tasks untouched', async () => {
    const fetchSpy = vi
      .spyOn(supabaseTaskAdapter, 'fetchTasksByWorkspaceId')
      .mockResolvedValue(mockTasks);
    const updateSpy = vi
      .spyOn(supabaseTaskAdapter, 'updateTaskInDb')
      .mockImplementation(async (_wsId, task) => task);

    await workspaceRepository.removeEventIdFromTasks('ws-1', 'evt-1');

    expect(fetchSpy).toHaveBeenCalledWith('ws-1');
    // Only task-1 should be updated because only it references evt-1
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith(
      'ws-1',
      expect.objectContaining({
        id: 'task-1',
        eventIds: [],
      })
    );
  });

  it('deleteEvent executes removeEventIdFromTasks first, then deleteWeddingEventFromDb', async () => {
    const callOrder: string[] = [];

    vi.spyOn(supabaseTaskAdapter, 'fetchTasksByWorkspaceId').mockImplementation(async () => {
      callOrder.push('fetchTasks');
      return mockTasks;
    });

    vi.spyOn(supabaseTaskAdapter, 'updateTaskInDb').mockImplementation(async (_wsId, task) => {
      callOrder.push('updateTask');
      return task;
    });

    vi.spyOn(supabaseEventAdapter, 'deleteWeddingEventFromDb').mockImplementation(async () => {
      callOrder.push('deleteEventDb');
    });

    await workspaceRepository.deleteEvent('ws-1', 'evt-1');

    expect(callOrder).toEqual(['fetchTasks', 'updateTask', 'deleteEventDb']);
  });

  it('if task cleanup fails, deleteWeddingEventFromDb is not called and error is thrown', async () => {
    vi.spyOn(supabaseTaskAdapter, 'fetchTasksByWorkspaceId').mockResolvedValue(mockTasks);
    vi.spyOn(supabaseTaskAdapter, 'updateTaskInDb').mockRejectedValue(
      new Error('Database network failure')
    );

    const deleteEventDbSpy = vi.spyOn(supabaseEventAdapter, 'deleteWeddingEventFromDb');

    await expect(
      workspaceRepository.deleteEvent('ws-1', 'evt-1')
    ).rejects.toThrow('Database network failure');

    // deleteEventDb must NEVER be called if task cleanup failed
    expect(deleteEventDbSpy).not.toHaveBeenCalled();
  });
});
