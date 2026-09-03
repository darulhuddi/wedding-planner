/**
 * WedFlow Workspace Repository
 *
 * The single canonical public interface for all workspace, task, vendor, budget,
 * guest, note, and onboarding draft persistence.
 *
 * Application code (App.tsx, OnboardingFlow, modules, etc.) imports from here.
 * UI components must never import adapters or Supabase directly.
 *
 * Unified Architecture:
 *   UI / App
 *     ↓
 *   workspaceRepository  ← import from here
 *     ↓
 *   Supabase Adapters (Workspace, Tasks, Vendors, Budget, Guests, Notes)
 */

import { StoredWorkspace } from '../types/workspace';
import { OnboardingData } from '../types/onboarding';
import { TaskItem } from '../types/checklist';
import { StoredBudget, BudgetAllocation, BudgetExpense } from '../types/budget';
import { Vendor } from '../types/vendor';
import { Guest } from '../types/guest';
import { Note } from '../types/note';
import { WeddingEvent } from '../domain/events';

import {
  fetchWorkspaceByUserId,
  insertWorkspace,
  updateWorkspace as updateSupabaseWorkspace,
} from './supabaseWorkspaceAdapter';

import {
  fetchEventsByWorkspaceId,
  fetchEventById,
  insertWeddingEvent,
  updateWeddingEventInDb,
  deleteWeddingEventFromDb,
} from './supabaseEventAdapter';

import {
  fetchTasksByWorkspaceId,
  insertTask as insertSupabaseTask,
  updateTaskInDb as updateSupabaseTask,
  deleteTaskFromDb as deleteSupabaseTask,
  bulkInsertTasks as bulkInsertSupabaseTasks,
} from './supabaseTaskAdapter';

import {
  fetchVendorsByWorkspaceId,
  insertVendor as insertSupabaseVendor,
  updateVendorInDb as updateSupabaseVendor,
  deleteVendorFromDb as deleteSupabaseVendor,
} from './supabaseVendorAdapter';

import {
  fetchBudgetByWorkspaceId,
  upsertBudgetAllocation as upsertSupabaseBudgetAllocation,
  insertBudgetExpense as insertSupabaseBudgetExpense,
  updateBudgetExpense as updateSupabaseBudgetExpense,
  deleteBudgetExpense as deleteSupabaseBudgetExpense,
  saveBudgetToDb as saveSupabaseBudget,
} from './supabaseBudgetAdapter';

import {
  fetchGuestsByWorkspaceId,
  insertGuest as insertSupabaseGuest,
  updateGuestInDb as updateSupabaseGuest,
  deleteGuestFromDb as deleteSupabaseGuest,
} from './supabaseGuestAdapter';

import {
  fetchNotesByWorkspaceId,
  insertNote as insertSupabaseNote,
  updateNoteInDb as updateSupabaseNote,
  deleteNoteFromDb as deleteSupabaseNote,
} from './supabaseNoteAdapter';

import {
  readOnboardingDraft,
  writeOnboardingDraft,
  removeOnboardingDraft,
} from './localStorageAdapter';

// ─── Workspace (Supabase Persistence) ────────────────────────────────────────

/** Returns the stored workspace for the authenticated user from Supabase. */
export async function getWorkspace(userId?: string): Promise<StoredWorkspace | null> {
  if (!userId) {
    return null;
  }
  return fetchWorkspaceByUserId(userId);
}

/** Creates and persists a new workspace in Supabase for the authenticated user. */
export async function createWorkspace(
  data: Omit<StoredWorkspace, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
  userId: string
): Promise<StoredWorkspace> {
  return insertWorkspace(data, userId);
}

/** Persists changes to an existing workspace in Supabase. */
export async function saveWorkspace(workspace: StoredWorkspace): Promise<StoredWorkspace> {
  return updateSupabaseWorkspace(workspace);
}

// ─── Tasks (Supabase Persistence) ───────────────────────────────────────────

/** Returns all tasks for the given workspace ID from Supabase. */
export async function getTasks(workspaceId: string): Promise<TaskItem[]> {
  return fetchTasksByWorkspaceId(workspaceId);
}

/** Creates and persists a single task in Supabase. */
export async function createTask(workspaceId: string, task: TaskItem): Promise<TaskItem> {
  return insertSupabaseTask(workspaceId, task);
}

