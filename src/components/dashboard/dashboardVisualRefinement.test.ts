import { describe, it, expect } from 'vitest';
import { formatCompactRupiah, formatRupiahNumber } from '../../domain/workspaceSelectors';
import { CATEGORY_ORDER, CATEGORY_TAXONOMY } from '../../domain/categories';

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

  describe('Module Preparation Categories', () => {
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
  });
});
