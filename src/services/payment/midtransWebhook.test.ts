import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService } from './paymentService';
import { MidtransProvider } from './midtransProvider';
import { computeMidtransSignature } from './midtransSignature';
import { normalizeMidtransNotification } from './midtransStatusMapper';
import { AdminOrderSummary } from '../../types/admin';
import { getClientMidtransConfig } from './midtransConfig';

describe('Midtrans Webhook & Security Verification Test Suite', () => {
  const mockServerKey = 'SB-Mid-server-HARDENED_SECRET_987';
  let mockOrder: AdminOrderSummary;
  let provider: MidtransProvider;
  let paymentService: PaymentService;
  let completeOrderSpy: any;

  beforeEach(() => {
    mockOrder = {
      id: 'ord-webhook-uuid-1',
      orderNumber: 'WF-20260904-0099',
      workspaceId: 'ws-webhook-1',
      coupleName: 'Rama & Sinta',
      productType: 'wedding_pass',
      productName: 'Wedding Pass',
      amount: 199000,
      currency: 'IDR',
      status: 'pending',
      createdAt: '2026-09-04T10:00:00Z',
      updatedAt: '2026-09-04T10:00:00Z',
      metadata: {},
    };

    provider = new MidtransProvider({
      serverKey: mockServerKey,
      isProduction: false,
    });

    completeOrderSpy = vi.fn().mockImplementation(async (orderId, paymentData) => {
      mockOrder.status = 'paid';
      return {
        ...mockOrder,
        status: 'paid',
        paidAt: new Date().toISOString(),
        paymentMethod: paymentData.paymentMethod,
        provider: paymentData.provider,
        providerReference: paymentData.providerReference,
        metadata: {
          ...paymentData.metadata,
          is_idempotent_replay: false,
        },
      };
    });

    paymentService = new PaymentService({
      provider,
      findOrderByOrderNumber: async (num) => (num === mockOrder.orderNumber ? mockOrder : null),
      saveOrderSnapSession: async () => {},
      completeOrder: completeOrderSpy,
    });
  });

  describe('Security: Server Key Isolation', () => {
    it('ensures getClientMidtransConfig does not contain or expose MIDTRANS_SERVER_KEY', () => {
      const clientConfig = getClientMidtransConfig();
      expect((clientConfig as any).serverKey).toBeUndefined();
      expect((clientConfig as any).MIDTRANS_SERVER_KEY).toBeUndefined();
      expect(clientConfig.clientKey).toBeDefined();
    });
  });

  describe('Webhook: Signature Verification', () => {
    it('accepts valid SHA-512 signature', async () => {
      const validSig = await computeMidtransSignature(
        mockOrder.orderNumber,
        '200',
        '199000.00',
        mockServerKey
      );

      const payload = {
        order_id: mockOrder.orderNumber,
        status_code: '200',
        gross_amount: '199000.00',
        signature_key: validSig,
        transaction_status: 'settlement',
        transaction_id: 'tx-sec-1',
        payment_type: 'qris',
      };

      const result = await paymentService.handleWebhookNotification(payload);
      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(completeOrderSpy).toHaveBeenCalledTimes(1);
    });

    it('rejects tampered signature with HTTP 401 and performs no DB mutations', async () => {
      const payload = {
        order_id: mockOrder.orderNumber,
        status_code: '200',
        gross_amount: '199000.00',
        signature_key: 'forged_or_invalid_signature_key_000000000000000000000000000000',
        transaction_status: 'settlement',
        transaction_id: 'tx-forged',
      };

      const result = await paymentService.handleWebhookNotification(payload);
      expect(result.statusCode).toBe(401);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid notification signature');
      expect(completeOrderSpy).not.toHaveBeenCalled();
    });
  });

  describe('Webhook: Order & Amount Validation', () => {
    it('returns HTTP 404 for unknown order number', async () => {
      const unknownOrderId = 'WF-NONEXISTENT-999';
      const validSig = await computeMidtransSignature(
        unknownOrderId,
        '200',
        '199000.00',
        mockServerKey
      );

      const payload = {
        order_id: unknownOrderId,
        status_code: '200',
        gross_amount: '199000.00',
        signature_key: validSig,
        transaction_status: 'settlement',
        transaction_id: 'tx-unknown',
      };

      const result = await paymentService.handleWebhookNotification(payload);
      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
      expect(completeOrderSpy).not.toHaveBeenCalled();
    });

    it('rejects amount mismatch with HTTP 422 and grants zero entitlement', async () => {
      // Order requires 199000, notification claims 50000
      const validSigFor50k = await computeMidtransSignature(
        mockOrder.orderNumber,
        '200',
        '50000.00',
        mockServerKey
      );

      const payload = {
        order_id: mockOrder.orderNumber,
        status_code: '200',
        gross_amount: '50000.00',
        signature_key: validSigFor50k,
        transaction_status: 'settlement',
        transaction_id: 'tx-mismatch',
      };

      const result = await paymentService.handleWebhookNotification(payload);
      expect(result.statusCode).toBe(422);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Amount mismatch');
      expect(completeOrderSpy).not.toHaveBeenCalled();
      expect(mockOrder.status).toBe('pending');
    });
  });

  describe('Webhook: Payment Lifecycle & Fraud States', () => {
    it('completes order on settlement', async () => {
      const sig = await computeMidtransSignature(
        mockOrder.orderNumber,
        '200',
        '199000.00',
        mockServerKey
      );

      const payload = {
        order_id: mockOrder.orderNumber,
        status_code: '200',
        gross_amount: '199000.00',
        signature_key: sig,
        transaction_status: 'settlement',
        transaction_id: 'tx-settle-ok',
        payment_type: 'gopay',
      };

      const result = await paymentService.handleWebhookNotification(payload);
      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(completeOrderSpy).toHaveBeenCalledWith(
        mockOrder.id,
        expect.objectContaining({
          amount: 199000,
          currency: 'IDR',
          paymentMethod: 'gopay',
          provider: 'midtrans',
          providerReference: 'tx-settle-ok',
        })
      );
    });

    it('completes order on card capture when fraud_status = accept', async () => {
      const sig = await computeMidtransSignature(
        mockOrder.orderNumber,
        '200',
        '199000.00',
        mockServerKey
      );

      const payload = {
        order_id: mockOrder.orderNumber,
        status_code: '200',
        gross_amount: '199000.00',
        signature_key: sig,
        transaction_status: 'capture',
        fraud_status: 'accept',
        transaction_id: 'tx-card-accept',
        payment_type: 'credit_card',
      };

      const result = await paymentService.handleWebhookNotification(payload);
      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(completeOrderSpy).toHaveBeenCalledTimes(1);
    });

    it('does NOT complete order or grant entitlement on card capture when fraud_status = challenge', async () => {
      const sig = await computeMidtransSignature(
        mockOrder.orderNumber,
        '201',
        '199000.00',
        mockServerKey
      );

      const payload = {
        order_id: mockOrder.orderNumber,
        status_code: '201',
        gross_amount: '199000.00',
        signature_key: sig,
        transaction_status: 'capture',
        fraud_status: 'challenge',
        transaction_id: 'tx-card-challenge',
        payment_type: 'credit_card',
      };

      const result = await paymentService.handleWebhookNotification(payload);
      expect(result.statusCode).toBe(200);
      expect(result.message).toContain('fraud review required');
      expect(completeOrderSpy).not.toHaveBeenCalled();
      expect(mockOrder.status).toBe('pending');
    });

    it('handles duplicate webhook notifications with idempotent replay', async () => {
      const sig = await computeMidtransSignature(
        mockOrder.orderNumber,
        '200',
        '199000.00',
        mockServerKey
      );

      const payload = {
        order_id: mockOrder.orderNumber,
        status_code: '200',
        gross_amount: '199000.00',
        signature_key: sig,
        transaction_status: 'settlement',
        transaction_id: 'tx-duplicate-1',
        payment_type: 'qris',
      };

      // First webhook
      const firstResult = await paymentService.handleWebhookNotification(payload);
      expect(firstResult.statusCode).toBe(200);
      expect(firstResult.isIdempotentReplay).toBe(false);

      // Configure completeOrder spy for subsequent call to simulate idempotent replay
      completeOrderSpy.mockImplementationOnce(async () => {
        return {
          ...mockOrder,
          status: 'paid',
          metadata: { is_idempotent_replay: true },
        };
      });

      // Second webhook (duplicate replay)
      const secondResult = await paymentService.handleWebhookNotification(payload);
      expect(secondResult.statusCode).toBe(200);
      expect(secondResult.isIdempotentReplay).toBe(true);
      expect(secondResult.message).toContain('Idempotent replay');
    });

    it('handles non-success states (pending, deny, cancel, expire) gracefully without granting entitlement', async () => {
      const statuses = ['pending', 'deny', 'cancel', 'expire', 'failure'];

      for (const status of statuses) {
        completeOrderSpy.mockClear();
        mockOrder.status = 'pending';

        const sig = await computeMidtransSignature(
          mockOrder.orderNumber,
          '202',
          '199000.00',
          mockServerKey
        );

        const payload = {
          order_id: mockOrder.orderNumber,
          status_code: '202',
          gross_amount: '199000.00',
          signature_key: sig,
          transaction_status: status,
          transaction_id: `tx-${status}`,
          payment_type: 'bank_transfer',
        };

        const result = await paymentService.handleWebhookNotification(payload);
        expect(result.statusCode).toBe(200);
        expect(completeOrderSpy).not.toHaveBeenCalled();
        expect(mockOrder.status).toBe('pending');
      }
    });

    it('handles refund notifications by recognizing refunded/cancelled domain state', async () => {
      const sig = await computeMidtransSignature(
        mockOrder.orderNumber,
        '200',
        '199000.00',
        mockServerKey
      );

      const payload = {
        order_id: mockOrder.orderNumber,
        status_code: '200',
        gross_amount: '199000.00',
        signature_key: sig,
        transaction_status: 'refund',
        transaction_id: 'tx-refund-99',
        payment_type: 'qris',
      };

      const result = await paymentService.handleWebhookNotification(payload);
      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toContain('refund');

      const parsed = normalizeMidtransNotification(payload as any);
      expect(parsed.domainPaymentStatus).toBe('refunded');
      expect(parsed.domainOrderStatus).toBe('cancelled');
    });

    it('handles chargeback notifications by recognizing refunded/cancelled domain state', async () => {
      const sig = await computeMidtransSignature(
        mockOrder.orderNumber,
        '200',
        '199000.00',
        mockServerKey
      );

      const payload = {
        order_id: mockOrder.orderNumber,
        status_code: '200',
        gross_amount: '199000.00',
        signature_key: sig,
        transaction_status: 'chargeback',
        transaction_id: 'tx-chargeback-99',
        payment_type: 'credit_card',
      };

      const result = await paymentService.handleWebhookNotification(payload);
      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.message).toContain('chargeback');

      const parsed = normalizeMidtransNotification(payload as any);
      expect(parsed.domainPaymentStatus).toBe('refunded');
      expect(parsed.domainOrderStatus).toBe('cancelled');
    });
  });
});
