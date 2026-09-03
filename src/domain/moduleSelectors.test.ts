import { describe, it, expect } from 'vitest';
import {
  getModuleProgress,
  getModuleStatus,
  getAllModulesProgress,
  getCompletedModuleCount,
  getOverallModuleProgressPercentage,
  TOTAL_CANONICAL_MODULES,
} from './moduleSelectors';
import { TaskItem } from '../types/checklist';
import { CategoryId } from '../types/onboarding';

function createTask(
  id: string,
  category: CategoryId,
  status: 'todo' | 'in_progress' | 'completed' = 'todo'
): TaskItem {
  return {
    id,
    title: `Task ${id}`,
    description: null,
    category,
    status,
    priority: 'medium',
    dueDate: '2027-01-01',
    estimatedMinutes: null,
    source: 'template',
    templateId: null,
    eventIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: status === 'completed' ? new Date().toISOString() : null,
  };
}

describe('moduleSelectors Unit Tests', () => {
  it('A. returns not_started when category has 0 tasks', () => {
    const tasks: TaskItem[] = [];
    const venueProgress = getModuleProgress(tasks, 'venue');

    expect(venueProgress.totalTasks).toBe(0);
    expect(venueProgress.completedTasks).toBe(0);
    expect(venueProgress.status).toBe('not_started');
    expect(venueProgress.progressPercentage).toBe(0);
    expect(getModuleStatus(tasks, 'venue')).toBe('not_started');
  });

  it('B. returns not_started when category has tasks but 0 completed', () => {
    const tasks: TaskItem[] = [
      createTask('v1', 'venue', 'todo'),
      createTask('v2', 'venue', 'todo'),
      createTask('v3', 'venue', 'in_progress'),
      createTask('v4', 'venue', 'todo'),
    ];

    const venueProgress = getModuleProgress(tasks, 'venue');
    expect(venueProgress.totalTasks).toBe(4);
    expect(venueProgress.completedTasks).toBe(0);
    expect(venueProgress.status).toBe('not_started');
    expect(venueProgress.progressPercentage).toBe(0);
  });

  it('C. returns in_progress when some but not all tasks are completed', () => {
    const tasks: TaskItem[] = [
      createTask('v1', 'venue', 'completed'),
      createTask('v2', 'venue', 'completed'),
      createTask('v3', 'venue', 'todo'),
      createTask('v4', 'venue', 'in_progress'),
    ];

    const venueProgress = getModuleProgress(tasks, 'venue');
    expect(venueProgress.totalTasks).toBe(4);
    expect(venueProgress.completedTasks).toBe(2);
    expect(venueProgress.status).toBe('in_progress');
    expect(venueProgress.progressPercentage).toBe(50);
  });

  it('D. returns completed when all tasks in category are completed', () => {
    const tasks: TaskItem[] = [
      createTask('v1', 'venue', 'completed'),
      createTask('v2', 'venue', 'completed'),
      createTask('v3', 'venue', 'completed'),
      createTask('v4', 'venue', 'completed'),
    ];

    const venueProgress = getModuleProgress(tasks, 'venue');
    expect(venueProgress.totalTasks).toBe(4);
    expect(venueProgress.completedTasks).toBe(4);
    expect(venueProgress.status).toBe('completed');
    expect(venueProgress.progressPercentage).toBe(100);
  });

  it('E. counts only status === completed as finished (in_progress and todo are unfinished)', () => {
    const tasks: TaskItem[] = [
      createTask('c1', 'catering', 'todo'),
      createTask('c2', 'catering', 'in_progress'),
      createTask('c3', 'catering', 'completed'),
    ];

    const cateringProgress = getModuleProgress(tasks, 'catering');
    expect(cateringProgress.totalTasks).toBe(3);
    expect(cateringProgress.completedTasks).toBe(1);
    expect(cateringProgress.status).toBe('in_progress');
  });

  it('F. calculates completed module count across multiple categories accurately', () => {
    const tasks: TaskItem[] = [
      // Venue: 4/4 completed -> completed
      createTask('v1', 'venue', 'completed'),
      createTask('v2', 'venue', 'completed'),
      createTask('v3', 'venue', 'completed'),
      createTask('v4', 'venue', 'completed'),

      // Catering: 2/5 completed -> in_progress
      createTask('c1', 'catering', 'completed'),
      createTask('c2', 'catering', 'completed'),
      createTask('c3', 'catering', 'todo'),
      createTask('c4', 'catering', 'in_progress'),
      createTask('c5', 'catering', 'todo'),

      // Photo: 3/3 completed -> completed
      createTask('p1', 'photography', 'completed'),
      createTask('p2', 'photography', 'completed'),
      createTask('p3', 'photography', 'completed'),

      // Decoration: 0/2 completed -> not_started
      createTask('d1', 'decoration', 'todo'),
      createTask('d2', 'decoration', 'todo'),
    ];

    const completedCount = getCompletedModuleCount(tasks);
    expect(completedCount).toBe(2); // Venue & Photo

    const overallPct = getOverallModuleProgressPercentage(tasks);
    // 2 out of 6 canonical modules = 33%
    expect(overallPct).toBe(Math.round((2 / 6) * 100));
  });

  it('G. guarantees category isolation (changing Catering tasks does not affect Venue progress)', () => {
    const venueTasks: TaskItem[] = [
      createTask('v1', 'venue', 'completed'),
      createTask('v2', 'venue', 'completed'),
    ];

    const initialVenueProgress = getModuleProgress(venueTasks, 'venue');
    expect(initialVenueProgress.status).toBe('completed');

    // Add catering tasks
    const combinedTasks: TaskItem[] = [
      ...venueTasks,
      createTask('c1', 'catering', 'todo'),
      createTask('c2', 'catering', 'in_progress'),
    ];

    const updatedVenueProgress = getModuleProgress(combinedTasks, 'venue');
    expect(updatedVenueProgress).toEqual(initialVenueProgress);
  });

  it('H. does not count empty categories with 0 tasks as completed', () => {
    const tasks: TaskItem[] = [
      createTask('v1', 'venue', 'completed'),
    ];

    const all = getAllModulesProgress(tasks);
    expect(all).toHaveLength(TOTAL_CANONICAL_MODULES);

    const venue = all.find((m) => m.category === 'venue');
    const catering = all.find((m) => m.category === 'catering');
    const invitation = all.find((m) => m.category === 'invitation');

    expect(venue?.status).toBe('completed');
    expect(catering?.status).toBe('not_started');
    expect(invitation?.status).toBe('not_started');

    expect(getCompletedModuleCount(tasks)).toBe(1);
  });
});
