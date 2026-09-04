import { describe, it, expect } from 'vitest';
import {
  AdminCoupleSummary,
  AdminCouplesFilterState,
} from '../../types/admin';
import {
  filterCouples,
  formatAdminDate,
  formatAdminRelativeTime,
  deriveAccessTier,
  calculateProgressPercentage,
} from '../../domain/adminSelectors';

describe('Admin Couples V1 Domain & Contract Tests', () => {
  const fixedNow = new Date('2026-09-04T12:00:00Z');

  const mockCouples: AdminCoupleSummary[] = [
    {
      id: 'ws-adit',
      userId: 'user-1',
      coupleName: 'Adit & Nisa',
      weddingDate: '2026-09-30',
      accessTier: 'Trial',
      progressPercentage: 57,
      totalTasks: 14,
      completedTasks: 8,
      lastActive: '2026-09-04T09:00:00Z',
      createdAt: '2026-09-01T00:00:00Z',
      daysToWedding: 26,
    },
    {
      id: 'ws-budi',
      userId: 'user-2',
      coupleName: 'Budi & Sari',
      weddingDate: '2026-10-12',
      accessTier: 'Paid',
      progressPercentage: 60,
      totalTasks: 20,
      completedTasks: 12,
      lastActive: '2026-09-04T08:30:00Z',
      createdAt: '2026-08-01T00:00:00Z',
      daysToWedding: 38,
    },
    {
      id: 'ws-raka',
      userId: 'user-3',
      coupleName: 'Raka & Dina',
      weddingDate: '2026-11-04',
      accessTier: 'Expired',
      progressPercentage: 18,
      totalTasks: 22,
      completedTasks: 4,
      lastActive: '2026-09-03T14:00:00Z',
      createdAt: '2026-08-15T00:00:00Z',
      daysToWedding: 61,
    },
    {
      id: 'ws-dimas',
      userId: 'user-4',
      coupleName: 'Dimas & Ratna',
      weddingDate: '2026-09-08',
      accessTier: 'Trial',
      progressPercentage: 80,
      totalTasks: 10,
      completedTasks: 8,
      lastActive: '2026-08-20T10:00:00Z', // Inactive > 7 days
      createdAt: '2026-09-02T00:00:00Z',
      daysToWedding: 4, // <= 7 days
    },
  ];

  describe('Task Progress Display Contract', () => {
    it('accurately calculates and formats task progress for Admin Couples', () => {
      mockCouples.forEach((c) => {
        const expected = calculateProgressPercentage(c.completedTasks, c.totalTasks);
        expect(c.progressPercentage).toBe(expected);
      });
      expect(mockCouples[0].progressPercentage).toBe(57);
      expect(mockCouples[0].completedTasks).toBe(8);
      expect(mockCouples[0].totalTasks).toBe(14);
    });
  });

  describe('Access Tier Lifecycle Contract', () => {
    it('correctly handles Trial, Expired, and Paid states', () => {
      // Recent registration (within 7 days) -> Trial
      expect(deriveAccessTier('2026-09-02T00:00:00Z', null, fixedNow)).toBe('Trial');
      // Registration older than 7 days -> Expired
      expect(deriveAccessTier('2026-08-01T00:00:00Z', null, fixedNow)).toBe('Expired');
      // Explicitly paid -> Paid
      expect(deriveAccessTier('2026-08-01T00:00:00Z', 'Paid', fixedNow)).toBe('Paid');
    });
  });

  describe('Search Functionality', () => {
    it('searches couples by coupleName case-insensitively', () => {
      const filters: AdminCouplesFilterState = {
        search: 'budi',
        access: 'all',
        wedding: 'all',
        activity: 'all',
      };
      const result = filterCouples(mockCouples, filters, fixedNow);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ws-budi');
    });

    it('returns empty when search term does not match any couple', () => {
      const filters: AdminCouplesFilterState = {
        search: 'Zack & Zoe',
        access: 'all',
        wedding: 'all',
        activity: 'all',
      };
      const result = filterCouples(mockCouples, filters, fixedNow);
      expect(result).toHaveLength(0);
    });
  });

  describe('Operational Multi-Filter Composition', () => {
    it('composes Access + Wedding interval filters correctly (Trial + Wedding <= 7 hari)', () => {
      const filters: AdminCouplesFilterState = {
        search: '',
        access: 'Trial',
        wedding: 'lte_7',
        activity: 'all',
      };
      const result = filterCouples(mockCouples, filters, fixedNow);
      expect(result).toHaveLength(1);
      expect(result[0].coupleName).toBe('Dimas & Ratna');
    });

    it('composes Access + Activity filters correctly (Trial + Aktif hari ini)', () => {
      const filters: AdminCouplesFilterState = {
        search: '',
        access: 'Trial',
        wedding: 'all',
        activity: 'today',
      };
      const result = filterCouples(mockCouples, filters, fixedNow);
      expect(result).toHaveLength(1);
      expect(result[0].coupleName).toBe('Adit & Nisa');
    });

    it('composes Search + Access + Wedding + Activity all together', () => {
      const filters: AdminCouplesFilterState = {
        search: 'adit',
        access: 'Trial',
        wedding: 'lte_30',
        activity: 'today',
      };
      const result = filterCouples(mockCouples, filters, fixedNow);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ws-adit');
    });
  });

  describe('Relative Date Localization', () => {
    it('formats last active as Indonesian relative time strings', () => {
      expect(formatAdminRelativeTime('2026-09-04T09:00:00Z', fixedNow)).toBe('Hari ini');
      expect(formatAdminRelativeTime('2026-09-03T09:00:00Z', fixedNow)).toBe('Kemarin');
      expect(formatAdminRelativeTime('2026-09-01T09:00:00Z', fixedNow)).toBe('3 hari lalu');
    });

    it('formats wedding date as Indonesian date', () => {
      expect(formatAdminDate('2026-09-30')).toBe('30 Sep 2026');
      expect(formatAdminDate('2026-10-12')).toBe('12 Okt 2026');
      expect(formatAdminDate('2026-11-04')).toBe('4 Nov 2026');
    });
  });
});
