/**
 * WedFlow Module Status Selectors
 *
 * Pure selectors for deriving module-level progress and completion status
 * solely from the canonical TaskItem[] store.
 *
 * Rules:
 * - totalTasks === 0 || completedTasks === 0 -> 'not_started'
 * - completedTasks > 0 && completedTasks < totalTasks -> 'in_progress'
 * - completedTasks === totalTasks && totalTasks > 0 -> 'completed'
 * - Only task.status === 'completed' is counted as completed.
 */

import { TaskItem } from '../types/checklist';
import { CategoryId } from '../types/onboarding';
import { CATEGORY_ORDER, CATEGORY_TAXONOMY } from './categories';

export type ModuleStatus = 'not_started' | 'in_progress' | 'completed';
export type ModuleSemanticStatus = 'selesai' | 'berjalan' | 'prioritas' | 'perlu_perhatian' | 'belum_mulai';

export interface ModuleProgress {
  category: CategoryId;
  label: string;
  totalTasks: number;
  completedTasks: number;
  status: ModuleStatus;
  semanticStatus: ModuleSemanticStatus;
  semanticStatusLabel: string;
  progressPercentage: number;
}

export const CANONICAL_MODULE_CATEGORIES: CategoryId[] = CATEGORY_ORDER;
export const TOTAL_CANONICAL_MODULES: number = CATEGORY_ORDER.length; // 6

/**
 * Derives semantic status for a module based on completion, urgency, and priority.
 *
 * IMPORTANT: Only the module that directly corresponds to the current recommended
 * next action (isPriorityCategory === true) receives 'prioritas'.
 * Incomplete modules with urgent/high-priority tasks receive 'perlu_perhatian'.
 * Incomplete modules with ongoing tasks receive 'berjalan'.
 * Finished modules receive 'selesai'.
 */
export function getModuleSemanticStatus(
  categoryTasks: TaskItem[],
  status: ModuleStatus,
  isPriorityCategory: boolean = false
): { semanticStatus: ModuleSemanticStatus; semanticStatusLabel: string } {
  if (status === 'completed') {
    return { semanticStatus: 'selesai', semanticStatusLabel: 'Selesai' };
  }

  if (categoryTasks.length === 0) {
    return { semanticStatus: 'belum_mulai', semanticStatusLabel: 'Belum mulai' };
  }

  const activeTasks = categoryTasks.filter((t) => t.status !== 'completed');
  if (activeTasks.length === 0) {
    return { semanticStatus: 'selesai', semanticStatusLabel: 'Selesai' };
  }

  // 1. Only the recommended action category receives 'prioritas'
  if (isPriorityCategory) {
    return { semanticStatus: 'prioritas', semanticStatusLabel: 'Prioritas' };
  }

  // 2. Urgent, overdue, or high-priority tasks in other modules receive 'perlu_perhatian'
  const today = new Date().toISOString().split('T')[0];
  const hasOverdueOrUrgent = activeTasks.some((t) => {
    if (!t.dueDate) return false;
    return t.dueDate <= today;
  });

  const hasHighPriority = activeTasks.some((t) => t.priority === 'high');

  if (hasOverdueOrUrgent || hasHighPriority) {
    return { semanticStatus: 'perlu_perhatian', semanticStatusLabel: 'Perlu perhatian' };
  }

  // 3. Normal in-progress tasks receive 'berjalan'
  return { semanticStatus: 'berjalan', semanticStatusLabel: 'Berjalan' };
}

/**
 * Calculates module progress and status for a specific category from canonical tasks.
 */
export function getModuleProgress(
  tasks: TaskItem[],
  category: CategoryId,
  priorityCategory?: CategoryId | null
): ModuleProgress {
  const categoryTasks = (tasks || []).filter((task) => task.category === category);
  const totalTasks = categoryTasks.length;
  const completedTasks = categoryTasks.filter((task) => task.status === 'completed').length;

  let status: ModuleStatus = 'not_started';
  if (totalTasks > 0) {
    if (completedTasks === 0) {
      status = 'not_started';
    } else if (completedTasks === totalTasks) {
      status = 'completed';
    } else {
      status = 'in_progress';
    }
  }

  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const label = CATEGORY_TAXONOMY[category]?.label || category;

  const { semanticStatus, semanticStatusLabel } = getModuleSemanticStatus(
    categoryTasks,
    status,
    priorityCategory === category
  );

  return {
    category,
    label,
    totalTasks,
    completedTasks,
    status,
    semanticStatus,
    semanticStatusLabel,
    progressPercentage,
  };
}

/**
 * Derives module status ('not_started' | 'in_progress' | 'completed') for a category.
 */
export function getModuleStatus(tasks: TaskItem[], category: CategoryId): ModuleStatus {
  return getModuleProgress(tasks, category).status;
}

/**
 * Calculates progress for all 6 canonical modules in fixed taxonomy order.
 */
export function getAllModulesProgress(
  tasks: TaskItem[],
  priorityCategory?: CategoryId | null
): ModuleProgress[] {
  return CATEGORY_ORDER.map((category) => getModuleProgress(tasks, category, priorityCategory));
}

/**
 * Counts how many of the 6 canonical modules are fully 'completed'.
 */
export function getCompletedModuleCount(tasks: TaskItem[]): number {
  return getAllModulesProgress(tasks).filter((m) => m.status === 'completed').length;
}

/**
 * Returns total count of canonical modules (6).
 */
export function getTotalModuleCount(): number {
  return TOTAL_CANONICAL_MODULES;
}

/**
 * Calculates overall module completion percentage (0 - 100%).
 */
export function getOverallModuleProgressPercentage(tasks: TaskItem[]): number {
  const completed = getCompletedModuleCount(tasks);
  return Math.round((completed / TOTAL_CANONICAL_MODULES) * 100);
}
