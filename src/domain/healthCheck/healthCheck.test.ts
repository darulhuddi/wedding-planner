/**
 * WedSiap Wedding Health Check - Comprehensive Unit & Regression Tests (Phase 1.6)
 *
 * Validates:
 * 1. Adapter: Correct mapping from HealthCheckInput to Transient State
 * 2. Aggregator: Synthetic report generation & refined composite readiness logic
 * 3. Engine Consistency: Guarantees 100% identical outputs with premium core engines
 * 4. Phase 1.6 Acceptance Criteria:
 *    - AC1: H-30 venue not started receives `needs_attention`
 *    - AC2: H-30 venue not started has lower score than H-6 months healthy progress
 *    - AC3: H-7 almost complete maintains high readiness and on_track status
 *    - AC4: Time proximity alone is NOT a penalty when important work is complete
 * 5. Edge Cases & Conversion Contract
 */

import { describe, it, expect } from 'vitest';
import { HealthCheckInput } from './types';
import { createTemporaryAssessmentState } from './adapter';
import {
  generateWeddingHealthReport,
  calculateCompositeReadinessScore,
  deriveHealthStatusLevel,
  aggregateTopRisks,
  evaluateCategoryTimeliness,
} from './aggregator';
import {
  createPersistedAssessment,
  convertAssessmentToWorkspacePayload,
} from './conversion';
import { getNextBestAction } from '../../utils/nextBestActionEngine';
import { getTimelineGroups, getTimelineSummary } from '../timelineSelectors';
import { calculateBudgetOverview, calculateCategorySummaries } from '../budgetSelectors';
import { derivePreparationJourney } from '../journeySelectors';
import { generateInitialTasks } from '../../utils/checklistUtils';

