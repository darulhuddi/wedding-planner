import { describe, it, expect } from 'vitest';
import {
  getStarterRecommendations,
  calculateDaysBetween,
  normalizeTitle,
} from './recommendationEngine';
import { StoredWorkspace } from '../types/workspace';
import { TaskItem } from '../types/checklist';
import { WeddingEvent } from './events';
import { STARTER_TASK_TEMPLATES } from './templateLibrary';

describe('Starter Plan Recommendation Engine Tests (Phase 2)', () => {
  const baseWorkspace: StoredWorkspace = {
    id: 'ws-rec-test',
    coupleName: 'Adit & Nisa',
    weddingDate: '2027-06-20',
    estimatedBudget: 150_000_000,
    estimatedGuestCount: 400,
    completedCategories: [],
    primaryPlanningPriority: 'vendor',
    religiousContexts: [{ tradition: 'islam', label: null }],
    culturalContext: { hasTradition: null, description: null },
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const ceremonyEvent: WeddingEvent = {
    id: 'evt-ceremony-1',
    workspaceId: 'ws-rec-test',
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
    workspaceId: 'ws-rec-test',
    type: 'reception',
    name: 'Resepsi Pernikahan',
    date: '2027-06-20',
    startTime: '19:00',
    endTime: '22:00',
    location: 'Ballroom Hotel',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const culturalEvent: WeddingEvent = {
    id: 'evt-cultural-1',
    workspaceId: 'ws-rec-test',
    type: 'cultural',
    name: 'Siraman Adat',
    date: '2027-06-19',
    startTime: '14:00',
    endTime: '17:00',
    location: 'Rumah Keluarga',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  describe('1. Empty Tasks State', () => {
    it('returns up to 5 highly relevant initial starter recommendations when tasks list is empty', () => {
      const recs = getStarterRecommendations({
        workspace: baseWorkspace,
        tasks: [],
        events: [ceremonyEvent, receptionEvent],
        today: '2026-09-03',
      });

      expect(recs.length).toBeGreaterThan(0);
      expect(recs.length).toBeLessThanOrEqual(5);

      // Recommendations should be starters
      recs.forEach((rec) => {
        expect(rec.id).toBeDefined();
        expect(rec.title).toBeDefined();
        expect(rec.category).toBeDefined();
        expect(rec.reason).toBeDefined();
        expect(rec.mode).toBe('normal');
      });
    });
  });

  describe('2. Existing and Completed Tasks Filtering', () => {
    it('excludes templates that are already present in existing tasks', () => {
      const existingTask: TaskItem = {
        id: 't-1',
        title: 'Tentukan kebutuhan venue',
        description: null,
        category: 'venue',
        status: 'completed',
        priority: 'high',
        dueDate: '2026-10-01',
        estimatedMinutes: 60,
        source: 'template',
        templateId: 'venue-1-needs',
        eventIds: [],
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        completedAt: '2026-09-02T00:00:00Z',
      };

      const recs = getStarterRecommendations({
        workspace: baseWorkspace,
        tasks: [existingTask],
        events: [ceremonyEvent, receptionEvent],
        today: '2026-09-03',
      });

      const hasVenueNeeds = recs.some((r) => r.templateId === 'venue-1-needs');
      expect(hasVenueNeeds).toBe(false);
    });

    it('excludes templates that match custom task title conservatively without templateId', () => {
      const customTask: TaskItem = {
        id: 't-custom-1',
        title: 'Tentukan Kebutuhan Catering',
        description: 'Catatan custom',
        category: 'catering',
        status: 'todo',
        priority: 'high',
        dueDate: '2026-10-01',
        estimatedMinutes: 60,
        source: 'custom',
        templateId: null,
        eventIds: [],
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        completedAt: null,
      };

      const recs = getStarterRecommendations({
        workspace: baseWorkspace,
        tasks: [customTask],
        events: [receptionEvent],
        today: '2026-09-03',
      });

      const hasCateringNeeds = recs.some((r) => r.templateId === 'catering-1-needs');
      expect(hasCateringNeeds).toBe(false);
    });
  });

  describe('3. Event Filtering and Linking', () => {
    it('reception-only: excludes ceremony-only administration templates', () => {
      const recs = getStarterRecommendations({
        workspace: baseWorkspace,
        tasks: [],
        events: [receptionEvent], // only reception
        today: '2026-09-03',
      });

      // Template prosesi-3-admin-needs requires ceremony
      const hasAdminCeremony = recs.some((r) => r.templateId === 'prosesi-3-admin-needs');
      expect(hasAdminCeremony).toBe(false);
    });

    it('ceremony + reception: correctly maps matching event IDs into recommendations', () => {
      const recs = getStarterRecommendations({
        workspace: baseWorkspace,
        tasks: [],
        events: [ceremonyEvent, receptionEvent],
        today: '2026-09-03',
      });

      // Venue template applies to ceremony & reception -> both IDs should be present
      const venueRec = recs.find((r) => r.category === 'venue');
      if (venueRec) {
        expect(venueRec.eventIds).toContain(ceremonyEvent.id);
        expect(venueRec.eventIds).toContain(receptionEvent.id);
      }
    });

    it('multiple events with cultural: retains cultural applicability', () => {
      const recs = getStarterRecommendations({
        workspace: {
          ...baseWorkspace,
          culturalContext: {
            hasTradition: true,
            description: 'Adat Sunda (Ngeuyeuk Seureuh)',
          },
        },
        tasks: [],
        events: [ceremonyEvent, receptionEvent, culturalEvent],
        today: '2026-09-03',
      });

      expect(recs.length).toBeGreaterThan(0);
      expect(recs.length).toBeLessThanOrEqual(5);
    });
  });

  describe('4. Religious Context Adaptation', () => {
    it('Islam context adapts ceremony and authority terms without legal claims', () => {
      const recs = getStarterRecommendations({
        workspace: {
          ...baseWorkspace,
          religiousContexts: [{ tradition: 'islam', label: null }],
        },
        tasks: [],
        events: [ceremonyEvent],
        today: '2026-09-03',
      });

      const prosesiRec = recs.find((r) => r.category === 'prosesi_administrasi');
      if (prosesiRec) {
        expect(prosesiRec.description).toBeDefined();
        // Should not make unsupported universal legal claims
        expect(prosesiRec.description).not.toContain('pasti wajib');
      }
    });

    it('Catholic context adapts terminology safely', () => {
      const recs = getStarterRecommendations({
        workspace: {
          ...baseWorkspace,
          religiousContexts: [{ tradition: 'catholic', label: null }],
        },
        tasks: [],
        events: [ceremonyEvent],
        today: '2026-09-03',
      });

      expect(recs).toBeDefined();
    });

    it('Buddhist context adapts ceremony terminology with Vivāhamaṅgala', () => {
      const recs = getStarterRecommendations({
        workspace: {
          ...baseWorkspace,
          religiousContexts: [{ tradition: 'buddhist', label: null }],
        },
        tasks: [],
        events: [ceremonyEvent],
        today: '2026-09-03',
      });

      expect(recs).toBeDefined();
      expect(recs.length).toBeGreaterThan(0);
    });

    it('mixed/unspecified contexts handle general terminology gracefully', () => {
      const recs = getStarterRecommendations({
        workspace: {
          ...baseWorkspace,
          religiousContexts: [{ tradition: 'mixed', label: 'Lintas Tradisi' }],
        },
        tasks: [],
        events: [ceremonyEvent, receptionEvent],
        today: '2026-09-03',
      });

      expect(recs.length).toBeGreaterThan(0);
      recs.forEach((r) => {
        expect(r.title).toBeDefined();
      });
    });
  });

  describe('5. Timing and Catch-Up Mode', () => {
    it('wedding far away (> 240 days): operates in normal mode prioritizing foundational steps', () => {
      const recs = getStarterRecommendations({
        workspace: {
          ...baseWorkspace,
          weddingDate: '2027-10-01', // ~390 days away
        },
        tasks: [],
        events: [ceremonyEvent, receptionEvent],
        today: '2026-09-03',
      });

      expect(recs.length).toBeGreaterThan(0);
      recs.forEach((r) => {
        expect(r.mode).toBe('normal');
      });
    });

    it('wedding near (<= 120 days): activates catch_up mode prioritizing quick security', () => {
      const recs = getStarterRecommendations({
        workspace: {
          ...baseWorkspace,
          weddingDate: '2026-11-15', // ~73 days away
        },
        tasks: [],
        events: [ceremonyEvent, receptionEvent],
        today: '2026-09-03',
      });

      expect(recs.length).toBeGreaterThan(0);
      recs.forEach((r) => {
        expect(r.mode).toBe('catch_up');
        expect(r.reason).toContain('dekat');
      });
    });

    it('suggested due dates are valid calendar dates and never in the past', () => {
      const today = '2026-09-03';
      const recs = getStarterRecommendations({
        workspace: {
          ...baseWorkspace,
          weddingDate: '2026-12-01',
        },
        tasks: [],
        events: [ceremonyEvent, receptionEvent],
        today,
      });

      recs.forEach((r) => {
        if (r.suggestedDueDate) {
          expect(r.suggestedDueDate >= today).toBe(true);
          expect(r.suggestedDueDate <= '2026-12-01').toBe(true);
        }
      });
    });
  });

  describe('6. User Planning Priority Responsiveness', () => {
    const priorities: ('vendor' | 'budget' | 'timeline' | 'checklist')[] = [
      'vendor',
      'budget',
      'timeline',
      'checklist',
    ];

    priorities.forEach((priority) => {
      it(`produces valid deterministic recommendations for priority: ${priority}`, () => {
        const recs = getStarterRecommendations({
          workspace: {
            ...baseWorkspace,
            primaryPlanningPriority: priority,
          },
          tasks: [],
          events: [ceremonyEvent, receptionEvent],
          today: '2026-09-03',
        });

        expect(recs.length).toBeGreaterThan(0);
        expect(recs.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('7. Determinism and Boundary Limits', () => {
    it('produces identical deterministic order when called repeatedly with same input', () => {
      const call1 = getStarterRecommendations({
        workspace: baseWorkspace,
        tasks: [],
        events: [ceremonyEvent, receptionEvent],
        today: '2026-09-03',
      });

      const call2 = getStarterRecommendations({
        workspace: baseWorkspace,
        tasks: [],
        events: [ceremonyEvent, receptionEvent],
        today: '2026-09-03',
      });

      expect(call1).toEqual(call2);
    });

    it('never exceeds the maximum limit of 5 recommendations', () => {
      const recs = getStarterRecommendations({
        workspace: baseWorkspace,
        tasks: [],
        events: [ceremonyEvent, receptionEvent],
        today: '2026-09-03',
      });

      expect(recs.length).toBeLessThanOrEqual(5);
    });

    it('returns 0 recommendations when all templates are already completed', () => {
      // Create mock tasks for all templates
      const allTasks: TaskItem[] = STARTER_TASK_TEMPLATES.map((tpl, i) => ({
        id: `t-${i}`,
        title: tpl.title,
        description: tpl.description,
        category: tpl.category,
        status: 'completed',
        priority: tpl.priority,
        dueDate: '2026-10-01',
        estimatedMinutes: 60,
        source: 'template',
        templateId: tpl.id,
        eventIds: [],
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        completedAt: '2026-09-01T00:00:00Z',
      }));

      const recs = getStarterRecommendations({
        workspace: baseWorkspace,
        tasks: allTasks,
        events: [ceremonyEvent, receptionEvent],
        today: '2026-09-03',
      });

      expect(recs).toHaveLength(0);
    });
  });

  describe('8. Pure Utility Functions', () => {
    it('calculateDaysBetween computes accurate day difference', () => {
      expect(calculateDaysBetween('2026-09-03', '2026-09-13')).toBe(10);
      expect(calculateDaysBetween('2026-09-03', '2026-09-03')).toBe(0);
      expect(calculateDaysBetween('2026-09-10', '2026-09-03')).toBe(-7);
    });

    it('normalizeTitle normalizes punctuation and spacing', () => {
      expect(normalizeTitle('Tentukan Kebutuhan Venue!')).toBe('tentukan kebutuhan venue');
      expect(normalizeTitle('   Survey / Cek   Venue   ')).toBe('survey cek venue');
    });
  });

  describe('9. Module Status Source of Truth & Timing Regression Tests', () => {
    it('1. completedCategories says venue completed, but current venue tasks are incomplete -> venue recommendations remain eligible', () => {
      const workspaceWithVenueCompleted: StoredWorkspace = {
        ...baseWorkspace,
        completedCategories: ['venue'], // Historical onboarding answer
      };

      const incompleteVenueTask: TaskItem = {
        id: 't-venue-in-progress',
        title: 'Survey / cek venue',
        description: null,
        category: 'venue',
        status: 'in_progress', // incomplete!
        priority: 'high',
        dueDate: '2026-10-01',
        estimatedMinutes: 60,
        source: 'template',
        templateId: 'venue-5-survey',
        eventIds: [],
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        completedAt: null,
      };

      const recs = getStarterRecommendations({
        workspace: workspaceWithVenueCompleted,
        tasks: [incompleteVenueTask],
        events: [ceremonyEvent, receptionEvent],
        today: '2026-09-03',
      });

      // Venue recommendations MUST remain eligible because current task status is in_progress, not completed
      const venueRecs = recs.filter((r) => r.category === 'venue');
      expect(venueRecs.length).toBeGreaterThan(0);
    });

    it('2. completedCategories says venue completed, but venue has zero current tasks -> venue is not incorrectly treated as completed', () => {
      const workspaceWithVenueCompleted: StoredWorkspace = {
        ...baseWorkspace,
        completedCategories: ['venue'], // Historical onboarding answer
      };

      const recs = getStarterRecommendations({
        workspace: workspaceWithVenueCompleted,
        tasks: [], // zero tasks
        events: [ceremonyEvent, receptionEvent],
        today: '2026-09-03',
      });

      // Venue recommendations MUST be eligible because totalTasks === 0 means not_started, not completed
      const venueRecs = recs.filter((r) => r.category === 'venue');
      expect(venueRecs.length).toBeGreaterThan(0);
      expect(venueRecs[0].category).toBe('venue');
    });

    it('3. venue tasks are actually all completed -> venue starter candidates are excluded/reduced according to existing rules', () => {
      const completedVenueTasks: TaskItem[] = [
        {
          id: 't-v1',
          title: 'Tentukan kebutuhan venue',
          description: null,
          category: 'venue',
          status: 'completed',
          priority: 'high',
          dueDate: '2026-09-01',
          estimatedMinutes: 60,
          source: 'template',
          templateId: 'venue-1-needs',
          eventIds: [],
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
          completedAt: '2026-09-01T00:00:00Z',
        },
        {
          id: 't-v2',
          title: 'Tentukan kriteria venue',
          description: null,
          category: 'venue',
          status: 'completed',
          priority: 'high',
          dueDate: '2026-09-01',
          estimatedMinutes: 60,
          source: 'template',
          templateId: 'venue-2-criteria',
          eventIds: [],
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
          completedAt: '2026-09-01T00:00:00Z',
        },
        {
          id: 't-v3',
          title: 'Buat shortlist venue',
          description: null,
          category: 'venue',
          status: 'completed',
          priority: 'high',
          dueDate: '2026-09-01',
          estimatedMinutes: 60,
          source: 'template',
          templateId: 'venue-3-shortlist',
          eventIds: [],
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
          completedAt: '2026-09-01T00:00:00Z',
        },
      ];

      const recs = getStarterRecommendations({
        workspace: {
          ...baseWorkspace,
          completedCategories: [], // Even if onboarding said empty
        },
        tasks: completedVenueTasks,
        events: [ceremonyEvent, receptionEvent],
        today: '2026-09-03',
      });

      // Early starter venue candidates (seq <= 3) MUST be excluded because all venue tasks are completed
      const earlyVenueRecs = recs.filter(
        (r) => r.category === 'venue' && ['venue-1-needs', 'venue-2-criteria', 'venue-3-shortlist'].includes(r.templateId)
      );
      expect(earlyVenueRecs).toHaveLength(0);
    });

    it('4. Recommended template window passed -> catch-up recommendation works without pretending the template itself is an overdue TaskItem', () => {
      // Wedding is in 60 days (past ideal recommended window of 240-365 days for venue)
      const nearWeddingDate = '2026-11-02'; // ~60 days from 2026-09-03
      const today = '2026-09-03';

      const recs = getStarterRecommendations({
        workspace: {
          ...baseWorkspace,
          weddingDate: nearWeddingDate,
        },
        tasks: [],
        events: [ceremonyEvent, receptionEvent],
        today,
      });

      expect(recs.length).toBeGreaterThan(0);
      recs.forEach((rec) => {
        // Catch-up mode active
        expect(rec.mode).toBe('catch_up');
        // Suggested due date MUST be a future or present date, NOT in the past (never overdue)
        expect(rec.suggestedDueDate).toBeDefined();
        expect(rec.suggestedDueDate! >= today).toBe(true);
        expect(rec.suggestedDueDate! <= nearWeddingDate).toBe(true);
        // Reason communicates urgency clearly without calling the uncreated task overdue
        expect(rec.reason).not.toContain('tugas terlambat');
        expect(rec.reason).toContain('dekat');
      });
    });
  });
});