/** Updates an existing task in Supabase. */
export async function updateTask(workspaceId: string, task: TaskItem): Promise<TaskItem> {
  return updateSupabaseTask(workspaceId, task);
}

/** Deletes a task from Supabase. */
export async function deleteTask(workspaceId: string, taskId: string): Promise<void> {
  return deleteSupabaseTask(workspaceId, taskId);
}

/** Bulk inserts a list of tasks into Supabase (e.g. initial onboarding tasks). */
export async function bulkCreateTasks(
  workspaceId: string,
  tasks: TaskItem[]
): Promise<TaskItem[]> {
  return bulkInsertSupabaseTasks(workspaceId, tasks);
}

// ─── Vendors (Supabase Persistence) ─────────────────────────────────────────

/** Returns all vendors for the given workspace ID from Supabase. */
export async function getVendors(workspaceId: string): Promise<Vendor[]> {
  return fetchVendorsByWorkspaceId(workspaceId);
}

/** Creates and persists a single vendor in Supabase. */
export async function createVendor(workspaceId: string, vendor: Vendor): Promise<Vendor> {
  return insertSupabaseVendor(workspaceId, vendor);
}

/** Updates an existing vendor in Supabase. */
export async function updateVendor(workspaceId: string, vendor: Vendor): Promise<Vendor> {
  return updateSupabaseVendor(workspaceId, vendor);
}

/** Deletes a vendor from Supabase and disassociates linked tasks. */
export async function deleteVendor(workspaceId: string, vendorId: string): Promise<void> {
  return deleteSupabaseVendor(workspaceId, vendorId);
}

/** Persists vendors for the given workspace ID. */
export async function saveVendors(workspaceId: string, vendors: Vendor[]): Promise<Vendor[]> {
  if (!workspaceId) return [];
  for (const v of vendors) {
    await insertSupabaseVendor(workspaceId, v).catch(() => updateSupabaseVendor(workspaceId, v));
  }
  return fetchVendorsByWorkspaceId(workspaceId);
}

// ─── Budgets (Supabase Persistence) ─────────────────────────────────────────

/** Returns the budget (allocations & expenses) for the given workspace ID from Supabase. */
export async function getBudget(workspaceId: string): Promise<StoredBudget> {
  return fetchBudgetByWorkspaceId(workspaceId);
}

/** Upserts a budget allocation in Supabase. */
export async function saveBudgetAllocation(
  workspaceId: string,
  allocation: BudgetAllocation
): Promise<BudgetAllocation> {
  return upsertSupabaseBudgetAllocation(workspaceId, allocation);
}

/** Creates a budget expense in Supabase. */
export async function createBudgetExpense(
  workspaceId: string,
  expense: BudgetExpense
): Promise<BudgetExpense> {
  return insertSupabaseBudgetExpense(workspaceId, expense);
}

/** Updates an existing budget expense in Supabase. */
export async function updateBudgetExpense(
  workspaceId: string,
  expense: BudgetExpense
): Promise<BudgetExpense> {
  return updateSupabaseBudgetExpense(workspaceId, expense);
}

/** Deletes a budget expense from Supabase. */
export async function deleteBudgetExpense(
  workspaceId: string,
  expenseId: string
): Promise<void> {
  return deleteSupabaseBudgetExpense(workspaceId, expenseId);
}

/** Persists the entire budget state to Supabase. */
export async function saveBudget(
  workspaceId: string,
  budget: StoredBudget
): Promise<StoredBudget> {
  return saveSupabaseBudget(workspaceId, budget);
}

// ─── Guests (Supabase Persistence) ──────────────────────────────────────────

/** Returns all guests for the given workspace ID from Supabase. */
export async function getGuests(workspaceId: string): Promise<Guest[]> {
  return fetchGuestsByWorkspaceId(workspaceId);
}

/** Creates a guest in Supabase. */
export async function createGuest(workspaceId: string, guest: Guest): Promise<Guest> {
  return insertSupabaseGuest(workspaceId, guest);
}

/** Updates an existing guest in Supabase. */
export async function updateGuest(workspaceId: string, guest: Guest): Promise<Guest> {
  return updateSupabaseGuest(workspaceId, guest);
}

/** Deletes a guest from Supabase. */
export async function deleteGuest(workspaceId: string, guestId: string): Promise<void> {
  return deleteSupabaseGuest(workspaceId, guestId);
}

