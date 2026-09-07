/**
 * WedSiap Wedding Health Check - Canonical Domain Types
 *
 * Provides types for:
 * - Health Check questionnaire input model
 * - Health Check report structure (Overall, Readiness, Budget, Timeline, Administration, Risks, NBA)
 * - Risk items derived from existing engine signals
 * - Assessment persistence and conversion contract
 *
 * Principles:
 * - Reuses existing types from onboarding, checklist, budget, context, and administration.
 * - Zero duplication of existing domain enums.
 * - Pure data models without database coupling.
 */

import { CategoryId, PlanningPriority, NextBestAction } from '../../types/onboarding';
import { TaskItem } from '../../types/checklist';
import { BudgetCategory, StoredBudget } from '../../types/budget';
import { StoredWorkspace } from '../../types/workspace';
import { WeddingEvent } from '../events';
import { ReligiousTradition } from '../context';
import { AdministrativeRiskLevel } from '../administration/types';
import { TimelineGroup, TimelineSummary } from '../timelineSelectors';
import { PreparationJourneyResult } from '../journeySelectors';
import { ModuleProgress } from '../moduleSelectors';
import { BudgetOverview, CategoryBudgetSummary, BudgetInsightMessage } from '../budgetSelectors';

// ─── Input Model ─────────────────────────────────────────────────────────────

export type HealthCheckVendorStatus = 'completed' | 'in_progress' | 'not_started';

export type HealthCheckAdministrationStatus =
  | 'not_started'
  | 'in_progress'
  | 'registered'
  | 'completed';

export interface HealthCheckInput {
  coupleName?: string;
  weddingDate: string; // YYYY-MM-DD
  location?: string;
  estimatedGuestCount: number;
  estimatedBudget: number;
  budgetCommittedPercentage?: number; // 0..100 (% of budget already committed/spent)
  vendorStatus: Record<CategoryId, HealthCheckVendorStatus>;
  administrationStatus?: {
    status: HealthCheckAdministrationStatus;
  };
  primaryPlanningPriority: PlanningPriority;
  religiousTradition?: ReligiousTradition;
  concern?: string;
}

// ─── Health Report & Readiness Types ─────────────────────────────────────────

export type HealthStatusLevel =
  | 'on_track'
  | 'quite_on_track'
  | 'needs_attention'
  | 'critical_urgency';

export interface HealthRisk {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'attention';
  source: 'timeline' | 'budget' | 'administration' | 'planning';
}

export interface HealthOverallSection {
  status: HealthStatusLevel;
  statusLabel: string;
  summary: string;
  score: number; // 0..100 composite readiness score
}

export interface HealthReadinessSection {
  score: number; // 0..100 based on module and task completion
  status: string;
  summary: string;
  completedModulesCount: number;
  totalModulesCount: number;
  moduleProgress: ModuleProgress[];
}

export interface HealthBudgetSection {
  status: 'aman' | 'mendekati_batas' | 'melebihi_budget' | 'belum_dialokasikan';
  statusLabel: string;
  summary: string;
  overview: BudgetOverview;
  categorySummaries: Record<BudgetCategory, CategoryBudgetSummary>;
  insights: BudgetInsightMessage[];
}

export interface HealthTimelineSection {
  status: string;
  summary: string;
  daysUntilWedding: number;
  timelineSummary: TimelineSummary;
  timelineGroups: TimelineGroup[];
  journey: PreparationJourneyResult;
}

export interface HealthAdministrationSection {
  riskLevel: AdministrativeRiskLevel;
  riskLabel: string;
  reasons: string[];
}

export interface WeddingHealthReport {
  generatedAt: string;
  daysUntilWedding: number;
  formattedWeddingDate: string;
  overall: HealthOverallSection;
  readiness: HealthReadinessSection;
  budget: HealthBudgetSection;
  timeline: HealthTimelineSection;
  administration: HealthAdministrationSection;
  risks: HealthRisk[];
  nextBestAction: NextBestAction; // Primary NBA from nextBestActionEngine
  recommendedActions: NextBestAction[]; // Complementary actions (from candidate evaluations / starter engine)
  source: {
    engineVersion: string;
  };
}

// ─── Transient State & Persistence Contract ──────────────────────────────────

export interface TemporaryAssessmentState {
  workspace: StoredWorkspace;
  tasks: TaskItem[];
  budget: StoredBudget;
  events: WeddingEvent[];
}

export interface PersistedHealthCheckAssessment {
  version: number;
  createdAt: string;
  input: HealthCheckInput;
  generatedState: TemporaryAssessmentState;
  report?: WeddingHealthReport;
}
