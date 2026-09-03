/**
 * WedFlow Supabase Event Adapter
 *
 * Direct interface to the Supabase `public.wedding_events` table.
 * Translates between frontend WeddingEvent (camelCase) and PostgreSQL wedding_events (snake_case).
 *
 * Responsibilities:
 * - Querying, inserting, updating, and deleting wedding events scoped by workspace_id.
 * - Preserving Task ↔ Event referential integrity upon event deletion (disassociating event relation from tasks without deleting tasks).
 * - Preserving domain WeddingEvent interfaces without exposing database internals.
 */

import { supabase } from '../lib/supabaseClient';
import { WeddingEvent, EventType } from '../domain/events';

export interface SupabaseWeddingEventRow {
  id: string;
  workspace_id: string;
  type: string;
  name: string;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Maps a database snake_case row to the frontend WeddingEvent model.
 */
export function mapRowToWeddingEvent(row: SupabaseWeddingEventRow): WeddingEvent {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    type: row.type as EventType,
    name: row.name,
    date: row.date ?? null,
    startTime: row.start_time ?? null,
    endTime: row.end_time ?? null,
    location: row.location ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps a frontend WeddingEvent model to a database snake_case row payload.
 */
export function mapWeddingEventToRow(
  event: Partial<WeddingEvent>,
  workspaceId: string
): Partial<SupabaseWeddingEventRow> {
  const row: Partial<SupabaseWeddingEventRow> = {
    workspace_id: workspaceId,
  };

  if (event.type !== undefined) row.type = event.type;
  if (event.name !== undefined) row.name = event.name.trim();
  if (event.date !== undefined) row.date = event.date ?? null;
  if (event.startTime !== undefined) row.start_time = event.startTime ?? null;
  if (event.endTime !== undefined) row.end_time = event.endTime ?? null;
  if (event.location !== undefined) row.location = event.location?.trim() ?? null;
  if (event.updatedAt !== undefined) row.updated_at = event.updatedAt;

  return row;
}

/**
 * Fetches all wedding events for a workspace, ordered by date ascending.
 */
export async function fetchEventsByWorkspaceId(workspaceId: string): Promise<WeddingEvent[]> {
  if (!workspaceId) return [];

  const { data, error } = await supabase
    .from('wedding_events')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('date', { ascending: true, nullsFirst: false });

  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') {
      return [];
    }
    console.error('[WedFlow] Failed to fetch wedding events from Supabase:', error);
    throw new Error(error.message || 'Gagal mengambil data acara dari database.');
  }

  return (data || []).map(mapRowToWeddingEvent);
}

/**
 * Fetches a single event by ID, scoped to a workspace.
 */
export async function fetchEventById(
  workspaceId: string,
  eventId: string
): Promise<WeddingEvent | null> {
  if (!workspaceId || !eventId) return null;

  const { data, error } = await supabase
    .from('wedding_events')
    .select('*')
    .eq('id', eventId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') {
      return null;
    }
    console.error('[WedFlow] Failed to fetch wedding event by ID:', error);
    throw new Error(error.message || 'Gagal mengambil data acara dari database.');
  }

  if (!data) return null;
  return mapRowToWeddingEvent(data as SupabaseWeddingEventRow);
}

/**
 * Inserts a new wedding event for a workspace.
 */
export async function insertWeddingEvent(
  workspaceId: string,
  eventData: Omit<WeddingEvent, 'id' | 'createdAt' | 'updatedAt' | 'workspaceId'>
): Promise<WeddingEvent> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk membuat acara.');
  }

  const now = new Date().toISOString();
  const payload = {
    workspace_id: workspaceId,
    type: eventData.type,
    name: eventData.name.trim(),
    date: eventData.date || null,
    start_time: eventData.startTime || null,
    end_time: eventData.endTime || null,
    location: eventData.location ? eventData.location.trim() : null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('wedding_events')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('[WedFlow] Failed to insert wedding event into Supabase:', error);
    throw new Error(error.message || 'Gagal menyimpan acara ke database.');
  }

  return mapRowToWeddingEvent(data as SupabaseWeddingEventRow);
}

/**
 * Updates an existing wedding event in Supabase, scoped by workspace_id.
 */
export async function updateWeddingEventInDb(
  workspaceId: string,
  eventId: string,
  changes: Partial<WeddingEvent>
): Promise<WeddingEvent> {
  if (!workspaceId || !eventId) {
    throw new Error('Workspace ID dan Event ID diperlukan untuk memperbarui acara.');
  }

  const payload = mapWeddingEventToRow(
    { ...changes, updatedAt: new Date().toISOString() },
    workspaceId
  );

  const { data, error } = await supabase
    .from('wedding_events')
    .update(payload)
    .eq('id', eventId)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single();

  if (error) {
    console.error('[WedFlow] Failed to update wedding event in Supabase:', error);
    throw new Error(error.message || 'Gagal memperbarui acara di database.');
  }

  return mapRowToWeddingEvent(data as SupabaseWeddingEventRow);
}

/**
 * Deletes a wedding event from Supabase, scoped by workspace_id.
 */
export async function deleteWeddingEventFromDb(
  workspaceId: string,
  eventId: string
): Promise<void> {
  if (!workspaceId || !eventId) {
    throw new Error('Workspace ID dan Event ID diperlukan untuk menghapus acara.');
  }

  const { error } = await supabase
    .from('wedding_events')
    .delete()
    .eq('id', eventId)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[WedFlow] Failed to delete wedding event from Supabase:', error);
    throw new Error(error.message || 'Gagal menghapus acara dari database.');
  }
}
