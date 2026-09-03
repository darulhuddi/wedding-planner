import { describe, it, expect } from 'vitest';
import { CATEGORY_ORDER, CATEGORY_TAXONOMY, ALL_TASK_CATEGORY_IDS } from '../domain/categories';
import { filterTasksByCategory } from './checklistUtils';
import { filterVendors, createVendor } from './vendorUtils';
import { Vendor } from '../types/vendor';
import { TaskItem, TaskCategoryId } from '../types/checklist';

function createMockTask(id: string, category: TaskCategoryId, status: 'todo' | 'completed' = 'todo'): TaskItem {
  return {
    id,
    title: `Task ${id}`,
    description: null,
    category,
    status,
    priority: 'medium',
    dueDate: '2026-10-01',
    estimatedMinutes: null,
    source: 'custom',
    templateId: null,
    eventIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: status === 'completed' ? new Date().toISOString() : null,
  };
}

describe('Navigation & Dashboard Routing Integration Tests', () => {
  describe('Mobile Navigation Secondary Active State', () => {
    const isSecondaryRoute = (route: string) =>
      ['vendor', 'guests', 'notes'].includes(route);

    const isTabActive = (tabId: string, currentRoute: string, isMoreOpen: boolean = false) => {
      if (tabId === 'more') {
        return isMoreOpen || isSecondaryRoute(currentRoute);
      }
      return currentRoute === tabId;
    };

    it('marks primary tabs as active only for their respective routes', () => {
      expect(isTabActive('dashboard', 'dashboard')).toBe(true);
      expect(isTabActive('dashboard', 'checklist')).toBe(false);
      expect(isTabActive('checklist', 'checklist')).toBe(true);
      expect(isTabActive('budget', 'budget')).toBe(true);
      expect(isTabActive('timeline', 'timeline')).toBe(true);
      expect(isTabActive('more', 'dashboard')).toBe(false);
    });

    it('marks "more" (Lainnya) tab as active when on secondary routes (vendor, guests, notes)', () => {
      expect(isTabActive('more', 'vendor')).toBe(true);
      expect(isTabActive('more', 'guests')).toBe(true);
      expect(isTabActive('more', 'notes')).toBe(true);
      expect(isTabActive('dashboard', 'vendor')).toBe(false);
      expect(isTabActive('checklist', 'guests')).toBe(false);
    });

    it('marks "more" as active when the dropdown/sheet is open', () => {
      expect(isTabActive('more', 'dashboard', true)).toBe(true);
    });
  });

  describe('Dashboard Module Card to Checklist Category Navigation', () => {
    const mockTasks: TaskItem[] = [
      createMockTask('1', 'venue', 'completed'),
      createMockTask('2', 'venue', 'todo'),
      createMockTask('3', 'catering', 'todo'),
      createMockTask('4', 'photography', 'completed'),
      createMockTask('5', 'decoration', 'todo'),
      createMockTask('6', 'makeup_attire', 'completed'),
      createMockTask('7', 'invitation', 'todo'),
      createMockTask('8', 'general', 'todo'),
    ];

    it('maps all 6 module cards directly to valid TaskCategoryIds', () => {
      expect(CATEGORY_ORDER).toHaveLength(6);
      CATEGORY_ORDER.forEach((catId) => {
        expect(ALL_TASK_CATEGORY_IDS.includes(catId)).toBe(true);
        expect(CATEGORY_TAXONOMY[catId]).toBeDefined();
        expect(CATEGORY_TAXONOMY[catId].label).toBeTruthy();
      });
    });

    it('correctly filters checklist tasks when arriving with Venue category filter', () => {
      const filtered = filterTasksByCategory(mockTasks, 'venue');
      expect(filtered).toHaveLength(2);
      expect(filtered.every((t) => t.category === 'venue')).toBe(true);
    });

    it('correctly filters checklist tasks when arriving with Catering category filter', () => {
      const filtered = filterTasksByCategory(mockTasks, 'catering');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].category).toBe('catering');
    });

    it('correctly filters checklist tasks when arriving with Photography category filter', () => {
      const filtered = filterTasksByCategory(mockTasks, 'photography');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].category).toBe('photography');
    });

    it('correctly filters checklist tasks when arriving with Decoration category filter', () => {
      const filtered = filterTasksByCategory(mockTasks, 'decoration');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].category).toBe('decoration');
    });

    it('correctly filters checklist tasks when arriving with Makeup & Attire category filter', () => {
      const filtered = filterTasksByCategory(mockTasks, 'makeup_attire');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].category).toBe('makeup_attire');
    });

    it('correctly filters checklist tasks when arriving with Invitation category filter', () => {
      const filtered = filterTasksByCategory(mockTasks, 'invitation');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].category).toBe('invitation');
    });

    it('returns empty array when filtering a category with zero tasks without throwing', () => {
      const tasksWithoutCatering = mockTasks.filter((t) => t.category !== 'catering');
      const filtered = filterTasksByCategory(tasksWithoutCatering, 'catering');
      expect(filtered).toHaveLength(0);
    });

    it('returns all tasks when filter is "all" (direct Checklist access default)', () => {
      const filtered = filterTasksByCategory(mockTasks, 'all');
      expect(filtered).toHaveLength(mockTasks.length);
    });
  });

  describe('Vendor Module Category Filtering (Isolated)', () => {
    it('correctly filters mock vendors when navigated in Vendor page', () => {
      let vendors: Vendor[] = [];
      const venueVendor = createVendor(vendors, {
        name: 'Grand Ballroom',
        category: 'venue',
        status: 'selected',
        quotedPrice: 50000000,
        contactName: 'Pak Budi',
        phone: '08123456789',
        instagram: '@grandballroom',
        notes: null,
      }).newVendor;

      const cateringVendor = createVendor(vendors, {
        name: 'Delicious Catering',
        category: 'catering',
        status: 'considering',
        quotedPrice: 30000000,
        contactName: 'Ibu Siti',
        phone: '08198765432',
        instagram: '@deliciouscatering',
        notes: null,
      }).newVendor;

      vendors = [venueVendor, cateringVendor];

      // Route to venue
      const venueFiltered = filterVendors(vendors, '', 'all', 'venue');
      expect(venueFiltered).toHaveLength(1);
      expect(venueFiltered[0].name).toBe('Grand Ballroom');

      // Route to catering
      const cateringFiltered = filterVendors(vendors, '', 'all', 'catering');
      expect(cateringFiltered).toHaveLength(1);
      expect(cateringFiltered[0].name).toBe('Delicious Catering');

      // Route to all
      const allFiltered = filterVendors(vendors, '', 'all', 'all');
      expect(allFiltered).toHaveLength(2);
    });
  });
});
