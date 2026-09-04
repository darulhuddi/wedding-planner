import { describe, it, expect } from 'vitest';
import {
  formatAdminDate,
  formatAdminRelativeTime,
  calculateDaysToWedding,
  calculateProgressPercentage,
  computeOverviewMetrics,
  evaluateAttentionItems,
  deriveAccessTier,
  filterCouples,
  calculateExtendedExpiryDate,
  calculateWeddingPassExpiryDate,
  formatAccessSourceLabel,
  formatAccessEventDescription,
  getWeddingPassProduct,
  generateOrderNumber,
  computePaymentMetrics,
  filterOrders,
  formatOrderStatusLabel,
  formatOrderStatusBadge,
} from './adminSelectors';
import { AdminCoupleSummary, AdminOrderSummary, DEFAULT_ADMIN_ACCESS_CONFIG } from '../types/admin';



describe('adminSelectors', () => {
  describe('formatAdminDate', () => {
    it('formats valid ISO date into Indonesian format', () => {
      expect(formatAdminDate('2026-09-30')).toBe('30 Sep 2026');
      expect(formatAdminDate('2026-10-12')).toBe('12 Okt 2026');
      expect(formatAdminDate('2026-01-05')).toBe('5 Jan 2026');
    });

    it('returns fallback for null or invalid dates', () => {
      expect(formatAdminDate(null)).toBe('Belum diatur');
      expect(formatAdminDate('invalid-date')).toBe('Belum diatur');
    });
  });

  describe('formatAdminRelativeTime', () => {
    const fixedNow = new Date('2026-09-04T12:00:00Z');

    it('returns "Hari ini" for same calendar day', () => {
      expect(formatAdminRelativeTime('2026-09-04T08:00:00Z', fixedNow)).toBe('Hari ini');
    });

    it('returns "Kemarin" for 1 day prior', () => {
      expect(formatAdminRelativeTime('2026-09-03T10:00:00Z', fixedNow)).toBe('Kemarin');
    });

    it('returns "X hari lalu" for 2 to 7 days prior', () => {
      expect(formatAdminRelativeTime('2026-09-01T10:00:00Z', fixedNow)).toBe('3 hari lalu');
      expect(formatAdminRelativeTime('2026-08-28T10:00:00Z', fixedNow)).toBe('7 hari lalu');
    });

    it('returns formatted date for older dates', () => {
      expect(formatAdminRelativeTime('2026-08-01T10:00:00Z', fixedNow)).toBe('1 Agu 2026');
    });

    it('handles null / invalid inputs gracefully', () => {
      expect(formatAdminRelativeTime('', fixedNow)).toBe('-');
      expect(formatAdminRelativeTime('invalid', fixedNow)).toBe('-');
    });
  });

  describe('calculateDaysToWedding', () => {
    const fixedNow = new Date('2026-09-04T12:00:00Z');

    it('calculates days difference correctly', () => {
      expect(calculateDaysToWedding('2026-09-30', fixedNow)).toBe(26);
      expect(calculateDaysToWedding('2026-09-04', fixedNow)).toBe(0);
      expect(calculateDaysToWedding('2026-09-01', fixedNow)).toBe(-3);
    });

    it('returns null for missing or invalid dates', () => {
      expect(calculateDaysToWedding(null, fixedNow)).toBeNull();
      expect(calculateDaysToWedding('invalid', fixedNow)).toBeNull();
    });
  });

  describe('calculateProgressPercentage', () => {
    it('computes rounded percentage', () => {
      expect(calculateProgressPercentage(1, 3)).toBe(33);
      expect(calculateProgressPercentage(61, 100)).toBe(61);
      expect(calculateProgressPercentage(0, 10)).toBe(0);
      expect(calculateProgressPercentage(10, 10)).toBe(100);
    });

    it('handles 0 total tasks gracefully', () => {
      expect(calculateProgressPercentage(0, 0)).toBe(0);
    });
  });

  describe('computeOverviewMetrics', () => {
    it('computes correct metrics from real couples data', () => {
      const mockCouples: AdminCoupleSummary[] = [
        {
          id: '1',
          userId: 'u1',
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
          id: '2',
          userId: 'u2',
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
          id: '3',
          userId: 'u3',
          coupleName: 'Past Couple',
          weddingDate: '2025-01-01',
          accessTier: 'Trial',
          progressPercentage: 10,
          totalTasks: 10,
          completedTasks: 1,
          lastActive: new Date().toISOString(),
          createdAt: new Date(Date.now() - 12 * 86400000).toISOString(), // 12 days old -> trial ending in 2 days
          daysToWedding: -600,
        },
      ];

      const metrics = computeOverviewMetrics(mockCouples);
      expect(metrics.totalCouples).toBe(3);
      expect(metrics.activeWeddings).toBe(2); // couples 1 and 2
      expect(metrics.activeTrial).toBe(2);    // couples 1 and 3
      expect(metrics.paid).toBe(1);           // couple 2
      expect(metrics.expiringSoon).toBe(1);   // couple 3 (created 12 days ago in 14-day trial)
    });
  });

  describe('evaluateAttentionItems', () => {
    it('surfaces operational attention item when trials are expiring', () => {
      const couples: AdminCoupleSummary[] = [
        {
          id: '1',
          userId: 'u1',
          coupleName: 'Expiring Trial Couple',
          weddingDate: '2026-12-01',
          accessTier: 'Trial',
          progressPercentage: 20,
          totalTasks: 10,
          completedTasks: 2,
          lastActive: new Date().toISOString(),
          createdAt: new Date(Date.now() - 12 * 86400000).toISOString(), // 12 days old (2 days left)
          daysToWedding: 80,
        },
      ];

      const items = evaluateAttentionItems(couples);
      expect(items.length).toBe(1);
      expect(items[0].type).toBe('trial_expiring');
      expect(items[0].count).toBe(1);
      expect(items[0].description).toBe('1 pasangan akan kehilangan akses penuh dalam 3 hari.');
      expect(items[0].ctaLabel).toBe('Lihat Trial →');
    });

    it('returns empty array when no attention items exist', () => {
      const couples: AdminCoupleSummary[] = [
        {
          id: '1',
          userId: 'u1',
          coupleName: 'Paid Couple',
          weddingDate: '2027-01-01',
          accessTier: 'Paid',
          progressPercentage: 50,
          totalTasks: 10,
          completedTasks: 5,
          lastActive: new Date().toISOString(),
          createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
          daysToWedding: 120,
        },
      ];

      const items = evaluateAttentionItems(couples);
      expect(items).toEqual([]);
    });
  });

  describe('deriveAccessTier', () => {
    const fixedNow = new Date('2026-09-04T12:00:00Z');

    it('returns Paid when explicitTier is Paid', () => {
      expect(deriveAccessTier('2026-08-01T00:00:00Z', 'Paid', fixedNow)).toBe('Paid');
    });

    it('returns Trial when created within 14 days', () => {
      // Created 3 days ago
      expect(deriveAccessTier('2026-09-01T12:00:00Z', null, fixedNow)).toBe('Trial');
    });

    it('returns Expired when created more than 14 days ago and not paid', () => {
      // Created 16 days ago
      expect(deriveAccessTier('2026-08-19T12:00:00Z', null, fixedNow)).toBe('Expired');
    });
  });

  describe('filterCouples', () => {
    const fixedNow = new Date('2026-09-04T12:00:00Z');

    const sampleCouples: AdminCoupleSummary[] = [
      {
        id: '1',
        userId: 'u1',
        coupleName: 'Adit & Nisa',
        weddingDate: '2026-09-10', // 6 days from now (lte_7)
        accessTier: 'Trial',
        progressPercentage: 57,
        totalTasks: 14,
        completedTasks: 8,
        lastActive: '2026-09-04T08:00:00Z', // Today
        createdAt: '2026-09-01T00:00:00Z',
        daysToWedding: 6,
      },
      {
        id: '2',
        userId: 'u2',
        coupleName: 'Budi & Sari',
        weddingDate: '2026-09-16', // 12 days from now (lte_14)
        accessTier: 'Paid',
        progressPercentage: 61,
        totalTasks: 20,
        completedTasks: 12,
        lastActive: '2026-09-03T10:00:00Z', // Yesterday (last_7_days)
        createdAt: '2026-08-10T00:00:00Z',
        daysToWedding: 12,
      },
      {
        id: '3',
        userId: 'u3',
        coupleName: 'Raka & Dina',
        weddingDate: '2026-10-20', // 46 days from now (gt_30)
        accessTier: 'Expired',
        progressPercentage: 18,
        totalTasks: 22,
        completedTasks: 4,
        lastActive: '2026-08-20T10:00:00Z', // Inactive > 7 days (15 days ago)
        createdAt: '2026-08-01T00:00:00Z',
        daysToWedding: 46,
      },
    ];

    it('returns all couples when default filter is active', () => {
      const results = filterCouples(
        sampleCouples,
        { search: '', access: 'all', wedding: 'all', activity: 'all' },
        fixedNow
      );
      expect(results).toHaveLength(3);
    });

    it('filters by search term in coupleName (case insensitive)', () => {
      const results = filterCouples(
        sampleCouples,
        { search: 'adit', access: 'all', wedding: 'all', activity: 'all' },
        fixedNow
      );
      expect(results).toHaveLength(1);
      expect(results[0].coupleName).toBe('Adit & Nisa');
    });

    it('filters by access status', () => {
      const paidResults = filterCouples(
        sampleCouples,
        { search: '', access: 'Paid', wedding: 'all', activity: 'all' },
        fixedNow
      );
      expect(paidResults).toHaveLength(1);
      expect(paidResults[0].coupleName).toBe('Budi & Sari');

      const expiredResults = filterCouples(
        sampleCouples,
        { search: '', access: 'Expired', wedding: 'all', activity: 'all' },
        fixedNow
      );
      expect(expiredResults).toHaveLength(1);
      expect(expiredResults[0].coupleName).toBe('Raka & Dina');
    });

    it('filters by wedding relative interval (lte_7, lte_14, gt_30)', () => {
      const lte7 = filterCouples(
        sampleCouples,
        { search: '', access: 'all', wedding: 'lte_7', activity: 'all' },
        fixedNow
      );
      expect(lte7).toHaveLength(1);
      expect(lte7[0].coupleName).toBe('Adit & Nisa');

      const lte14 = filterCouples(
        sampleCouples,
        { search: '', access: 'all', wedding: 'lte_14', activity: 'all' },
        fixedNow
      );
      expect(lte14).toHaveLength(2); // Adit (6) and Budi (12)

      const gt30 = filterCouples(
        sampleCouples,
        { search: '', access: 'all', wedding: 'gt_30', activity: 'all' },
        fixedNow
      );
      expect(gt30).toHaveLength(1);
      expect(gt30[0].coupleName).toBe('Raka & Dina');
    });

    it('filters by activity (today, last_7_days, inactive_gt_7)', () => {
      const today = filterCouples(
        sampleCouples,
        { search: '', access: 'all', wedding: 'all', activity: 'today' },
        fixedNow
      );
      expect(today).toHaveLength(1);
      expect(today[0].coupleName).toBe('Adit & Nisa');

      const last7 = filterCouples(
        sampleCouples,
        { search: '', access: 'all', wedding: 'all', activity: 'last_7_days' },
        fixedNow
      );
      expect(last7).toHaveLength(2); // Adit and Budi

      const inactive = filterCouples(
        sampleCouples,
        { search: '', access: 'all', wedding: 'all', activity: 'inactive_gt_7' },
        fixedNow
      );
      expect(inactive).toHaveLength(1);
      expect(inactive[0].coupleName).toBe('Raka & Dina');
    });

    it('composes multiple filters correctly with logical AND', () => {
      // Trial + Wedding <= 30 days
      const composite1 = filterCouples(
        sampleCouples,
        { search: '', access: 'Trial', wedding: 'lte_30', activity: 'all' },
        fixedNow
      );
      expect(composite1).toHaveLength(1);
      expect(composite1[0].coupleName).toBe('Adit & Nisa');

      // Paid + Inactive > 7 days -> should be 0
      const composite2 = filterCouples(
        sampleCouples,
        { search: '', access: 'Paid', wedding: 'all', activity: 'inactive_gt_7' },
        fixedNow
      );
      expect(composite2).toHaveLength(0);
    });
  });

  describe('calculateExtendedExpiryDate', () => {
    const fixedNow = new Date('2026-09-04T12:00:00Z');

    it('extends from current expiry if current expiry is in the future', () => {
      const futureExpiry = '2026-09-10T12:00:00.000Z';
      const result = calculateExtendedExpiryDate(futureExpiry, 7, fixedNow);
      expect(result).toBe('2026-09-17T12:00:00.000Z');
    });

    it('extends from now if current expiry is in the past', () => {
      const pastExpiry = '2026-09-01T12:00:00.000Z';
      const result = calculateExtendedExpiryDate(pastExpiry, 7, fixedNow);
      expect(result).toBe('2026-09-11T12:00:00.000Z');
    });

    it('extends from now if current expiry is null', () => {
      const result = calculateExtendedExpiryDate(null, 7, fixedNow);
      expect(result).toBe('2026-09-11T12:00:00.000Z');
    });

    it('returns current expiry if daysToAdd <= 0', () => {
      const futureExpiry = '2026-09-10T12:00:00.000Z';
      const result = calculateExtendedExpiryDate(futureExpiry, 0, fixedNow);
      expect(result).toBe(futureExpiry);
    });
  });

  describe('calculateWeddingPassExpiryDate', () => {
    const fixedNow = new Date('2026-09-04T12:00:00Z');

    it('calculates expiry until wedding day + grace period', () => {
      const weddingDate = '2026-10-10T00:00:00.000Z';
      const result = calculateWeddingPassExpiryDate(weddingDate, 30, 'until_wedding_day', 18, fixedNow);
      expect(result).toBe('2026-11-09T00:00:00.000Z');
    });

    it('calculates fixed duration expiry in months when rule is fixed_duration', () => {
      const result = calculateWeddingPassExpiryDate(null, 30, 'fixed_duration', 12, fixedNow);
      const expected = new Date(fixedNow);
      expected.setMonth(expected.getMonth() + 12);
      expect(result).toBe(expected.toISOString());
    });
  });

  describe('formatAccessSourceLabel', () => {
    it('returns Indonesian friendly source labels', () => {
      expect(formatAccessSourceLabel('complimentary')).toBe('Wedding Pass (Complimentary)');
      expect(formatAccessSourceLabel('purchased')).toBe('Wedding Pass (Pembelian)');
      expect(formatAccessSourceLabel('trial')).toBe('Free Trial (Sistem)');
      expect(formatAccessSourceLabel('system')).toBe('Sistem Otomatis');
      expect(formatAccessSourceLabel('unknown_source')).toBe('unknown_source');
    });
  });

  describe('formatAccessEventDescription', () => {
    it('formats trial_extended event', () => {
      const formatted = formatAccessEventDescription('trial_extended', {
        daysAdded: 7,
        newExpiresAt: '2026-09-18T00:00:00.000Z',
        reason: 'Customer request',
      });
      expect(formatted.title).toBe('Perpanjangan Trial (+7 Hari)');
      expect(formatted.description).toContain('18 Sep 2026');
      expect(formatted.description).toContain('Customer request');
    });

    it('formats wedding_pass_purchased event', () => {
      const formatted = formatAccessEventDescription('wedding_pass_purchased', {
        orderNumber: 'WF-20260904-1234',
        newExpiresAt: '2026-11-10T00:00:00.000Z',
      });
      expect(formatted.title).toBe('Wedding Pass (Pembelian)');
      expect(formatted.description).toContain('WF-20260904-1234');
      expect(formatted.description).toContain('10 Nov 2026');
    });

    it('formats wedding_pass_granted_complimentary event', () => {
      const formatted = formatAccessEventDescription('wedding_pass_granted_complimentary', {
        newExpiresAt: '2026-11-10T00:00:00.000Z',
        reason: 'VIP Partner',
      });
      expect(formatted.title).toBe('Wedding Pass Diberikan (Complimentary)');
      expect(formatted.description).toContain('10 Nov 2026');
      expect(formatted.description).toContain('VIP Partner');
    });

    it('formats legacy wedding_pass_granted event according to source metadata', () => {
      const purchasedLegacy = formatAccessEventDescription('wedding_pass_granted', {
        source: 'purchased',
        orderNumber: 'WF-20260904-5678',
        newExpiresAt: '2026-12-31T00:00:00.000Z',
      });
      expect(purchasedLegacy.title).toBe('Wedding Pass (Pembelian)');

      const complimentaryLegacy = formatAccessEventDescription('wedding_pass_granted', {
        source: 'complimentary',
        newExpiresAt: '2026-12-31T00:00:00.000Z',
        reason: 'Admin test',
      });
      expect(complimentaryLegacy.title).toBe('Wedding Pass Diberikan (Complimentary)');
    });


    it('formats trial_started event', () => {
      const formatted = formatAccessEventDescription('trial_started', {
        newExpiresAt: '2026-09-18T00:00:00.000Z',
      });
      expect(formatted.title).toBe('Trial Dimulai');
    });
  });

  describe('getWeddingPassProduct', () => {
    it('creates a commercial product representation from global access config', () => {
      const product = getWeddingPassProduct({
        ...DEFAULT_ADMIN_ACCESS_CONFIG,
        price: 249000,
        currency: 'IDR',
      });
      expect(product.id).toBe('prod_wedding_pass');
      expect(product.productType).toBe('wedding_pass');
      expect(product.price).toBe(249000);
      expect(product.currency).toBe('IDR');
    });
  });

  describe('generateOrderNumber', () => {
    it('formats order numbers with WF-YYYYMMDD prefix', () => {
      const orderNum = generateOrderNumber(new Date('2026-09-04T10:00:00Z'), '1234');
      expect(orderNum).toBe('WF-20260904-1234');
    });
  });

  describe('computePaymentMetrics', () => {
    it('computes order counts and revenue strictly from real order data', () => {
      const mockOrders: AdminOrderSummary[] = [
        {
          id: 'o1',
          orderNumber: 'WF-20260904-001',
          workspaceId: 'w1',
          coupleName: 'Adit & Nisa',
          productType: 'wedding_pass',
          productName: 'Wedding Pass',
          amount: 199000,
          currency: 'IDR',
          status: 'paid',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'o2',
          orderNumber: 'WF-20260904-002',
          workspaceId: 'w2',
          coupleName: 'Budi & Siti',
          productType: 'wedding_pass',
          productName: 'Wedding Pass',
          amount: 199000,
          currency: 'IDR',
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'o3',
          orderNumber: 'WF-20260904-003',
          workspaceId: 'w3',
          coupleName: 'Raka & Dina',
          productType: 'wedding_pass',
          productName: 'Wedding Pass',
          amount: 199000,
          currency: 'IDR',
          status: 'failed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const metrics = computePaymentMetrics(mockOrders);
      expect(metrics.totalOrders).toBe(3);
      expect(metrics.paidCount).toBe(1);
      expect(metrics.pendingCount).toBe(1);
      expect(metrics.failedCount).toBe(1);
      expect(metrics.totalRevenue).toBe(199000);
    });

    it('returns zero metrics when orders list is empty', () => {
      const metrics = computePaymentMetrics([]);
      expect(metrics.totalOrders).toBe(0);
      expect(metrics.paidCount).toBe(0);
      expect(metrics.pendingCount).toBe(0);
      expect(metrics.failedCount).toBe(0);
      expect(metrics.totalRevenue).toBe(0);
    });
  });

  describe('filterOrders', () => {
    const sampleOrders: AdminOrderSummary[] = [
      {
        id: 'o1',
        orderNumber: 'WF-20260904-1001',
        workspaceId: 'w1',
        coupleName: 'Adit & Nisa',
        productType: 'wedding_pass',
        productName: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'paid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'o2',
        orderNumber: 'WF-20260904-1002',
        workspaceId: 'w2',
        coupleName: 'Budi & Siti',
        productType: 'wedding_pass',
        productName: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    it('filters orders by couple name search', () => {
      const res = filterOrders(sampleOrders, { search: 'Adit', status: 'all' });
      expect(res).toHaveLength(1);
      expect(res[0].orderNumber).toBe('WF-20260904-1001');
    });

    it('filters orders by order number search', () => {
      const res = filterOrders(sampleOrders, { search: '1002', status: 'all' });
      expect(res).toHaveLength(1);
      expect(res[0].coupleName).toBe('Budi & Siti');
    });

    it('filters orders by status', () => {
      const res = filterOrders(sampleOrders, { search: '', status: 'pending' });
      expect(res).toHaveLength(1);
      expect(res[0].orderNumber).toBe('WF-20260904-1002');
    });
  });

  describe('formatOrderStatusBadge', () => {
    it('returns appropriate badge classes for order statuses', () => {
      expect(formatOrderStatusBadge('paid').className).toContain('emerald');
      expect(formatOrderStatusBadge('pending').className).toContain('amber');
      expect(formatOrderStatusBadge('failed').className).toContain('rose');
    });
  });
});


