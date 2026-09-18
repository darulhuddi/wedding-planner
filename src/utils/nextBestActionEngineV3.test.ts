import { describe, it, expect } from 'vitest';
import { getNextBestAction } from './nextBestActionEngine';
import { StoredWorkspace } from '../types/workspace';
import { TaskItem } from '../types/checklist';
import { StoredBudget } from '../types/budget';
import { Vendor } from '../types/vendor';

function createMockWorkspace(overrides: Partial<StoredWorkspace> = {}): StoredWorkspace {
  return {
    id: 'ws-nba-v3',
    userId: 'user-nba-v3',
    coupleName: 'Ika & Farel',
    weddingDate: '2027-05-15',
    estimatedBudget: 100000000,
    estimatedGuestCount: 300,
    completedCategories: [],
    primaryPlanningPriority: 'vendor',
    religiousContexts: [{ tradition: 'christian', label: 'Kristen' }],
    culturalContext: { hasTradition: false, description: null },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createMockTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: `task-${Math.random().toString(36).substring(7)}`,
    title: 'Survey Lokasi Venue',
    description: 'Kunjungi 3 opsi gedung pernikahan utama',
    category: 'venue',
    status: 'todo',
    priority: 'medium',
    dueDate: '2026-10-01',
    estimatedMinutes: 60,
    source: 'custom',
    templateId: null,
    eventIds: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    completedAt: null,
    ...overrides,
  };
}

