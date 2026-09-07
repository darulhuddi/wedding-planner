import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  savePendingAssessment,
  getPendingAssessment,
  clearPendingAssessment,
  hasPendingAssessment,
} from './storage';
import {
  convertPendingAssessmentToWorkspace,
  ConversionResult,
} from './conversionService';
import {
  createPersistedAssessment,
  HEALTH_CHECK_ASSESSMENT_STORAGE_KEY,
  HEALTH_CHECK_LEGACY_STORAGE_KEY,
} from './conversion';
import { generateWeddingHealthReport } from './aggregator';
import { createTemporaryAssessmentState } from './adapter';
import { HealthCheckInput } from './types';
import * as workspaceRepository from '../../repositories/workspaceRepository';
import { StoredWorkspace } from '../../types/workspace';
import { TaskItem } from '../../types/checklist';
import { StoredBudget } from '../../types/budget';
import { WeddingEvent } from '../events';
import { isWorkspaceOnboarded } from '../workspaceSelectors';
import { getNextBestAction } from '../../utils/nextBestActionEngine';
import { getStarterRecommendations } from '../recommendationEngine';

const memoryStore: Record<string, string> = {};

if (typeof localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStore[key] || null,
    setItem: (key: string, value: string) => {
      memoryStore[key] = value;
    },
    removeItem: (key: string) => {
      delete memoryStore[key];
    },
    clear: () => {
      Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
    },
  };
}

