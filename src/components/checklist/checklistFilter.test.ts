import { describe, it, expect } from 'vitest';
import { TaskItem, ChecklistFilter, TaskCategoryId } from '../../types/checklist';
import { getActiveTasks, getCompletedTasks, filterTasksByCategory } from '../../utils/checklistUtils';

function createSampleTask(
  id: string,
  category: TaskCategoryId,
  status: 'todo' | 'in_progress' | 'completed'
): TaskItem {
  return {
    id,
    title: `Task ${id}`,
    description: null,
    category,
    status,
    priority: 'medium',
    dueDate: '2026-10-01',
    estimatedMinutes: null,
    source: 'custom',
    templateId: null,
    eventIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: status === 'completed' ? new Date().toISOString() : null,
  };
}

// Pure helper replicating the 2-step filter pipeline in ChecklistPage
function applyChecklistFilters(
  tasks: TaskItem[],
  statusFilter: ChecklistFilter,
  categoryFilter: TaskCategoryId | 'all'
): TaskItem[] {
  let result = tasks;
  if (statusFilter === 'active') result = getActiveTasks(result);
  else if (statusFilter === 'completed') result = getCompletedTasks(result);

  return filterTasksByCategory(result, categoryFilter);
}

describe('Checklist Status & Category Filtering Logic', () => {
  const mockTasks: TaskItem[] = [
    // Catering
    createSampleTask('cat-1', 'catering', 'todo'),
    createSampleTask('cat-2', 'catering', 'in_progress'),
    createSampleTask('cat-3', 'catering', 'completed'),

    // Venue
    createSampleTask('ven-1', 'venue', 'todo'),
    createSampleTask('ven-2', 'venue', 'completed'),

    // Photography
    createSampleTask('pho-1', 'photography', 'in_progress'),
    createSampleTask('pho-2', 'photography', 'completed'),

    // Decoration (all todo)
    createSampleTask('dec-1', 'decoration', 'todo'),
  ];

  describe('Three Status Filter Modes', () => {
    it('Semua Status (all) returns all tasks: todo, in_progress, and completed', () => {
      const result = applyChecklistFilters(mockTasks, 'all', 'all');
      expect(result).toHaveLength(mockTasks.length);
      expect(result.some((t) => t.status === 'todo')).toBe(true);
      expect(result.some((t) => t.status === 'in_progress')).toBe(true);
      expect(result.some((t) => t.status === 'completed')).toBe(true);
    });

    it('Belum Selesai (active) returns only todo and in_progress tasks, excluding completed', () => {
      const result = applyChecklistFilters(mockTasks, 'active', 'all');
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((t) => t.status === 'todo' || t.status === 'in_progress')).toBe(true);
      expect(result.some((t) => t.status === 'completed')).toBe(false);
    });

    it('Selesai (completed) returns only completed tasks', () => {
      const result = applyChecklistFilters(mockTasks, 'completed', 'all');
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((t) => t.status === 'completed')).toBe(true);
      expect(result.some((t) => t.status === 'todo')).toBe(false);
      expect(result.some((t) => t.status === 'in_progress')).toBe(false);
    });
  });

  describe('Combination with Category Filtering', () => {
    it('Semua Status + Catering returns all Catering tasks including completed', () => {
      const result = applyChecklistFilters(mockTasks, 'all', 'catering');
      expect(result).toHaveLength(3);
      expect(result.map((t) => t.id)).toEqual(['cat-1', 'cat-2', 'cat-3']);
      expect(result.some((t) => t.status === 'completed')).toBe(true);
      expect(result.some((t) => t.status === 'todo')).toBe(true);
    });

    it('Belum Selesai + Catering returns only unfinished Catering tasks (todo + in_progress)', () => {
      const result = applyChecklistFilters(mockTasks, 'active', 'catering');
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual(['cat-1', 'cat-2']);
      expect(result.every((t) => t.status !== 'completed')).toBe(true);
    });

    it('Selesai + Catering returns only completed Catering tasks', () => {
      const result = applyChecklistFilters(mockTasks, 'completed', 'catering');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cat-3');
      expect(result[0].status).toBe('completed');
    });

    it('Semua Status + Venue returns all Venue tasks (todo + completed)', () => {
      const result = applyChecklistFilters(mockTasks, 'all', 'venue');
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toEqual(['ven-1', 'ven-2']);
    });

    it('Belum Selesai + Venue returns only unfinished Venue tasks', () => {
      const result = applyChecklistFilters(mockTasks, 'active', 'venue');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ven-1');
      expect(result[0].status).toBe('todo');
    });

    it('Selesai + Venue returns only completed Venue tasks', () => {
      const result = applyChecklistFilters(mockTasks, 'completed', 'venue');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ven-2');
      expect(result[0].status).toBe('completed');
    });

    it('Selesai on category with no completed tasks returns empty array', () => {
      const result = applyChecklistFilters(mockTasks, 'completed', 'decoration');
      expect(result).toHaveLength(0);
    });
  });

  describe('Filter State Independence', () => {
    it('switching category maintains active status filter', () => {
      let currentStatus: ChecklistFilter = 'completed';
      let currentCategory: TaskCategoryId | 'all' = 'catering';

      let result1 = applyChecklistFilters(mockTasks, currentStatus, currentCategory);
      expect(result1).toHaveLength(1);
      expect(result1[0].category).toBe('catering');

      // Change category to venue
      currentCategory = 'venue';
      let result2 = applyChecklistFilters(mockTasks, currentStatus, currentCategory);
      expect(result2).toHaveLength(1);
      expect(result2[0].category).toBe('venue');
      expect(result2[0].status).toBe('completed');
    });

    it('switching status maintains active category filter', () => {
      let currentStatus: ChecklistFilter = 'all';
      let currentCategory: TaskCategoryId | 'all' = 'catering';

      let result1 = applyChecklistFilters(mockTasks, currentStatus, currentCategory);
      expect(result1).toHaveLength(3);

      // Change status to active
      currentStatus = 'active';
      let result2 = applyChecklistFilters(mockTasks, currentStatus, currentCategory);
      expect(result2).toHaveLength(2);
      expect(result2.every((t) => t.category === 'catering')).toBe(true);

      // Change status to completed
      currentStatus = 'completed';
      let result3 = applyChecklistFilters(mockTasks, currentStatus, currentCategory);
      expect(result3).toHaveLength(1);
      expect(result3[0].category).toBe('catering');
      expect(result3[0].status).toBe('completed');
    });
  });
});
