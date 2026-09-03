/**
 * WedFlow Local Storage Adapter
 *
 * THE ONLY FILE PERMITTED TO ACCESS localStorage DIRECTLY.
 *
 * All persistence in the application must go through this adapter via
 * workspaceRepository.ts. UI components, utils, and business logic must
 * never import from this file — import from workspaceRepository.ts instead.
 *
 * To switch persistence backends (e.g. Supabase), implement a new adapter
 * with the same exported function signatures and update workspaceRepository.ts.
 */

import { StoredWorkspace } from '../types/workspace';
import { OnboardingData } from '../types/onboarding';
import { TaskItem } from '../types/checklist';
import { StoredBudget } from '../types/budget';
import { Vendor } from '../types/vendor';
import { Guest } from '../types/guest';
import { Note } from '../types/note';

// ─── Storage Keys ────────────────────────────────────────────────────────────

const KEYS = {
  WORKSPACE_V2: 'wedflow_workspace_v2',
  WORKSPACE_V1: 'wedflow_wedding_workspace', // legacy key — migration source only
  TASKS: 'wedflow_tasks',
  ONBOARDING_DRAFT: 'wedflow_onboarding_draft',
  BUDGETS: 'wedflow_budgets',
  VENDORS: 'wedflow_vendors',
  GUESTS: 'wedflow_guests',
  NOTES: 'wedflow_notes',
} as const;

const VALID_CATEGORY_IDS = new Set([
  'venue', 'catering', 'photography', 'decoration', 'makeup_attire', 'invitation',
]);

const VALID_PRIORITIES = new Set(['budget', 'checklist', 'vendor', 'timeline']);

// ─── Workspace Migration ─────────────────────────────────────────────────────

/**
 * Migrates a v1 workspace object (WeddingWorkspace shape) to StoredWorkspace (v2).
 * Handles field renames: budget → estimatedBudget, guestCount → estimatedGuestCount.
 * Strips all derived fields (formattedDate, daysUntilWedding, etc.).
 * Returns null if the input is missing required fields.
 */
function migrateV1Workspace(raw: unknown): StoredWorkspace | null {
  try {
    if (!raw || typeof raw !== 'object') return null;
    const v1 = raw as Record<string, unknown>;

    if (typeof v1.id !== 'string' || !v1.id) return null;
    if (typeof v1.coupleName !== 'string' || !v1.coupleName) return null;
    if (typeof v1.weddingDate !== 'string' || !v1.weddingDate) return null;

    const estimatedBudget =
      typeof v1.estimatedBudget === 'number'
        ? v1.estimatedBudget
        : typeof v1.budget === 'number'
        ? v1.budget
        : 100_000_000;

    const estimatedGuestCount =
      typeof v1.estimatedGuestCount === 'number'
        ? v1.estimatedGuestCount
        : typeof v1.guestCount === 'number'
        ? v1.guestCount
        : 400;

    const completedCategories = Array.isArray(v1.completedCategories)
      ? (v1.completedCategories as unknown[])
          .filter((c): c is StoredWorkspace['completedCategories'][number] =>
            typeof c === 'string' && VALID_CATEGORY_IDS.has(c)
          )
      : [];

    const priority =
      typeof v1.primaryPlanningPriority === 'string' &&
      VALID_PRIORITIES.has(v1.primaryPlanningPriority)
        ? (v1.primaryPlanningPriority as StoredWorkspace['primaryPlanningPriority'])
        : 'checklist';

    const now = new Date().toISOString();

    return {
      id: v1.id as string,
      coupleName: v1.coupleName as string,
      weddingDate: v1.weddingDate as string,
      estimatedBudget,
      estimatedGuestCount,
      completedCategories,
      primaryPlanningPriority: priority,
      religiousContexts: [],
      culturalContext: {
        hasTradition: null,
        description: null,
      },
      createdAt: typeof v1.createdAt === 'string' ? v1.createdAt : now,
      updatedAt: now,
    };
  } catch {
    return null;
  }
}