describe('Wedding Health Check - Refined Readiness & Aggregation (Phase 1.6)', () => {
  const baseToday = '2026-09-07';

  const mockValidInput: HealthCheckInput = {
    coupleName: 'Budi & Citra',
    weddingDate: '2027-03-20', // ~194 days in the future
    location: 'Grand Ballroom Jakarta',
    estimatedGuestCount: 500,
    estimatedBudget: 150_000_000,
    budgetCommittedPercentage: 40,
    vendorStatus: {
      venue: 'completed',
      catering: 'in_progress',
      photography: 'not_started',
      decoration: 'not_started',
      makeup_attire: 'not_started',
      invitation: 'not_started',
    },
    primaryPlanningPriority: 'vendor',
    religiousTradition: 'christian',
  };

  // ─── 1. ADAPTER TESTS ──────────────────────────────────────────────────────

  describe('1. Temporary Assessment Adapter', () => {
    it('correctly transforms HealthCheckInput into an authoritative StoredWorkspace', () => {
      const state = createTemporaryAssessmentState(mockValidInput, baseToday);
      const ws = state.workspace;

      expect(ws.coupleName).toBe('Budi & Citra');
      expect(ws.weddingDate).toBe('2027-03-20');
      expect(ws.estimatedBudget).toBe(150_000_000);
      expect(ws.estimatedGuestCount).toBe(500);
      expect(ws.primaryPlanningPriority).toBe('vendor');
      expect(ws.completedCategories).toEqual(['venue']);
      expect(ws.religiousContexts).toEqual([{ tradition: 'christian', label: null }]);
      expect(ws.administrationContext).toBeUndefined();
    });

    it('generates tasks using existing generateInitialTasks and excludes completed categories', () => {
      const state = createTemporaryAssessmentState(mockValidInput, baseToday);
      const tasks = state.tasks;

      expect(tasks.length).toBeGreaterThan(0);
      // Venue is completed, so tasks requiring venue to be incomplete should NOT be generated
      const venueTasks = tasks.filter((t) => t.category === 'venue');
      expect(venueTasks.length).toBe(0);

      // Catering is in_progress, so its generated tasks should have in_progress status applied
      const cateringTasks = tasks.filter((t) => t.category === 'catering');
      expect(cateringTasks.length).toBeGreaterThan(0);
      expect(cateringTasks.some((t) => t.status === 'in_progress')).toBe(true);
    });

    it('generates standard template budget allocations and creates expenses for committed percentage', () => {
      const state = createTemporaryAssessmentState(mockValidInput, baseToday);
      const budget = state.budget;

      expect(budget.allocations.length).toBe(7);
      const totalAllocated = budget.allocations.reduce((sum, a) => sum + a.amount, 0);
      expect(totalAllocated).toBe(150_000_000);

      expect(budget.expenses.length).toBeGreaterThan(0);
      const totalSpent = budget.expenses.reduce((sum, e) => sum + e.amount, 0);
      expect(totalSpent).toBe(60_000_000);
    });

    it('handles Islamic religious context safely with valid administration context', () => {
      const islamicInput: HealthCheckInput = {
        ...mockValidInput,
        religiousTradition: 'islam',
        administrationStatus: { status: 'in_progress' },
      };

      const state = createTemporaryAssessmentState(islamicInput, baseToday);
      expect(state.workspace.religiousContexts[0].tradition).toBe('islam');
      expect(state.workspace.administrationContext).toBeDefined();
      expect(state.workspace.administrationContext?.isSetupCompleted).toBe(true);
    });
  });

  // ─── 2. ENGINE CONSISTENCY TESTS ───────────────────────────────────────────

  describe('2. Core Engine Consistency (Health Check === Premium Engine)', () => {
    it('Scenario 1: Health Check NBA is 100% identical to Premium getNextBestAction', () => {
      const state = createTemporaryAssessmentState(mockValidInput, baseToday);

      const premiumNba = getNextBestAction(
        state.workspace,
        state.tasks,
        baseToday,
        state.events
      );
      const report = generateWeddingHealthReport(state, baseToday);

      expect(report.nextBestAction.title).toBe(premiumNba.title);
      expect(report.nextBestAction.actionType).toBe(premiumNba.actionType);
      expect(report.nextBestAction.priorityLevel).toBe(premiumNba.priorityLevel);
      expect(report.nextBestAction.priorityTag).toBe(premiumNba.priorityTag);
      expect(report.nextBestAction.reason).toBe(premiumNba.reason);
    });

    it('Scenario 2: Overdue task urgency matches premium evaluation exactly', () => {
      const state = createTemporaryAssessmentState(mockValidInput, baseToday);

      const overdueTask = {
        ...state.tasks[0],
        id: 'task-overdue-1',
        title: 'Survey Catering Pilihan',
        dueDate: '2026-09-04',
        status: 'todo' as const,
      };
      state.tasks = [overdueTask, ...state.tasks.slice(1)];

      const premiumNba = getNextBestAction(
        state.workspace,
        state.tasks,
        baseToday,
        state.events
      );
      const report = generateWeddingHealthReport(state, baseToday);

      expect(report.nextBestAction.taskId).toBe('task-overdue-1');
      expect(report.nextBestAction.priorityLevel).toBe('P1');
      expect(report.nextBestAction.priorityTag).toBe('Terlambat');
      expect(report.nextBestAction.source).toBe('overdue');
      expect(report.nextBestAction.title).toBe(premiumNba.title);
    });

    it('Scenario 3: Budget health status matches premium calculateBudgetOverview and category summaries', () => {
      const state = createTemporaryAssessmentState(mockValidInput, baseToday);

      const premiumOverview = calculateBudgetOverview(state.workspace.estimatedBudget, state.budget);
      const premiumCategorySummaries = calculateCategorySummaries(state.budget);

      const report = generateWeddingHealthReport(state, baseToday);

      expect(report.budget.overview).toEqual(premiumOverview);
      expect(report.budget.categorySummaries).toEqual(premiumCategorySummaries);
      expect(report.budget.status).toBe('aman');
    });

    it('Scenario 4: Timeline grouping and journey matches premium selectors', () => {
      const state = createTemporaryAssessmentState(mockValidInput, baseToday);

      const premiumTimelineGroups = getTimelineGroups(state.tasks, state.workspace.weddingDate, baseToday);
      const premiumTimelineSummary = getTimelineSummary(state.tasks, state.workspace.weddingDate, baseToday);
      const premiumJourney = derivePreparationJourney(state.workspace.weddingDate, state.tasks, baseToday);

      const report = generateWeddingHealthReport(state, baseToday);

      expect(report.timeline.timelineGroups).toEqual(premiumTimelineGroups);
      expect(report.timeline.timelineSummary).toEqual(premiumTimelineSummary);
      expect(report.timeline.journey).toEqual(premiumJourney);
    });

    it('Scenario 5: Generated tasks strictly follow existing checklistUtils rules', () => {
      const state = createTemporaryAssessmentState(mockValidInput, baseToday);

      const baselineInitialTasks = generateInitialTasks({
        workspaceId: state.workspace.id,
        completedCategories: state.workspace.completedCategories,
        weddingDate: state.workspace.weddingDate,
        daysUntilWedding: 194,
      });

      expect(state.tasks.length).toBe(baselineInitialTasks.length);
      expect(state.tasks.map((t) => t.title)).toEqual(baselineInitialTasks.map((t) => t.title));
    });
  });

  // ─── 3. PHASE 1.6 ACCEPTANCE CRITERIA TESTS ────────────────────────────────

  describe('3. Phase 1.6 Refined Readiness & Critical Foundation Tests', () => {
    // Scenario B: H-181 (6 Months) with Venue & Catering completed
    const inputB_Healthy6Mo: HealthCheckInput = {
      coupleName: 'Pasangan B',
      weddingDate: '2027-03-07', // 181 days
      estimatedBudget: 150_000_000,
      estimatedGuestCount: 400,
      budgetCommittedPercentage: 35,
      vendorStatus: {
        venue: 'completed',
        catering: 'completed',
        photography: 'in_progress',
        decoration: 'in_progress',
        makeup_attire: 'not_started',
        invitation: 'not_started',
      },
      primaryPlanningPriority: 'vendor',
      religiousTradition: 'christian',
    };

    // Scenario D: H-30 with Venue NOT STARTED
    const inputD_30DaysNoVenue: HealthCheckInput = {
      coupleName: 'Pasangan D',
      weddingDate: '2026-10-07', // 30 days
      estimatedBudget: 150_000_000,
      estimatedGuestCount: 400,
      budgetCommittedPercentage: 40,
      vendorStatus: {
        venue: 'not_started',
        catering: 'completed',
        photography: 'completed',
        decoration: 'completed',
        makeup_attire: 'in_progress',
        invitation: 'in_progress',
      },
      primaryPlanningPriority: 'vendor',
      religiousTradition: 'christian',
    };

    // Scenario F: H-7 with 5/6 modules completed and 0 overdue
    const inputF_7DaysAlmostComplete: HealthCheckInput = {
      coupleName: 'Pasangan F',
      weddingDate: '2026-09-14', // 7 days
      estimatedBudget: 150_000_000,
      estimatedGuestCount: 400,
      budgetCommittedPercentage: 90,
      vendorStatus: {
        venue: 'completed',
        catering: 'completed',
        photography: 'completed',
        decoration: 'completed',
        makeup_attire: 'completed',
        invitation: 'in_progress',
      },
      primaryPlanningPriority: 'vendor',
      religiousTradition: 'christian',
    };

    it('AC1: H-30 venue not started receives needs_attention (not quite_on_track)', () => {
      const stateD = createTemporaryAssessmentState(inputD_30DaysNoVenue, baseToday);
      const reportD = generateWeddingHealthReport(stateD, baseToday);

      expect(reportD.overall.status).toBe('needs_attention');
      expect(reportD.overall.statusLabel).toBe('Perlu Perhatian');
      expect(reportD.risks.some((r) => r.title.includes('Venue'))).toBe(true);
    });

    it('AC2: H-30 venue not started has lower readiness score than H-6 months healthy progress', () => {
      const stateB = createTemporaryAssessmentState(inputB_Healthy6Mo, baseToday);
      const reportB = generateWeddingHealthReport(stateB, baseToday);

      const stateD = createTemporaryAssessmentState(inputD_30DaysNoVenue, baseToday);
      const reportD = generateWeddingHealthReport(stateD, baseToday);

      expect(reportD.overall.score).toBeLessThan(reportB.overall.score);
      expect(reportB.overall.score).toBeGreaterThanOrEqual(45);
      expect(reportD.overall.score).toBeLessThanOrEqual(40);
    });

    it('AC3 & AC4: H-7 almost complete maintains high readiness and on_track status without artificial time penalty', () => {
      const stateF = createTemporaryAssessmentState(inputF_7DaysAlmostComplete, baseToday);
      const reportF = generateWeddingHealthReport(stateF, baseToday);

      // Preparation is virtually done: readiness should be high
      expect(reportF.overall.score).toBeGreaterThanOrEqual(70);
      expect(reportF.overall.status).toBe('on_track');
      expect(reportF.overall.statusLabel).toBe('On Track & Terkendali');
    });

    it('evaluates category timeliness windows accurately across time horizons', () => {
      // H-180: Early stage -> No timeliness penalty
      const timeliness180 = evaluateCategoryTimeliness(
        ['venue'],
        ['catering'],
        180
      );
      expect(timeliness180.totalTimelinessPenalty).toBe(0);
      expect(timeliness180.hasCriticalFoundationMissing).toBe(false);

      // H-30 with missing venue -> Critical foundation missing penalty
      const timeliness30 = evaluateCategoryTimeliness(
        ['catering', 'photography'],
        ['makeup_attire'],
        30
      );
      expect(timeliness30.totalTimelinessPenalty).toBeGreaterThanOrEqual(20);
      expect(timeliness30.hasCriticalFoundationMissing).toBe(true);
      expect(timeliness30.criticalMissingCategoryLabels).toContain('Venue / Gedung');
    });
  });

  // ─── 4. EDGE CASES & PERSISTENCE ───────────────────────────────────────────

  describe('4. Edge Cases & Conversion Contract', () => {
    it('handles wedding date in the past (Readiness = 0, Blocker UPDATE_WEDDING_DATE)', () => {
      const pastInput: HealthCheckInput = {
        ...mockValidInput,
        weddingDate: '2026-08-01',
      };

      const state = createTemporaryAssessmentState(pastInput, baseToday);
      const report = generateWeddingHealthReport(state, baseToday);

      expect(report.daysUntilWedding).toBeLessThan(0);
      expect(report.overall.score).toBe(0);
      expect(report.overall.status).toBe('critical_urgency');
      expect(report.nextBestAction.actionType).toBe('OPEN_WEDDING_IDENTITY');
    });

    it('handles all vendors completed state with top readiness', () => {
      const allCompletedInput: HealthCheckInput = {
        ...mockValidInput,
        vendorStatus: {
          venue: 'completed',
          catering: 'completed',
          photography: 'completed',
          decoration: 'completed',
          makeup_attire: 'completed',
          invitation: 'completed',
        },
      };

      const state = createTemporaryAssessmentState(allCompletedInput, baseToday);
      const report = generateWeddingHealthReport(state, baseToday);

      expect(report.readiness.completedModulesCount).toBe(6);
      expect(report.overall.score).toBeGreaterThanOrEqual(80);
      expect(report.overall.status).toBe('on_track');
    });

    it('recalculates dynamic timeline on conversion when time has elapsed (no stale deadlines)', () => {
      const persisted = createPersistedAssessment(mockValidInput, '2026-09-07');

      const futureConversionDate = '2026-09-17';
      const payload = convertAssessmentToWorkspacePayload(persisted, futureConversionDate);

      expect(payload.workspaceData.coupleName).toBe('Budi & Citra');
      expect(payload.workspaceData.weddingDate).toBe('2027-03-20');
      expect(payload.tasksData.length).toBeGreaterThan(0);
      expect(payload.budgetData.allocations.length).toBe(7);
      expect(payload.eventsData.length).toBe(1);

      const activeTasksWithDueDate = payload.tasksData.filter((t) => t.dueDate !== null);
      activeTasksWithDueDate.forEach((task) => {
        expect(task.dueDate! >= futureConversionDate).toBe(true);
      });
    });
  });
});
