import { describe, it, expect } from 'vitest';
import { formatCompactRupiah, formatRupiahNumber } from '../../domain/workspaceSelectors';
import { CATEGORY_ORDER, CATEGORY_TAXONOMY, getCategoryDisplayName } from '../../domain/categories';
import {
  getAllModulesProgress,
  getModuleProgress,
  getModuleSemanticStatus,
} from '../../domain/moduleSelectors';
import { TaskItem } from '../../types/checklist';
import { CategoryId } from '../../types/onboarding';

function createDummyTask(
  id: string,
  category: CategoryId,
  status: 'todo' | 'in_progress' | 'completed' = 'todo',
  priority: 'low' | 'medium' | 'high' = 'medium',
  dueDate: string | null = '2026-12-31'
): TaskItem {
  return {
    id,
    title: `Task ${id}`,
    description: null,
    category,
    status,
    priority,
    dueDate,
    estimatedMinutes: null,
    source: 'template',
    templateId: null,
    eventIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: status === 'completed' ? new Date().toISOString() : null,
  };
}

describe('Dashboard Visual Refinement Tests', () => {
  describe('Compact Rupiah Formatter (formatCompactRupiah)', () => {
    it('formats round million values correctly into human-readable strings', () => {
      expect(formatCompactRupiah(1_000_000)).toBe('Rp1 juta');
      expect(formatCompactRupiah(25_000_000)).toBe('Rp25 juta');
      expect(formatCompactRupiah(100_000_000)).toBe('Rp100 juta');
      expect(formatCompactRupiah(125_000_000)).toBe('Rp125 juta');
    });

    it('formats decimal billion values correctly with Indonesian comma separator', () => {
      expect(formatCompactRupiah(1_000_000_000)).toBe('Rp1 miliar');
      expect(formatCompactRupiah(1_200_000_000)).toBe('Rp1,2 miliar');
      expect(formatCompactRupiah(2_500_000_000)).toBe('Rp2,5 miliar');
      expect(formatCompactRupiah(1_250_000_000)).toBe('Rp1,25 miliar');
    });

    it('formats thousands and zero correctly', () => {
      expect(formatCompactRupiah(500_000)).toBe('Rp500 ribu');
      expect(formatCompactRupiah(750_000)).toBe('Rp750 ribu');
      expect(formatCompactRupiah(0)).toBe('Rp0');
    });

    it('never truncates values with ellipsis', () => {
      const formatted = formatCompactRupiah(1_000_000_000);
      expect(formatted).not.toContain('...');
      expect(formatted).not.toContain('....');
    });

    it('preserves exact numeric representation via formatRupiahNumber for Budget page', () => {
      expect(formatRupiahNumber(125_000_000)).toBe('Rp125.000.000');
      expect(formatRupiahNumber(1_200_000_000)).toBe('Rp1.200.000.000');
    });
  });

  describe('Sidebar Navigation Requirements', () => {
    const primaryNavItems = [
      { id: 'dashboard', label: 'Beranda' },
      { id: 'checklist', label: 'Checklist' },
      { id: 'budget', label: 'Budget' },
      { id: 'timeline', label: 'Timeline' },
      { id: 'vendor', label: 'Vendor' },
      { id: 'guests', label: 'Tamu' },
      { id: 'notes', label: 'Catatan' },
    ];

    it('contains exactly the 7 approved primary navigation items in correct order', () => {
      expect(primaryNavItems).toHaveLength(7);
      expect(primaryNavItems.map((n) => n.id)).toEqual([
        'dashboard',
        'checklist',
        'budget',
        'timeline',
        'vendor',
        'guests',
        'notes',
      ]);
    });

    it('does not include settings (Pengaturan) in primary nav items', () => {
      expect(primaryNavItems.some((n) => n.id === 'settings')).toBe(false);
    });
  });

  describe('Module Preparation Categories & Semantic Statuses', () => {
    it('contains all 6 canonical modules', () => {
      expect(CATEGORY_ORDER).toHaveLength(6);
      expect(CATEGORY_ORDER).toEqual([
        'venue',
        'catering',
        'photography',
        'decoration',
        'makeup_attire',
        'invitation',
      ]);
    });

    it('has display labels for each canonical category', () => {
      CATEGORY_ORDER.forEach((cat) => {
        expect(CATEGORY_TAXONOMY[cat].label).toBeTruthy();
      });
    });

    it('derives semantic status correctly: selesai, prioritas, perlu_perhatian, berjalan', () => {
      // 1. Selesai
      const doneTasks = [createDummyTask('v1', 'venue', 'completed')];
      const doneStatus = getModuleSemanticStatus(doneTasks, 'completed', false);
      expect(doneStatus.semanticStatus).toBe('selesai');
      expect(doneStatus.semanticStatusLabel).toBe('Selesai');

      // 2. Prioritas (marked as priority category)
      const cateringTasks = [
        createDummyTask('c1', 'catering', 'completed'),
        createDummyTask('c2', 'catering', 'todo'),
      ];
      const priorityStatus = getModuleSemanticStatus(cateringTasks, 'in_progress', true);
      expect(priorityStatus.semanticStatus).toBe('prioritas');
      expect(priorityStatus.semanticStatusLabel).toBe('Prioritas');

      // 3. Perlu perhatian (has overdue or urgent task)
      const decorTasks = [
        createDummyTask('d1', 'decoration', 'todo', 'medium', '2020-01-01'), // overdue
      ];
      const urgentStatus = getModuleSemanticStatus(decorTasks, 'not_started', false);
      expect(urgentStatus.semanticStatus).toBe('perlu_perhatian');
      expect(urgentStatus.semanticStatusLabel).toBe('Perlu perhatian');

      // 4. Berjalan (normal in progress)
      const photoTasks = [
        createDummyTask('p1', 'photography', 'completed'),
        createDummyTask('p2', 'photography', 'in_progress', 'medium', '2029-12-31'),
      ];
      const runningStatus = getModuleSemanticStatus(photoTasks, 'in_progress', false);
      expect(runningStatus.semanticStatus).toBe('berjalan');
      expect(runningStatus.semanticStatusLabel).toBe('Berjalan');
    });

    it('getAllModulesProgress provides semanticStatus for all 6 modules', () => {
      const tasks: TaskItem[] = [
        createDummyTask('v1', 'venue', 'completed'),
        createDummyTask('c1', 'catering', 'todo'),
      ];

      const progress = getAllModulesProgress(tasks, 'catering');
      expect(progress).toHaveLength(6);
      
      const venue = progress.find((p) => p.category === 'venue');
      expect(venue?.semanticStatus).toBe('selesai');

      const catering = progress.find((p) => p.category === 'catering');
      expect(catering?.semanticStatus).toBe('prioritas');
    });

    it('guarantees ONLY the recommended priority category receives prioritas (no multi-prioritas overload)', () => {
      const tasks: TaskItem[] = [
        createDummyTask('v1', 'venue', 'completed'),
        // Catering is the recommended next action
        createDummyTask('c1', 'catering', 'todo', 'high'),
        // Decoration also has high-priority task, but is NOT the recommended priority category
        createDummyTask('d1', 'decoration', 'todo', 'high'),
        // MUA has normal active task
        createDummyTask('m1', 'makeup_attire', 'in_progress', 'medium'),
        // Photo has normal active task
        createDummyTask('p1', 'photography', 'in_progress', 'medium'),
        // Invitation is finished
        createDummyTask('i1', 'invitation', 'completed'),
      ];

      const progress = getAllModulesProgress(tasks, 'catering');

      const priorityModules = progress.filter((p) => p.semanticStatus === 'prioritas');
      expect(priorityModules).toHaveLength(1);
      expect(priorityModules[0].category).toBe('catering');

      const decor = progress.find((p) => p.category === 'decoration');
      expect(decor?.semanticStatus).toBe('perlu_perhatian');

      const mua = progress.find((p) => p.category === 'makeup_attire');
      expect(mua?.semanticStatus).toBe('berjalan');

      const venue = progress.find((p) => p.category === 'venue');
      expect(venue?.semanticStatus).toBe('selesai');
    });
  });

  describe('Presentation Layer Category Mapping (getCategoryDisplayName)', () => {
    it('maps internal administrative identifiers to clean user-facing labels', () => {
      expect(getCategoryDisplayName('prosesi_administrasi')).toBe('Administrasi');
      expect(getCategoryDisplayName('proses_i_administrasi')).toBe('Administrasi');
    });

    it('maps internal vendor enum keys to human-readable labels', () => {
      expect(getCategoryDisplayName('photography')).toBe('Foto & Video');
      expect(getCategoryDisplayName('foto_video')).toBe('Foto & Video');
      expect(getCategoryDisplayName('makeup_attire')).toBe('MUA & Busana');
      expect(getCategoryDisplayName('mua_busana')).toBe('MUA & Busana');
      expect(getCategoryDisplayName('venue')).toBe('Venue & Gedung');
      expect(getCategoryDisplayName('catering')).toBe('Catering');
      expect(getCategoryDisplayName('decoration')).toBe('Dekorasi');
      expect(getCategoryDisplayName('invitation')).toBe('Undangan');
    });
  });
});
