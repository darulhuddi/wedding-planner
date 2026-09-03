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

export interface ModuleProgress {
  category: CategoryId;
  label: string;
  totalTasks: number;
  completedTasks: number;
  status: ModuleStatus;
  progressPercentage: number;
}

export const CANONICAL_MODULE_CATEGORIES: CategoryId[] = CATEGORY_ORDER;
export const TOTAL_CANONICAL_MODULES: number = CATEGORY_ORDER.length; // 6

/**
 * Calculates module progress and status for a specific category from canonical tasks.
 */
export function getModuleProgress(tasks: TaskItem[], category: CategoryId): ModuleProgress {
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

  return {
    category,
    label,
    totalTasks,
    completedTasks,
    status,
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
export function getAllModulesProgress(tasks: TaskItem[]): ModuleProgress[] {
  return CATEGORY_ORDER.map((category) => getModuleProgress(tasks, category));
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
