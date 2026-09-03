/**
 * WedFlow Checklist Utilities
 *
 * Pure selectors, task generation, mutation helpers, and grouping functions.
 * No localStorage access — persistence is handled by workspaceRepository.
 */

import {
  TaskItem,
  TaskCategoryId,
  TaskStatus,
  TaskPriority,
  ChecklistProgress,
  TaskGroup,
  TaskTimeGroup,
} from '../types/checklist';
import { CategoryId } from '../types/onboarding';
import TASK_TEMPLATES from '../data/taskTemplates';
import { ALL_TASK_CATEGORY_IDS, CATEGORY_LABELS } from '../domain/categories';



// ─── ID Generation ──────────────────────────────────────────────────────────

export function generateTaskId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
}

// ─── Initial Task Generation ─────────────────────────────────────────────────

interface GenerateTasksInput {
  workspaceId: string;
  completedCategories: CategoryId[];
  weddingDate: string;
  daysUntilWedding: number;
}

/**
 * Generates the initial personalized task set from templates based on onboarding data.
 * Only generates tasks for categories the user has NOT completed.
 * Always generates general tasks.
 */
export function generateInitialTasks(input: GenerateTasksInput): TaskItem[] {
  const completed = new Set(input.completedCategories);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return TASK_TEMPLATES
    .filter((template) => {
      // Skip tasks that require an incomplete category the user has already completed
      if (
        template.requiresIncompleteCategory &&
        completed.has(template.requiresIncompleteCategory)
      ) {
        return false;
      }
      // Skip tasks that require a complete category the user hasn't completed
      if (
        template.requiresCompleteCategory &&
        !completed.has(template.requiresCompleteCategory)
      ) {
        return false;
      }
      return true;
    })
    .map((template, index) => {
      // Spread due dates naturally across the timeline
      const dueDateOffset = getDueDateOffset(template.category, index, input.daysUntilWedding);
      const dueDate = dueDateOffset !== null
        ? addDays(today, dueDateOffset)
        : null;

      const nowIso = new Date().toISOString();
      const task: TaskItem = {
        id: generateTaskId(),
        title: template.title,
        description: template.description,
        category: template.category,
        status: 'todo',
        priority: template.defaultPriority,
        dueDate: dueDate ? formatDateYMD(dueDate) : null,
        estimatedMinutes: null,
        source: 'template',
        templateId: template.templateId,
        eventIds: [],
        createdAt: nowIso,
        updatedAt: nowIso,
        completedAt: null,
      };
      return task;
    });
}

/** Returns days from today to assign as due date, spread across the planning horizon */
function getDueDateOffset(
  category: TaskCategoryId,
  index: number,
  daysUntilWedding: number
): number | null {
  if (daysUntilWedding <= 0) return null;

  // Spread tasks across planning window proportionally
  const categoryOffsets: Record<TaskCategoryId, number> = {
    general:       0.05,
    venue:         0.10,
    catering:      0.20,
    photography:   0.25,
    decoration:    0.35,
    makeup_attire: 0.45,
    invitation:    0.60,
    prosesi_administrasi: 0.50,
  };

  const baseRatio = categoryOffsets[category] ?? 0.3;
  const spreadRatio = baseRatio + (index * 0.01); // slight stagger per task
  const cappedRatio = Math.min(spreadRatio, 0.85); // never too close to the day
  return Math.round(daysUntilWedding * cappedRatio);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── Selectors ───────────────────────────────────────────────────────────────

export function getCompletedTasks(tasks: TaskItem[]): TaskItem[] {
  return tasks.filter((t) => t.status === 'completed');
}

export function getActiveTasks(tasks: TaskItem[]): TaskItem[] {
  return tasks.filter((t) => t.status !== 'completed');
}

export function getOverdueTasks(tasks: TaskItem[]): TaskItem[] {
  const today = getTodayStr();
  return tasks.filter(
    (t) => t.status !== 'completed' && t.dueDate !== null && t.dueDate < today
  );
}

/**
 * Returns a small sorted list of upcoming tasks for the Dashboard Upcoming card.
 * Priority: overdue → today → nearest due date → priority weight → creation order
 */
export function getUpcomingTasks(tasks: TaskItem[], limit: number = 4): TaskItem[] {
  const today = getTodayStr();
  const active = tasks.filter((t) => t.status !== 'completed');

  return active
    .sort((a, b) => {
      // Overdue first
      const aOverdue = a.dueDate && a.dueDate < today;
      const bOverdue = b.dueDate && b.dueDate < today;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Then by due date (nulls last)
      if (a.dueDate && b.dueDate) {
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      } else if (a.dueDate) return -1;
      else if (b.dueDate) return 1;

      // Then by priority
      const priorityWeight = { high: 0, medium: 1, low: 2 };
      return priorityWeight[a.priority] - priorityWeight[b.priority];
    })
    .slice(0, limit);
}

export function getTasksByCategory(tasks: TaskItem[], category: TaskCategoryId): TaskItem[] {
  return tasks.filter((t) => t.category === category);
}

export function filterTasksByCategory(tasks: TaskItem[], categoryFilter: TaskCategoryId | 'all'): TaskItem[] {
  if (categoryFilter === 'all') return tasks;
  return tasks.filter((t) => t.category === categoryFilter);
}

export function getChecklistProgress(tasks: TaskItem[]): ChecklistProgress {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, percentage };
}

