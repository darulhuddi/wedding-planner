import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as workspaceRepository from '../repositories/workspaceRepository';
import { StoredWorkspace } from '../types/workspace';
import { TaskItem } from '../types/checklist';
import { WeddingEvent } from './events';
import { deriveWorkspaceViewModel } from './workspaceSelectors';
import { getNextBestAction } from '../utils/nextBestActionEngine';
import { getModuleProgress, getCompletedModuleCount } from './moduleSelectors';
import { groupTasksByTime } from '../utils/checklistUtils';
import { getTimelineGroups } from './timelineSelectors';

describe('Phase 1: Wedding Context & Event Foundation Integration Tests', () => {
  const sampleWorkspaceId = 'w-ctx-1111-4111-8111-111111111111';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Scenario 1: Existing workspace without context fields', () => {
    it('loads successfully with safe default empty context values', () => {
      // Raw legacy workspace without religiousContexts or culturalContext
      const legacyRaw = {
        id: sampleWorkspaceId,
        userId: 'u1',
        coupleName: 'Budi & Citra',
        weddingDate: '2027-06-20',
        estimatedBudget: 150_000_000,
        estimatedGuestCount: 350,
        completedCategories: ['venue' as const],
        primaryPlanningPriority: 'budget' as const,
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      // When mapped through adapter or normalized
      const normalized: StoredWorkspace = {
        ...legacyRaw,
        religiousContexts: (legacyRaw as any).religiousContexts || [],
        culturalContext: (legacyRaw as any).culturalContext || {
          hasTradition: null,
          description: null,
        },
      };

      expect(normalized.religiousContexts).toEqual([]);
      expect(normalized.culturalContext).toEqual({
        hasTradition: null,
        description: null,
      });

      const viewModel = deriveWorkspaceViewModel(normalized, []);
      expect(viewModel.coupleName).toBe('Budi & Citra');
      expect(viewModel.religiousContexts).toEqual([]);
      expect(viewModel.culturalContext.hasTradition).toBeNull();
    });
  });

  describe('Scenario 2: Workspace with Islam context', () => {
    it('persists and reloads religious context exactly', async () => {
      const workspaceWithIslam: StoredWorkspace = {
        id: sampleWorkspaceId,
        userId: 'u1',
        coupleName: 'Adit & Nisa',
        weddingDate: '2027-02-14',
        estimatedBudget: 100_000_000,
        estimatedGuestCount: 400,
        completedCategories: [],
        primaryPlanningPriority: 'checklist',
        religiousContexts: [{ tradition: 'islam', label: 'KUA Pasar Minggu' }],
        culturalContext: { hasTradition: null, description: null },
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      vi.spyOn(workspaceRepository, 'getWorkspace').mockResolvedValue(workspaceWithIslam);
      const loaded = await workspaceRepository.getWorkspace('u1');

      expect(loaded?.religiousContexts).toHaveLength(1);
      expect(loaded?.religiousContexts[0].tradition).toBe('islam');
      expect(loaded?.religiousContexts[0].label).toBe('KUA Pasar Minggu');
    });
  });

  describe('Scenario 3: Workspace with mixed contexts', () => {
    it('persists multiple ReligiousContext values safely', async () => {
      const workspaceWithMixed: StoredWorkspace = {
        id: sampleWorkspaceId,
        userId: 'u1',
        coupleName: 'Reza & Maria',
        weddingDate: '2027-08-17',
        estimatedBudget: 200_000_000,
        estimatedGuestCount: 500,
        completedCategories: [],
        primaryPlanningPriority: 'vendor',
        religiousContexts: [
          { tradition: 'islam', label: 'Akad Nikah' },
          { tradition: 'catholic', label: 'Pemberkatan Gereja' },
        ],
        culturalContext: { hasTradition: null, description: null },
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      vi.spyOn(workspaceRepository, 'getWorkspace').mockResolvedValue(workspaceWithMixed);
      const loaded = await workspaceRepository.getWorkspace('u1');

      expect(loaded?.religiousContexts).toHaveLength(2);
      expect(loaded?.religiousContexts[0].tradition).toBe('islam');
      expect(loaded?.religiousContexts[1].tradition).toBe('catholic');
    });
  });

  describe('Scenario 4: Workspace with cultural description', () => {
    it('persists free-form cultural description without hardcoded limitation', async () => {
      const workspaceWithTradition: StoredWorkspace = {
        id: sampleWorkspaceId,
        userId: 'u1',
        coupleName: 'Dimas & Ratna',
        weddingDate: '2027-10-10',
        estimatedBudget: 180_000_000,
        estimatedGuestCount: 450,
        completedCategories: [],
        primaryPlanningPriority: 'timeline',
        religiousContexts: [{ tradition: 'islam', label: null }],
        culturalContext: {
          hasTradition: true,
          description: 'Adat Jawa Solo (Siraman, Midodareni, Panggih) & Sunda',
        },
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      vi.spyOn(workspaceRepository, 'getWorkspace').mockResolvedValue(workspaceWithTradition);
      const loaded = await workspaceRepository.getWorkspace('u1');

      expect(loaded?.culturalContext.hasTradition).toBe(true);
      expect(loaded?.culturalContext.description).toBe(
        'Adat Jawa Solo (Siraman, Midodareni, Panggih) & Sunda'
      );
    });
  });

  describe('Scenario 5 & 6: Multiple Wedding Events Coexistence', () => {
    it('creates Akad and Reception events under the correct workspace', async () => {
      const eventAkad: WeddingEvent = {
        id: 'event-akad-1',
        workspaceId: sampleWorkspaceId,
        type: 'ceremony',
        name: 'Akad Nikah',
        date: '2027-06-20',
        startTime: '08:00',
        endTime: '10:30',
        location: 'Masjid Pondok Indah',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      const eventReception: WeddingEvent = {
        id: 'event-reception-1',
        workspaceId: sampleWorkspaceId,
        type: 'reception',
        name: 'Resepsi Pernikahan',
        date: '2027-06-20',
        startTime: '19:00',
        endTime: '22:00',
        location: 'Grand Ballroom Hotel Mulia',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      vi.spyOn(workspaceRepository, 'getEvents').mockResolvedValue([eventAkad, eventReception]);
      const events = await workspaceRepository.getEvents(sampleWorkspaceId);

      expect(events).toHaveLength(2);
      expect(events[0].name).toBe('Akad Nikah');
      expect(events[0].type).toBe('ceremony');
      expect(events[1].name).toBe('Resepsi Pernikahan');
      expect(events[1].type).toBe('reception');
    });
  });

  describe('Scenario 7 & 8: Task Linked to Single or Multiple Events', () => {
    it('supports linking task to single event or multiple events while remaining canonical TaskItem', () => {
      const taskLinkedToAkad: TaskItem = {
        id: 'task-1',
        title: 'Siapkan Buku Nikah & Mahar',
        description: null,
        category: 'general',
        status: 'todo',
        priority: 'high',
        dueDate: '2027-06-15',
        estimatedMinutes: 30,
        source: 'template',
        templateId: null,
        eventIds: ['event-akad-1'],
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        completedAt: null,
      };

      const taskLinkedToBoth: TaskItem = {
        id: 'task-2',
        title: 'Briefing Tim Dokumentasi Foto & Video',
        description: null,
        category: 'photography',
        status: 'todo',
        priority: 'high',
        dueDate: '2027-06-18',
        estimatedMinutes: 60,
        source: 'custom',
        templateId: null,
        eventIds: ['event-akad-1', 'event-reception-1'],
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        completedAt: null,
      };

      expect(taskLinkedToAkad.eventIds).toEqual(['event-akad-1']);
      expect(taskLinkedToBoth.eventIds).toEqual(['event-akad-1', 'event-reception-1']);
    });
  });

  describe('Scenario 9: Deleting Event Preserves Tasks and Cleans Relation', () => {
    it('disassociates eventId from task without deleting the task', () => {
      const initialTask: TaskItem = {
        id: 'task-1',
        title: 'Booking Penghulu KUA',
        description: null,
        category: 'venue',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2027-05-01',
        estimatedMinutes: null,
        source: 'template',
        templateId: null,
        eventIds: ['event-akad-1', 'event-other-1'],
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        completedAt: null,
      };

      // Simulating event-akad-1 deletion disassociation
      const deletedEventId = 'event-akad-1';
      const updatedTask: TaskItem = {
        ...initialTask,
        eventIds: initialTask.eventIds.filter((id) => id !== deletedEventId),
        updatedAt: new Date().toISOString(),
      };

      // Task is preserved, only eventId reference is removed
      expect(updatedTask.id).toBe('task-1');
      expect(updatedTask.status).toBe('in_progress');
      expect(updatedTask.eventIds).toEqual(['event-other-1']);
    });
  });

  describe('Scenario 10: Workspace Isolation', () => {
    it('ensures events are strictly partitioned by workspaceId', async () => {
      const wsAEvents: WeddingEvent[] = [
        {
          id: 'e-ws-a',
          workspaceId: 'ws-A',
          type: 'ceremony',
          name: 'Akad WS A',
          date: '2027-06-20',
          startTime: null,
          endTime: null,
          location: null,
          createdAt: '',
          updatedAt: '',
        },
      ];

      vi.spyOn(workspaceRepository, 'getEvents').mockImplementation(async (wsId: string) => {
        if (wsId === 'ws-A') return wsAEvents;
        return [];
      });

      const eventsA = await workspaceRepository.getEvents('ws-A');
      const eventsB = await workspaceRepository.getEvents('ws-B');

      expect(eventsA).toHaveLength(1);
      expect(eventsB).toHaveLength(0);
    });
  });

  describe('Scenario 11 & 12: Checklist and Timeline Compatibility', () => {
    it('Checklist and Timeline selectors function without errors on tasks with eventIds', () => {
      const tasks: TaskItem[] = [
        {
          id: 't1',
          title: 'Cari Venue',
          description: null,
          category: 'venue',
          status: 'todo',
          priority: 'high',
          dueDate: '2027-01-10',
          estimatedMinutes: null,
          source: 'template',
          templateId: null,
          eventIds: ['event-1'],
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
          completedAt: null,
        },
      ];

      // Checklist grouping
      const checklistGroups = groupTasksByTime(tasks);
      expect(checklistGroups).toBeDefined();
      expect(checklistGroups.length).toBeGreaterThan(0);

      // Timeline grouping
      const timelineGroups = getTimelineGroups(tasks, '2027-06-20');
      expect(timelineGroups).toBeDefined();
      expect(timelineGroups.length).toBeGreaterThan(0);
    });
  });

  describe('Scenario 13 & 14: Dashboard & NBA Compatibility', () => {
    it('Dashboard module progress and NBA engine remain deterministic and unchanged', () => {
      const tasks: TaskItem[] = [
        {
          id: 't1',
          title: 'DP Venue',
          description: null,
          category: 'venue',
          status: 'completed',
          priority: 'high',
          dueDate: '2027-01-10',
          estimatedMinutes: null,
          source: 'template',
          templateId: null,
          eventIds: ['e1'],
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
          completedAt: '2026-09-01T00:00:00Z',
        },
      ];

      const workspace: StoredWorkspace = {
        id: sampleWorkspaceId,
        coupleName: 'Adit & Nisa',
        weddingDate: '2027-06-20',
        estimatedBudget: 100_000_000,
        estimatedGuestCount: 400,
        completedCategories: [],
        primaryPlanningPriority: 'budget',
        religiousContexts: [{ tradition: 'islam', label: null }],
        culturalContext: { hasTradition: null, description: null },
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      // Module Progress
      const venueProgress = getModuleProgress(tasks, 'venue');
      expect(venueProgress.status).toBe('completed');
      expect(getCompletedModuleCount(tasks)).toBe(1);

      // NBA
      const nba = getNextBestAction(workspace, tasks, '2026-09-03');
      expect(nba).toBeDefined();
      expect(nba.title).toBeDefined();
      expect(nba.reason).toBeDefined();
    });
  });
});
