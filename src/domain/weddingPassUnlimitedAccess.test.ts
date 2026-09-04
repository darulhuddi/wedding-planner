/**
 * WedFlow Wedding Pass Unlimited Access — Regression Test Suite (Cases A to H)
 *
 * Verifies the unlimited access model contracts across domain selectors,
 * customer entitlement hook derivations, database adapters, and payment completions.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateWeddingPassExpiryDate,
  deriveCustomerAccessDetail,
  deriveAccessTier,
} from './adminSelectors';
import { DEFAULT_ADMIN_ACCESS_CONFIG, CustomerEntitlement } from '../types/admin';
import { deriveCustomerEntitlementState } from '../hooks/useCustomerEntitlement';
import { getCheckoutDurationDescription } from '../components/checkout/CheckoutPage';

describe('Wedding Pass Unlimited Access — Comprehensive Test Suite (Cases A-H)', () => {
  // Case A: Paid entitlement has expires_at = null, remainingDays = null, isExpired = false
  describe('Case A: Paid entitlement unlimited attributes', () => {
    it('returns null expiresAt and remainingDays with isExpired=false for Paid tier', () => {
      const mockPaidEntitlement: CustomerEntitlement = {
        workspaceId: 'ws-paid-1',
        coupleName: 'Adit & Nisa',
        weddingDate: '2026-10-10',
        tier: 'Paid',
        source: 'purchased',
        startedAt: '2026-09-01T00:00:00.000Z',
        expiresAt: null,
        remainingDays: null,
        isExpired: false,
        grantedBy: 'system_order',
        notes: null,
        updatedAt: '2026-09-01T00:00:00.000Z',
      };

      const derivedState = deriveCustomerEntitlementState(
        mockPaidEntitlement,
        false,
        null,
        async () => {}
      );

      expect(derivedState.tier).toBe('Paid');
      expect(derivedState.isPaid).toBe(true);
      expect(derivedState.expiresAt).toBeNull();
      expect(derivedState.remainingDays).toBeNull();
      expect(derivedState.isExpired).toBe(false);
    });
  });

  // Case B: Unlimited access rule derivation
  describe('Case B: Unlimited access duration rule configuration & derivation', () => {
    it('returns null expiration date when accessDurationRule is unlimited', () => {
      const expiry = calculateWeddingPassExpiryDate(
        '2026-12-31T00:00:00.000Z',
        30,
        'unlimited',
        18,
        new Date('2026-09-04T00:00:00.000Z')
      );

      expect(expiry).toBeNull();
    });

    it('derives unlimited customer access detail for Paid tier', () => {
      const accessDetail = deriveCustomerAccessDetail(
        '2026-01-01T00:00:00.000Z',
        { ...DEFAULT_ADMIN_ACCESS_CONFIG, accessDurationRule: 'unlimited' },
        'Paid',
        new Date('2026-09-04T00:00:00.000Z')
      );

      expect(accessDetail.tier).toBe('Paid');
      expect(accessDetail.endDate).toBeNull();
      expect(accessDetail.remainingDays).toBeNull();
      expect(accessDetail.isExpired).toBe(false);
    });
  });

  // Case C: Free trial behavior — 14 days, finite, expires normally
  describe('Case C: Free Trial 14-day finite lifecycle', () => {
    const fixedNow = new Date('2026-09-04T12:00:00Z');

    it('grants Trial tier for accounts <= 14 days old', () => {
      // 10 days old account
      const createdAt = new Date('2026-08-25T12:00:00Z').toISOString();
      const tier = deriveAccessTier(createdAt, null, fixedNow, 14);
      expect(tier).toBe('Trial');
    });

    it('expires Trial tier after 14 days', () => {
      // 15 days old account
      const createdAt = new Date('2026-08-20T12:00:00Z').toISOString();
      const tier = deriveAccessTier(createdAt, null, fixedNow, 14);
      expect(tier).toBe('Expired');
    });

    it('derives finite remaining days for active trial', () => {
      const createdAt = new Date('2026-09-01T12:00:00Z').toISOString(); // 3 days old
      const accessDetail = deriveCustomerAccessDetail(
        createdAt,
        { ...DEFAULT_ADMIN_ACCESS_CONFIG, trialDurationDays: 14 },
        null,
        fixedNow
      );

      expect(accessDetail.tier).toBe('Trial');
      expect(accessDetail.isExpired).toBe(false);
      expect(accessDetail.remainingDays).toBe(11);
      expect(accessDetail.endDate).not.toBeNull();
    });
  });

  // Case D: Paid entitlement with past wedding date remains active
  describe('Case D: Paid access past wedding date immutability', () => {
    it('remains active (not expired) even if wedding date has passed', () => {
      const pastWeddingDate = '2025-01-01'; // Over a year ago
      const mockPastWeddingPaidEntitlement: CustomerEntitlement = {
        workspaceId: 'ws-past-wedding',
        coupleName: 'Senior Couple',
        weddingDate: pastWeddingDate,
        tier: 'Paid',
        source: 'purchased',
        startedAt: '2024-06-01T00:00:00.000Z',
        expiresAt: null,
        remainingDays: null,
        isExpired: false,
        grantedBy: 'system_order',
        notes: null,
        updatedAt: '2024-06-01T00:00:00.000Z',
      };

      const derivedState = deriveCustomerEntitlementState(
        mockPastWeddingPaidEntitlement,
        false,
        null,
        async () => {}
      );

      expect(derivedState.tier).toBe('Paid');
      expect(derivedState.isPaid).toBe(true);
      expect(derivedState.isExpired).toBe(false);
      expect(derivedState.remainingDays).toBeNull();
      expect(derivedState.expiresAt).toBeNull();
    });
  });

  // Case E: Paid entitlement with future wedding date remains active
  describe('Case E: Paid access future wedding date', () => {
    it('remains active without expiration date for future wedding', () => {
      const futureWeddingDate = '2027-12-31';
      const mockFutureWeddingPaidEntitlement: CustomerEntitlement = {
        workspaceId: 'ws-future-wedding',
        coupleName: 'Future Couple',
        weddingDate: futureWeddingDate,
        tier: 'Paid',
        source: 'purchased',
        startedAt: '2026-09-01T00:00:00.000Z',
        expiresAt: null,
        remainingDays: null,
        isExpired: false,
        grantedBy: 'system_order',
        notes: null,
        updatedAt: '2026-09-01T00:00:00.000Z',
      };

      const derivedState = deriveCustomerEntitlementState(
        mockFutureWeddingPaidEntitlement,
        false,
        null,
        async () => {}
      );

      expect(derivedState.tier).toBe('Paid');
      expect(derivedState.isPaid).toBe(true);
      expect(derivedState.isExpired).toBe(false);
      expect(derivedState.remainingDays).toBeNull();
      expect(derivedState.expiresAt).toBeNull();
    });
  });

  // Case F: Fetch failure handling does not fabricate Expired status for Paid accounts
  describe('Case F: Fetch failure / Loading state safety', () => {
    it('returns Paid tier and non-expired state when entitlement object has Paid tier despite hook error', () => {
      const paidEntitlement: CustomerEntitlement = {
        workspaceId: 'ws-err',
        coupleName: 'Error Safety Couple',
        weddingDate: '2026-10-10',
        tier: 'Paid',
        source: 'purchased',
        startedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: null,
        remainingDays: null,
        isExpired: false,
        grantedBy: null,
        notes: null,
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      const derivedState = deriveCustomerEntitlementState(
        paidEntitlement,
        false,
        'Network error during refresh',
        async () => {}
      );

      expect(derivedState.isPaid).toBe(true);
      expect(derivedState.isExpired).toBe(false);
      expect(derivedState.remainingDays).toBeNull();
      expect(derivedState.expiresAt).toBeNull();
    });
  });

  // Case G & H: Order Completion & Complimentary Pass calculation returns null expiration
  describe('Case G & H: Expiration calculation helper for Order Completion and Complimentary Pass', () => {
    it('calculateWeddingPassExpiryDate returns null when accessDurationRule is unlimited', () => {
      const complimentaryExpiry = calculateWeddingPassExpiryDate(
        '2026-11-15',
        30,
        'unlimited',
        18,
        new Date()
      );

      const orderCompletionExpiry = calculateWeddingPassExpiryDate(
        null,
        30,
        DEFAULT_ADMIN_ACCESS_CONFIG.accessDurationRule,
        DEFAULT_ADMIN_ACCESS_CONFIG.maxDurationMonths,
        new Date()
      );

      expect(complimentaryExpiry).toBeNull();
      expect(orderCompletionExpiry).toBeNull();
    });

    it('checkout duration description returns Akses penuh tanpa batas waktu for unlimited rule', () => {
      const description = getCheckoutDurationDescription({
        ...DEFAULT_ADMIN_ACCESS_CONFIG,
        accessDurationRule: 'unlimited',
      });

      expect(description).toBe('Akses penuh tanpa batas waktu');
    });
  });
});