// ─── Workspace ───────────────────────────────────────────────────────────────

export function readWorkspace(): StoredWorkspace | null {
  try {
    // 1. Try v2 key first
    const rawV2 = localStorage.getItem(KEYS.WORKSPACE_V2);
    if (rawV2) {
      return JSON.parse(rawV2) as StoredWorkspace;
    }

    // 2. Attempt migration from v1
    const rawV1 = localStorage.getItem(KEYS.WORKSPACE_V1);
    if (rawV1) {
      const parsed = JSON.parse(rawV1) as unknown;
      const migrated = migrateV1Workspace(parsed);
      if (migrated) {
        console.info('[WedFlow] Workspace migrated v1 → v2 successfully.');
        localStorage.setItem(KEYS.WORKSPACE_V2, JSON.stringify(migrated));
        return migrated;
      }
      console.warn(
        '[WedFlow] Could not migrate workspace data — required fields missing or malformed. ' +
          'Please re-complete onboarding to create a new workspace.'
      );
      return null;
    }
  } catch (e) {
    console.error('[WedFlow] Failed to read workspace from storage:', e);
  }
  return null;
}

export function writeWorkspace(workspace: StoredWorkspace): void {
  try {
    localStorage.setItem(KEYS.WORKSPACE_V2, JSON.stringify(workspace));
  } catch (e) {
    console.error('[WedFlow] Failed to save workspace:', e);
  }
}

