import { describe, it, expect } from 'vitest';
import {
  getModuleProgress,
  getModuleStatus,
  getAllModulesProgress,
  getCompletedModuleCount,
  getOverallModuleProgressPercentage,
} from './moduleSelectors';
import { deriveWorkspaceViewModel } from './workspaceSelectors';
import { StoredWorkspace } from '../types/workspace';
import { TaskItem } from '../types/checklist';

function createMockTask(
  id: string,
  category: any,
  status: 'todo' | 'in_progress' | 'completed' = 'todo'
): TaskItem {
  return {
    id,
    title: `Task ${id}`,
    description: null,
    category,
    status,
    priority: 'medium',
    dueDate: '2027-06-01',
    estimatedMinutes: null,
    source: 'template',
    templateId: null,
    eventIds: [],
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    completedAt: status === 'completed' ? '2026-09-01T00:00:00Z' : null,
  };
}

describe('Module Status as Single Source of Truth Integration Tests', () => {
  const initialWorkspace: StoredWorkspace = {
    id: 'ws-single-source-test',
    coupleName: 'Budi & Citra',
    weddingDate: '2027-06-20',
    estimatedBudget: 150_000_000,
    estimatedGuestCount: 350,
    // Note: completedCategories has 'venue' from onboarding
    completedCategories: ['venue', 'photography'],
    primaryPlanningPriority: 'budget',
    religiousContexts: [],
    culturalContext: {
      hasTradition: null,
      description: null,
    },
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  it('1. ignores completedCategories for dashboard module status and computes strictly from tasks', () => {
    // Tasks: Venue has 2 tasks, none completed yet
    const initialTasks: TaskItem[] = [
      createMockTask('v1', 'venue', 'todo'),
      createMockTask('v2', 'venue', 'todo'),
      createMockTask('c1', 'catering', 'todo'),
      createMockTask('c2', 'catering', 'todo'),
    ];

    // deriveWorkspaceViewModel derives counts from tasks
    const viewModel = deriveWorkspaceViewModel(initialWorkspace, initialTasks);

    // Even though initialWorkspace.completedCategories has 2 items, actual completed task module count is 0!
    expect(viewModel.completedCategoriesCount).toBe(0);
    expect(viewModel.completionPercentage).toBe(0);

    const venueProgress = getModuleProgress(initialTasks, 'venue');
    expect(venueProgress.status).toBe('not_started');
    expect(venueProgress.completedTasks).toBe(0);
    expect(venueProgress.totalTasks).toBe(2);
  });

  it('2. partial task completion updates module to in_progress and shows X/Y', () => {
    let tasks: TaskItem[] = [
      createMockTask('v1', 'venue', 'todo'),
      createMockTask('v2', 'venue', 'todo'),
      createMockTask('v3', 'venue', 'todo'),
      createMockTask('v4', 'venue', 'todo'),
    ];

    // User completes 1 task in Venue
    tasks = tasks.map((t) => (t.id === 'v1' ? { ...t, status: 'completed' as const } : t));

    const progress1 = getModuleProgress(tasks, 'venue');
    expect(progress1.status).toBe('in_progress');
    expect(progress1.completedTasks).toBe(1);
    expect(progress1.totalTasks).toBe(4);
    expect(progress1.progressPercentage).toBe(25);

    // User completes another task in Venue (2/4)
    tasks = tasks.map((t) => (t.id === 'v2' ? { ...t, status: 'completed' as const } : t));
    const progress2 = getModuleProgress(tasks, 'venue');
    expect(progress2.status).toBe('in_progress');
    expect(progress2.completedTasks).toBe(2);
    expect(progress2.totalTasks).toBe(4);
    expect(progress2.progressPercentage).toBe(50);

    // Overall module count is still 0 completed modules
    expect(getCompletedModuleCount(tasks)).toBe(0);
  });

  it('3. full task completion updates module to completed and increments completed module count', () => {
    let tasks: TaskItem[] = [
      createMockTask('v1', 'venue', 'completed'),
      createMockTask('v2', 'venue', 'completed'),
      createMockTask('v3', 'venue', 'completed'),
      createMockTask('v4', 'venue', 'completed'),
      createMockTask('c1', 'catering', 'completed'),
      createMockTask('c2', 'catering', 'todo'),
    ];

    const venueProgress = getModuleProgress(tasks, 'venue');
    expect(venueProgress.status).toBe('completed');
    expect(venueProgress.completedTasks).toBe(4);
    expect(venueProgress.totalTasks).toBe(4);
    expect(venueProgress.progressPercentage).toBe(100);

    const cateringProgress = getModuleProgress(tasks, 'catering');
    expect(cateringProgress.status).toBe('in_progress');
    expect(cateringProgress.completedTasks).toBe(1);
    expect(cateringProgress.totalTasks).toBe(2);

    // 1 of 6 modules completed (Venue)
    const completedModuleCount = getCompletedModuleCount(tasks);
    expect(completedModuleCount).toBe(1);

    const viewModel = deriveWorkspaceViewModel(initialWorkspace, tasks);
    expect(viewModel.completedCategoriesCount).toBe(1);
    expect(viewModel.completionPercentage).toBe(Math.round((1 / 6) * 100)); // 17%
  });

  it('4. completing all tasks across multiple modules updates overall counter and percentage reactively', () => {
    const tasks: TaskItem[] = [
      // Venue (2/2) -> completed
      createMockTask('v1', 'venue', 'completed'),
      createMockTask('v2', 'venue', 'completed'),

      // Catering (3/3) -> completed
      createMockTask('c1', 'catering', 'completed'),
      createMockTask('c2', 'catering', 'completed'),
      createMockTask('c3', 'catering', 'completed'),

      // Photography (2/2) -> completed
      createMockTask('p1', 'photography', 'completed'),
      createMockTask('p2', 'photography', 'completed'),

      // Decoration (0/2) -> not_started
      createMockTask('d1', 'decoration', 'todo'),
      createMockTask('d2', 'decoration', 'todo'),

      // Makeup & Attire (1/2) -> in_progress
      createMockTask('m1', 'makeup_attire', 'completed'),
      createMockTask('m2', 'makeup_attire', 'todo'),

      // Invitation (0/1) -> not_started
      createMockTask('i1', 'invitation', 'todo'),
    ];

    const all = getAllModulesProgress(tasks);
    expect(all.find((m) => m.category === 'venue')?.status).toBe('completed');
    expect(all.find((m) => m.category === 'catering')?.status).toBe('completed');
    expect(all.find((m) => m.category === 'photography')?.status).toBe('completed');
    expect(all.find((m) => m.category === 'decoration')?.status).toBe('not_started');
    expect(all.find((m) => m.category === 'makeup_attire')?.status).toBe('in_progress');
    expect(all.find((m) => m.category === 'invitation')?.status).toBe('not_started');

    // Exactly 3/6 completed
    expect(getCompletedModuleCount(tasks)).toBe(3);
    expect(getOverallModuleProgressPercentage(tasks)).toBe(50);

    const viewModel = deriveWorkspaceViewModel(initialWorkspace, tasks);
    expect(viewModel.completedCategoriesCount).toBe(3);
    expect(viewModel.totalCategoriesCount).toBe(6);
    expect(viewModel.completionPercentage).toBe(50);
  });

  it('5. uncompleting a task reverts module status reactively', () => {
    let tasks: TaskItem[] = [
      createMockTask('v1', 'venue', 'completed'),
      createMockTask('v2', 'venue', 'completed'),
    ];

    expect(getModuleStatus(tasks, 'venue')).toBe('completed');
    expect(getCompletedModuleCount(tasks)).toBe(1);

    // User unchecks v2 in Checklist
    tasks = tasks.map((t) => (t.id === 'v2' ? { ...t, status: 'todo' as const } : t));

    expect(getModuleStatus(tasks, 'venue')).toBe('in_progress');
    expect(getCompletedModuleCount(tasks)).toBe(0);

    const viewModel = deriveWorkspaceViewModel(initialWorkspace, tasks);
    expect(viewModel.completedCategoriesCount).toBe(0);
    expect(viewModel.completionPercentage).toBe(0);
  });
});
