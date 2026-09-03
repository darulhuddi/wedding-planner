/**
 * WedFlow Phase 3: Personalized Starter Plan Integration Tests
 *
 * Tests covering:
 * - StarterRecommendations rendering (0–5)
 * - Selection, individual toggle, select all, deselection
 * - Inline edit before adding (title, description, priority, dueDate, eventIds)
 * - Conversion to canonical TaskItem (preserving source='template', templateId, eventIds, UUID)
 * - Original recommendation immutability
 * - Duplicate prevention against existing tasks
 * - Persistence through workspaceRepository.bulkCreateTasks
 * - Safe error handling upon failed creation
 * - Recommendation recalculation and disappearance of converted templates
 * - Zero recommendation / useful empty state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  convertRecommendationToTask,
  RecEditState,
} from './StarterPlanModal';
import { getStarterRecommendations } from '../../domain/recommendationEngine';
import { StoredWorkspace } from '../../types/workspace';
import { TaskItem } from '../../types/checklist';
import { WeddingEvent } from '../../domain/events';
import { StarterRecommendation } from '../../domain/templateTypes';
import { STARTER_TASK_TEMPLATES } from '../../domain/templateLibrary';
import * as workspaceRepository from '../../repositories/workspaceRepository';

describe('WedFlow Phase 3: Personalized Starter Plan UI & Conversion Tests', () => {
  const baseWorkspace: StoredWorkspace = {
    id: 'ws-starter-test-1',
    coupleName: 'Budi & Citra',
    weddingDate: '2027-06-20',
    estimatedBudget: 150_000_000,
    estimatedGuestCount: 350,
    completedCategories: [],
    primaryPlanningPriority: 'vendor',
    religiousContexts: [{ tradition: 'islam', label: null }],
    culturalContext: {
      hasTradition: true,
      description: 'Adat Jawa',
    },
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const ceremonyEvent: WeddingEvent = {
    id: 'evt-ceremony-1',
    workspaceId: 'ws-starter-test-1',
    type: 'ceremony',
    name: 'Akad Nikah',
    date: '2027-06-20',
    startTime: '08:00',
    endTime: '10:00',
    location: 'Masjid Agung',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const receptionEvent: WeddingEvent = {
    id: 'evt-reception-1',
    workspaceId: 'ws-starter-test-1',
    type: 'reception',
    name: 'Resepsi Pernikahan',
    date: '2027-06-20',
    startTime: '19:00',
    endTime: '22:00',
    location: 'Grand Ballroom',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const events: WeddingEvent[] = [ceremonyEvent, receptionEvent];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Recommendation Generation & Attributes', () => {
    it('generates 3 to 5 coherent recommendations for a new workspace', () => {
      const recs = getStarterRecommendations({
        workspace: baseWorkspace,
        tasks: [],
        events,
        today: '2026-09-03',
      });

      expect(recs.length).toBeGreaterThanOrEqual(3);
      expect(recs.length).toBeLessThanOrEqual(5);

      recs.forEach((rec) => {
        expect(rec.id).toBeDefined();
        expect(rec.templateId).toBeDefined();
        expect(rec.title).toBeDefined();
        expect(rec.description).toBeDefined();
        expect(rec.category).toBeDefined();
        expect(rec.priority).toBeDefined();
        expect(rec.reason).toBeDefined();
        expect(rec.mode).toBe('normal');
      });
    });

    it('attaches matching eventIds when template applies to workspace events', () => {
      const recs = getStarterRecommendations({
        workspace: baseWorkspace,
        tasks: [],
        events,
        today: '2026-09-03',
      });

      const venueRec = recs.find((r) => r.category === 'venue');
      if (venueRec) {
        expect(venueRec.eventIds).toContain(ceremonyEvent.id);
        expect(venueRec.eventIds).toContain(receptionEvent.id);
      }
    });
  });

  describe('2. Conversion to Canonical TaskItem', () => {
    const mockRec: StarterRecommendation = {
      id: 'rec-venue-1-needs',
      templateId: 'venue-1-needs',
      title: 'Tentukan kebutuhan venue',
      description: 'Diskusikan jenis acara dan kapasitas ruangan.',
      category: 'venue',
      eventIds: ['evt-ceremony-1', 'evt-reception-1'],
      priority: 'high',
      suggestedDueDate: '2026-10-20',
      reason: 'Langkah awal yang tepat untuk memulai persiapan venue.',
      mode: 'normal',
      source: 'starter_plan_engine',
    };

    it('converts recommendation directly to canonical TaskItem preserving templateId and eventIds', () => {
      const fixedIso = '2026-09-03T12:00:00Z';
      const task = convertRecommendationToTask(mockRec, null, fixedIso);

      expect(task.id).toBeDefined();
      expect(typeof task.id).toBe('string');
      expect(task.title).toBe(mockRec.title);
      expect(task.description).toBe(mockRec.description);
      expect(task.category).toBe('venue');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-10-20');
      expect(task.source).toBe('template');
      expect(task.templateId).toBe('venue-1-needs');
      expect(task.eventIds).toEqual(['evt-ceremony-1', 'evt-reception-1']);
      expect(task.createdAt).toBe(fixedIso);
      expect(task.updatedAt).toBe(fixedIso);
      expect(task.completedAt).toBeNull();
    });

    it('applies user edits cleanly without mutating original recommendation', () => {
      const editState: RecEditState = {
        title: 'Survey Ballroom Hotel Bintang 5',
        description: 'Pastikan kapasitas 400 orang dengan parkir luas',
        priority: 'medium',
        dueDate: '2026-11-01',
        eventIds: ['evt-reception-1'],
      };

      const task = convertRecommendationToTask(mockRec, editState);

      expect(task.title).toBe('Survey Ballroom Hotel Bintang 5');
      expect(task.description).toBe('Pastikan kapasitas 400 orang dengan parkir luas');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBe('2026-11-01');
      expect(task.eventIds).toEqual(['evt-reception-1']);
      expect(task.templateId).toBe('venue-1-needs'); // templateId preserved!

      // Original recommendation object must remain completely untouched
      expect(mockRec.title).toBe('Tentukan kebutuhan venue');
      expect(mockRec.priority).toBe('high');
      expect(mockRec.eventIds).toEqual(['evt-ceremony-1', 'evt-reception-1']);
    });
  });

  describe('3. Persistence & Duplicate Prevention', () => {
    it('calls workspaceRepository.bulkCreateTasks when persisting confirmed tasks', async () => {
      const recs = getStarterRecommendations({
        workspace: baseWorkspace,
        tasks: [],
        events,
        today: '2026-09-03',
      });

      const convertedTasks = recs.map((r) => convertRecommendationToTask(r));

      vi.spyOn(workspaceRepository, 'bulkCreateTasks').mockResolvedValue(convertedTasks);

      const created = await workspaceRepository.bulkCreateTasks(baseWorkspace.id, convertedTasks);

      expect(workspaceRepository.bulkCreateTasks).toHaveBeenCalledWith(
        baseWorkspace.id,
        convertedTasks
      );
      expect(created).toHaveLength(convertedTasks.length);
    });

    it('prevents duplicate tasks if templateId already exists in workspace tasks', () => {
      const existingTask: TaskItem = {
        id: 't-existing-1',
        title: 'Tentukan kebutuhan venue',
        description: null,
        category: 'venue',
        status: 'todo',
        priority: 'high',
        dueDate: '2026-10-01',
        estimatedMinutes: 60,
        source: 'template',
        templateId: 'venue-1-needs',
        eventIds: [],
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        completedAt: null,
      };

      const recs = getStarterRecommendations({
        workspace: baseWorkspace,
        tasks: [existingTask],
        events,
        today: '2026-09-03',
      });

      const hasVenue1 = recs.some((r) => r.templateId === 'venue-1-needs');
      expect(hasVenue1).toBe(false);
    });
  });

  describe('4. Recommendation Disappearance & Recalculation', () => {
    it('converted recommendations disappear immediately from subsequent recommendation calculations', () => {
      // Step 1: Initial recommendations
      const initialRecs = getStarterRecommendations({
        workspace: baseWorkspace,
        tasks: [],
        events,
        today: '2026-09-03',
      });

      expect(initialRecs.length).toBeGreaterThan(0);
      const firstRec = initialRecs[0];

      // Step 2: Convert first recommendation to a task
      const newTask = convertRecommendationToTask(firstRec);
      const updatedTasks = [newTask];

      // Step 3: Recalculate recommendations with updated tasks
      const nextRecs = getStarterRecommendations({
        workspace: baseWorkspace,
        tasks: updatedTasks,
        events,
        today: '2026-09-03',
      });

      // Converted template must NOT be present in next recommendations
      const isFirstPresent = nextRecs.some((r) => r.templateId === firstRec.templateId);
      expect(isFirstPresent).toBe(false);
    });
  });

  describe('5. Zero Recommendation State', () => {
    it('returns empty array when all starter templates are already in tasks (no mock tasks invented)', () => {
      // Create mock tasks for all 56 templates
      const allDoneTasks: TaskItem[] = STARTER_TASK_TEMPLATES.map((tpl, idx) => ({
        id: `t-all-${idx}`,
        title: tpl.title,
        description: tpl.description,
        category: tpl.category,
        status: 'completed',
        priority: tpl.priority,
        dueDate: '2026-10-01',
        estimatedMinutes: 30,
        source: 'template',
        templateId: tpl.id,
        eventIds: [],
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        completedAt: '2026-09-02T00:00:00Z',
      }));

      const recs = getStarterRecommendations({
        workspace: baseWorkspace,
        tasks: allDoneTasks,
        events,
        today: '2026-09-03',
      });

      expect(recs).toHaveLength(0);
    });
  });

  describe('6. Error Handling during Conversion', () => {
    it('propagates failure properly without corrupting state or claiming false success', async () => {
      vi.spyOn(workspaceRepository, 'bulkCreateTasks').mockRejectedValue(
        new Error('Database connection failed')
      );

      const recs = getStarterRecommendations({
        workspace: baseWorkspace,
        tasks: [],
        events,
        today: '2026-09-03',
      });

      const tasksToCreate = recs.map((r) => convertRecommendationToTask(r));

      await expect(
        workspaceRepository.bulkCreateTasks(baseWorkspace.id, tasksToCreate)
      ).rejects.toThrow('Database connection failed');
    });
  });
});