describe('Wedding Health Check - End-to-End Funnel & Hardening Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
  });

  const sampleInput: HealthCheckInput = {
    coupleName: 'Rian & Maya',
    weddingDate: '2027-02-14',
    location: 'Bandung',
    estimatedGuestCount: 350,
    estimatedBudget: 150_000_000,
    budgetCommittedPercentage: 25,
    vendorStatus: {
      venue: 'completed',
      catering: 'in_progress',
      photography: 'in_progress',
      decoration: 'not_started',
      makeup_attire: 'not_started',
      invitation: 'not_started',
    },
    administrationStatus: {
      status: 'in_progress',
    },
    religiousTradition: 'islam',
    concern: 'vendor',
    primaryPlanningPriority: 'timeline',
  };

  describe('1. Storage Key Audit & Legacy Migration', () => {
    it('saves under canonical wedsiap brand key', () => {
      const assessment = createPersistedAssessment(sampleInput, '2026-09-07');
      savePendingAssessment(assessment);

      expect(localStorage.getItem(HEALTH_CHECK_ASSESSMENT_STORAGE_KEY)).not.toBeNull();
      expect(hasPendingAssessment()).toBe(true);
    });

    it('migrates legacy wedflow key automatically to wedsiap key on retrieval', () => {
      const assessment = createPersistedAssessment(sampleInput, '2026-09-07');
      // Store in legacy key
      localStorage.setItem(HEALTH_CHECK_LEGACY_STORAGE_KEY, JSON.stringify(assessment));
      expect(localStorage.getItem(HEALTH_CHECK_ASSESSMENT_STORAGE_KEY)).toBeNull();

      // Read triggers migration
      const retrieved = getPendingAssessment();
      expect(retrieved).not.toBeNull();
      expect(retrieved?.input.coupleName).toBe('Rian & Maya');

      // Canonical key now populated, legacy key cleared
      expect(localStorage.getItem(HEALTH_CHECK_ASSESSMENT_STORAGE_KEY)).not.toBeNull();
      expect(localStorage.getItem(HEALTH_CHECK_LEGACY_STORAGE_KEY)).toBeNull();
    });

    it('clears both canonical and legacy keys on clearPendingAssessment()', () => {
      const assessment = createPersistedAssessment(sampleInput, '2026-09-07');
      localStorage.setItem(HEALTH_CHECK_LEGACY_STORAGE_KEY, JSON.stringify(assessment));
      localStorage.setItem(HEALTH_CHECK_ASSESSMENT_STORAGE_KEY, JSON.stringify(assessment));

      clearPendingAssessment();
      expect(localStorage.getItem(HEALTH_CHECK_ASSESSMENT_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(HEALTH_CHECK_LEGACY_STORAGE_KEY)).toBeNull();
      expect(hasPendingAssessment()).toBe(false);
    });

    it('returns null on corrupted storage payload without crashing', () => {
      localStorage.setItem(HEALTH_CHECK_ASSESSMENT_STORAGE_KEY, '{"invalid": true}');
      expect(getPendingAssessment()).toBeNull();
      expect(hasPendingAssessment()).toBe(false);
    });
  });

  describe('2. Hardened Signup Conversion Service & Concurrency Lock', () => {
    it('returns no_pending_assessment when localStorage is empty', async () => {
      const result = await convertPendingAssessmentToWorkspace('user-123');
      expect(result.converted).toBe(false);
      expect(result.reason).toBe('no_pending_assessment');
    });

    it('deduplicates simultaneous concurrent conversion calls for the same user (Mutex Lock)', async () => {
      const assessment = createPersistedAssessment(sampleInput, '2026-09-07');
      savePendingAssessment(assessment);

      const createdWorkspace: StoredWorkspace = {
        id: 'ws-concurrent-1',
        userId: 'user-concurrent-1',
        coupleName: 'Rian & Maya',
        weddingDate: '2027-02-14',
        estimatedBudget: 150_000_000,
        estimatedGuestCount: 350,
        completedCategories: ['venue'],
        primaryPlanningPriority: 'timeline',
        religiousContexts: [],
        culturalContext: { hasTradition: null, description: null },
        createdAt: '2026-09-07T00:00:00Z',
        updatedAt: '2026-09-07T00:00:00Z',
      };

      vi.spyOn(workspaceRepository, 'getWorkspace').mockResolvedValueOnce(null);
      const createWorkspaceSpy = vi.spyOn(workspaceRepository, 'createWorkspace').mockResolvedValueOnce(createdWorkspace);
      vi.spyOn(workspaceRepository, 'getTasks').mockResolvedValue([]);
      vi.spyOn(workspaceRepository, 'bulkCreateTasks').mockResolvedValue([]);
      vi.spyOn(workspaceRepository, 'getBudget').mockResolvedValue({ allocations: [], expenses: [] });
      vi.spyOn(workspaceRepository, 'saveBudget').mockResolvedValue({ allocations: [], expenses: [] });
      vi.spyOn(workspaceRepository, 'getEvents').mockResolvedValue([]);
      vi.spyOn(workspaceRepository, 'createEvent').mockResolvedValue({} as any);

      // Trigger 2 concurrent conversion calls simultaneously
      const [res1, res2] = await Promise.all([
        convertPendingAssessmentToWorkspace('user-concurrent-1', '2026-09-07'),
        convertPendingAssessmentToWorkspace('user-concurrent-1', '2026-09-07'),
      ]);

      expect(res1.converted).toBe(true);
      expect(res2.converted).toBe(true);
      // Workspace creation must only be called ONCE
      expect(createWorkspaceSpy).toHaveBeenCalledTimes(1);
    });

    it('safely bypasses conversion if user ALREADY has an active populated workspace (Idempotency Protection)', async () => {
      const assessment = createPersistedAssessment(sampleInput, '2026-09-07');
      savePendingAssessment(assessment);

      const existingWorkspace: StoredWorkspace = {
        id: 'existing-ws-1',
        userId: 'user-already-onboarded',
        coupleName: 'Budi & Citra',
        weddingDate: '2027-06-20',
        estimatedBudget: 200_000_000,
        estimatedGuestCount: 500,
        completedCategories: ['venue', 'catering'],
        primaryPlanningPriority: 'budget',
        religiousContexts: [],
        culturalContext: { hasTradition: null, description: null },
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      };

      vi.spyOn(workspaceRepository, 'getWorkspace').mockResolvedValue(existingWorkspace);
      // Workspace has existing tasks
      vi.spyOn(workspaceRepository, 'getTasks').mockResolvedValue([
        { id: 'task-1', title: 'Survey Venue', category: 'venue', status: 'completed' } as TaskItem,
      ]);
      const createWorkspaceSpy = vi.spyOn(workspaceRepository, 'createWorkspace');
      const saveWorkspaceSpy = vi.spyOn(workspaceRepository, 'saveWorkspace');

      const result = await convertPendingAssessmentToWorkspace('user-already-onboarded');

      expect(result.converted).toBe(false);
      expect(result.reason).toBe('already_onboarded');
      expect(result.workspace?.id).toBe('existing-ws-1');

      // Crucial: Must NEVER create or overwrite existing workspace
      expect(createWorkspaceSpy).not.toHaveBeenCalled();
      expect(saveWorkspaceSpy).not.toHaveBeenCalled();

      // Crucial: Pending assessment cleared
      expect(hasPendingAssessment()).toBe(false);
    });

    it('resumes partial conversion if workspace row existed but tasks were unpopulated (Resilience against partial failure)', async () => {
      const assessment = createPersistedAssessment(sampleInput, '2026-09-07');
      savePendingAssessment(assessment);

      // Workspace row exists from a prior partial attempt
      const partialWorkspace: StoredWorkspace = {
        id: 'partial-ws-1',
        userId: 'user-partial-retry',
        coupleName: 'Rian & Maya',
        weddingDate: '2027-02-14',
        estimatedBudget: 150_000_000,
        estimatedGuestCount: 350,
        completedCategories: ['venue'],
        primaryPlanningPriority: 'timeline',
        religiousContexts: [],
        culturalContext: { hasTradition: null, description: null },
        createdAt: '2026-09-07T00:00:00Z',
        updatedAt: '2026-09-07T00:00:00Z',
      };

      vi.spyOn(workspaceRepository, 'getWorkspace').mockResolvedValue(partialWorkspace);
      vi.spyOn(workspaceRepository, 'saveWorkspace').mockResolvedValue(partialWorkspace);
      // 0 tasks currently exist
      vi.spyOn(workspaceRepository, 'getTasks').mockResolvedValue([]);
      const bulkCreateTasksSpy = vi.spyOn(workspaceRepository, 'bulkCreateTasks').mockResolvedValue([]);
      vi.spyOn(workspaceRepository, 'getBudget').mockResolvedValue({ allocations: [], expenses: [] });
      const saveBudgetSpy = vi.spyOn(workspaceRepository, 'saveBudget').mockResolvedValue({ allocations: [], expenses: [] });
      vi.spyOn(workspaceRepository, 'getEvents').mockResolvedValue([]);
      const createEventSpy = vi.spyOn(workspaceRepository, 'createEvent').mockResolvedValue({} as any);

      const result = await convertPendingAssessmentToWorkspace('user-partial-retry', '2026-09-07');

      expect(result.converted).toBe(true);
      expect(result.workspace?.id).toBe('partial-ws-1');
      // Resumes and populates the missing tasks, budget, events
      expect(bulkCreateTasksSpy).toHaveBeenCalledTimes(1);
      expect(saveBudgetSpy).toHaveBeenCalledTimes(1);
      expect(createEventSpy).toHaveBeenCalledTimes(1);
      expect(hasPendingAssessment()).toBe(false);
    });

    it('preserves pending assessment in storage if conversion throws an error (Atomic Failure Protection)', async () => {
      const assessment = createPersistedAssessment(sampleInput, '2026-09-07');
      savePendingAssessment(assessment);

      vi.spyOn(workspaceRepository, 'getWorkspace').mockRejectedValueOnce(new Error('Network connection failure'));

      const result = await convertPendingAssessmentToWorkspace('user-error-test');

      expect(result.converted).toBe(false);
      expect(result.reason).toBe('conversion_error');
      expect(result.error).toContain('Network connection failure');

      // CRITICAL: Must NOT clear pending assessment on failure
      expect(hasPendingAssessment()).toBe(true);
    });
  });

  describe('3. Next Best Actions Provenance Audit', () => {
    it('verifies that NBA #1 originates from authoritative getNextBestAction() and NBAs #2/#3 originate from getStarterRecommendations()', () => {
      const state = createTemporaryAssessmentState(sampleInput, '2026-09-07');
      const report = generateWeddingHealthReport(state, '2026-09-07');

      // 1. Direct invocation of existing nextBestActionEngine
      const authoritativeNba = getNextBestAction(state.workspace, state.tasks, '2026-09-07', state.events);
      expect(report.nextBestAction.id).toBe(authoritativeNba.id);
      expect(report.nextBestAction.title).toBe(authoritativeNba.title);

      // 2. Direct invocation of existing recommendationEngine
      const starterRecs = getStarterRecommendations({
        workspace: state.workspace,
        tasks: state.tasks,
        events: state.events,
        today: '2026-09-07',
      });
      expect(report.recommendedActions.length).toBeGreaterThan(0);
      expect(report.recommendedActions[0].id).toBe(starterRecs[0].id);
      expect(report.recommendedActions[0].title).toBe(starterRecs[0].title);
    });
  });

  describe('4. Data Integrity & Onboarding Bypass Contract', () => {
    it('verifies all questionnaire inputs map accurately to converted workspace payload', async () => {
      const assessment = createPersistedAssessment(sampleInput, '2026-09-07');
      savePendingAssessment(assessment);

      const createdWorkspace: StoredWorkspace = {
        id: 'ws-integrity-check',
        userId: 'user-integrity',
        coupleName: 'Rian & Maya',
        weddingDate: '2027-02-14',
        estimatedBudget: 150_000_000,
        estimatedGuestCount: 350,
        completedCategories: ['venue'],
        primaryPlanningPriority: 'timeline',
        religiousContexts: [{ tradition: 'islam', label: null }],
        culturalContext: { hasTradition: null, description: null },
        createdAt: '2026-09-07T00:00:00Z',
        updatedAt: '2026-09-07T00:00:00Z',
      };

      vi.spyOn(workspaceRepository, 'getWorkspace').mockResolvedValueOnce(null);
      const createWorkspaceSpy = vi.spyOn(workspaceRepository, 'createWorkspace').mockResolvedValueOnce(createdWorkspace);
      vi.spyOn(workspaceRepository, 'getTasks').mockResolvedValue([]);
      const bulkCreateTasksSpy = vi.spyOn(workspaceRepository, 'bulkCreateTasks').mockResolvedValue([]);
      vi.spyOn(workspaceRepository, 'getBudget').mockResolvedValue({ allocations: [], expenses: [] });
      const saveBudgetSpy = vi.spyOn(workspaceRepository, 'saveBudget').mockResolvedValue({ allocations: [], expenses: [] });
      vi.spyOn(workspaceRepository, 'getEvents').mockResolvedValue([]);
      const createEventSpy = vi.spyOn(workspaceRepository, 'createEvent').mockResolvedValue({} as any);

      const result = await convertPendingAssessmentToWorkspace('user-integrity', '2026-09-07');

      expect(result.converted).toBe(true);

      // Verify Workspace fields
      const wsData = createWorkspaceSpy.mock.calls[0][0];
      expect(wsData.coupleName).toBe('Rian & Maya');
      expect(wsData.weddingDate).toBe('2027-02-14');
      expect(wsData.estimatedBudget).toBe(150_000_000);
      expect(wsData.estimatedGuestCount).toBe(350);
      expect(wsData.completedCategories).toContain('venue');
      expect(wsData.primaryPlanningPriority).toBe('timeline');

      // Verify Budget allocations & expenses
      const budgetData = saveBudgetSpy.mock.calls[0][1];
      expect(budgetData.allocations.length).toBeGreaterThan(0);
      expect(budgetData.expenses.length).toBeGreaterThan(0);

      // Verify Event
      const eventData = createEventSpy.mock.calls[0][1];
      expect(eventData.name).toBe('Akad Nikah / Pemberkatan');
      expect(eventData.date).toBe('2027-02-14');
      expect(eventData.location).toBe('Bandung');

      // Verify No Repeat Onboarding guarantee
      expect(isWorkspaceOnboarded(result.workspace)).toBe(true);
    });
  });
});
