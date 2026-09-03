/**
 * WedFlow Supabase Task Adapter
 *
 * Direct interface to the Supabase `public.tasks` table.
 * Translates between frontend TaskItem (camelCase) and PostgreSQL tasks (snake_case).
 *
 * Responsibilities:
 * - Querying, inserting, updating, and deleting tasks scoped by workspace_id.
 * - Preserving Task ↔ Vendor relationships (vendorId ↔ vendor_id).
 * - Preserving Task ↔ Event relationships (eventIds ↔ event_ids).
 * - Preserving domain TaskItem interfaces without exposing database internals.
 */

import { supabase } from '../lib/supabaseClient';
import {
  TaskItem,
  TaskCategoryId,
  TaskStatus,
  TaskPriority,
  TaskSource,
} from '../types/checklist';

export interface SupabaseTaskRow {
  id: string;
  workspace_id: string;
  vendor_id: string | null;
  template_id: string | null;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string;
  due_date: string | null;
  estimated_minutes: number | null;
  source: string;
  event_ids?: string[] | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Maps a database snake_case row to the frontend TaskItem model.
 */
export function mapRowToTaskItem(row: SupabaseTaskRow): TaskItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    category: row.category as TaskCategoryId,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    dueDate: row.due_date ?? null,
    estimatedMinutes: row.estimated_minutes ?? null,
    source: row.source as TaskSource,
    templateId: row.template_id ?? null,
    vendorId: row.vendor_id ?? null,
    eventIds: Array.isArray(row.event_ids) ? row.event_ids : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? null,
  };
}

/**
 * Maps a frontend TaskItem model to a database snake_case row payload.
 */
export function mapTaskItemToRow(
  task: TaskItem,
  workspaceId: string
): SupabaseTaskRow {
  return {
    id: task.id,
    workspace_id: workspaceId,
    vendor_id: task.vendorId ?? null,
    template_id: task.templateId ?? null,
    title: task.title,
    description: task.description ?? null,
    category: task.category,
    status: task.status,
    priority: task.priority,
    due_date: task.dueDate ?? null,
    estimated_minutes: task.estimatedMinutes ?? null,
    source: task.source,
    event_ids: Array.isArray(task.eventIds) ? task.eventIds : [],
    completed_at: task.completedAt ?? null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
}

/**
 * Fetches all tasks for the given workspace, ordered by created_at.
 */
export async function fetchTasksByWorkspaceId(workspaceId: string): Promise<TaskItem[]> {
  if (!workspaceId) return [];

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[WedFlow] Failed to fetch tasks from Supabase:', error);
    throw new Error(error.message || 'Gagal mengambil data tugas dari database.');
  }

  return (data || []).map(mapRowToTaskItem);
}

/**
 * Inserts a single new task into Supabase.
 */
export async function insertTask(
  workspaceId: string,
  task: TaskItem
): Promise<TaskItem> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk membuat tugas.');
  }

  const row = mapTaskItemToRow(task, workspaceId);
  let { data, error } = await supabase
    .from('tasks')
    .insert(row)
    .select('*')
    .single();

  if (error && (error.code === 'PGRST204' || error.code === '42703')) {
    const { event_ids, ...baseRow } = row;
    const retry = await supabase
      .from('tasks')
      .insert(baseRow)
      .select('*')
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('[WedFlow] Failed to insert task into Supabase:', error);
    throw new Error(error.message || 'Gagal menyimpan tugas ke database.');
  }

  return mapRowToTaskItem(data);
}

/**
 * Updates an existing task in Supabase, scoped by workspace_id.
 */
export async function updateTaskInDb(
  workspaceId: string,
  task: TaskItem
): Promise<TaskItem> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk memperbarui tugas.');
  }

  const row = mapTaskItemToRow(task, workspaceId);
  let { data, error } = await supabase
    .from('tasks')
    .update(row)
    .eq('id', task.id)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single();

  if (error && (error.code === 'PGRST204' || error.code === '42703')) {
    const { event_ids, ...baseRow } = row;
    const retry = await supabase
      .from('tasks')
      .update(baseRow)
      .eq('id', task.id)
      .eq('workspace_id', workspaceId)
      .select('*')
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('[WedFlow] Failed to update task in Supabase:', error);
    throw new Error(error.message || 'Gagal memperbarui tugas di database.');
  }

  return mapRowToTaskItem(data);
}

/**
 * Deletes a task from Supabase, scoped by workspace_id.
 */
export async function deleteTaskFromDb(
  workspaceId: string,
  taskId: string
): Promise<void> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk menghapus tugas.');
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[WedFlow] Failed to delete task from Supabase:', error);
    throw new Error(error.message || 'Gagal menghapus tugas dari database.');
  }
}

/**
 * Inserts multiple tasks at once into Supabase (used during onboarding initial task generation).
 */
export async function bulkInsertTasks(
  workspaceId: string,
  tasks: TaskItem[]
): Promise<TaskItem[]> {
  if (!workspaceId || tasks.length === 0) return [];

  const rows = tasks.map((t) => mapTaskItemToRow(t, workspaceId));
  let { data, error } = await supabase
    .from('tasks')
    .insert(rows)
    .select('*');

  if (error && (error.code === 'PGRST204' || error.code === '42703')) {
    const baseRows = rows.map(({ event_ids, ...rest }) => rest);
    const retry = await supabase
      .from('tasks')
      .insert(baseRows)
      .select('*');
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('[WedFlow] Failed to bulk insert tasks into Supabase:', error);
    throw new Error(error.message || 'Gagal membuat daftar tugas awal di database.');
  }

  return (data || []).map(mapRowToTaskItem);
}
