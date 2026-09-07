/**
 * WedSiap Wedding Health Check - Hardened Signup Conversion Service
 *
 * Orchestrates converting an anonymous Health Check assessment into real,
 * persisted Supabase entities (Workspace, Tasks, Budget, Events) upon signup.
 *
 * Hardening & Invariants:
 * 1. Concurrency Lock: In-flight conversion deduplication prevents race conditions
 *    when multiple callers (SignUpPage + hydration effects) trigger conversion simultaneously.
 * 2. Idempotency & Resumability: Checks both workspace existence AND entity population
 *    (tasks/budget/events) to differentiate between genuinely existing workspaces and
 *    partially initialized workspaces from a prior transient failure.
 * 3. Atomic Retention: Assessment in localStorage is ONLY cleared when all 4 entities
 *    (Workspace, Tasks, Budget, Events) are successfully persisted. On failure, the
 *    assessment remains safely stored for retries.
 * 4. Zero Overwrite: Never overwrites an already-populated workspace.
 */

import { getPendingAssessment, clearPendingAssessment } from './storage';
import { convertAssessmentToWorkspacePayload } from './conversion';
import * as workspaceRepository from '../../repositories/workspaceRepository';
import { isWorkspaceOnboarded } from '../workspaceSelectors';
import { StoredWorkspace } from '../../types/workspace';

export interface ConversionResult {
  converted: boolean;
  reason?: 'no_pending_assessment' | 'already_onboarded' | 'conversion_error';
  workspace?: StoredWorkspace | null;
  error?: string;
}

function getTodayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// In-flight conversion promise registry to deduplicate simultaneous calls per user
const inFlightConversions = new Map<string, Promise<ConversionResult>>();

/**
 * Detects any pending anonymous Health Check assessment and converts it
 * to a full workspace for the newly authenticated user.
 */
export async function convertPendingAssessmentToWorkspace(
  userId: string,
  today: string = getTodayYMD()
): Promise<ConversionResult> {
  if (!userId) {
    return { converted: false, reason: 'conversion_error', error: 'Missing userId' };
  }

  // Deduplicate concurrent in-flight requests for the same userId
  const existingInFlight = inFlightConversions.get(userId);
  if (existingInFlight) {
    return existingInFlight;
  }

  const conversionPromise = executeConversion(userId, today);
  inFlightConversions.set(userId, conversionPromise);

  try {
    const result = await conversionPromise;
    return result;
  } finally {
    inFlightConversions.delete(userId);
  }
}

async function executeConversion(userId: string, today: string): Promise<ConversionResult> {
  const assessment = getPendingAssessment();
  if (!assessment) {
    return { converted: false, reason: 'no_pending_assessment' };
  }

  try {
    // 1. Check existing workspace in repository
    const existing = await workspaceRepository.getWorkspace(userId);

    if (existing && isWorkspaceOnboarded(existing)) {
      // Check if tasks are already populated to distinguish genuine existing workspace vs partial creation
      const existingTasks = await workspaceRepository.getTasks(existing.id);
      if (existingTasks.length > 0) {
        // Genuine pre-existing wedding plan: do not overwrite
        clearPendingAssessment();
        return {
          converted: false,
          reason: 'already_onboarded',
          workspace: existing,
        };
      }
    }

    // 2. Derive dynamic payload using current date (recalculates deadlines safely)
    const payload = convertAssessmentToWorkspacePayload(assessment, today);

    // 3. Create or update workspace record
    let targetWorkspace: StoredWorkspace;
    if (!existing) {
      targetWorkspace = await workspaceRepository.createWorkspace(payload.workspaceData, userId);
    } else {
      targetWorkspace = await workspaceRepository.saveWorkspace({
        ...existing,
        ...payload.workspaceData,
      });
    }

    // 4. Populate Tasks (idempotent: only if not already populated)
    const currentTasks = await workspaceRepository.getTasks(targetWorkspace.id);
    if (currentTasks.length === 0 && payload.tasksData.length > 0) {
      await workspaceRepository.bulkCreateTasks(targetWorkspace.id, payload.tasksData);
    }

    // 5. Populate Budget (idempotent: only if empty)
    if (payload.budgetData) {
      const currentBudget = await workspaceRepository.getBudget(targetWorkspace.id);
      if (
        (!currentBudget.allocations || currentBudget.allocations.length === 0) &&
        (!currentBudget.expenses || currentBudget.expenses.length === 0)
      ) {
        await workspaceRepository.saveBudget(targetWorkspace.id, payload.budgetData);
      }
    }

    // 6. Populate Events (idempotent: only if empty)
    const currentEvents = await workspaceRepository.getEvents(targetWorkspace.id);
    if (currentEvents.length === 0 && payload.eventsData.length > 0) {
      for (const event of payload.eventsData) {
        await workspaceRepository.createEvent(targetWorkspace.id, event);
      }
    }

    // 7. Cleanup pending assessment from storage ONLY after full success
    clearPendingAssessment();

    return {
      converted: true,
      workspace: targetWorkspace,
    };
  } catch (err: unknown) {
    console.error('[HealthCheck] Error converting assessment to workspace:', err);
    // Note: pending assessment is deliberately NOT deleted so user/system can retry safely
    return {
      converted: false,
      reason: 'conversion_error',
      error: err instanceof Error ? err.message : 'Gagal mengonversi assessment ke workspace.',
    };
  }
}
