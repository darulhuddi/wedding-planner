/**
 * WedSiap Wedding Health Check - Persistence & Conversion Contract
 *
 * Provides pure contracts and conversion functions to:
 * 1. Package Health Check assessments into versioned persistent shapes for temporary storage.
 * 2. Convert stored assessments into canonical database creation payloads upon signup/login.
 * 3. Safely handle stale dates by recalculating dynamic timeline/deadline state against current `today`.
 *
 * Principles:
 * - Pure domain logic, 0 Supabase imports.
 * - Zero data loss upon user registration.
 * - Versioned schema for forwards compatibility.
 */

import {
  HealthCheckInput,
  PersistedHealthCheckAssessment,
  TemporaryAssessmentState,
} from './types';
import { createTemporaryAssessmentState } from './adapter';
import { generateWeddingHealthReport } from './aggregator';
import { StoredWorkspace } from '../../types/workspace';
import { TaskItem } from '../../types/checklist';
import { StoredBudget } from '../../types/budget';
import { WeddingEvent } from '../events';

export const HEALTH_CHECK_ASSESSMENT_STORAGE_KEY = 'wedsiap_health_check_assessment_v1';
export const HEALTH_CHECK_LEGACY_STORAGE_KEY = 'wedflow_health_check_assessment_v1';
export const HEALTH_CHECK_CURRENT_VERSION = 1;

function getTodayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Creates a versioned PersistedHealthCheckAssessment ready for temporary browser storage.
 */
export function createPersistedAssessment(
  input: HealthCheckInput,
  today: string = getTodayYMD()
): PersistedHealthCheckAssessment {
  const generatedState = createTemporaryAssessmentState(input, today);
  const report = generateWeddingHealthReport(generatedState, today);

  return {
    version: HEALTH_CHECK_CURRENT_VERSION,
    createdAt: new Date().toISOString(),
    input,
    generatedState,
    report,
  };
}

export interface WorkspaceCreationPayload {
  workspaceData: Omit<StoredWorkspace, 'id' | 'createdAt' | 'updatedAt' | 'userId'>;
  tasksData: TaskItem[];
  budgetData: StoredBudget;
  eventsData: Array<Omit<WeddingEvent, 'id' | 'createdAt' | 'updatedAt' | 'workspaceId'>>;
}

/**
 * Converts a stored assessment into actual workspace creation payloads.
 *
 * Re-runs task generation and date calculation against `currentToday` so that
 * any elapsed days between initial assessment and user registration are
 * cleanly recalculated without stale deadlines or invalid wedding dates.
 */
export function convertAssessmentToWorkspacePayload(
  assessment: PersistedHealthCheckAssessment,
  currentToday: string = getTodayYMD()
): WorkspaceCreationPayload {
  const input = assessment.input;

  // Re-generate transient state using currentToday to prevent stale deadline drift
  const freshState = createTemporaryAssessmentState(input, currentToday);
  const { workspace, tasks, budget, events } = freshState;

  const workspaceData: Omit<StoredWorkspace, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
    coupleName: workspace.coupleName,
    weddingDate: workspace.weddingDate,
    estimatedBudget: workspace.estimatedBudget,
    estimatedGuestCount: workspace.estimatedGuestCount,
    completedCategories: workspace.completedCategories,
    primaryPlanningPriority: workspace.primaryPlanningPriority,
    religiousContexts: workspace.religiousContexts,
    culturalContext: workspace.culturalContext,
    administrationContext: workspace.administrationContext,
  };

  const eventsData = events.map((e) => ({
    type: e.type,
    name: e.name,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    location: e.location,
  }));

  return {
    workspaceData,
    tasksData: tasks,
    budgetData: budget,
    eventsData,
  };
}
