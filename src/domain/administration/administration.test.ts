import { describe, it, expect } from 'vitest';
import {
  calculateAgeAtDate,
  getAgeLegalCategory,
  calculateBusinessDaysBefore,
  calculateDaysBefore,
  calculateRemainingWorkingDays,
  assessPnbpStatus,
  calculateAdministrativeRisk,
  getAdministrativeNextBestAction,
  generateAdministrativeTasks,
} from './engine';
import { StoredAdministrationContext } from './types';
import { TaskItem } from '../../types/checklist';
import { WeddingEvent } from '../events';

describe('Marriage Administration Domain Engine (V1)', () => {
  describe('calculateAgeAtDate & getAgeLegalCategory', () => {
    it('calculates exact age correctly before birthday', () => {
      // Born 2005-10-15, Wedding 2024-09-01 -> 18 years old (not yet 19)
      const age = calculateAgeAtDate('2005-10-15', '2024-09-01');
      expect(age).toBe(18);
      expect(getAgeLegalCategory(age)).toBe('under_19');
    });

    it('calculates exact age correctly on birthday', () => {
      // Born 2005-09-01, Wedding 2024-09-01 -> exactly 19 years old
      const age = calculateAgeAtDate('2005-09-01', '2024-09-01');
      expect(age).toBe(19);
      expect(getAgeLegalCategory(age)).toBe('between_19_and_21');
    });

    it('calculates age between 19 and 21', () => {
      // Born 2004-01-01, Wedding 2024-09-01 -> 20 years old
      const age = calculateAgeAtDate('2004-01-01', '2024-09-01');
      expect(age).toBe(20);
      expect(getAgeLegalCategory(age)).toBe('between_19_and_21');
    });

    it('calculates adult 21+ correctly', () => {
      // Born 2000-01-01, Wedding 2024-09-01 -> 24 years old
      const age = calculateAgeAtDate('2000-01-01', '2024-09-01');
      expect(age).toBe(24);
      expect(getAgeLegalCategory(age)).toBe('adult_21_plus');
    });
  });

  describe('Working Days & Deadline Engine', () => {
    it('calculates 10 business days before target excluding weekends', () => {
      // Target: Saturday 2026-10-24
      // 10 working days backwards: Fri 23, Thu 22, Wed 21, Tue 20, Mon 19, Fri 16, Thu 15, Wed 14, Tue 13, Mon 12
      const deadline = calculateBusinessDaysBefore('2026-10-24', 10);
      expect(deadline).toBe('2026-10-12');
    });

    it('calculates remaining working days accurately', () => {
      // From Monday 2026-10-12 to Friday 2026-10-16 -> 4 working days (Tue 13, Wed 14, Thu 15, Fri 16)
      const days = calculateRemainingWorkingDays('2026-10-12', '2026-10-16');
      expect(days).toBe(4);
    });

    it('calculates 10 business days before Wednesday 2026-09-30 yielding Wednesday 2026-09-16', () => {
      // Target: Wednesday 2026-09-30
      // 10 working days: Tue 29, Mon 28, Fri 25, Thu 24, Wed 23, Tue 22, Mon 21, Fri 18, Thu 17, Wed 16
      const deadline = calculateBusinessDaysBefore('2026-09-30', 10);
      expect(deadline).toBe('2026-09-16');
    });

    it('calculates calendar days before target for planning target (H-35)', () => {
      const planning = calculateDaysBefore('2026-10-24', 35);
      expect(planning).toBe('2026-09-19');
    });
  });

  describe('assessPnbpStatus', () => {
    it('returns Rp0 when at Balai Nikah KUA during weekday office hours', () => {
      const event: WeddingEvent = {
        id: 'evt-1',
        workspaceId: 'ws-1',
        type: 'ceremony',
        name: 'Akad Nikah',
        location: 'Balai Nikah Kantor Urusan Agama (KUA) Kec. Sukasari',
        date: '2026-10-21', // Wednesday
        startTime: '09:00',
        endTime: '10:00',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };
      const result = assessPnbpStatus(event);
      expect(result.status).toBe('ZERO_AT_KUA_OFFICE_HOURS');
      expect(result.amount).toBe(0);
    });

    it('returns Rp600.000 when at Gedung/Hotel outside KUA', () => {
      const event: WeddingEvent = {
        id: 'evt-2',
        workspaceId: 'ws-1',
        type: 'ceremony',
        name: 'Akad Nikah & Resepsi',
        location: 'Grand Ballroom Hotel Aston',
        date: '2026-10-24', // Saturday
        startTime: '08:00',
        endTime: '11:00',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };
      const result = assessPnbpStatus(event);
      expect(result.status).toBe('STANDARD_OUTSIDE_OR_WEEKEND');
      expect(result.amount).toBe(600000);
    });
  });

  describe('calculateAdministrativeRisk', () => {
    it('evaluates CRITICAL risk when <= 10 working days and not registered', () => {
      const tasks: TaskItem[] = [
        {
          id: 't-1',
          title: 'Daftar KUA',
          description: null,
          category: 'prosesi_administrasi',
          status: 'todo',
          priority: 'high',
          dueDate: '2026-10-12',
          estimatedMinutes: 60,
          source: 'template',
          templateId: 'adm-daftar-kua',
          eventIds: [],
          createdAt: '',
          updatedAt: '',
          completedAt: null,
        },
      ];

      // Wedding on 2026-10-24 (Saturday), today is 2026-10-15 (Thursday) -> 7 working days left
      const risk = calculateAdministrativeRisk(tasks, null, '2026-10-24', '2026-10-15');
      expect(risk.level).toBe('CRITICAL');
    });

    it('evaluates LOW risk when registration is completed', () => {
      const tasks: TaskItem[] = [
        {
          id: 't-1',
          title: 'Daftar KUA',
          description: null,
          category: 'prosesi_administrasi',
          status: 'completed',
          priority: 'high',
          dueDate: '2026-10-12',
          estimatedMinutes: 60,
          source: 'template',
          templateId: 'adm-daftar-kua',
          eventIds: [],
          createdAt: '',
          updatedAt: '',
          completedAt: '2026-09-01',
        },
      ];

      const risk = calculateAdministrativeRisk(tasks, null, '2026-10-24', '2026-10-15');
      expect(risk.level).toBe('LOW');
    });
  });

  describe('generateAdministrativeTasks & NBA Scenarios', () => {
    const mockContext: StoredAdministrationContext = {
      groom: {
        birthDate: '1998-05-20', // Adult 21+
        maritalStatus: 'single',
        citizenship: 'wni',
        serviceStatus: 'civilian',
        isSameKuaDistrictAsCeremony: false, // Beda kecamatan -> needs rekomendasi
      },
      bride: {
        birthDate: '2000-08-15', // Adult 21+
        maritalStatus: 'single',
        citizenship: 'wni',
        serviceStatus: 'civilian',
        isSameKuaDistrictAsCeremony: true,
      },
      hasSpecialWaliCase: false,
      isSetupCompleted: true,
      updatedAt: '2026-01-01',
    };

    it('generates base tasks and conditional recommendation letter for groom', () => {
      const tasks = generateAdministrativeTasks(mockContext, '2026-10-24');
      const templateIds = tasks.map((t) => t.templateId);

      expect(templateIds).toContain('adm-doc-ktp');
      expect(templateIds).toContain('adm-urus-n1');
      expect(templateIds).toContain('adm-urus-rekomendasi-groom');
      expect(templateIds).not.toContain('adm-urus-rekomendasi-bride');
      expect(templateIds).toContain('adm-daftar-kua');
    });

    it('generates court dispensation task when under 19', () => {
      const youngContext: StoredAdministrationContext = {
        ...mockContext,
        bride: {
          ...mockContext.bride,
          birthDate: '2008-01-01', // < 19 at wedding 2026-10-24 (18 years old)
        },
      };

      const tasks = generateAdministrativeTasks(youngContext, '2026-10-24');
      const templateIds = tasks.map((t) => t.templateId);
      expect(templateIds).toContain('adm-spec-dispensasi-bride');
    });

    it('yields Next Best Action for Surat N1 Kelurahan when basic docs ready', () => {
      const tasks = generateAdministrativeTasks(mockContext, '2026-10-24');
      // Mark basic docs complete
      const updatedTasks = tasks.map((t) => {
        if (['adm-doc-ktp', 'adm-doc-kk', 'adm-doc-akta', 'adm-doc-foto'].includes(t.templateId || '')) {
          return { ...t, status: 'completed' as const };
        }
        return t;
      });

      const nba = getAdministrativeNextBestAction(updatedTasks, mockContext, '2026-10-24', '2026-08-01');
      expect(nba).not.toBeNull();
      expect(nba?.title).toContain('Surat Pengantar Nikah (Model N1)');
    });

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    it('TEST 1: KTP does not have a hard dueDate (dueDate = null)', () => {
      const tasks = generateAdministrativeTasks(mockContext, '2026-10-24');
      const ktp = tasks.find((t) => t.templateId === 'adm-doc-ktp');
      expect(ktp).toBeDefined();
      expect(ktp?.dueDate).toBeNull();
    });

    it('TEST 2: KK does not have a hard dueDate (dueDate = null)', () => {
      const tasks = generateAdministrativeTasks(mockContext, '2026-10-24');
      const kk = tasks.find((t) => t.templateId === 'adm-doc-kk');
      expect(kk).toBeDefined();
      expect(kk?.dueDate).toBeNull();
    });

    it('TEST 3: Akta does not have a hard dueDate (dueDate = null)', () => {
      const tasks = generateAdministrativeTasks(mockContext, '2026-10-24');
      const akta = tasks.find((t) => t.templateId === 'adm-doc-akta');
      expect(akta).toBeDefined();
      expect(akta?.dueDate).toBeNull();
    });

    it('TEST 4: TNI/POLRI is not given an artificial H-60 hard dueDate', () => {
      const militaryContext: StoredAdministrationContext = {
        ...mockContext,
        groom: {
          ...mockContext.groom,
          serviceStatus: 'tni_polri',
        },
      };
      const tasks = generateAdministrativeTasks(militaryContext, '2026-10-24');
      const militaryTask = tasks.find((t) => t.templateId === 'adm-spec-tni-polri-groom');
      expect(militaryTask).toBeDefined();
      expect(militaryTask?.dueDate).toBeNull();
    });

    it('TEST 5: N1 and Rekomendasi tasks do not have artificial H-30 hard dueDate', () => {
      const tasks = generateAdministrativeTasks(mockContext, '2026-10-24');
      const n1 = tasks.find((t) => t.templateId === 'adm-urus-n1');
      const reco = tasks.find((t) => t.templateId === 'adm-urus-rekomendasi-groom');
      expect(n1).toBeDefined();
      expect(n1?.dueDate).toBeNull();
      expect(reco).toBeDefined();
      expect(reco?.dueDate).toBeNull();
    });

    it('TEST 6: PNBP does not have artificial H-45/H-10 deadline', () => {
      const outsideEvent: WeddingEvent = {
        id: 'event-akad',
        workspaceId: 'ws-1',
        name: 'Akad Nikah',
        type: 'ceremony',
        date: '2026-10-24',
        startTime: '09:00',
        endTime: '11:00',
        location: 'Masjid Agung',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      const tasks = generateAdministrativeTasks(mockContext, '2026-10-24', outsideEvent);
      const pnbp = tasks.find((t) => t.templateId === 'adm-daftar-bayar-pnbp');
      expect(pnbp).toBeDefined();
      expect(pnbp?.dueDate).toBeNull();
    });

    it('TEST 7: Daftar KUA retains the strict legal deadline H-10 working days', () => {
      const tasks = generateAdministrativeTasks(mockContext, '2026-10-24');
      const kuaTask = tasks.find((t) => t.templateId === 'adm-daftar-kua');
      expect(kuaTask).toBeDefined();
      expect(kuaTask?.dueDate).toBe(calculateBusinessDaysBefore('2026-10-24', 10));
    });

    it('TEST 8: Checklist overdueCount does not count administrative preparation tasks without dueDate', () => {
      const tasks = generateAdministrativeTasks(mockContext, '2026-09-30'); // Wedding in 25 days
      const today = '2026-09-05';
      const overdueTasks = tasks.filter((t) => t.status !== 'completed' && t.dueDate !== null && t.dueDate < today);
      // KUA registration deadline for 2026-09-30 is 2026-09-16 (future, > 2026-09-05). All other tasks have dueDate = null.
      expect(overdueTasks.length).toBe(0);
    });

    it('TEST 9: Existing task UUID remains identical after reconciliation', () => {
      const initialTask: TaskItem = {
        id: '11111111-2222-4333-8444-555555555555',
        title: 'Fotokopi KTP',
        description: 'Mock',
        category: 'prosesi_administrasi',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-08-15', // Old legacy H-45 date
        estimatedMinutes: 30,
        source: 'template',
        templateId: 'adm-doc-ktp',
        eventIds: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        completedAt: null,
      };

      const result = generateAdministrativeTasks(mockContext, '2026-10-24', undefined, [initialTask]);
      const ktpTask = result.find((t) => t.templateId === 'adm-doc-ktp');
      expect(ktpTask?.id).toBe('11111111-2222-4333-8444-555555555555');
      expect(ktpTask?.dueDate).toBeNull(); // Cleaned up from legacy H-45
    });

    it('TEST 10: Existing completed status remains preserved after reconciliation', () => {
      const completedTask: TaskItem = {
        id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        title: 'Surat N1 Kelurahan',
        description: 'Mock',
        category: 'prosesi_administrasi',
        status: 'completed',
        priority: 'high',
        dueDate: '2026-08-31',
        estimatedMinutes: 60,
        source: 'template',
        templateId: 'adm-urus-n1',
        eventIds: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        completedAt: '2026-01-02T10:00:00.000Z',
      };

      const result = generateAdministrativeTasks(mockContext, '2026-10-24', undefined, [completedTask]);
      const n1Task = result.find((t) => t.templateId === 'adm-urus-n1');
      expect(n1Task?.status).toBe('completed');
      expect(n1Task?.completedAt).toBe('2026-01-02T10:00:00.000Z');
      expect(n1Task?.id).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
    });

    it('TEST 11: Regenerating multiple times produces no duplicate tasks', () => {
      const firstPass = generateAdministrativeTasks(mockContext, '2026-10-24');
      const secondPass = generateAdministrativeTasks(mockContext, '2026-10-24', undefined, firstPass);
      expect(secondPass.length).toBe(firstPass.length);
      const uniqueTemplateIds = new Set(secondPass.map((t) => t.templateId));
      expect(uniqueTemplateIds.size).toBe(secondPass.length);
    });

    it('TEST 12: Risk Engine still detects urgency accurately even when preparation tasks have null dueDate', () => {
      // 5 working days left before wedding without KUA registration -> CRITICAL RISK
      const tasks = generateAdministrativeTasks(mockContext, '2026-09-15');
      const risk = calculateAdministrativeRisk(tasks, mockContext, '2026-09-15', '2026-09-08');
      expect(risk.level).toBe('CRITICAL');
    });

    it('TEST 13: Next Best Action works deterministically without relying on artificial due dates', () => {
      const tasks = generateAdministrativeTasks(mockContext, '2026-10-24');
      const nba = getAdministrativeNextBestAction(tasks, mockContext, '2026-10-24', '2026-08-01');
      expect(nba).not.toBeNull();
      // Initially requires Surat N1 from Kelurahan (or Special requirements)
      expect(nba?.priorityTag).toBeDefined();
    });
  });
});