describe('Next Best Action V3: Unified Decision Engine Test Suite', () => {
  const referenceDate = '2026-09-18';

  describe('1. Administration Signals & Blockers', () => {
    it('generates Lengkapi Profil Administrasi when Islamic profile is incomplete', () => {
      const ws = createMockWorkspace({
        religiousContexts: [{ tradition: 'islam', label: 'Islam' }],
        administrationContext: undefined,
      });

      const nba = getNextBestAction(ws, [], referenceDate);

      expect(nba.priorityLevel).toBe('P0');
      expect(nba.title).toBe('Lengkapi Profil Administrasi');
      expect(nba.actionType).toBe('OPEN_ADMINISTRATION_SETUP');
      expect(nba.target).toBe('administration');
      expect(nba.whyNow).toContain('Data profil pasangan diperlukan');
    });

    it('generates Buat Panduan Berkas Administrasi when profile is complete but guide not generated', () => {
      const ws = createMockWorkspace({
        religiousContexts: [{ tradition: 'islam', label: 'Islam' }],
        administrationContext: {
          isSetupCompleted: true,
          groom: {} as any,
          bride: {} as any,
          hasSpecialWaliCase: false,
          updatedAt: '2026-01-01T00:00:00Z',
        },
      });

      const nba = getNextBestAction(ws, [], referenceDate);

      expect(nba.priorityLevel).toBe('P1');
      expect(nba.title).toBe('Buat Panduan Berkas Administrasi');
      expect(nba.actionType).toBe('GENERATE_ADMIN_GUIDE');
      expect(nba.target).toBe('administration');
      expect(nba.whyNow).toContain('Profil administrasi sudah selesai');
    });

    it('generates Overdue Administrative Task when KUA document deadline passed', () => {
      const ws = createMockWorkspace({
        religiousContexts: [{ tradition: 'islam', label: 'Islam' }],
        administrationContext: {
          isSetupCompleted: true,
          groom: {} as any,
          bride: {} as any,
          hasSpecialWaliCase: false,
          updatedAt: '2026-01-01T00:00:00Z',
        },
      });
      const overdueKuaTask = createMockTask({
        id: 'adm-kua-1',
        templateId: 'adm-daftar-kua',
        category: 'prosesi_administrasi',
        title: 'Daftar Nikah di Simkah KUA',
        dueDate: '2026-09-10', // 8 days overdue relative to referenceDate
        status: 'todo',
        priority: 'high',
      });

      const nba = getNextBestAction(ws, [overdueKuaTask], referenceDate);

      expect(nba.priorityLevel).toBe('P1');
      expect(nba.title).toBe('Daftar Nikah di Simkah KUA');
      expect(nba.source).toBe('overdue');
      expect(nba.priorityTag).toBe('Terlambat');
      expect(nba.actionType).toBe('OPEN_ADMIN_TASK');
    });
  });

  describe('2. Vendor Signals & Critical Sourcing', () => {
    it('recommends finding venue when budget is allocated but no venue vendor is selected', () => {
      const ws = createMockWorkspace({
        weddingDate: '2027-03-01', // ~6 months away
        estimatedBudget: 150000000,
      });

      const mockVendors: Vendor[] = [
        {
          id: 'v-cat-1',
          name: 'Catering Berkah',
          category: 'catering',
          status: 'contacted',
          quotedPrice: 40000000,
          contactName: null,
          phone: null,
          instagram: null,
          notes: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      const nba = getNextBestAction(ws, [createMockTask({ category: 'invitation', priority: 'low', dueDate: '2026-12-01' })], {
        today: referenceDate,
        vendors: mockVendors,
        budget: { allocations: [{ id: 'a1', category: 'venue', amount: 30000000, createdAt: '', updatedAt: '' }], expenses: [] },
      });

      expect(nba.title).toContain('Venue');
      expect(nba.type).toBe('vendor');
      expect(nba.category).toBe('venue');
      expect(nba.actionType).toBe('OPEN_VENDOR');
      expect(nba.whyNow).toContain('Venue perlu diamankan lebih awal');
    });

    it('transitions away from venue search once venue vendor is selected', () => {
      const ws = createMockWorkspace({
        weddingDate: '2027-03-01',
        estimatedBudget: 150000000,
      });

      const mockVendors: Vendor[] = [
        {
          id: 'v-venue-1',
          name: 'Grand Ballroom Hotel',
          category: 'venue',
          status: 'selected',
          quotedPrice: 35000000,
          contactName: null,
          phone: null,
          instagram: null,
          notes: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      const customTask = createMockTask({
        id: 'task-decor-1',
        category: 'decoration',
        title: 'Pilih Konsep Dekorasi Pelaminan',
        priority: 'high',
        dueDate: '2026-10-01',
      });

      const nba = getNextBestAction(ws, [customTask], {
        today: referenceDate,
        vendors: mockVendors,
        budget: { allocations: [], expenses: [] },
      });

      // Does NOT recommend "Cari Venue" because venue is already selected!
      expect(nba.title).not.toContain('Cari dan Tentukan Venue');
      expect(nba.taskId).toBe('task-decor-1');
    });
  });

  describe('3. Payment Obligations Signals (Overdue & Due Soon)', () => {
    it('prioritizes overdue vendor payment with P1 and explicit amount in whyNow', () => {
      const ws = createMockWorkspace();

      const mockVendors: Vendor[] = [
        {
          id: 'v-catering-sel',
          name: 'Royal Catering',
          category: 'catering',
          status: 'selected',
          quotedPrice: 25000000,
          contactName: null,
          phone: null,
          instagram: null,
          notes: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      const paymentTask = createMockTask({
        id: 'task-pay-overdue',
        category: 'catering',
        title: 'Pelunasan Vendor Royal Catering',
        dueDate: '2026-09-10', // overdue relative to referenceDate 2026-09-18
        status: 'todo',
        priority: 'high',
      });

      const mockBudget: StoredBudget = {
        allocations: [{ id: 'a1', category: 'catering', amount: 30000000, createdAt: '', updatedAt: '' }],
        expenses: [{ id: 'e1', category: 'catering', title: 'DP Catering', amount: 10000000, date: '2026-08-01', note: null, createdAt: '', updatedAt: '' }],
      };

      const nba = getNextBestAction(ws, [paymentTask], {
        today: referenceDate,
        vendors: mockVendors,
        budget: mockBudget,
      });

      expect(nba.priorityLevel).toBe('P1');
      expect(nba.type).toBe('budget');
      expect(nba.priorityTag).toBe('Jatuh Tempo');
      expect(nba.title).toContain('Selesaikan Pembayaran');
      expect(nba.whyNow).toContain('Rp15.000.000');
    });

    it('generates P2 payment action for upcoming payment due in 5 days', () => {
      const ws = createMockWorkspace();

      const mockVendors: Vendor[] = [
        {
          id: 'v-venue-sel',
          name: 'Sasana Kriya Ballroom',
          category: 'venue',
          status: 'selected',
          quotedPrice: 20000000,
          contactName: null,
          phone: null,
          instagram: null,
          notes: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];

      const paymentTask = createMockTask({
        id: 'task-pay-soon',
        category: 'venue',
        title: 'Pelunasan Sasana Kriya Ballroom',
        dueDate: '2026-09-23', // 5 days from referenceDate 2026-09-18
        status: 'todo',
        priority: 'high',
      });

      const mockBudget: StoredBudget = {
        allocations: [{ id: 'a1', category: 'venue', amount: 20000000, createdAt: '', updatedAt: '' }],
        expenses: [{ id: 'e1', category: 'venue', title: 'DP Venue', amount: 5000000, date: '2026-08-01', note: null, createdAt: '', updatedAt: '' }],
      };

      const nba = getNextBestAction(ws, [paymentTask], {
        today: referenceDate,
        vendors: mockVendors,
        budget: mockBudget,
      });

      expect(nba.priorityLevel).toBe('P2');
      expect(nba.type).toBe('budget');
      expect(nba.title).toContain('Siapkan Pembayaran');
      expect(nba.whyNow).toContain('5 hari');
    });
  });

  describe('4. Budget Health & Projected Deficit Signals', () => {
    it('generates Review Budget when projected deficit occurs without double-counting', () => {
      const ws = createMockWorkspace({
        estimatedBudget: 50000000, // Total budget 50jt
      });

      const mockBudget: StoredBudget = {
        allocations: [
          { id: 'a1', category: 'venue', amount: 25000000, createdAt: '', updatedAt: '' },
          { id: 'a2', category: 'catering', amount: 30000000, createdAt: '', updatedAt: '' },
        ],
        expenses: [
          { id: 'e1', category: 'venue', title: 'DP Venue', amount: 20000000, date: '2026-08-01', note: null, createdAt: '', updatedAt: '' },
        ],
      };

      // Remaining budget = 30jt, but Catering needs 30jt and Venue needs 5jt -> Total needs 35jt -> Deficit 5jt!
      const nba = getNextBestAction(ws, [createMockTask({ priority: 'low', dueDate: '2026-11-01' })], {
        today: referenceDate,
        budget: mockBudget,
      });

      expect(nba.priorityLevel).toBe('P2');
      expect(nba.type).toBe('budget');
      expect(nba.title).toBe('Review Alokasi Anggaran Pernikahan');
      expect(nba.priorityTag).toBe('Potensi Defisit');
      expect(nba.whyNow).toContain('potensi kekurangan');
    });

    it('generates Budget Overrun candidate when total spent exceeds total budget', () => {
      const ws = createMockWorkspace({
        estimatedBudget: 50000000,
      });

      const mockBudget: StoredBudget = {
        allocations: [],
        expenses: [
          { id: 'e1', category: 'venue', title: 'Pelunasan Venue', amount: 60000000, date: '2026-08-01', note: null, createdAt: '', updatedAt: '' },
        ],
      };

      const nba = getNextBestAction(ws, [createMockTask({ priority: 'low', dueDate: '2026-11-01' })], {
        today: referenceDate,
        budget: mockBudget,
      });

      expect(nba.priorityLevel).toBe('P1');
      expect(nba.type).toBe('budget');
      expect(nba.title).toBe('Tinjau Pengeluaran Melebihi Anggaran');
      expect(nba.priorityTag).toBe('Budget Terlampaui');
    });
  });

  describe('5. Constraint Filtering & Prerequisite Invariants', () => {
    it('never recommends completed tasks', () => {
      const ws = createMockWorkspace();
      const completedTask = createMockTask({
        id: 't-done',
        status: 'completed',
        priority: 'high',
        dueDate: '2026-09-01',
      });
      const activeTask = createMockTask({
        id: 't-active',
        status: 'todo',
        priority: 'medium',
        dueDate: '2026-10-15',
      });

      const nba = getNextBestAction(ws, [completedTask, activeTask], referenceDate);

      expect(nba.taskId).toBe('t-active');
    });

    it('returns Semua Tugas Saat Ini Selesai when all tasks are completed', () => {
      const ws = createMockWorkspace();
      const completedTasks = [
        createMockTask({ id: 't1', status: 'completed' }),
        createMockTask({ id: 't2', status: 'completed' }),
      ];

      const nba = getNextBestAction(ws, completedTasks, referenceDate);

      expect(nba.priorityLevel).toBe('P4');
      expect(nba.title).toBe('Semua Tugas Saat Ini Selesai');
      expect(nba.actionType).toBe('OPEN_TIMELINE');
    });
  });

  describe('6. Deterministic Tie-Breaking & Recalculation', () => {
    it('resolves exact score ties by earliest due date', () => {
      const ws = createMockWorkspace();
      const taskA = createMockTask({ id: 'task-a', dueDate: '2026-10-05', priority: 'medium', category: 'general' });
      const taskB = createMockTask({ id: 'task-b', dueDate: '2026-10-02', priority: 'medium', category: 'general' });

      const nba = getNextBestAction(ws, [taskA, taskB], referenceDate);

      expect(nba.taskId).toBe('task-b');
    });

    it('resolves same due date ties by higher priority', () => {
      const ws = createMockWorkspace();
      const taskMedium = createMockTask({ id: 'task-med', dueDate: '2026-10-05', priority: 'medium', category: 'general' });
      const taskHigh = createMockTask({ id: 'task-high', dueDate: '2026-10-05', priority: 'high', category: 'general' });

      const nba = getNextBestAction(ws, [taskMedium, taskHigh], referenceDate);

      expect(nba.taskId).toBe('task-high');
    });

    it('guarantees 100% deterministic output across 100 repeated executions', () => {
      const ws = createMockWorkspace();
      const tasks = [
        createMockTask({ id: 't-1', dueDate: '2026-10-05', priority: 'medium', category: 'venue' }),
        createMockTask({ id: 't-2', dueDate: '2026-10-02', priority: 'high', category: 'catering' }),
        createMockTask({ id: 't-3', dueDate: '2026-10-02', priority: 'medium', category: 'photography' }),
      ];

      const first = getNextBestAction(ws, tasks, referenceDate);

      for (let i = 0; i < 100; i++) {
        const current = getNextBestAction(ws, tasks, referenceDate);
        expect(current.taskId).toBe(first.taskId);
        expect(current.title).toBe(first.title);
        expect(current.priorityScore).toBe(first.priorityScore);
      }
    });
  });
});
