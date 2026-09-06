import { describe, it, expect } from 'vitest';
import {
  generateAdministrativeTasks,
  calculateAdministrativeRisk,
  getAdministrativeNextBestAction,
  hasGeneratedAdministrativeGuide,
  getApplicableAdministrativeTasks,
  reconcileAdministrativeTasksOnReligionChange,
} from './engine';
import { ADMINISTRATIVE_TEMPLATES, isTemplateApplicableToReligion } from './templates';
import { StoredAdministrationContext } from './types';
import { TaskItem } from '../../types/checklist';
import { ReligiousTradition } from '../context';
import { getNextBestAction } from '../../utils/nextBestActionEngine';
import { StoredWorkspace } from '../../types/workspace';

const mockBaseAdminContext: StoredAdministrationContext = {
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
};

const mockWorkspace = (religion: ReligiousTradition, adminContext: StoredAdministrationContext = mockBaseAdminContext): StoredWorkspace => ({
  id: 'ws-test',
  userId: 'usr-1',
  coupleName: 'Romeo & Juliet',
  weddingDate: '2026-10-15',
  estimatedBudget: 100000000,
  estimatedGuestCount: 300,
  completedCategories: [],
  primaryPlanningPriority: 'budget',
  religiousContexts: [{ tradition: religion, label: religion }],
  culturalContext: { hasTradition: false, description: null },
  administrationContext: adminContext,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
});

