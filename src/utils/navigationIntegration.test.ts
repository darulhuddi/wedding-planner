import { describe, it, expect } from 'vitest';
import { CATEGORY_ORDER, CATEGORY_TAXONOMY } from '../domain/categories';
import { filterVendors, createVendor } from './vendorUtils';
import { Vendor } from '../types/vendor';

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

  describe('Dashboard Preparation Category to Vendor Category Routing', () => {
    const VENDOR_CATEGORY_IDS = new Set<string>([
      'venue',
      'catering',
      'photography',
      'decoration',
      'makeup_attire',
      'invitation',
    ]);

    it('maps all 6 preparation category IDs correctly into vendor categories', () => {
      CATEGORY_ORDER.forEach((catId) => {
        expect(VENDOR_CATEGORY_IDS.has(catId)).toBe(true);
        expect(CATEGORY_TAXONOMY[catId]).toBeDefined();
        expect(CATEGORY_TAXONOMY[catId].label).toBeTruthy();
      });
    });

    it('correctly filters mock vendors when navigated with specific category filter', () => {
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

      // Route to photography (empty for now)
      const photoFiltered = filterVendors(vendors, '', 'all', 'photography');
      expect(photoFiltered).toHaveLength(0);

      // Route to all
      const allFiltered = filterVendors(vendors, '', 'all', 'all');
      expect(allFiltered).toHaveLength(2);
    });
  });
});