/** Persists guests for the given workspace ID. */
export async function saveGuests(workspaceId: string, guests: Guest[]): Promise<Guest[]> {
  if (!workspaceId) return [];
  for (const g of guests) {
    await insertSupabaseGuest(workspaceId, g).catch(() => updateSupabaseGuest(workspaceId, g));
  }
  return fetchGuestsByWorkspaceId(workspaceId);
}

// ─── Notes (Supabase Persistence) ───────────────────────────────────────────

/** Returns all notes for the given workspace ID from Supabase. */
export async function getNotes(workspaceId: string): Promise<Note[]> {
  return fetchNotesByWorkspaceId(workspaceId);
}

/** Creates a note in Supabase. */
export async function createNote(workspaceId: string, note: Note): Promise<Note> {
  return insertSupabaseNote(workspaceId, note);
}

/** Updates an existing note in Supabase. */
export async function updateNote(workspaceId: string, note: Note): Promise<Note> {
  return updateSupabaseNote(workspaceId, note);
}

/** Deletes a note from Supabase. */
export async function deleteNote(workspaceId: string, noteId: string): Promise<void> {
  return deleteSupabaseNote(workspaceId, noteId);
}

/** Persists notes for the given workspace ID. */
export async function saveNotes(workspaceId: string, notes: Note[]): Promise<Note[]> {
  if (!workspaceId) return [];
  for (const n of notes) {
    await insertSupabaseNote(workspaceId, n).catch(() => updateSupabaseNote(workspaceId, n));
  }
  return fetchNotesByWorkspaceId(workspaceId);
}

// ─── Wedding Events (Supabase Persistence) ──────────────────────────────────
 
/** Returns all wedding events for the given workspace ID from Supabase. */
export async function getEvents(workspaceId: string): Promise<WeddingEvent[]> {
  return fetchEventsByWorkspaceId(workspaceId);
}

/** Returns a single wedding event by ID scoped to workspace from Supabase. */
export async function getEvent(workspaceId: string, eventId: string): Promise<WeddingEvent | null> {
  return fetchEventById(workspaceId, eventId);
}

/** Creates and persists a wedding event in Supabase. */
export async function createEvent(
  workspaceId: string,
  event: Omit<WeddingEvent, 'id' | 'createdAt' | 'updatedAt' | 'workspaceId'>
): Promise<WeddingEvent> {
  return insertWeddingEvent(workspaceId, event);
}

/** Updates an existing wedding event in Supabase. */
export async function updateEvent(
  workspaceId: string,
  eventId: string,
  changes: Partial<WeddingEvent>
): Promise<WeddingEvent> {
  return updateWeddingEventInDb(workspaceId, eventId, changes);
}

/**
 * Removes an eventId from all tasks referencing it in the workspace without deleting any task.
 * If task cleanup fails, throws an error.
 */
export async function removeEventIdFromTasks(
  workspaceId: string,
  eventId: string
): Promise<void> {
  if (!workspaceId || !eventId) return;

  const tasks = await fetchTasksByWorkspaceId(workspaceId);
  const referencingTasks = tasks.filter(
    (t) => Array.isArray(t.eventIds) && t.eventIds.includes(eventId)
  );

  for (const task of referencingTasks) {
    const updatedEventIds = (task.eventIds || []).filter((id) => id !== eventId);
    const updatedTask: TaskItem = {
      ...task,
      eventIds: updatedEventIds,
      updatedAt: new Date().toISOString(),
    };
    await updateSupabaseTask(workspaceId, updatedTask);
  }
}

/** 
 * Deletes a wedding event from Supabase safely:
 * 1. Disassociates eventId from referencing tasks
 * 2. Deletes the event record
 * Tasks are NEVER deleted.
 */
export async function deleteEvent(workspaceId: string, eventId: string): Promise<void> {
  // Step 1: Clean task references first
  await removeEventIdFromTasks(workspaceId, eventId);

  // Step 2: Delete event row
  await deleteWeddingEventFromDb(workspaceId, eventId);
}

// ─── Onboarding Draft (LocalStorage) ────────────────────────────────────────

/** Returns the saved onboarding draft, or empty defaults if none. */
export function getOnboardingDraft(): OnboardingData {
  return readOnboardingDraft();
}

/** Persists intermediate onboarding form state. */
export function saveOnboardingDraft(data: OnboardingData): void {
  writeOnboardingDraft(data);
}

/** Clears the onboarding draft after workspace creation is complete. */
export function clearOnboardingDraft(): void {
  removeOnboardingDraft();
}
