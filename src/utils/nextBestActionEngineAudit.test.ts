import { describe, it, expect } from 'vitest';
import { getNextBestAction } from './nextBestActionEngine';
import { StoredWorkspace } from '../types/workspace';
import { TaskItem } from '../types/checklist';
import { StoredBudget } from '../types/budget';
import { Vendor } from '../types/vendor';
import { WeddingEvent } from '../domain/events';

function createMockWorkspace(overrides: Partial<StoredWorkspace> = {}): StoredWorkspace {
  return {
    id: 'ws-audit-v3',
    userId: 'user-audit-v3',
    coupleName: 'Ika & Farel',
    weddingDate: '2027-05-15',
    estimatedBudget: 150000000,
    estimatedGuestCount: 400,
    completedCategories: [],
    primaryPlanningPriority: 'vendor',
    religiousContexts: [{ tradition: 'christian', label: 'Kristen' }],
    culturalContext: { hasTradition: false, description: null },
    administrationContext: {
      isSetupCompleted: true,
      groom: {
        birthDate: '1998-05-12',
        maritalStatus: 'single',
        citizenship: 'wni',
        serviceStatus: 'civilian',
        isSameKuaDistrictAsCeremony: true,
      },
      bride: {
        birthDate: '2000-08-20',
        maritalStatus: 'single',
        citizenship: 'wni',
        serviceStatus: 'civilian',
        isSameKuaDistrictAsCeremony: true,
      },
      hasSpecialWaliCase: false,
      updatedAt: '2026-01-01T00:00:00Z',
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createMockTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: `task-${Math.random().toString(36).substring(7)}`,
    title: 'Survei Rekomendasi Gedung',
    description: 'Bandingkan 3 venue teratas untuk resepsi',
    category: 'venue',
    status: 'todo',
    priority: 'medium',
    dueDate: '2026-11-01',
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

describe('NBA V3 Product Logic & State Transition Audit', () => {
  const referenceToday = '2026-09-18';

  // ───────────────────────────────────────────────────────────────────────────
  // 1. STATE TRANSITION AUDIT (SCENARIO A — VENUE)
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. State Transition Audit — Venue Lifecycle', () => {
    const ws = createMockWorkspace({ weddingDate: '2027-02-15' }); // ~150 days

    it('STATE 1: Venue not selected -> Recommends finding venue', () => {
      const tasks = [
        createMockTask({ id: 't-admin', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-photo', category: 'photography', priority: 'low', dueDate: '2026-12-01' }),
      ];
      const vendors: Vendor[] = [];
      const nba = getNextBestAction(ws, tasks, { today: referenceToday, vendors, budget: { allocations: [{ id: 'a1', category: 'venue', amount: 40000000, createdAt: '', updatedAt: '' }], expenses: [] } });

      expect(nba.type).toBe('vendor');
      expect(nba.category).toBe('venue');
      expect(nba.title).toContain('Venue');
      expect(nba.actionType).toBe('OPEN_VENDOR');
    });

    it('STATE 2: Venue selected -> "Cari venue" recommendation MUST disappear', () => {
      const tasks = [
        createMockTask({ id: 't-admin', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-photo', category: 'photography', priority: 'medium', dueDate: '2026-10-15' }),
      ];
      const vendors: Vendor[] = [
        {
          id: 'v-venue-sel',
          name: 'Grand Ballroom Sudirman',
          category: 'venue',
          status: 'selected',
          quotedPrice: 45000000,
          contactName: null,
          phone: null,
          instagram: null,
          notes: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];
      const nba = getNextBestAction(ws, tasks, { today: referenceToday, vendors, budget: { allocations: [{ id: 'a1', category: 'venue', amount: 45000000, createdAt: '', updatedAt: '' }], expenses: [] } });

      expect(nba.title).not.toContain('Cari dan Tentukan Venue');
      expect(nba.type).not.toBe('vendor');
      expect(nba.taskId).toBe('t-photo');
    });

    it('STATE 3: Venue selected + upcoming payment -> NBA transitions to payment action', () => {
      const tasks = [
        createMockTask({ id: 't-admin', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-pay-venue', category: 'venue', title: 'Bayar DP Grand Ballroom Sudirman', dueDate: '2026-09-22', priority: 'high' }), // 4 days away
      ];
      const vendors: Vendor[] = [
        {
          id: 'v-venue-sel',
          name: 'Grand Ballroom Sudirman',
          category: 'venue',
          status: 'selected',
          quotedPrice: 45000000,
          contactName: null,
          phone: null,
          instagram: null,
          notes: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];
      const nba = getNextBestAction(ws, tasks, {
        today: referenceToday,
        vendors,
        budget: { allocations: [{ id: 'a1', category: 'venue', amount: 45000000, createdAt: '', updatedAt: '' }], expenses: [] },
      });

      expect(nba.type).toBe('budget');
      expect(nba.title).toContain('Siapkan Pembayaran');
      expect(nba.actionType).toBe('OPEN_BUDGET');
      expect(nba.whyNow).toContain('4 hari');
    });

    it('STATE 4: Payment paid -> Payment action MUST disappear, transitions to next routine task', () => {
      const tasks = [
        createMockTask({ id: 't-admin', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-pay-venue', category: 'venue', title: 'Bayar DP Grand Ballroom Sudirman', dueDate: '2026-09-22', status: 'completed' }),
        createMockTask({ id: 't-catering-menu', category: 'catering', title: 'Pilih Menu Catering', dueDate: '2026-10-20', priority: 'medium' }),
      ];
      const vendors: Vendor[] = [
        {
          id: 'v-venue-sel',
          name: 'Grand Ballroom Sudirman',
          category: 'venue',
          status: 'selected',
          quotedPrice: 45000000,
          contactName: null,
          phone: null,
          instagram: null,
          notes: null,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ];
      const nba = getNextBestAction(ws, tasks, {
        today: referenceToday,
        vendors,
        budget: {
          allocations: [{ id: 'a1', category: 'venue', amount: 45000000, createdAt: '', updatedAt: '' }],
          expenses: [{ id: 'e1', category: 'venue', title: 'Pelunasan Grand Ballroom Sudirman', amount: 45000000, date: '2026-09-18', note: null, createdAt: '', updatedAt: '' }],
        },
      });

      expect(nba.type).toBe('task');
      expect(nba.taskId).toBe('t-catering-menu');
      expect(nba.title).toBe('Pilih Menu Catering');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. ADMINISTRATION STATE TRANSITION
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Administration State Transition', () => {
    it('STATE 1: Incomplete profile -> Lengkapi Profil Administrasi (P0)', () => {
      const ws = createMockWorkspace({
        religiousContexts: [{ tradition: 'islam', label: 'Islam' }],
        administrationContext: undefined,
      });
      const nba = getNextBestAction(ws, [], referenceToday);

      expect(nba.priorityLevel).toBe('P0');
      expect(nba.title).toBe('Lengkapi Profil Administrasi');
      expect(nba.actionType).toBe('OPEN_ADMINISTRATION_SETUP');
    });

    it('STATE 2: Profile complete but guide not created -> Buat Panduan Berkas Administrasi (P1)', () => {
      const ws = createMockWorkspace({
        religiousContexts: [{ tradition: 'islam', label: 'Islam' }],
      });
      const nba = getNextBestAction(ws, [], referenceToday);

      expect(nba.priorityLevel).toBe('P1');
      expect(nba.title).toBe('Buat Panduan Berkas Administrasi');
      expect(nba.actionType).toBe('GENERATE_ADMIN_GUIDE');
    });

    it('STATE 3: Guide generated + document task active -> Recommends administration document task', () => {
      const ws = createMockWorkspace({
        religiousContexts: [{ tradition: 'islam', label: 'Islam' }],
      });
      const adminTasks = [
        createMockTask({ id: 't-doc-n1', category: 'prosesi_administrasi', templateId: 'adm-urus-n1', title: 'Urus Surat Pengantar N1 di Kelurahan', dueDate: '2026-09-25', priority: 'high' }),
      ];
      const nba = getNextBestAction(ws, adminTasks, referenceToday);

      expect(nba.type).toBe('task');
      expect(nba.taskId).toBe('t-doc-n1');
      expect(nba.actionType).toBe('OPEN_ADMIN_TASK');
    });

    it('STATE 4: Document task completed -> Admin document action clears, moves to next task', () => {
      const ws = createMockWorkspace({
        religiousContexts: [{ tradition: 'islam', label: 'Islam' }],
      });
      const tasks = [
        createMockTask({ id: 't-doc-n1', category: 'prosesi_administrasi', templateId: 'adm-urus-n1', title: 'Urus Surat Pengantar N1 di Kelurahan', status: 'completed' }),
        createMockTask({ id: 't-next', category: 'catering', title: 'Test Food Katering', priority: 'medium', dueDate: '2026-10-10' }),
      ];
      const nba = getNextBestAction(ws, tasks, referenceToday);

      expect(nba.taskId).toBe('t-next');
      expect(nba.actionType).toBe('OPEN_CHECKLIST_TASK');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. BUDGET STATE TRANSITION
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. Budget State Transition', () => {
    it('STATE 1: Budget healthy -> No budget warning, routine task recommended', () => {
      const ws = createMockWorkspace({ estimatedBudget: 100000000 });
      const budget: StoredBudget = {
        allocations: [{ id: 'a1', category: 'venue', amount: 30000000, createdAt: '', updatedAt: '' }],
        expenses: [{ id: 'e1', category: 'venue', title: 'DP Venue', amount: 10000000, date: '2026-08-01', note: null, createdAt: '', updatedAt: '' }],
      };
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-routine', category: 'photography', title: 'Pilih Fotografer', dueDate: '2026-10-15', priority: 'medium' }),
      ];

      const nba = getNextBestAction(ws, tasks, { today: referenceToday, budget });

      expect(nba.type).toBe('task');
      expect(nba.taskId).toBe('t-routine');
      expect(nba.title).not.toContain('Review Alokasi Anggaran');
      expect(nba.title).not.toContain('Melebihi Anggaran');
    });

    it('STATE 2: Actual spending exceeds total budget -> Budget overrun warning (P1)', () => {
      const ws = createMockWorkspace({ estimatedBudget: 50000000 });
      const budget: StoredBudget = {
        allocations: [],
        expenses: [{ id: 'e1', category: 'venue', title: 'Venue Total', amount: 60000000, date: '2026-08-01', note: null, createdAt: '', updatedAt: '' }],
      };
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-routine', category: 'photography', priority: 'low', dueDate: '2026-12-01' }),
      ];

      const nba = getNextBestAction(ws, tasks, { today: referenceToday, budget });

      expect(nba.priorityLevel).toBe('P1');
      expect(nba.type).toBe('budget');
      expect(nba.priorityTag).toBe('Budget Terlampaui');
    });

    it('STATE 3: Projected deficit -> Review Budget candidate generated (P2)', () => {
      const ws = createMockWorkspace({ estimatedBudget: 50000000 });
      const budget: StoredBudget = {
        allocations: [
          { id: 'a1', category: 'venue', amount: 30000000, createdAt: '', updatedAt: '' },
          { id: 'a2', category: 'catering', amount: 30000000, createdAt: '', updatedAt: '' },
        ],
        expenses: [{ id: 'e1', category: 'venue', title: 'DP Venue', amount: 20000000, date: '2026-08-01', note: null, createdAt: '', updatedAt: '' }],
      };
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-routine', category: 'photography', priority: 'low', dueDate: '2026-12-01' }),
      ];

      const nba = getNextBestAction(ws, tasks, { today: referenceToday, budget });

      expect(nba.priorityLevel).toBe('P2');
      expect(nba.type).toBe('budget');
      expect(nba.title).toBe('Review Alokasi Anggaran Pernikahan');
      expect(nba.priorityTag).toBe('Potensi Defisit');
    });

    it('STATE 4: Projection surplus restored -> Deficit-related NBA disappears', () => {
      const ws = createMockWorkspace({ estimatedBudget: 70000000 }); // Budget increased to 70jt
      const budget: StoredBudget = {
        allocations: [
          { id: 'a1', category: 'venue', amount: 30000000, createdAt: '', updatedAt: '' },
          { id: 'a2', category: 'catering', amount: 30000000, createdAt: '', updatedAt: '' },
        ],
        expenses: [{ id: 'e1', category: 'venue', title: 'DP Venue', amount: 20000000, date: '2026-08-01', note: null, createdAt: '', updatedAt: '' }],
      };
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-routine', category: 'photography', priority: 'medium', dueDate: '2026-10-15' }),
      ];

      const nba = getNextBestAction(ws, tasks, { today: referenceToday, budget });

      expect(nba.title).not.toBe('Review Alokasi Anggaran Pernikahan');
      expect(nba.taskId).toBe('t-routine');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. PAYMENT STATE TRANSITION
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. Payment State Transition & Invariants', () => {
    const ws = createMockWorkspace();
    const vendor: Vendor = {
      id: 'v-cat-sel',
      name: 'Berkah Catering',
      category: 'catering',
      status: 'selected',
      quotedPrice: 30000000,
      contactName: null,
      phone: null,
      instagram: null,
      notes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    it('No payment obligation -> Routine task recommended', () => {
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-photo', category: 'photography', dueDate: '2026-10-15', priority: 'medium' }),
      ];
      const nba = getNextBestAction(ws, tasks, { today: referenceToday });
      expect(nba.taskId).toBe('t-photo');
    });

    it('Upcoming payment in 5 days -> P2 Siapkan Pembayaran', () => {
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-pay', category: 'catering', title: 'Pelunasan Berkah Catering', dueDate: '2026-09-23', priority: 'high' }), // 5 days
      ];
      const budget: StoredBudget = { allocations: [{ id: 'a1', category: 'catering', amount: 30000000, createdAt: '', updatedAt: '' }], expenses: [] };

      const nba = getNextBestAction(ws, tasks, { today: referenceToday, vendors: [vendor], budget });
      expect(nba.priorityLevel).toBe('P2');
      expect(nba.title).toContain('Siapkan Pembayaran');
    });

    it('Due today payment -> P1 Selesaikan Pembayaran', () => {
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-pay', category: 'catering', title: 'Pelunasan Berkah Catering', dueDate: '2026-09-18', priority: 'high' }), // Due today!
      ];
      const budget: StoredBudget = { allocations: [{ id: 'a1', category: 'catering', amount: 30000000, createdAt: '', updatedAt: '' }], expenses: [] };

      const nba = getNextBestAction(ws, tasks, { today: referenceToday, vendors: [vendor], budget });
      expect(nba.priorityLevel).toBe('P1');
      expect(nba.priorityTag).toBe('Hari Ini');
    });

    it('Overdue payment -> P1 Selesaikan Pembayaran (Jatuh Tempo) with top urgency', () => {
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-pay', category: 'catering', title: 'Pelunasan Berkah Catering', dueDate: '2026-09-10', priority: 'high' }), // Overdue by 8 days!
        createMockTask({ id: 't-routine', category: 'invitation', title: 'Cetak Undangan', dueDate: '2026-09-12', priority: 'high' }),
      ];
      const budget: StoredBudget = { allocations: [{ id: 'a1', category: 'catering', amount: 30000000, createdAt: '', updatedAt: '' }], expenses: [] };

      const nba = getNextBestAction(ws, tasks, { today: referenceToday, vendors: [vendor], budget });
      expect(nba.priorityLevel).toBe('P1');
      expect(nba.type).toBe('budget');
      expect(nba.priorityTag).toBe('Jatuh Tempo');
      expect(nba.title).toContain('Selesaikan Pembayaran');
    });

    it('Paid payment -> Never becomes NBA', () => {
      const selectedVenueVendor: Vendor = {
        id: 'v-venue-sel',
        name: 'Grand Ballroom',
        category: 'venue',
        status: 'selected',
        quotedPrice: 40000000,
        contactName: null,
        phone: null,
        instagram: null,
        notes: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-pay', category: 'catering', title: 'Pelunasan Berkah Catering', dueDate: '2026-09-10', status: 'completed' }),
        createMockTask({ id: 't-decor', category: 'decoration', title: 'Pilih Bunga Dekorasi', dueDate: '2026-10-20', priority: 'medium' }),
      ];
      const budget: StoredBudget = {
        allocations: [{ id: 'a1', category: 'catering', amount: 30000000, createdAt: '', updatedAt: '' }],
        expenses: [{ id: 'e1', category: 'catering', title: 'Pelunasan Berkah Catering', amount: 30000000, date: '2026-09-10', note: null, createdAt: '', updatedAt: '' }],
      };

      const nba = getNextBestAction(ws, tasks, { today: referenceToday, vendors: [selectedVenueVendor, vendor], budget });
      expect(nba.title).not.toContain('Pembayaran');
      expect(nba.taskId).toBe('t-decor');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. TIMELINE STATE TRANSITION
  // ───────────────────────────────────────────────────────────────────────────
  describe('5. Timeline State Transition (Horizon Sensitivity)', () => {
    it('H-300: Critical venue search is ranked at P3 (early stage)', () => {
      const ws = createMockWorkspace({ weddingDate: '2027-07-15' }); // ~300 days
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-concept', category: 'general', title: 'Diskusi Konsep Bersama Pasangan', priority: 'high', dueDate: '2026-09-20' }),
      ];
      const nba = getNextBestAction(ws, tasks, { today: referenceToday, vendors: [] });
      // Urgent near-term concept task wins over early venue search
      expect(nba.taskId).toBe('t-concept');
    });

    it('H-120: Critical venue search elevates to P2 when no venue selected', () => {
      const ws = createMockWorkspace({ weddingDate: '2027-01-16' }); // ~120 days
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-inv', category: 'invitation', title: 'Pilih Desain Undangan', priority: 'low', dueDate: '2026-12-01' }),
      ];
      const nba = getNextBestAction(ws, tasks, { today: referenceToday, vendors: [] });
      expect(nba.type).toBe('vendor');
      expect(nba.category).toBe('venue');
      expect(nba.priorityLevel).toBe('P2');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. DEPENDENCY STATE TRANSITION
  // ───────────────────────────────────────────────────────────────────────────
  describe('6. Dependency State Transition', () => {
    it('Completed task cannot be NBA and unlocks next eligible task', () => {
      const ws = createMockWorkspace();
      const taskA = createMockTask({ id: 'task-a', title: 'Task A Prerequisite', status: 'completed' });
      const taskB = createMockTask({ id: 'task-b', title: 'Task B Dependent', status: 'todo', priority: 'high', dueDate: '2026-10-01' });

      const adminTask = createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' });
      const nba = getNextBestAction(ws, [adminTask, taskA, taskB], referenceToday);

      expect(nba.taskId).toBe('task-b');
      expect(nba.title).toBe('Task B Dependent');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. NO-ACTION STATE
  // ───────────────────────────────────────────────────────────────────────────
  describe('7. No-Action State', () => {
    it('Returns "Semua Tugas Saat Ini Selesai" when all tasks are complete and no deficits/blockers exist', () => {
      const ws = createMockWorkspace({ estimatedBudget: 100000000, estimatedGuestCount: 300 });
      const events: WeddingEvent[] = [{ id: 'e1', workspaceId: ws.id, type: 'ceremony', name: 'Akad Nikah', date: '2027-05-15', startTime: '08:00', endTime: '10:00', location: 'Masjid', createdAt: '', updatedAt: '' }];
      const tasks = [
        createMockTask({ id: 't1', status: 'completed', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp' }),
        createMockTask({ id: 't2', status: 'completed', category: 'venue' }),
      ];
      const budget: StoredBudget = {
        allocations: [{ id: 'a1', category: 'venue', amount: 40000000, createdAt: '', updatedAt: '' }],
        expenses: [{ id: 'e1', category: 'venue', title: 'Lunas', amount: 40000000, date: '2026-08-01', note: null, createdAt: '', updatedAt: '' }],
      };

      const nba = getNextBestAction(ws, tasks, { today: referenceToday, events, budget });

      expect(nba.priorityLevel).toBe('P4');
      expect(nba.title).toBe('Semua Tugas Saat Ini Selesai');
      expect(nba.source).toBe('completion');
      expect(nba.actionType).toBe('OPEN_TIMELINE');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. P0 AUDIT: HARD BLOCKER VS DATA COMPLETENESS GAP
  // ───────────────────────────────────────────────────────────────────────────
  describe('8. P0 Audit: Hard Blocker vs Data Completeness Gap', () => {
    it('Passed wedding date is a hard blocker (P0)', () => {
      const ws = createMockWorkspace({ weddingDate: '2026-08-01' }); // In the past relative to 2026-09-18
      const nba = getNextBestAction(ws, [], referenceToday);
      expect(nba.priorityLevel).toBe('P0');
      expect(nba.title).toBe('Perbarui Tanggal Pernikahan');
      expect(nba.actionType).toBe('OPEN_WEDDING_IDENTITY');
    });

    it('Missing couple name is a hard blocker (P0)', () => {
      const ws = createMockWorkspace({ coupleName: '' });
      const nba = getNextBestAction(ws, [], referenceToday);
      expect(nba.priorityLevel).toBe('P0');
      expect(nba.title).toBe('Lengkapi Data Pernikahan');
    });

    it('Missing religious context is a hard blocker (P0)', () => {
      const ws = createMockWorkspace({ religiousContexts: [] });
      const nba = getNextBestAction(ws, [], referenceToday);
      expect(nba.priorityLevel).toBe('P0');
      expect(nba.title).toBe('Tentukan Konteks Agama & Pernikahan');
    });

    it('Missing budget target is a non-blocking planning gap (P3, NOT P0)', () => {
      const ws = createMockWorkspace({ estimatedBudget: 0 });
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
      ];
      const nba = getNextBestAction(ws, tasks, referenceToday);
      expect(nba.priorityLevel).toBe('P3');
      expect(nba.title).toBe('Atur Target Budget Pernikahan');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 9. PRIORITY TIER VS SCORE (TIER INVARIANCE)
  // ───────────────────────────────────────────────────────────────────────────
  describe('9. Priority Tier vs Score Invariance', () => {
    it('P1 candidate strictly beats P2 candidate regardless of raw scoring factors', () => {
      const ws = createMockWorkspace();
      // P1 Overdue task
      const overdueTask = createMockTask({ id: 't-p1', priority: 'medium', dueDate: '2026-09-10' });
      // P2 Near-term high priority task
      const nearTermTask = createMockTask({ id: 't-p2', priority: 'high', dueDate: '2026-09-20' });

      const adminDone = createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' });
      const nba = getNextBestAction(ws, [adminDone, nearTermTask, overdueTask], referenceToday);

      expect(nba.priorityLevel).toBe('P1');
      expect(nba.taskId).toBe('t-p1');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 10. TIE-BREAKER AUDIT
  // ───────────────────────────────────────────────────────────────────────────
  describe('10. Tie-Breaker Ordering Audit', () => {
    it('Resolves identical scores by earliest due date', () => {
      const ws = createMockWorkspace();
      const adminDone = createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' });
      const taskA = createMockTask({ id: 'task-a', dueDate: '2026-10-05', priority: 'medium', category: 'general' });
      const taskB = createMockTask({ id: 'task-b', dueDate: '2026-10-02', priority: 'medium', category: 'general' });

      const nba = getNextBestAction(ws, [adminDone, taskA, taskB], referenceToday);
      expect(nba.taskId).toBe('task-b');
    });

    it('Resolves identical scores and dates by task priority (high > medium > low)', () => {
      const ws = createMockWorkspace();
      const adminDone = createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' });
      const taskMed = createMockTask({ id: 'task-med', dueDate: '2026-10-05', priority: 'medium', category: 'general' });
      const taskHigh = createMockTask({ id: 'task-high', dueDate: '2026-10-05', priority: 'high', category: 'general' });

      const nba = getNextBestAction(ws, [adminDone, taskMed, taskHigh], referenceToday);
      expect(nba.taskId).toBe('task-high');
    });

    it('Resolves identical scores, dates, and priorities by category taxonomy sequence', () => {
      const ws = createMockWorkspace({ primaryPlanningPriority: 'timeline' });
      const adminDone = createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' });
      // Venue is earlier in taxonomy than Photography
      const taskPhoto = createMockTask({ id: 'task-photo', dueDate: '2026-10-05', priority: 'medium', category: 'photography' });
      const taskVenue = createMockTask({ id: 'task-venue', dueDate: '2026-10-05', priority: 'medium', category: 'venue' });

      const nba = getNextBestAction(ws, [adminDone, taskPhoto, taskVenue], referenceToday);
      expect(nba.taskId).toBe('task-venue');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 11. CROSS-DOMAIN COMPETITION TEST (10+ SCENARIOS)
  // ───────────────────────────────────────────────────────────────────────────
  describe('11. Cross-Domain Competition Test Suite', () => {
    const ws = createMockWorkspace();
    const adminDone = createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' });

    it('Scenario 1: Overdue vendor payment (P1) beats routine checklist task (P4)', () => {
      const vendor: Vendor = { id: 'v1', name: 'Vendor 1', category: 'catering', status: 'selected', quotedPrice: 20000000, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' };
      const payTask = createMockTask({ id: 't-pay', category: 'catering', title: 'Bayar Vendor', dueDate: '2026-09-10', priority: 'high' });
      const routineTask = createMockTask({ id: 't-routine', category: 'invitation', priority: 'low', dueDate: '2026-12-01' });

      const nba = getNextBestAction(ws, [adminDone, payTask, routineTask], { today: referenceToday, vendors: [vendor], budget: { allocations: [{ id: 'a1', category: 'catering', amount: 20000000, createdAt: '', updatedAt: '' }], expenses: [] } });
      expect(nba.type).toBe('budget');
      expect(nba.priorityLevel).toBe('P1');
      expect(nba.title).toContain('Selesaikan Pembayaran');
    });

    it('Scenario 2: Overdue vendor payment (P1) beats venue sourcing (P2)', () => {
      const wsVenue = createMockWorkspace({ weddingDate: '2027-01-15' }); // 120d (P2 for venue)
      const vendor: Vendor = { id: 'v1', name: 'Vendor 1', category: 'catering', status: 'selected', quotedPrice: 20000000, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' };
      const payTask = createMockTask({ id: 't-pay', category: 'catering', title: 'Bayar Vendor', dueDate: '2026-09-10', priority: 'high' });

      const nba = getNextBestAction(wsVenue, [adminDone, payTask], { today: referenceToday, vendors: [vendor], budget: { allocations: [{ id: 'a1', category: 'catering', amount: 20000000, createdAt: '', updatedAt: '' }], expenses: [] } });
      expect(nba.type).toBe('budget');
      expect(nba.priorityLevel).toBe('P1');
    });

    it('Scenario 3: Overdue KUA document task (P1) beats routine checklist task (P4)', () => {
      const kuaTask = createMockTask({ id: 't-kua', category: 'prosesi_administrasi', title: 'Daftar Nikah di Simkah KUA', dueDate: '2026-09-10', priority: 'high' });
      const routineTask = createMockTask({ id: 't-routine', category: 'photography', priority: 'medium', dueDate: '2026-10-15' });

      const nba = getNextBestAction(ws, [kuaTask, routineTask], referenceToday);
      expect(nba.type).toBe('task');
      expect(nba.actionType).toBe('OPEN_ADMIN_TASK');
      expect(nba.priorityLevel).toBe('P1');
    });

    it('Scenario 4: Budget Overrun (P1) beats impending payment due in 5 days (P2)', () => {
      const vendor: Vendor = { id: 'v1', name: 'Hotel Grand', category: 'venue', status: 'selected', quotedPrice: 40000000, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' };
      const payTask = createMockTask({ id: 't-pay', category: 'venue', title: 'Pelunasan Hotel Grand', dueDate: '2026-09-23', priority: 'high' });
      const budget: StoredBudget = {
        allocations: [],
        expenses: [{ id: 'e1', category: 'venue', title: 'Overrun', amount: 200000000, date: '2026-09-01', note: null, createdAt: '', updatedAt: '' }], // 200jt > 150jt
      };

      const nba = getNextBestAction(ws, [adminDone, payTask], { today: referenceToday, vendors: [vendor], budget });
      expect(nba.priorityLevel).toBe('P1');
      expect(nba.priorityTag).toBe('Budget Terlampaui');
    });

    it('Scenario 5: Upcoming payment in 2 days (P2 score 80) beats projected budget deficit (P2 score 66)', () => {
      const vendor: Vendor = { id: 'v1', name: 'Royal Ballroom', category: 'venue', status: 'selected', quotedPrice: 30000000, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' };
      const payTask = createMockTask({ id: 't-pay', category: 'venue', title: 'DP Ballroom', dueDate: '2026-09-20', priority: 'high' }); // 2 days away
      const budget: StoredBudget = {
        allocations: [
          { id: 'a1', category: 'venue', amount: 90000000, createdAt: '', updatedAt: '' },
          { id: 'a2', category: 'catering', amount: 90000000, createdAt: '', updatedAt: '' },
        ], // Deficit!
        expenses: [{ id: 'e1', category: 'venue', title: 'DP 1', amount: 10000000, date: '2026-08-01', note: null, createdAt: '', updatedAt: '' }],
      };

      const nba = getNextBestAction(ws, [adminDone, payTask], { today: referenceToday, vendors: [vendor], budget });
      expect(nba.type).toBe('budget');
      expect(nba.title).toContain('Siapkan Pembayaran');
    });

    it('Scenario 6: Projected Deficit (P2) beats routine task due in 25 days (P3)', () => {
      const routineTask = createMockTask({ id: 't-routine', category: 'invitation', dueDate: '2026-10-13', priority: 'medium' });
      const budget: StoredBudget = {
        allocations: [
          { id: 'a1', category: 'venue', amount: 90000000, createdAt: '', updatedAt: '' },
          { id: 'a2', category: 'catering', amount: 90000000, createdAt: '', updatedAt: '' },
        ],
        expenses: [{ id: 'e1', category: 'venue', title: 'DP', amount: 10000000, date: '2026-08-01', note: null, createdAt: '', updatedAt: '' }],
      };

      const nba = getNextBestAction(ws, [adminDone, routineTask], { today: referenceToday, budget });
      expect(nba.priorityLevel).toBe('P2');
      expect(nba.title).toBe('Review Alokasi Anggaran Pernikahan');
    });

    it('Scenario 7: Venue sourcing (P2) beats routine checklist task with no due date (P4)', () => {
      const wsVenue = createMockWorkspace({ weddingDate: '2027-01-15' }); // 120d
      const noDueDateTask = createMockTask({ id: 't-nodate', category: 'decoration', dueDate: null, priority: 'low' });

      const nba = getNextBestAction(wsVenue, [adminDone, noDueDateTask], { today: referenceToday, vendors: [] });
      expect(nba.type).toBe('vendor');
      expect(nba.category).toBe('venue');
    });

    it('Scenario 8: Task due today (P1) beats missing budget setup (P3)', () => {
      const wsNoBudget = createMockWorkspace({ estimatedBudget: 0 });
      const taskToday = createMockTask({ id: 't-today', category: 'general', title: 'Konfirmasi Lokasi Resepsi', dueDate: '2026-09-18', priority: 'high' });

      const nba = getNextBestAction(wsNoBudget, [adminDone, taskToday], referenceToday);
      expect(nba.priorityLevel).toBe('P1');
      expect(nba.taskId).toBe('t-today');
    });

    it('Scenario 9: High priority task beats low priority task with same due date', () => {
      const taskHigh = createMockTask({ id: 't-high', category: 'catering', priority: 'high', dueDate: '2026-10-01' });
      const taskLow = createMockTask({ id: 't-low', category: 'catering', priority: 'low', dueDate: '2026-10-01' });

      const nba = getNextBestAction(ws, [adminDone, taskLow, taskHigh], referenceToday);
      expect(nba.taskId).toBe('t-high');
    });

    it('Scenario 10: Task in primary planning priority category gets boost over other categories', () => {
      const wsPref = createMockWorkspace({ primaryPlanningPriority: 'vendor' });
      // Photography is a vendor category, General is not
      const taskGen = createMockTask({ id: 't-gen', category: 'general', priority: 'medium', dueDate: '2026-11-01' });
      const taskPhoto = createMockTask({ id: 't-photo', category: 'photography', priority: 'medium', dueDate: '2026-11-01' });

      const nba = getNextBestAction(wsPref, [adminDone, taskGen, taskPhoto], referenceToday);
      expect(nba.taskId).toBe('t-photo');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 12. WHY-NOW AUDIT
  // ───────────────────────────────────────────────────────────────────────────
  describe('12. Why-Now Audit', () => {
    it('Provides explicit financial amount in whyNow for overdue payments', () => {
      const ws = createMockWorkspace();
      const vendor: Vendor = { id: 'v1', name: 'Grand Catering', category: 'catering', status: 'selected', quotedPrice: 35000000, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' };
      const payTask = createMockTask({ id: 't-pay', category: 'catering', title: 'Pelunasan Grand Catering', dueDate: '2026-09-10', priority: 'high' });
      const budget: StoredBudget = {
        allocations: [{ id: 'a1', category: 'catering', amount: 35000000, createdAt: '', updatedAt: '' }],
        expenses: [{ id: 'e1', category: 'catering', title: 'DP', amount: 15000000, date: '2026-08-01', note: null, createdAt: '', updatedAt: '' }],
      };

      const nba = getNextBestAction(ws, [payTask], { today: referenceToday, vendors: [vendor], budget });
      expect(nba.whyNow).toContain('Rp20.000.000');
      expect(nba.whyNow).toContain('jatuh tempo');
    });

    it('Provides specific days remaining in whyNow for upcoming payments', () => {
      const ws = createMockWorkspace();
      const vendor: Vendor = { id: 'v1', name: 'Grand Ballroom', category: 'venue', status: 'selected', quotedPrice: 20000000, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' };
      const payTask = createMockTask({ id: 't-pay', category: 'venue', title: 'Pelunasan Grand Ballroom', dueDate: '2026-09-24', priority: 'high' }); // 6 days away
      const budget: StoredBudget = {
        allocations: [{ id: 'a1', category: 'venue', amount: 20000000, createdAt: '', updatedAt: '' }],
        expenses: [],
      };

      const nba = getNextBestAction(ws, [payTask], { today: referenceToday, vendors: [vendor], budget });
      expect(nba.whyNow).toContain('6 hari');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 13. STALE RECOMMENDATION TEST
  // ───────────────────────────────────────────────────────────────────────────
  describe('13. Stale Recommendation Test', () => {
    it('Instantly clears administration guide prompt when guide is generated', () => {
      const ws = createMockWorkspace({ religiousContexts: [{ tradition: 'islam', label: 'Islam' }] });
      const beforeNba = getNextBestAction(ws, [], referenceToday);
      expect(beforeNba.title).toBe('Buat Panduan Berkas Administrasi');

      const guideTasks = [createMockTask({ id: 't-adm-n1', category: 'prosesi_administrasi', templateId: 'adm-urus-n1', status: 'todo' })];
      const afterNba = getNextBestAction(ws, guideTasks, referenceToday);
      expect(afterNba.title).not.toBe('Buat Panduan Berkas Administrasi');
      expect(afterNba.taskId).toBe('t-adm-n1');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 14. DETERMINISM TEST
  // ───────────────────────────────────────────────────────────────────────────
  describe('14. Determinism Test', () => {
    it('Guarantees 100% identical outputs across 100 runs', () => {
      const ws = createMockWorkspace();
      const tasks = [
        createMockTask({ id: 't1', category: 'catering', priority: 'high', dueDate: '2026-10-01' }),
        createMockTask({ id: 't2', category: 'venue', priority: 'medium', dueDate: '2026-10-01' }),
      ];

      const first = getNextBestAction(ws, tasks, referenceToday);
      for (let i = 0; i < 100; i++) {
        const result = getNextBestAction(ws, tasks, referenceToday);
        expect(result.taskId).toBe(first.taskId);
        expect(result.priorityLevel).toBe(first.priorityLevel);
        expect(result.whyNow).toBe(first.whyNow);
        expect(result.actionType).toBe(first.actionType);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 15. DATA INSUFFICIENCY TEST
  // ───────────────────────────────────────────────────────────────────────────
  describe('15. Data Insufficiency & Graceful Degradation', () => {
    it('Handles minimal workspace with zero tasks, zero vendors, zero budget without crash', () => {
      const ws: StoredWorkspace = {
        id: 'ws-empty',
        userId: 'u1',
        coupleName: 'Budi & Ani',
        weddingDate: '2027-06-01',
        estimatedBudget: 0,
        estimatedGuestCount: 0,
        completedCategories: [],
        primaryPlanningPriority: 'budget',
        religiousContexts: [{ tradition: 'christian', label: 'Kristen' }],
        culturalContext: { hasTradition: false, description: null },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      const nba = getNextBestAction(ws, [], referenceToday);
      expect(nba).toBeDefined();
      expect(nba.priorityLevel).toBe('P3');
      expect(nba.title).toBe('Atur Target Budget Pernikahan');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 16. 15 REALISTIC GOLDEN END-TO-END SCENARIOS
  // ───────────────────────────────────────────────────────────────────────────
  describe('16. 15 Realistic Golden End-to-End Scenarios', () => {
    it('Golden Scenario 1: Early Planning Stage -> Recommends Initial Setup', () => {
      const ws = createMockWorkspace({ estimatedBudget: 0 });
      const nba = getNextBestAction(ws, [], referenceToday);
      expect(nba.title).toBe('Atur Target Budget Pernikahan');
    });

    it('Golden Scenario 2: Venue Missing at H-150 -> Recommends Finding Venue', () => {
      const ws = createMockWorkspace({ weddingDate: '2027-02-15' });
      const tasks = [createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' })];
      const nba = getNextBestAction(ws, tasks, { today: referenceToday, vendors: [] });
      expect(nba.category).toBe('venue');
      expect(nba.type).toBe('vendor');
    });

    it('Golden Scenario 3: Venue Selected -> Transitions to Next Vendor', () => {
      const ws = createMockWorkspace();
      const vendors: Vendor[] = [{ id: 'v1', name: 'Grand Ballroom', category: 'venue', status: 'selected', quotedPrice: 40000000, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' }];
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-cat', category: 'catering', title: 'Survey Catering', dueDate: '2026-10-15', priority: 'high' }),
      ];
      const nba = getNextBestAction(ws, tasks, { today: referenceToday, vendors });
      expect(nba.taskId).toBe('t-cat');
    });

    it('Golden Scenario 4: Catering Missing -> Recommends Catering Task', () => {
      const ws = createMockWorkspace();
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-cat-search', category: 'catering', title: 'Cari Opsi Catering', priority: 'high', dueDate: '2026-10-01' }),
      ];
      const nba = getNextBestAction(ws, tasks, referenceToday);
      expect(nba.taskId).toBe('t-cat-search');
    });

    it('Golden Scenario 5: Upcoming Payment Due in 4 Days -> Recommends Siapkan Pembayaran', () => {
      const ws = createMockWorkspace();
      const vendor: Vendor = { id: 'v1', name: 'Foto Wedding', category: 'photography', status: 'selected', quotedPrice: 15000000, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' };
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-pay', category: 'photography', title: 'Pelunasan Foto Wedding', dueDate: '2026-09-22', priority: 'high' }),
      ];
      const budget: StoredBudget = { allocations: [{ id: 'a1', category: 'photography', amount: 15000000, createdAt: '', updatedAt: '' }], expenses: [] };
      const nba = getNextBestAction(ws, tasks, { today: referenceToday, vendors: [vendor], budget });
      expect(nba.title).toContain('Siapkan Pembayaran');
    });

    it('Golden Scenario 6: Overdue Payment -> Recommends Selesaikan Pembayaran (P1)', () => {
      const ws = createMockWorkspace();
      const vendor: Vendor = { id: 'v1', name: 'Decor Elegan', category: 'decoration', status: 'selected', quotedPrice: 20000000, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' };
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-pay', category: 'decoration', title: 'DP Decor Elegan', dueDate: '2026-09-12', priority: 'high' }),
      ];
      const budget: StoredBudget = { allocations: [{ id: 'a1', category: 'decoration', amount: 20000000, createdAt: '', updatedAt: '' }], expenses: [] };
      const nba = getNextBestAction(ws, tasks, { today: referenceToday, vendors: [vendor], budget });
      expect(nba.priorityLevel).toBe('P1');
      expect(nba.priorityTag).toBe('Jatuh Tempo');
    });

    it('Golden Scenario 7: Projected Deficit -> Recommends Review Budget', () => {
      const ws = createMockWorkspace({ estimatedBudget: 40000000 });
      const budget: StoredBudget = {
        allocations: [{ id: 'a1', category: 'catering', amount: 50000000, createdAt: '', updatedAt: '' }],
        expenses: [],
      };
      const tasks = [createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' })];
      const nba = getNextBestAction(ws, tasks, { today: referenceToday, budget });
      expect(nba.title).toBe('Review Alokasi Anggaran Pernikahan');
    });

    it('Golden Scenario 8: Incomplete Islamic Administration Setup -> Recommends Lengkapi Profil', () => {
      const ws = createMockWorkspace({ religiousContexts: [{ tradition: 'islam', label: 'Islam' }], administrationContext: undefined });
      const nba = getNextBestAction(ws, [], referenceToday);
      expect(nba.title).toBe('Lengkapi Profil Administrasi');
    });

    it('Golden Scenario 9: Complete Profile without Guide -> Recommends Buat Panduan Berkas', () => {
      const ws = createMockWorkspace({ religiousContexts: [{ tradition: 'islam', label: 'Islam' }] });
      const nba = getNextBestAction(ws, [], referenceToday);
      expect(nba.title).toBe('Buat Panduan Berkas Administrasi');
    });

    it('Golden Scenario 10: Approaching H-7 -> High Priority Near Deadline Tasks Take Precedence', () => {
      const ws = createMockWorkspace({ weddingDate: '2026-09-25' }); // 7 days away
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-final', category: 'makeup_attire', title: 'Final Fitting Gaun Pengantin', dueDate: '2026-09-20', priority: 'high' }),
      ];
      const nba = getNextBestAction(ws, tasks, referenceToday);
      expect(nba.taskId).toBe('t-final');
      expect(nba.priorityLevel).toBe('P2');
    });

    it('Golden Scenario 11: Multiple Competing Priorities -> Highest Urgency / P1 Wins', () => {
      const ws = createMockWorkspace();
      const vendor: Vendor = { id: 'v1', name: 'Catering Prima', category: 'catering', status: 'selected', quotedPrice: 30000000, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' };
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-overdue-pay', category: 'catering', title: 'Pelunasan Catering Prima', dueDate: '2026-09-10', priority: 'high' }),
        createMockTask({ id: 't-venue', category: 'venue', title: 'Cari Venue', priority: 'high', dueDate: '2026-10-01' }),
      ];
      const budget: StoredBudget = { allocations: [{ id: 'a1', category: 'catering', amount: 30000000, createdAt: '', updatedAt: '' }], expenses: [] };

      const nba = getNextBestAction(ws, tasks, { today: referenceToday, vendors: [vendor], budget });
      expect(nba.type).toBe('budget');
      expect(nba.priorityLevel).toBe('P1');
    });

    it('Golden Scenario 12: All Tasks Completed -> Peaceful State', () => {
      const ws = createMockWorkspace();
      const tasks = [
        createMockTask({ id: 't1', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't2', category: 'venue', status: 'completed' }),
      ];
      const nba = getNextBestAction(ws, tasks, referenceToday);
      expect(nba.title).toBe('Semua Tugas Saat Ini Selesai');
    });

    it('Golden Scenario 13: Insufficient Data -> Gracefully Prompts Budget Target', () => {
      const ws = createMockWorkspace({ estimatedBudget: 0, estimatedGuestCount: 0 });
      const nba = getNextBestAction(ws, [createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' })], referenceToday);
      expect(nba.title).toBe('Atur Target Budget Pernikahan');
    });

    it('Golden Scenario 14: Multiple Vendors in Same Category -> Correct Total Balance Calculated', () => {
      const ws = createMockWorkspace();
      const vendors: Vendor[] = [
        { id: 'v1', name: 'Main Venue', category: 'venue', status: 'selected', quotedPrice: 30000000, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' },
        { id: 'v2', name: 'Akad Room', category: 'venue', status: 'selected', quotedPrice: 10000000, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' },
      ];
      const tasks = [
        createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }),
        createMockTask({ id: 't-pay', category: 'venue', title: 'Pelunasan Main Venue', dueDate: '2026-09-10', priority: 'high' }),
      ];
      const budget: StoredBudget = {
        allocations: [{ id: 'a1', category: 'venue', amount: 40000000, createdAt: '', updatedAt: '' }],
        expenses: [{ id: 'e1', category: 'venue', title: 'DP Main Venue', amount: 10000000, date: '2026-08-01', note: null, createdAt: '', updatedAt: '' }],
      };

      const nba = getNextBestAction(ws, tasks, { today: referenceToday, vendors, budget });
      expect(nba.type).toBe('budget');
      expect(nba.whyNow).toContain('Rp20.000.000');
    });

    it('Golden Scenario 15: State Change after User Action -> Transitions Seamlessly', () => {
      const ws = createMockWorkspace();
      const task1 = createMockTask({ id: 't1', category: 'venue', title: 'Survey Venue 1', dueDate: '2026-09-20', priority: 'high' });
      const task2 = createMockTask({ id: 't2', category: 'catering', title: 'Survey Catering 1', dueDate: '2026-09-25', priority: 'high' });

      // Before completing t1
      const nbaBefore = getNextBestAction(ws, [createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }), task1, task2], referenceToday);
      expect(nbaBefore.taskId).toBe('t1');

      // After completing t1
      const task1Done = { ...task1, status: 'completed' as const };
      const nbaAfter = getNextBestAction(ws, [createMockTask({ id: 't-adm', category: 'prosesi_administrasi', templateId: 'adm-doc-ktp', status: 'completed' }), task1Done, task2], referenceToday);
      expect(nbaAfter.taskId).toBe('t2');
    });
  });
});
