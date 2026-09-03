/**
 * WedFlow Supabase Note Adapter
 *
 * Direct interface to the Supabase `public.notes` table.
 * Translates between frontend Note (camelCase) and PostgreSQL notes (snake_case).
 */

import { supabase } from '../lib/supabaseClient';
import { Note, NoteCategory } from '../types/note';

export interface SupabaseNoteRow {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export function mapRowToNote(row: SupabaseNoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category as NoteCategory,
    isPinned: Boolean(row.is_pinned),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapNoteToRow(note: Note, workspaceId: string): SupabaseNoteRow {
  return {
    id: note.id,
    workspace_id: workspaceId,
    title: note.title,
    content: note.content,
    category: note.category,
    is_pinned: note.isPinned,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
  };
}

/**
 * Fetches all notes for the given workspace, ordered by created_at.
 */
export async function fetchNotesByWorkspaceId(workspaceId: string): Promise<Note[]> {
  if (!workspaceId) return [];

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[WedFlow] Failed to fetch notes from Supabase:', error);
    throw new Error(error.message || 'Gagal mengambil catatan dari database.');
  }

  return (data || []).map(mapRowToNote);
}

/**
 * Inserts a single note into Supabase.
 */
export async function insertNote(
  workspaceId: string,
  note: Note
): Promise<Note> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk membuat catatan.');
  }

  const row = mapNoteToRow(note, workspaceId);
  const { data, error } = await supabase
    .from('notes')
    .insert(row)
    .select('*')
    .single();

  if (error) {
    console.error('[WedFlow] Failed to insert note into Supabase:', error);
    throw new Error(error.message || 'Gagal menyimpan catatan ke database.');
  }

  return mapRowToNote(data);
}

/**
 * Updates an existing note in Supabase, scoped by workspace_id.
 */
export async function updateNoteInDb(
  workspaceId: string,
  note: Note
): Promise<Note> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk memperbarui catatan.');
  }

  const row = mapNoteToRow(note, workspaceId);
  const { data, error } = await supabase
    .from('notes')
    .update(row)
    .eq('id', note.id)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single();

  if (error) {
    console.error('[WedFlow] Failed to update note in Supabase:', error);
    throw new Error(error.message || 'Gagal memperbarui catatan di database.');
  }

  return mapRowToNote(data);
}

/**
 * Deletes a note from Supabase, scoped by workspace_id.
 */
export async function deleteNoteFromDb(
  workspaceId: string,
  noteId: string
): Promise<void> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk menghapus catatan.');
  }

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[WedFlow] Failed to delete note from Supabase:', error);
    throw new Error(error.message || 'Gagal menghapus catatan dari database.');
  }
}
