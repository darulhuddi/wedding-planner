import { CategoryId } from './onboarding';

// Extend CategoryId with 'general' for tasks not tied to a vendor category
export type TaskCategoryId = CategoryId | 'general';

export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskSource = 'template' | 'custom';

/**
 * Central task model — shared across Checklist, Dashboard Upcoming, Timeline, NBA Engine.
 * One dataset, multiple consumers via selectors.
 */
export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  category: TaskCategoryId;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null; // YYYY-MM-DD
  estimatedMinutes: number | null;
  source: TaskSource;
  templateId: string | null; // references the template that generated this task
  vendorId?: string | null; // references canonical vendor ID if associated
  createdAt: string; // ISO
  updatedAt: string; // ISO
  completedAt: string | null; // ISO
}

/**
 * Template used to generate initial personalized tasks during workspace creation.
 */
export interface TaskTemplate {
  templateId: string;
  title: string;
  description: string | null;
  category: TaskCategoryId;
  defaultPriority: TaskPriority;
  /** Which onboarding category must be INCOMPLETE for this task to be generated */
  requiresIncompleteCategory?: CategoryId;
  /** Which onboarding category must be COMPLETE for this task to be generated */
  requiresCompleteCategory?: CategoryId;
}

/**
 * Checklist progress snapshot (derived from tasks)
 */
export interface ChecklistProgress {
  total: number;
  completed: number;
  percentage: number;
}

/**
 * Time-based grouping keys for the checklist view
 */
export type TaskTimeGroup =
  | 'overdue'
  | 'today'
  | 'this_week'
  | 'upcoming'
  | 'no_deadline'
  | 'completed';

export interface TaskGroup {
  key: TaskTimeGroup;
  label: string;
  tasks: TaskItem[];
}

export type ChecklistView = 'by_time' | 'by_category';
export type ChecklistFilter = 'all' | 'active' | 'completed';
