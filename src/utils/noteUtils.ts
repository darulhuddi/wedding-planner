/**
 * WedFlow Note Pure Utilities (Catatan v1)
 *
 * Pure domain utilities for Note operations, filtering, sorting, and validation.
 *
 * Boundaries:
 * - Completely isolated from Task, Vendor, Budget, Guest, Timeline, NBA.
 * - No side effects or direct storage calls.
 */

import { Note, NoteCategory } from '../types/note';

export interface CreateNoteInput {
  title: string;
  content: string;
  category?: NoteCategory;
  isPinned?: boolean;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  category?: NoteCategory;
  isPinned?: boolean;
}

/**
 * Validates that a string is non-empty after trimming.
 */
export function isValidNoteString(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  return val.trim().length > 0;
}

/**
 * Generates a unique note ID.
 */
function generateNoteId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Creates a new Note record with default values:
 * - category: 'general'
 * - isPinned: false
 * - title & content: trimmed, required
 */
export function createNote(
  existingNotes: Note[],
  input: CreateNoteInput
): { updatedNotes: Note[]; newNote: Note } {
  const trimmedTitle = (input.title ?? '').trim();
  const trimmedContent = (input.content ?? '').trim();

  if (!trimmedTitle) {
    throw new Error('Title is required');
  }

  if (!trimmedContent) {
    throw new Error('Content is required');
  }

  const now = new Date().toISOString();

  const newNote: Note = {
    id: generateNoteId(),
    title: trimmedTitle,
    content: trimmedContent,
    category: input.category ?? 'general',
    isPinned: input.isPinned ?? false,
    createdAt: now,
    updatedAt: now,
  };

  const updatedNotes = sortNotes([newNote, ...existingNotes]);

  return {
    updatedNotes,
    newNote,
  };
}

/**
 * Updates an existing Note by ID.
 * Updates updatedAt timestamp.
 */
export function updateNote(
  existingNotes: Note[],
  noteId: string,
  input: UpdateNoteInput
): Note[] {
  const now = new Date().toISOString();

  const updated = existingNotes.map((note) => {
    if (note.id !== noteId) return note;

    let nextTitle = note.title;
    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (!trimmed) {
        throw new Error('Title cannot be empty');
      }
      nextTitle = trimmed;
    }

    let nextContent = note.content;
    if (input.content !== undefined) {
      const trimmed = input.content.trim();
      if (!trimmed) {
        throw new Error('Content cannot be empty');
      }
      nextContent = trimmed;
    }

    return {
      ...note,
      title: nextTitle,
      content: nextContent,
      category: input.category ?? note.category,
      isPinned: input.isPinned !== undefined ? input.isPinned : note.isPinned,
      updatedAt: now,
    };
  });

  return sortNotes(updated);
}

/**
 * Deletes a Note by ID.
 */
export function deleteNote(
  existingNotes: Note[],
  noteId: string
): { updatedNotes: Note[] } {
  return {
    updatedNotes: existingNotes.filter((n) => n.id !== noteId),
  };
}

/**
 * Toggles the pinned status of a Note.
 */
export function togglePinNote(existingNotes: Note[], noteId: string): Note[] {
  const note = existingNotes.find((n) => n.id === noteId);
  if (!note) return existingNotes;

  return updateNote(existingNotes, noteId, { isPinned: !note.isPinned });
}

/**
 * Filters notes based on query (title & content, case-insensitive, trimmed) and category.
 */
export function filterNotes(
  notes: Note[],
  query: string,
  categoryFilter: NoteCategory | 'all' = 'all'
): Note[] {
  const q = query.trim().toLowerCase();

  return notes.filter((note) => {
    // Category filter
    if (categoryFilter !== 'all' && note.category !== categoryFilter) {
      return false;
    }

    // Search query (title & content)
    if (q) {
      const matchTitle = note.title.toLowerCase().includes(q);
      const matchContent = note.content.toLowerCase().includes(q);
      if (!matchTitle && !matchContent) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sorts notes:
 * 1. Pinned notes first (`isPinned: true` before `false`)
 * 2. Within each group, most recently updated first (descending `updatedAt`, fallback `createdAt`)
 */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    // 1. Pinned priority
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // 2. Updated date descending
    const timeA = new Date(a.updatedAt || a.createdAt).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt).getTime();

    if (timeB !== timeA) {
      return timeB - timeA;
    }

    // 3. Fallback createdAt
    const createdA = new Date(a.createdAt).getTime();
    const createdB = new Date(b.createdAt).getTime();
    return createdB - createdA;
  });
}

/**
 * Formats an ISO date string into a calm editorial Indonesian date format.
 * Example: "12 Okt 2026"
 */
export function formatNoteDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}
