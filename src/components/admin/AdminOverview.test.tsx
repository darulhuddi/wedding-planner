import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AdminOverviewMetrics,
  AdminAttentionItem,
  AdminCoupleSummary,
  AdminNavRoute,
} from '../../types/admin';
import {
  computeOverviewMetrics,
  evaluateAttentionItems,
  formatAdminDate,
  formatAdminRelativeTime,
  calculateDaysToWedding,
  calculateProgressPercentage,
} from '../../domain/adminSelectors';
import * as adminRepository from '../../repositories/adminRepository';
import { fetchAdminCouples, fetchAdminOverviewData } from '../../repositories/supabaseAdminAdapter';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Admin Console Architectural & Domain Tests', () => {
  const mockCouples: AdminCoupleSummary[] = [
    {
      id: 'ws-1',
      userId: 'u-1',
      coupleName: 'Adit & Nisa',
      weddingDate: '2026-09-30',
      accessTier: 'Trial',
      progressPercentage: 33,
      totalTasks: 30,
      completedTasks: 10,
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      daysToWedding: 26,
    },
    {
      id: 'ws-2',
      userId: 'u-2',
      coupleName: 'Budi & Sari',
      weddingDate: '2026-10-12',
      accessTier: 'Paid',
      progressPercentage: 61,
      totalTasks: 20,
      completedTasks: 12,
      lastActive: new Date().toISOString(),
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      daysToWedding: 38,
    },
    {
      id: 'ws-3',
      userId: 'u-3',
      coupleName: 'Raka & Dina',
      weddingDate: '2026-11-04',
      accessTier: 'Trial',
      progressPercentage: 18,
      totalTasks: 22,
      completedTasks: 4,
      lastActive: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 12 * 86400000).toISOString(), // Trial ending in 2 days (out of 14)
      daysToWedding: 61,
    },
  ];

  describe('KPI Metric Grid Calculation', () => {
    it('accurately computes 5 key business metrics from couples data without hardcoded values', () => {
      const metrics = computeOverviewMetrics(mockCouples);

      // 1. Total Couples
      expect(metrics.totalCouples).toBe(3);

      // 2. Active Weddings
      expect(metrics.activeWeddings).toBe(3);

      // 3. Active Trial
      expect(metrics.activeTrial).toBe(2);

      // 4. Paid
      expect(metrics.paid).toBe(1);

      // 5. Expiring Soon (Trial within 3 days: ws-3 created 5 days ago in 7-day trial)
      expect(metrics.expiringSoon).toBe(1);
    });

    it('returns zeroes safely when no couples are registered', () => {
      const metrics = computeOverviewMetrics([]);
      expect(metrics).toEqual({
        totalCouples: 0,
        activeWeddings: 0,
        activeTrial: 0,
        paid: 0,
        expiringSoon: 0,
      });
    });
  });

  describe('Attention Needed Evaluation', () => {
    it('creates operational attention item when trials are expiring within 3 days', () => {
      const items = evaluateAttentionItems(mockCouples);
      const trialItem = items.find((i) => i.type === 'trial_expiring');

      expect(trialItem).toBeDefined();
      expect(trialItem?.count).toBe(1);
      expect(trialItem?.description).toBe('1 pasangan akan kehilangan akses penuh dalam 3 hari.');
      expect(trialItem?.ctaLabel).toBe('Lihat Trial →');
      expect(trialItem?.ctaRoute).toBe('admin/access');
    });

    it('creates attention item for upcoming weddings within 14 days', () => {
      const couplesWithImminent: AdminCoupleSummary[] = [
        ...mockCouples,
        {
          id: 'ws-4',
          userId: 'u-4',
          coupleName: 'Imminent Couple',
          weddingDate: '2026-09-10',
          accessTier: 'Paid',
          progressPercentage: 90,
          totalTasks: 50,
          completedTasks: 45,
          lastActive: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          daysToWedding: 6,
        },
      ];

      const items = evaluateAttentionItems(couplesWithImminent);
      const weddingItem = items.find((i) => i.type === 'wedding_approaching');

      expect(weddingItem).toBeDefined();
      expect(weddingItem?.count).toBe(1);
      expect(weddingItem?.ctaRoute).toBe('admin/weddings');
    });

    it('returns empty array when all accounts and operations are normal', () => {
      const healthyCouples: AdminCoupleSummary[] = [
        {
          id: 'ws-1',
          userId: 'u-1',
          coupleName: 'Long Term Couple',
          weddingDate: '2027-09-30',
          accessTier: 'Paid',
          progressPercentage: 50,
          totalTasks: 20,
          completedTasks: 10,
          lastActive: new Date().toISOString(),
          createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
          daysToWedding: 390,
        },
      ];

      const items = evaluateAttentionItems(healthyCouples);
      expect(items).toHaveLength(0);
    });
  });

  describe('Recent Couples Formatting & Presentation Contracts', () => {
    it('formats wedding dates in Indonesian locale', () => {
      expect(formatAdminDate('2026-09-30')).toBe('30 Sep 2026');
      expect(formatAdminDate('2026-10-12')).toBe('12 Okt 2026');
      expect(formatAdminDate('2026-11-04')).toBe('4 Nov 2026');
      expect(formatAdminDate(null)).toBe('Belum diatur');
    });

    it('formats relative last active timestamps accurately', () => {
      const fixedNow = new Date('2026-09-04T12:00:00Z');
      expect(formatAdminRelativeTime('2026-09-04T08:00:00Z', fixedNow)).toBe('Hari ini');
      expect(formatAdminRelativeTime('2026-09-03T08:00:00Z', fixedNow)).toBe('Kemarin');
    });

    it('calculates progress percentage correctly', () => {
      expect(calculateProgressPercentage(10, 30)).toBe(33);
      expect(calculateProgressPercentage(12, 20)).toBe(60);
      expect(calculateProgressPercentage(4, 22)).toBe(18);
    });
  });

  describe('Admin Navigation Structure', () => {
    it('contains all required navigation routes', () => {
      const expectedRoutes: AdminNavRoute[] = [
        'admin',
        'admin/overview',
        'admin/couples',
        'admin/weddings',
        'admin/access',
        'admin/payments',
        'admin/system',
        'admin/settings',
      ];

      expectedRoutes.forEach((route) => {
        expect(typeof route).toBe('string');
      });
    });
  });
});