export function removeWorkspace(): void {
  try {
    localStorage.removeItem(KEYS.WORKSPACE_V2);
    localStorage.removeItem(KEYS.WORKSPACE_V1); // also clear legacy key
  } catch (e) {
    console.error('[WedFlow] Failed to remove workspace:', e);
  }
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

function readAllTasksByWorkspace(): Record<string, TaskItem[]> {
  try {
    const raw = localStorage.getItem(KEYS.TASKS);
    return raw ? (JSON.parse(raw) as Record<string, TaskItem[]>) : {};
  } catch {
    return {};
  }
}

export function readTasks(workspaceId: string): TaskItem[] {
  try {
    return readAllTasksByWorkspace()[workspaceId] ?? [];
  } catch (e) {
    console.error('[WedFlow] Failed to read tasks:', e);
    return [];
  }
}

export function writeTasks(workspaceId: string, tasks: TaskItem[]): void {
  try {
    const all = readAllTasksByWorkspace();
    all[workspaceId] = tasks;
    localStorage.setItem(KEYS.TASKS, JSON.stringify(all));
  } catch (e) {
    console.error('[WedFlow] Failed to save tasks:', e);
  }
}

// ─── Budgets ─────────────────────────────────────────────────────────────────

function readAllBudgetsByWorkspace(): Record<string, StoredBudget> {
  try {
    const raw = localStorage.getItem(KEYS.BUDGETS);
    return raw ? (JSON.parse(raw) as Record<string, StoredBudget>) : {};
  } catch {
    return {};
  }
}

export function readBudget(workspaceId: string): StoredBudget | null {
  try {
    return readAllBudgetsByWorkspace()[workspaceId] ?? null;
  } catch (e) {
    console.error('[WedFlow] Failed to read budget:', e);
    return null;
  }
}

export function writeBudget(workspaceId: string, budget: StoredBudget): void {
  try {
    const all = readAllBudgetsByWorkspace();
    all[workspaceId] = budget;
    localStorage.setItem(KEYS.BUDGETS, JSON.stringify(all));
  } catch (e) {
    console.error('[WedFlow] Failed to save budget:', e);
  }
}

// ─── Onboarding Draft ────────────────────────────────────────────────────────

const EMPTY_ONBOARDING_DRAFT: OnboardingData = {
  coupleName: '',
  weddingDate: '',
  budget: 100_000_000,
  guestCount: 400,
  completedCategories: [],
  primaryPlanningPriority: '',
  daysUntilWedding: 0,
};

export function readOnboardingDraft(): OnboardingData {
  try {
    const raw = localStorage.getItem(KEYS.ONBOARDING_DRAFT);
    if (raw) {
      return { ...EMPTY_ONBOARDING_DRAFT, ...(JSON.parse(raw) as OnboardingData) };
    }
  } catch (e) {
    console.error('[WedFlow] Failed to read onboarding draft:', e);
  }
  return { ...EMPTY_ONBOARDING_DRAFT };
}

export function writeOnboardingDraft(data: OnboardingData): void {
  try {
    localStorage.setItem(KEYS.ONBOARDING_DRAFT, JSON.stringify(data));
  } catch (e) {
    console.error('[WedFlow] Failed to save onboarding draft:', e);
  }
}

export function removeOnboardingDraft(): void {
  try {
    localStorage.removeItem(KEYS.ONBOARDING_DRAFT);
  } catch (e) {
    console.error('[WedFlow] Failed to remove onboarding draft:', e);
  }
}

// ─── Vendors ─────────────────────────────────────────────────────────────────

function readAllVendorsByWorkspace(): Record<string, Vendor[]> {
  try {
    const raw = localStorage.getItem(KEYS.VENDORS);
    return raw ? (JSON.parse(raw) as Record<string, Vendor[]>) : {};
  } catch {
    return {};
  }
}

export function readVendors(workspaceId: string): Vendor[] {
  try {
    return readAllVendorsByWorkspace()[workspaceId] ?? [];
  } catch (e) {
    console.error('[WedFlow] Failed to read vendors:', e);
    return [];
  }
}

export function writeVendors(workspaceId: string, vendors: Vendor[]): void {
  try {
    const all = readAllVendorsByWorkspace();
    all[workspaceId] = vendors;
    localStorage.setItem(KEYS.VENDORS, JSON.stringify(all));
  } catch (e) {
    console.error('[WedFlow] Failed to save vendors:', e);
  }
}

// ─── Guests ──────────────────────────────────────────────────────────────────

function readAllGuestsByWorkspace(): Record<string, Guest[]> {
  try {
    const raw = localStorage.getItem(KEYS.GUESTS);
    return raw ? (JSON.parse(raw) as Record<string, Guest[]>) : {};
  } catch {
    return {};
  }
}

export function readGuests(workspaceId: string): Guest[] {
  try {
    return readAllGuestsByWorkspace()[workspaceId] ?? [];
  } catch (e) {
    console.error('[WedFlow] Failed to read guests:', e);
    return [];
  }
}

export function writeGuests(workspaceId: string, guests: Guest[]): void {
  try {
    const all = readAllGuestsByWorkspace();
    all[workspaceId] = guests;
    localStorage.setItem(KEYS.GUESTS, JSON.stringify(all));
  } catch (e) {
    console.error('[WedFlow] Failed to save guests:', e);
  }
}

// ─── Notes ───────────────────────────────────────────────────────────────────

function readAllNotesByWorkspace(): Record<string, Note[]> {
  try {
    const raw = localStorage.getItem(KEYS.NOTES);
    return raw ? (JSON.parse(raw) as Record<string, Note[]>) : {};
  } catch {
    return {};
  }
}

export function readNotes(workspaceId: string): Note[] {
  try {
    return readAllNotesByWorkspace()[workspaceId] ?? [];
  } catch (e) {
    console.error('[WedFlow] Failed to read notes:', e);
    return [];
  }
}

export function writeNotes(workspaceId: string, notes: Note[]): void {
  try {
    const all = readAllNotesByWorkspace();
    all[workspaceId] = notes;
    localStorage.setItem(KEYS.NOTES, JSON.stringify(all));
  } catch (e) {
    console.error('[WedFlow] Failed to save notes:', e);
  }
}


