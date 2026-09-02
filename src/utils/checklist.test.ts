import {
  generateInitialTasks,
  toggleTaskComplete,
  getChecklistProgress,
  groupTasksByTime,
  groupTasksByCategory,
  filterTasksByCategory,
  getUpcomingTasks,
  addTask,
  updateTask,
  deleteTask,
  getTodayStr,
} from './checklistUtils';
import { TaskItem, TaskCategoryId } from '../types/checklist';

export function runChecklistUnitTests() {
  console.log('=== WEDFLOW CHECKLIST V1 UNIT & SYSTEM TESTS ===');

  // 1. Initial Task Generation
  const initialTasks = generateInitialTasks({
    workspaceId: 'test-workspace-1',
    completedCategories: ['venue'], // Venue completed, so venue template tasks should be excluded
    weddingDate: '2026-10-01',
    daysUntilWedding: 60,
  });

  console.log(`Test 1 — Task Generation: Generated ${initialTasks.length} tasks.`);
  if (initialTasks.length === 0) throw new Error('Initial task generation returned 0 tasks!');

  // Verify venue task is excluded since 'venue' is in completedCategories
  const venueTask = initialTasks.find((t) => t.category === 'venue');
  if (venueTask) throw new Error('Venue task should not be generated when venue is completed!');
  console.log('  ✓ Initial tasks correctly exclude completed categories.');

  // Verify canonical fields exist
  const first = initialTasks[0];
  if (!first.id || !first.createdAt || !first.updatedAt || first.status !== 'todo') {
    throw new Error('TaskItem missing canonical fields!');
  }
  console.log('  ✓ Canonical TaskItem fields verified (id, createdAt, updatedAt, status).');

  // 2. Task Progress Calculation
  const initialProgress = getChecklistProgress(initialTasks);
  console.log(`Test 2 — Progress: Total=${initialProgress.total}, Completed=${initialProgress.completed}, ${initialProgress.percentage}%`);
  if (initialProgress.completed !== 0 || initialProgress.percentage !== 0) {
    throw new Error('Initial completed count/percentage should be 0!');
  }
  console.log('  ✓ Initial progress derived calculation verified.');

  // 3. Task Completion & Uncompletion
  const toggledOnce = toggleTaskComplete(initialTasks, first.id);
  const completedTask = toggledOnce.find((t) => t.id === first.id)!;

  if (completedTask.status !== 'completed' || !completedTask.completedAt || !completedTask.updatedAt) {
    throw new Error('Toggle complete failed to set status, completedAt, or updatedAt!');
  }
  console.log('  ✓ Toggle complete sets status="completed", completedAt, and updatedAt.');

  const progressAfterToggle = getChecklistProgress(toggledOnce);
  if (progressAfterToggle.completed !== 1) {
    throw new Error('Progress failed to update after task completion!');
  }
  console.log(`  ✓ Progress updated after completion: ${progressAfterToggle.completed}/${progressAfterToggle.total} (${progressAfterToggle.percentage}%).`);

  const toggledBack = toggleTaskComplete(toggledOnce, first.id);
  const uncompletedTask = toggledBack.find((t) => t.id === first.id)!;
  if (uncompletedTask.status !== 'todo' || uncompletedTask.completedAt !== null) {
    throw new Error('Toggle uncomplete failed to reset status or completedAt!');
  }
  console.log('  ✓ Toggle uncomplete resets status="todo" and completedAt=null.');

  // 4. Category Filtering (categoryFilter: TaskCategoryId | 'all')
  const cateringFiltered = filterTasksByCategory(initialTasks, 'catering');
  const allFiltered = filterTasksByCategory(initialTasks, 'all');

  if (allFiltered.length !== initialTasks.length) {
    throw new Error('filterTasksByCategory with "all" should return all tasks!');
  }
  cateringFiltered.forEach((t) => {
    if (t.category !== 'catering') throw new Error('Filter returned non-catering task!');
  });
  console.log(`  ✓ Category filtering verified (Catering count: ${cateringFiltered.length}).`);

  // 5. Time-based & Category-based Grouping
  const timeGroups = groupTasksByTime(initialTasks);
  const categoryGroups = groupTasksByCategory(initialTasks);
  if (timeGroups.length === 0 || categoryGroups.length === 0) {
    throw new Error('Grouping returned empty results!');
  }
  console.log(`  ✓ Time-based groups: ${timeGroups.map((g) => g.label).join(', ')}.`);
  console.log(`  ✓ Category-based groups: ${categoryGroups.map((g) => g.label).join(', ')}.`);

  // 6. Overdue Handling
  const overdueTask: TaskItem = {
    id: 'overdue-1',
    title: 'Overdue Test Task',
    description: null,
    category: 'general',
    status: 'todo',
    priority: 'high',
    dueDate: '2020-01-01', // Date in the past
    estimatedMinutes: 30,
    source: 'custom',
    templateId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };
  const tasksWithOverdue = addTask(initialTasks, overdueTask);
  const groupsWithOverdue = groupTasksByTime(tasksWithOverdue);
  const overdueGroup = groupsWithOverdue.find((g) => g.key === 'overdue');
  if (!overdueGroup || overdueGroup.tasks.length !== 1) {
    throw new Error('Overdue task not correctly grouped under "overdue"!');
  }
  console.log('  ✓ Overdue task correctly detected and grouped.');

  // 7. Custom Task CRUD
  const newTask: TaskItem = {
    id: 'custom-task-100',
    title: 'Amankan Souvenir Pernikahan',
    description: 'Beli 500 pcs souvenir khas',
    category: 'invitation',
    status: 'todo',
    priority: 'medium',
    dueDate: '2026-09-15',
    estimatedMinutes: 45,
    source: 'custom',
    templateId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
  };

  const tasksWithCustom = addTask(initialTasks, newTask);
  if (!tasksWithCustom.some((t) => t.id === 'custom-task-100')) {
    throw new Error('addTask failed to insert custom task!');
  }
  console.log('  ✓ Custom task creation verified.');

  const updatedCustom: TaskItem = {
    ...newTask,
    title: 'Amankan Souvenir Premium Pernikahan',
    priority: 'high',
  };
  const tasksAfterUpdate = updateTask(tasksWithCustom, updatedCustom);
  const foundUpdated = tasksAfterUpdate.find((t) => t.id === 'custom-task-100');
  if (foundUpdated?.title !== 'Amankan Souvenir Premium Pernikahan' || foundUpdated?.priority !== 'high') {
    throw new Error('updateTask failed to update custom task!');
  }
  console.log('  ✓ Custom task editing verified.');

  const tasksAfterDelete = deleteTask(tasksAfterUpdate, 'custom-task-100');
  if (tasksAfterDelete.some((t) => t.id === 'custom-task-100')) {
    throw new Error('deleteTask failed to remove task!');
  }
  console.log('  ✓ Custom task deletion verified.');

  // 8. Upcoming Tasks Selector for Dashboard
  const upcoming = getUpcomingTasks(tasksWithOverdue, 4);
  if (upcoming.length > 4) {
    throw new Error('getUpcomingTasks returned more than limit!');
  }
  if (upcoming[0].id !== 'overdue-1') {
    throw new Error('Overdue task should be ranked #1 in upcoming tasks!');
  }
  console.log('  ✓ Dashboard Upcoming Tasks selector ranking verified (Overdue ranked #1).');

  console.log('\nAll Checklist v1 Unit & System Tests Passed Successfully! 🎉');
  return true;
}

import { describe, it } from 'vitest';

describe('Checklist v1 System Tests', () => {
  it('runs all checklist unit & system assertions successfully', () => {
    runChecklistUnitTests();
  });
});