describe('Religion-Aware Administrative Engine', () => {
  describe('Template Applicability Classification', () => {
    it('correctly classifies Islam-only templates', () => {
      const islamOnlyTemplateIds = [
        'adm-doc-foto',
        'adm-doc-wali-saksi',
        'adm-urus-n1',
        'adm-urus-rekomendasi-groom',
        'adm-urus-rekomendasi-bride',
        'adm-daftar-kua',
        'adm-daftar-bayar-pnbp',
        'adm-daftar-tarif-nol',
        'adm-periksa-rapak',
        'adm-periksa-bimwin',
        'adm-spec-dispensasi-groom',
        'adm-spec-dispensasi-bride',
        'adm-spec-cerai-hidup-groom',
        'adm-spec-cerai-hidup-bride',
        'adm-spec-poligami',
        'adm-spec-wali-hakim',
      ];

      islamOnlyTemplateIds.forEach((id) => {
        const tpl = ADMINISTRATIVE_TEMPLATES[id];
        expect(tpl, `Template ${id} must exist`).toBeDefined();
        expect(tpl.applicableTraditions).toEqual(['islam']);
        expect(isTemplateApplicableToReligion(tpl, 'islam')).toBe(true);
        expect(isTemplateApplicableToReligion(tpl, 'christian')).toBe(false);
        expect(isTemplateApplicableToReligion(tpl, 'catholic')).toBe(false);
        expect(isTemplateApplicableToReligion(tpl, 'hindu')).toBe(false);
        expect(isTemplateApplicableToReligion(tpl, 'buddhist')).toBe(false);
        expect(isTemplateApplicableToReligion(tpl, 'confucian')).toBe(false);
        expect(isTemplateApplicableToReligion(tpl, 'belief')).toBe(false);
      });
    });

    it('correctly classifies universal civil & health templates', () => {
      const universalTemplateIds = [
        'adm-doc-ktp',
        'adm-doc-kk',
        'adm-doc-akta',
        'adm-urus-kesehatan',
        'adm-urus-rt-rw',
        'adm-spec-izin-ortu-groom',
        'adm-spec-izin-ortu-bride',
        'adm-spec-tni-polri-groom',
        'adm-spec-tni-polri-bride',
        'adm-spec-wna-groom',
        'adm-spec-wna-bride',
        'adm-spec-cerai-mati-groom',
        'adm-spec-cerai-mati-bride',
      ];

      universalTemplateIds.forEach((id) => {
        const tpl = ADMINISTRATIVE_TEMPLATES[id];
        expect(tpl, `Template ${id} must exist`).toBeDefined();
        expect(tpl.applicableTraditions).toBe('universal');
        expect(isTemplateApplicableToReligion(tpl, 'islam')).toBe(true);
        expect(isTemplateApplicableToReligion(tpl, 'christian')).toBe(true);
        expect(isTemplateApplicableToReligion(tpl, 'catholic')).toBe(true);
        expect(isTemplateApplicableToReligion(tpl, 'hindu')).toBe(true);
        expect(isTemplateApplicableToReligion(tpl, 'buddhist')).toBe(true);
        expect(isTemplateApplicableToReligion(tpl, 'confucian')).toBe(true);
        expect(isTemplateApplicableToReligion(tpl, 'belief')).toBe(true);
        expect(isTemplateApplicableToReligion(tpl, 'mixed')).toBe(true);
      });
    });
  });

  describe('Task Generation per Religion', () => {
    it('generates Islam workflow (KUA, SIMKAH, N1, Bimwin, Rapak, PNBP) for Muslim profile', () => {
      const tasks = generateAdministrativeTasks(
        mockBaseAdminContext,
        '2026-10-15',
        undefined,
        [],
        'islam'
      );

      const tplIds = tasks.map((t) => t.templateId);
      expect(tplIds).toContain('adm-doc-ktp');
      expect(tplIds).toContain('adm-doc-foto');
      expect(tplIds).toContain('adm-doc-wali-saksi');
      expect(tplIds).toContain('adm-urus-n1');
      expect(tplIds).toContain('adm-daftar-kua');
      expect(tplIds).toContain('adm-periksa-rapak');
      expect(tplIds).toContain('adm-periksa-bimwin');

      // Verify no task is generated that doesn't belong to Islam
      tasks.forEach((t) => {
        if (t.templateId && ADMINISTRATIVE_TEMPLATES[t.templateId]) {
          expect(isTemplateApplicableToReligion(ADMINISTRATIVE_TEMPLATES[t.templateId], 'islam')).toBe(true);
        }
      });
    });

    it('generates ONLY universal civil/health tasks and ZERO KUA/SIMKAH tasks for Christian profile', () => {
      const nonIslamTraditions: ReligiousTradition[] = [
        'christian',
        'catholic',
        'hindu',
        'buddhist',
        'confucian',
        'belief',
        'other',
        'mixed',
      ];

      nonIslamTraditions.forEach((religion) => {
        const tasks = generateAdministrativeTasks(
          mockBaseAdminContext,
          '2026-10-15',
          undefined,
          [],
          religion
        );

        const tplIds = tasks.map((t) => t.templateId);

        // MUST contain universal docs
        expect(tplIds).toContain('adm-doc-ktp');
        expect(tplIds).toContain('adm-doc-kk');
        expect(tplIds).toContain('adm-doc-akta');
        expect(tplIds).toContain('adm-urus-kesehatan');

        // MUST NEVER contain Islam/KUA specific tasks
        expect(tplIds).not.toContain('adm-doc-foto');
        expect(tplIds).not.toContain('adm-doc-wali-saksi');
        expect(tplIds).not.toContain('adm-urus-n1');
        expect(tplIds).not.toContain('adm-urus-rekomendasi-groom');
        expect(tplIds).not.toContain('adm-urus-rekomendasi-bride');
        expect(tplIds).not.toContain('adm-daftar-kua');
        expect(tplIds).not.toContain('adm-daftar-bayar-pnbp');
        expect(tplIds).not.toContain('adm-daftar-tarif-nol');
        expect(tplIds).not.toContain('adm-periksa-rapak');
        expect(tplIds).not.toContain('adm-periksa-bimwin');
        expect(tplIds).not.toContain('adm-spec-wali-hakim');
        expect(tplIds).not.toContain('adm-spec-poligami');
      });
    });
  });

  describe('Guide Detection (hasGeneratedAdministrativeGuide)', () => {
    it('returns false for Islam when only universal civil docs exist', () => {
      const universalOnlyTasks: TaskItem[] = [
        {
          id: 't-ktp',
          title: 'KTP',
          description: null,
          category: 'prosesi_administrasi',
          templateId: 'adm-doc-ktp',
          status: 'todo',
          priority: 'medium',
          source: 'template',
          dueDate: null,
          estimatedMinutes: null,
          eventIds: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          completedAt: null,
        },
      ];

      expect(hasGeneratedAdministrativeGuide(universalOnlyTasks, 'islam')).toBe(false);
    });

    it('returns true for Islam when Islam-specific administrative tasks exist', () => {
      const islamTasks: TaskItem[] = [
        {
          id: 't-n1',
          title: 'Surat Pengantar N1',
          description: null,
          category: 'prosesi_administrasi',
          templateId: 'adm-urus-n1',
          status: 'todo',
          priority: 'high',
          source: 'template',
          dueDate: null,
          estimatedMinutes: null,
          eventIds: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          completedAt: null,
        },
      ];

      expect(hasGeneratedAdministrativeGuide(islamTasks, 'islam')).toBe(true);
    });

    it('returns true for Christian when applicable universal civil tasks exist', () => {
      const christianTasks: TaskItem[] = [
        {
          id: 't-ktp',
          title: 'KTP',
          description: null,
          category: 'prosesi_administrasi',
          templateId: 'adm-doc-ktp',
          status: 'todo',
          priority: 'medium',
          source: 'template',
          dueDate: null,
          estimatedMinutes: null,
          eventIds: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          completedAt: null,
        },
      ];

      expect(hasGeneratedAdministrativeGuide(christianTasks, 'christian')).toBe(true);
    });
  });

  describe('Authoritative Task Filtering (getApplicableAdministrativeTasks)', () => {
    it('filters out stale KUA tasks when current context is Christian', () => {
      const mixedStaleTasks: TaskItem[] = [
        {
          id: 't-custom-1',
          title: 'Urus Surat Baptis di Gereja',
          description: null,
          category: 'prosesi_administrasi',
          templateId: null,
          status: 'todo',
          priority: 'high',
          source: 'custom',
          dueDate: null,
          estimatedMinutes: null,
          eventIds: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          completedAt: null,
        },
        {
          id: 't-ktp',
          title: 'KTP',
          description: null,
          category: 'prosesi_administrasi',
          templateId: 'adm-doc-ktp',
          status: 'todo',
          priority: 'medium',
          source: 'template',
          dueDate: null,
          estimatedMinutes: null,
          eventIds: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          completedAt: null,
        },
        {
          id: 't-kua',
          title: 'Daftar Nikah di SIMKAH',
          description: null,
          category: 'prosesi_administrasi',
          templateId: 'adm-daftar-kua',
          status: 'todo',
          priority: 'high',
          source: 'template',
          dueDate: null,
          estimatedMinutes: null,
          eventIds: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          completedAt: null,
        },
      ];

      const applicable = getApplicableAdministrativeTasks(mixedStaleTasks, 'christian');
      const ids = applicable.map((t) => t.id);

      expect(ids).toContain('t-custom-1'); // User custom task is preserved
      expect(ids).toContain('t-ktp');      // Universal doc is preserved
      expect(ids).not.toContain('t-kua');  // Stale KUA task is filtered out
    });
  });

  describe('Non-Destructive Task Reconciliation (reconcileAdministrativeTasksOnReligionChange)', () => {
    it('removes uncompleted KUA tasks on switch from Islam to Christian, preserves completed KUA tasks historically', () => {
      const existingTasks: TaskItem[] = [
        {
          id: 't-kua-done',
          title: 'Konsultasi KUA',
          description: null,
          category: 'prosesi_administrasi',
          templateId: 'adm-daftar-kua',
          status: 'completed',
          completedAt: '2026-02-01',
          priority: 'high',
          source: 'template',
          dueDate: null,
          estimatedMinutes: null,
          eventIds: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-02-01',
        },
        {
          id: 't-rapak-todo',
          title: 'Pemeriksaan Berkas Rapak',
          description: null,
          category: 'prosesi_administrasi',
          templateId: 'adm-periksa-rapak',
          status: 'todo',
          priority: 'high',
          source: 'template',
          dueDate: null,
          estimatedMinutes: null,
          eventIds: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          completedAt: null,
        },
        {
          id: 't-ktp',
          title: 'KTP',
          description: null,
          category: 'prosesi_administrasi',
          templateId: 'adm-doc-ktp',
          status: 'todo',
          priority: 'medium',
          source: 'template',
          dueDate: null,
          estimatedMinutes: null,
          eventIds: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          completedAt: null,
        },
      ];

      const reconciled = reconcileAdministrativeTasksOnReligionChange(existingTasks, 'christian');

      // Uncompleted Rapak should be removed
      expect(reconciled.find((t) => t.id === 't-rapak-todo')).toBeUndefined();

      // Completed KUA should be preserved with historical flag
      const completedKua = reconciled.find((t) => t.id === 't-kua-done');
      expect(completedKua).toBeDefined();
      expect(completedKua?.isHistoricalContext).toBe(true);

      // Universal KTP should be kept intact
      expect(reconciled.find((t) => t.id === 't-ktp')).toBeDefined();
    });
  });

  describe('Risk Engine & NBA Integration for Non-Islam', () => {
    it('returns LOW risk and null administrative NBA for Christian workspace', () => {
      const christianTasks: TaskItem[] = [
        {
          id: 't-ktp',
          title: 'KTP',
          description: null,
          category: 'prosesi_administrasi',
          templateId: 'adm-doc-ktp',
          status: 'todo',
          priority: 'medium',
          source: 'template',
          dueDate: null,
          estimatedMinutes: null,
          eventIds: [],
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          completedAt: null,
        },
      ];

      const risk = calculateAdministrativeRisk(
        christianTasks,
        mockBaseAdminContext,
        '2026-10-15',
        '2026-10-10', // near wedding
        'christian'
      );
      expect(risk.level).toBe('LOW');

      const adminNba = getAdministrativeNextBestAction(
        christianTasks,
        mockBaseAdminContext,
        '2026-10-15',
        '2026-10-10',
        'christian'
      );
      expect(adminNba).toBeNull();
    });

    it('Next Best Action Engine never recommends KUA guide generation for Christian workspace', () => {
      const ws = mockWorkspace('christian');
      const nba = getNextBestAction(ws, [], '2026-01-01', []);

      // Must not be GENERATE_ADMIN_GUIDE for KUA
      expect(nba.actionType).not.toBe('GENERATE_ADMIN_GUIDE');
      expect(nba.title).not.toContain('KUA');
      expect(nba.title).not.toContain('SIMKAH');
    });
  });
});