// ─── Task Status Transitions ─────────────────────────────────────────────────

export function toggleTaskComplete(tasks: TaskItem[], taskId: string): TaskItem[] {
  const nowIso = new Date().toISOString();
  return tasks.map((t) => {
    if (t.id !== taskId) return t;
    if (t.status === 'completed') {
      return { ...t, status: 'todo', completedAt: null, updatedAt: nowIso };
    }
    return {
      ...t,
      status: 'completed',
      completedAt: nowIso,
      updatedAt: nowIso,
    };
  });
}

export function updateTask(tasks: TaskItem[], updated: TaskItem): TaskItem[] {
  const nowIso = new Date().toISOString();
  const taskToSave: TaskItem = { ...updated, updatedAt: nowIso };
  return tasks.map((t) => (t.id === updated.id ? taskToSave : t));
}

export function addTask(tasks: TaskItem[], newTask: TaskItem): TaskItem[] {
  const nowIso = new Date().toISOString();
  const taskToAdd: TaskItem = {
    ...newTask,
    createdAt: newTask.createdAt || nowIso,
    updatedAt: nowIso,
  };
  return [...tasks, taskToAdd];
}

export function deleteTask(tasks: TaskItem[], taskId: string): TaskItem[] {
  return tasks.filter((t) => t.id !== taskId);
}

// ─── Time-based Grouping ─────────────────────────────────────────────────────

export function groupTasksByTime(tasks: TaskItem[]): TaskGroup[] {
  const today = getTodayStr();
  const endOfWeek = getEndOfWeekStr();

  const overdue: TaskItem[] = [];
  const todayTasks: TaskItem[] = [];
  const thisWeek: TaskItem[] = [];
  const upcoming: TaskItem[] = [];
  const noDeadline: TaskItem[] = [];
  const completed: TaskItem[] = [];

  for (const task of tasks) {
    if (task.status === 'completed') {
      completed.push(task);
      continue;
    }
    if (!task.dueDate) {
      noDeadline.push(task);
      continue;
    }
    if (task.dueDate < today) {
      overdue.push(task);
    } else if (task.dueDate === today) {
      todayTasks.push(task);
    } else if (task.dueDate <= endOfWeek) {
      thisWeek.push(task);
    } else {
      upcoming.push(task);
    }
  }

  // Sort each group
  const byDuePriority = (a: TaskItem, b: TaskItem) => {
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate)
      return a.dueDate.localeCompare(b.dueDate);
    const w = { high: 0, medium: 1, low: 2 };
    return w[a.priority] - w[b.priority];
  };

  const groups: TaskGroup[] = [
    { key: 'overdue', label: 'Terlambat', tasks: overdue.sort(byDuePriority) },
    { key: 'today', label: 'Hari Ini', tasks: todayTasks.sort(byDuePriority) },
    { key: 'this_week', label: 'Minggu Ini', tasks: thisWeek.sort(byDuePriority) },
    { key: 'upcoming', label: 'Berikutnya', tasks: upcoming.sort(byDuePriority) },
    { key: 'no_deadline', label: 'Tanpa Deadline', tasks: noDeadline },
    { key: 'completed', label: 'Selesai', tasks: completed },
  ];

  // Only return groups that have tasks
  return groups.filter((g) => g.tasks.length > 0);
}

export function groupTasksByCategory(tasks: TaskItem[]): {
  category: TaskCategoryId;
  label: string;
  tasks: TaskItem[];
}[] {
  return ALL_TASK_CATEGORY_IDS
    .map((catId) => ({
      category: catId,
      label: CATEGORY_LABELS[catId],
      tasks: tasks.filter((t) => t.category === catId),
    }))
    .filter((g) => g.tasks.length > 0);
}

// ─── Date Helpers ────────────────────────────────────────────────────────────

export function getTodayStr(): string {
  const today = new Date();
  return formatDateYMD(today);
}

export function getEndOfWeekStr(): string {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const daysUntilSunday = 7 - (dayOfWeek === 0 ? 7 : dayOfWeek);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + daysUntilSunday);
  return formatDateYMD(endOfWeek);
}

/**
 * Returns human-readable Indonesian due date label.
 * e.g. "Hari ini", "Besok", "Selasa, 15 Sep", "3 hari terlambat"
 */
export function formatDueDateLabel(dueDateStr: string | null): string {
  if (!dueDateStr) return 'Tanpa deadline';
  const today = getTodayStr();
  if (dueDateStr === today) return 'Hari ini';

  const todayDate = new Date(today + 'T00:00:00');
  const dueDate = new Date(dueDateStr + 'T00:00:00');
  const diffDays = Math.round((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Besok';
  if (diffDays === -1) return '1 hari terlambat';
  if (diffDays < 0) return `${Math.abs(diffDays)} hari terlambat`;
  if (diffDays <= 7) {
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return dayNames[dueDate.getDay()];
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${dueDate.getDate()} ${months[dueDate.getMonth()]}`;
}

// ─── Category Utilities ──────────────────────────────────────────────────────

/**
 * Re-exported from domain/categories for backward compat with existing importers.
 * Import from domain/categories directly in new code.
 */
export { CATEGORY_LABELS as TASK_CATEGORY_LABELS };

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  high: 'Prioritas tinggi',
  medium: 'Prioritas sedang',
  low: 'Prioritas rendah',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'Belum selesai',
  in_progress: 'Sedang dikerjakan',
  completed: 'Selesai',
};
