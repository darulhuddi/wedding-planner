import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  evaluateCheckoutAccessGuard,
  reconcileCheckoutPrice,
  getPaymentCallbackFeedback,
  getCheckoutDurationDescription,
} from './CheckoutPage';
import * as paymentRepository from '../../repositories/paymentRepository';
import { AdminAccessConfig, AdminOrderSummary } from '../../types/admin';

vi.mock('../../repositories/paymentRepository', () => ({
  fetchCommercialPricing: vi.fn(),
  getOrCreatePendingOrder: vi.fn(),
  createPaymentSession: vi.fn(),
}));

describe('CheckoutPage Domain & Logic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Access Guard Evaluation', () => {
    it('blocks checkout if workspace already has Paid (purchased) access', () => {
      const isBlocked = evaluateCheckoutAccessGuard(true, false);
      expect(isBlocked).toBe(true);
    });

    it('blocks checkout if workspace has Complimentary access', () => {
      const isBlocked = evaluateCheckoutAccessGuard(false, true);
      expect(isBlocked).toBe(true);
    });

    it('allows checkout for Trial workspace (isPaid: false, isComplimentary: false)', () => {
      const isBlocked = evaluateCheckoutAccessGuard(false, false);
      expect(isBlocked).toBe(false);
    });

    it('allows checkout for Expired workspace', () => {
      const isBlocked = evaluateCheckoutAccessGuard(false, false);
      expect(isBlocked).toBe(false);
    });
  });

  describe('2. Authoritative Price Reconciliation', () => {
    it('matches when display price equals authoritative order price', () => {
      const result = reconcileCheckoutPrice(199000, 199000);
      expect(result.isMatch).toBe(true);
      expect(result.authoritativePrice).toBe(199000);
      expect(result.notice).toBeNull();
    });

    it('detects price discrepancy and produces clear review notice without generic error', () => {
      const result = reconcileCheckoutPrice(199000, 249000);
      expect(result.isMatch).toBe(false);
      expect(result.authoritativePrice).toBe(249000);
      expect(result.notice).toContain('Terdapat pembaruan informasi harga');
      expect(result.notice).toContain('249.000');
    });

    it('handles initial null display price gracefully', () => {
      const result = reconcileCheckoutPrice(null, 199000);
      expect(result.isMatch).toBe(true);
      expect(result.authoritativePrice).toBe(199000);
      expect(result.notice).toBeNull();
    });
  });

  describe('3. Payment Callback UI Language & Invariants', () => {
    it('onSuccess callback displays processing verification notice (NEVER "Pembayaran berhasil")', () => {
      const feedback = getPaymentCallbackFeedback('success');
      expect(feedback).not.toBeNull();
      expect(feedback?.type).toBe('processing');
      expect(feedback?.message).toContain('Pembayaran sedang diverifikasi oleh sistem');
      expect(feedback?.message).not.toContain('Pembayaran berhasil');
    });

    it('onPending callback displays pending payment instructions notice', () => {
      const feedback = getPaymentCallbackFeedback('pending');
      expect(feedback).not.toBeNull();
      expect(feedback?.type).toBe('pending');
      expect(feedback?.message).toContain('Menunggu penyelesaian pembayaran');
    });

    it('onError callback displays error notice with retry option', () => {
      const feedback = getPaymentCallbackFeedback('error');
      expect(feedback).not.toBeNull();
      expect(feedback?.type).toBe('error');
      expect(feedback?.message).toContain('Pembayaran belum berhasil diproses');
    });

    it('onClose callback produces null feedback without marking order failed', () => {
      const feedback = getPaymentCallbackFeedback('close');
      expect(feedback).toBeNull();
    });
  });

  describe('4. Access Expiry Display based on Domain Configuration', () => {
    it('displays unlimited access wording when accessDurationRule is unlimited', () => {
      const config: Partial<AdminAccessConfig> = {
        accessDurationRule: 'unlimited',
      };
      const desc = getCheckoutDurationDescription(config as AdminAccessConfig);
      expect(desc).toBe('Akses penuh tanpa batas waktu');
    });

    it('displays until_wedding_day wording when configured', () => {
      const config: Partial<AdminAccessConfig> = {
        accessDurationRule: 'until_wedding_day',
      };
      const desc = getCheckoutDurationDescription(config as AdminAccessConfig);
      expect(desc).toBe('Akses penuh aktif hingga Hari-H pernikahanmu');
    });

    it('displays month-based wording when maxDurationMonths is set', () => {
      const config: Partial<AdminAccessConfig> = {
        accessDurationRule: 'fixed_duration',
        maxDurationMonths: 18,
      };
      const desc = getCheckoutDurationDescription(config as AdminAccessConfig);
      expect(desc).toBe('Akses aktif selama 18 bulan');
    });

    it('falls back to default calm wording when config is absent', () => {
      const desc = getCheckoutDurationDescription(null);
      expect(desc).toBe('Akses penuh persiapan pernikahan');
    });
  });

  describe('5. Pending Order Reuse & Refresh / Re-entry Invariant', () => {
    it('reuses existing pending order on browser refresh / re-entry without creating duplicate', async () => {
      const mockWorkspaceId = 'ws-test-123';
      const existingPendingOrder: AdminOrderSummary = {
        id: 'ord-existing-999',
        orderNumber: 'WF-20260904-999',
        workspaceId: mockWorkspaceId,
        coupleName: 'Budi & Sari',
        productType: 'wedding_pass',
        productName: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'pending',
        createdAt: '2026-09-04T08:00:00Z',
        updatedAt: '2026-09-04T08:00:00Z',
      };

      (paymentRepository.getOrCreatePendingOrder as any).mockResolvedValue(existingPendingOrder);

      // 1. Initial checkout entry
      const firstEntryOrder = await paymentRepository.getOrCreatePendingOrder(mockWorkspaceId, 'wedding_pass');
      expect(firstEntryOrder.id).toBe('ord-existing-999');

      // 2. Simulated browser refresh / re-entry
      const refreshEntryOrder = await paymentRepository.getOrCreatePendingOrder(mockWorkspaceId, 'wedding_pass');
      expect(refreshEntryOrder.id).toBe('ord-existing-999');
      expect(refreshEntryOrder.orderNumber).toBe('WF-20260904-999');

      expect(paymentRepository.getOrCreatePendingOrder).toHaveBeenCalledTimes(2);
    });

    it('acquires Snap payment session for the order', async () => {
      const mockSession = {
        provider: 'midtrans',
        token: 'snap-token-xyz-123',
        redirectUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-xyz-123',
      };

      (paymentRepository.createPaymentSession as any).mockResolvedValueOnce(mockSession);

      const session = await paymentRepository.createPaymentSession('ord-existing-999', 'budi@example.com');
      expect(session.token).toBe('snap-token-xyz-123');
      expect(paymentRepository.createPaymentSession).toHaveBeenCalledWith('ord-existing-999', 'budi@example.com');
    });
  });
});
