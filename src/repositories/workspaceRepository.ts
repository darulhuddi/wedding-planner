/**
 * WedFlow Workspace Repository
 *
 * The single public interface for all workspace, task, and onboarding draft persistence.
 *
 * Application code (App.tsx, OnboardingFlow, etc.) must import from here.
 * UI components must never import the adapter directly.
 *
 * To switch backends: implement a supabaseAdapter.ts with the same exported
 * function signatures as localStorageAdapter.ts and update the imports below.
 *
 * Architecture:
 *   UI / App
 *     ↓
 *   workspaceRepository  ← import from here
 *     ↓
 *   localStorageAdapter  ← only this file touches localStorage
 *     ↓
 *   localStorage
 */

import { StoredWorkspace } from '../types/workspace';
import { OnboardingData } from '../types/onboarding';
import { TaskItem } from '../types/checklist';
import { StoredBudget } from '../types/budget';
import { Vendor } from '../types/vendor';
import { Guest } from '../types/guest';
import { Note } from '../types/note';
import {
  readWorkspace,
  writeWorkspace,
  removeWorkspace,
  readTasks,
  writeTasks,
  readBudget,
  writeBudget,
  readVendors,
  writeVendors,
  readGuests,
  writeGuests,
  readNotes,
  writeNotes,
  readOnboardingDraft,
  writeOnboardingDraft,
  removeOnboardingDraft,
} from './localStorageAdapter';

// ─── Workspace ───────────────────────────────────────────────────────────────

/** Returns the stored workspace, or null if none exists / migration failed. */
export function getWorkspace(): StoredWorkspace | null {
  return readWorkspace();
}

/** Persists the workspace. Only StoredWorkspace (no derived fields) is written. */
export function saveWorkspace(workspace: StoredWorkspace): void {
  writeWorkspace(workspace);
}

/** Removes workspace from storage (clears both v1 and v2 keys). */
export function clearWorkspace(): void {
  removeWorkspace();
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

/** Returns all tasks for the given workspace ID. */
export function getTasks(workspaceId: string): TaskItem[] {
  return readTasks(workspaceId);
}

/** Persists all tasks for the given workspace ID. */
export function saveTasks(workspaceId: string, tasks: TaskItem[]): void {
  writeTasks(workspaceId, tasks);
}

// ─── Budgets ─────────────────────────────────────────────────────────────────

/** Returns the budget for the given workspace ID, or an empty budget if none. */
export function getBudget(workspaceId: string): StoredBudget {
  const budget = readBudget(workspaceId);
  return budget || { allocations: [], expenses: [] };
}

/** Persists the budget for the given workspace ID. */
export function saveBudget(workspaceId: string, budget: StoredBudget): void {
  writeBudget(workspaceId, budget);
}

// ─── Vendors ─────────────────────────────────────────────────────────────────

/** Returns all vendors for the given workspace ID. */
export function getVendors(workspaceId: string): Vendor[] {
  return readVendors(workspaceId);
}

/** Persists all vendors for the given workspace ID. */
export function saveVendors(workspaceId: string, vendors: Vendor[]): void {
  writeVendors(workspaceId, vendors);
}

// ─── Guests ──────────────────────────────────────────────────────────────────

/** Returns all guests for the given workspace ID. */
export function getGuests(workspaceId: string): Guest[] {
  return readGuests(workspaceId);
}

/** Persists all guests for the given workspace ID. */
export function saveGuests(workspaceId: string, guests: Guest[]): void {
  writeGuests(workspaceId, guests);
}

// ─── Notes ───────────────────────────────────────────────────────────────────

/** Returns all notes for the given workspace ID. */
export function getNotes(workspaceId: string): Note[] {
  return readNotes(workspaceId);
}

/** Persists all notes for the given workspace ID. */
export function saveNotes(workspaceId: string, notes: Note[]): void {
  writeNotes(workspaceId, notes);
}

// ─── Onboarding Draft ────────────────────────────────────────────────────────

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

