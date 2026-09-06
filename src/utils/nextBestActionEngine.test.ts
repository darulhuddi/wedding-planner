import { describe, it, expect } from 'vitest';
import { getNextBestAction } from './nextBestActionEngine';
import { StoredWorkspace } from '../types/workspace';
import { TaskItem } from '../types/checklist';
import { WeddingEvent } from '../domain/events';

function createMockWorkspace(overrides: Partial<StoredWorkspace> = {}): StoredWorkspace {
  return {
    id: 'ws-test-123',
    coupleName: 'Adit & Nisa',
    weddingDate: '2026-12-01',
    estimatedBudget: 150000000,
    estimatedGuestCount: 500,
    completedCategories: [],
    primaryPlanningPriority: 'timeline',
    religiousContexts: [{ tradition: 'islam', label: 'Islam' }],
    culturalContext: {
      hasTradition: null,
      description: null,
    },
    administrationContext: {
      groom: {
        birthDate: '1995-05-15',
        maritalStatus: 'single',
        citizenship: 'wni',
        serviceStatus: 'civilian',
        isSameKuaDistrictAsCeremony: true,
      },
      bride: {
        birthDate: '1997-08-20',
        maritalStatus: 'single',
        citizenship: 'wni',
        serviceStatus: 'civilian',
        isSameKuaDistrictAsCeremony: true,
      },
      hasSpecialWaliCase: false,
      isSetupCompleted: true,
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 'task-1',
    title: 'Survey Gedung & Venue',
    description: 'Bandingkan 3 opsi gedung pernikahan',
    category: 'venue',
    status: 'todo',
    priority: 'high',
    dueDate: '2026-09-01',
    estimatedMinutes: 60,
    source: 'custom',
    templateId: null,
    eventIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

const referenceDate = '2026-08-01';

describe('NextBestActionEngine (NBA Engine v3 Hardened)', () => {
  describe('1. Admin Guide Semantic State & Robustness', () => {
    it('(a) Guide generated + 0 active admin tasks (all completed) -> does NOT return GENERATE_ADMIN_GUIDE', () => {
      const ws = createMockWorkspace();
      const tasks: TaskItem[] = [
        createMockTask({
          id: 'admin-1',
          title: 'Urus Surat N1',
          category: 'prosesi_administrasi',
          source: 'template',
          templateId: 'adm-urus-n1',
          status: 'completed',
        }),
        createMockTask({
          id: 'admin-2',
          title: 'Daftar KUA',
          category: 'prosesi_administrasi',
          source: 'template',
          templateId: 'adm-daftar-kua',
          status: 'completed',
        }),
        createMockTask({
          id: 'venue-1',
          title: 'Pilih Venue',
          category: 'venue',
          status: 'todo',
        }),
      ];

      const nba = getNextBestAction(ws, tasks, referenceDate);
      expect(nba.actionType).not.toBe('GENERATE_ADMIN_GUIDE');
      expect(nba.target).not.toBe('administration');
      expect(nba.taskId).toBe('venue-1');
    });

    it('(b) Guide not generated + existing non-admin tasks -> returns GENERATE_ADMIN_GUIDE for Muslim context', () => {
      const ws = createMockWorkspace();
      const tasks: TaskItem[] = [
        createMockTask({
          id: 'catering-1',
          title: 'Food Tasting',
          category: 'catering',
          status: 'todo',
        }),
      ];

      const nba = getNextBestAction(ws, tasks, referenceDate);
      expect(nba.priorityLevel).toBe('P1');
      expect(nba.actionType).toBe('GENERATE_ADMIN_GUIDE');
      expect(nba.target).toBe('administration');
      expect(nba.ctaLabel).toBe('Buat Panduan');
    });

    it('(c) Guide generated + all tasks completed -> returns truthful completion message (not GENERATE_ADMIN_GUIDE)', () => {
      const ws = createMockWorkspace();
      const tasks: TaskItem[] = [
        createMockTask({
          id: 'admin-1',
          title: 'Urus Surat N1',
          category: 'prosesi_administrasi',
          source: 'template',
          templateId: 'adm-urus-n1',
          status: 'completed',
        }),
        createMockTask({
          id: 'venue-1',
          title: 'Pilih Venue',
          category: 'venue',
          status: 'completed',
        }),
      ];

      const nba = getNextBestAction(ws, tasks, referenceDate);
      expect(nba.actionType).toBe('OPEN_TIMELINE');
      expect(nba.title).toBe('Semua Tugas Saat Ini Selesai');
      expect(nba.actionType).not.toBe('GENERATE_ADMIN_GUIDE');
    });

    it('(d) Existing admin tasks that were NOT generated from the guide (custom tasks) -> returns GENERATE_ADMIN_GUIDE', () => {
      const ws = createMockWorkspace();
      // Custom task created by user in administration category without official guide templateId
      const tasks: TaskItem[] = [
        createMockTask({
          id: 'custom-admin-note',
          title: 'Tanya paman soal berkas',
          category: 'prosesi_administrasi',
          source: 'custom',
          templateId: null,
          status: 'todo',
        }),
      ];

      const nba = getNextBestAction(ws, tasks, referenceDate);
      expect(nba.priorityLevel).toBe('P1');
      expect(nba.actionType).toBe('GENERATE_ADMIN_GUIDE');
      expect(nba.target).toBe('administration');
    });
  });

  describe('2. Religious Context Categorization', () => {
    it('returns P0 Tentukan Konteks when religiousContexts is empty array', () => {
      const ws = createMockWorkspace({ religiousContexts: [] });
      const nba = getNextBestAction(ws, [createMockTask()], referenceDate);

      expect(nba.priorityLevel).toBe('P0');
      expect(nba.actionType).toBe('OPEN_ADMINISTRATION_SETUP');
      expect(nba.title).toBe('Tentukan Konteks Agama & Pernikahan');
      expect(nba.target).toBe('administration');
      expect(nba.ctaLabel).toBe('Tentukan Konteks');
    });

    it('returns P0 Tentukan Konteks when tradition is unspecified', () => {
      const ws = createMockWorkspace({
        religiousContexts: [{ tradition: 'unspecified', label: null }],
      });
      const nba = getNextBestAction(ws, [createMockTask()], referenceDate);

      expect(nba.priorityLevel).toBe('P0');
      expect(nba.actionType).toBe('OPEN_ADMINISTRATION_SETUP');
      expect(nba.title).toBe('Tentukan Konteks Agama & Pernikahan');
    });

    it('does NOT enforce KUA profile or KUA guide for explicit Christian context', () => {
      const ws = createMockWorkspace({
        religiousContexts: [{ tradition: 'christian', label: 'Kristen Protestan' }],
        administrationContext: undefined, // No KUA context
      });
      const tasks = [
        createMockTask({
          id: 'venue-task',
          category: 'venue',
          priority: 'high',
          status: 'todo',
        }),
      ];
      const nba = getNextBestAction(ws, tasks, referenceDate);

      expect(nba.actionType).not.toBe('OPEN_ADMINISTRATION_SETUP');
      expect(nba.actionType).not.toBe('GENERATE_ADMIN_GUIDE');
      expect(nba.taskId).toBe('venue-task');
    });

    it('does NOT enforce KUA profile or KUA guide for explicit Catholic context', () => {
      const ws = createMockWorkspace({
        religiousContexts: [{ tradition: 'catholic', label: 'Katolik' }],
        administrationContext: undefined,
      });
      const tasks = [
        createMockTask({
          id: 'venue-task',
          category: 'venue',
          priority: 'high',
          status: 'todo',
        }),
      ];
      const nba = getNextBestAction(ws, tasks, referenceDate);

      expect(nba.actionType).not.toBe('GENERATE_ADMIN_GUIDE');
      expect(nba.taskId).toBe('venue-task');
    });

    it('does NOT enforce KUA profile or KUA guide for mixed or custom tradition context', () => {
      const ws = createMockWorkspace({
        religiousContexts: [{ tradition: 'mixed', label: 'Pernikahan Lintas Agama' }],
        administrationContext: undefined,
      });
      const tasks = [
        createMockTask({
          id: 'catering-task',
          category: 'catering',
          priority: 'medium',
          status: 'todo',
        }),
      ];
      const nba = getNextBestAction(ws, tasks, referenceDate);

      expect(nba.actionType).not.toBe('GENERATE_ADMIN_GUIDE');
      expect(nba.taskId).toBe('catering-task');
    });
  });

  describe('3. Events & Foundational Planning Targets Dependencies', () => {
    const defaultEvents: WeddingEvent[] = [
      {
        id: 'ev-1',
        workspaceId: 'ws-test-123',
        type: 'ceremony',
        name: 'Akad Nikah',
        date: '2026-12-01',
        startTime: '08:00',
        endTime: '10:00',
        location: 'Masjid Al-Azhar',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const lowUrgencyTasks = [
      createMockTask({
        id: 'task-admin-tpl',
        category: 'prosesi_administrasi',
        source: 'template',
        templateId: 'adm-urus-n1',
        status: 'completed',
      }),
      createMockTask({
        id: 'decor-1',
        category: 'decoration',
        priority: 'low',
        dueDate: '2026-11-15',
        status: 'todo',
      }),
    ];

    it('events missing + budget missing + guests missing -> recommends OPEN_BUDGET first without masking', () => {
      const ws = createMockWorkspace({
        estimatedBudget: 0,
        estimatedGuestCount: 0,
      });
      const nba = getNextBestAction(ws, lowUrgencyTasks, referenceDate, []);

      expect(nba.priorityLevel).toBe('P3');
      expect(nba.actionType).toBe('OPEN_BUDGET');
      expect(nba.target).toBe('budget');
      expect(nba.ctaLabel).toBe('Atur Budget');
    });

    it('events present + budget missing -> recommends OPEN_BUDGET', () => {
      const ws = createMockWorkspace({
        estimatedBudget: 0,
        estimatedGuestCount: 400,
      });
      const nba = getNextBestAction(ws, lowUrgencyTasks, referenceDate, defaultEvents);

      expect(nba.priorityLevel).toBe('P3');
      expect(nba.actionType).toBe('OPEN_BUDGET');
      expect(nba.target).toBe('budget');
    });

    it('events present + guests missing -> recommends OPEN_GUESTS', () => {
      const ws = createMockWorkspace({
        estimatedBudget: 100000000,
        estimatedGuestCount: 0,
      });
      const nba = getNextBestAction(ws, lowUrgencyTasks, referenceDate, defaultEvents);

      expect(nba.priorityLevel).toBe('P3');
      expect(nba.actionType).toBe('OPEN_GUESTS');
      expect(nba.target).toBe('guests');
      expect(nba.ctaLabel).toBe('Atur Tamu');
    });

    it('events missing + budget/guests configured -> recommends OPEN_EVENTS', () => {
      const ws = createMockWorkspace({
        estimatedBudget: 100000000,
        estimatedGuestCount: 400,
      });
      const nba = getNextBestAction(ws, lowUrgencyTasks, referenceDate, []);

      expect(nba.priorityLevel).toBe('P3');
      expect(nba.actionType).toBe('OPEN_EVENTS');
      expect(nba.target).toBe('dashboard');
      expect(nba.ctaLabel).toBe('Tambah Acara');
    });
  });

  describe('4. Truthful Planning Completion Semantics', () => {
    it('returns "Semua Tugas Saat Ini Selesai" when all current checklist tasks are completed', () => {
      const ws = createMockWorkspace({
        religiousContexts: [{ tradition: 'christian', label: 'Kristen' }],
      });
      const tasks = [
        createMockTask({ id: 't1', status: 'completed' }),
        createMockTask({ id: 't2', status: 'completed' }),
      ];
      const nba = getNextBestAction(ws, tasks, referenceDate);

      expect(nba.title).toBe('Semua Tugas Saat Ini Selesai');
      expect(nba.description).toContain('checklist aktif telah diselesaikan');
      expect(nba.actionType).toBe('OPEN_TIMELINE');
      expect(nba.target).toBe('timeline');
      expect(nba.ctaLabel).toBe('Lihat Timeline');
      expect(nba.priorityTag).toBe('Checklist Selesai');
    });
  });

  describe('5. Passed Wedding Date & Workspace Lifecycle', () => {
    it('blocks active workspace when wedding date is in the past', () => {
      const ws = createMockWorkspace({ weddingDate: '2026-07-01' });
      const nba = getNextBestAction(ws, [createMockTask()], referenceDate);

      expect(nba.priorityLevel).toBe('P0');
      expect(nba.actionType).toBe('OPEN_WEDDING_IDENTITY');
      expect(nba.ctaLabel).toBe('Perbarui Tanggal');
    });

    it('bypasses passed-date blocker if workspace lifecycle status is archived or completed', () => {
      const ws = {
        ...createMockWorkspace({
          weddingDate: '2026-07-01',
          religiousContexts: [{ tradition: 'christian', label: 'Kristen' }],
        }),
        status: 'archived',
      } as any;
      const tasks = [createMockTask({ id: 't-done', status: 'completed' })];
      const nba = getNextBestAction(ws, tasks, referenceDate);

      expect(nba.actionType).not.toBe('OPEN_WEDDING_IDENTITY');
      expect(nba.title).toBe('Semua Tugas Saat Ini Selesai');
    });
  });

  describe('6. Determinism and Safety', () => {
    it('produces 100% deterministic results across repeated invocations', () => {
      const ws = createMockWorkspace({
        religiousContexts: [{ tradition: 'islam', label: 'Islam' }],
      });
      const tasks = [
        createMockTask({
          id: 'admin-tpl',
          category: 'prosesi_administrasi',
          source: 'template',
          templateId: 'adm-urus-n1',
          status: 'todo',
          dueDate: '2026-08-20',
        }),
        createMockTask({ id: 't1', priority: 'medium', dueDate: '2026-09-01' }),
        createMockTask({ id: 't2', priority: 'high', dueDate: '2026-09-01' }),
        createMockTask({ id: 't3', priority: 'low', dueDate: '2026-08-05' }),
      ];

      const firstResult = getNextBestAction(ws, tasks, referenceDate);
      for (let i = 0; i < 50; i++) {
        const result = getNextBestAction(ws, tasks, referenceDate);
        expect(result).toEqual(firstResult);
      }
    });
  });
});
