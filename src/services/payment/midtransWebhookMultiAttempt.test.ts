import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService } from './paymentService';
import { MidtransProvider } from './midtransProvider';
import { computeMidtransSignature } from './midtransSignature';
import { generateMidtransOrderId } from './midtransConfig';
import { AdminOrderSummary } from '../../types/admin';

describe('Midtrans Webhook Multi-Attempt & Unique ID Matching Test Suite', () => {
  const mockServerKey = 'SB-Mid-server-HARDENED_SECRET_987';
  let mockOrder: AdminOrderSummary;
  let provider: MidtransProvider;
  let paymentService: PaymentService;
  let completeOrderSpy: any;

  beforeEach(() => {
    mockOrder = {
      id: 'ord-multi-uuid-101',
      orderNumber: 'WF-20260904-5555',
      workspaceId: 'ws-couple-55',
      coupleName: 'Dimas & Rara',
      productType: 'wedding_pass',
      productName: 'Wedding Pass',
      amount: 250000,
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
      const wasAlreadyPaid = mockOrder.status === 'paid';
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
          is_idempotent_replay: wasAlreadyPaid,
        },
      };
    });

    paymentService = new PaymentService({
      provider,
      findOrderByOrderNumber: async (num) => {
        // Simulates DB lookup: matches either the exact orderNumber or metadata session midtransOrderId
        if (num === mockOrder.orderNumber) return mockOrder;
        if (mockOrder.metadata?.midtransSession?.midtransOrderId === num) return mockOrder;
        return null;
      },
      saveOrderSnapSession: async () => {},
      completeOrder: completeOrderSpy,
    });
  });

  it('1. Webhook with unique midtrans_order_id successfully matches order via base number fallback', async () => {
    const uniqueMidtransOrderId = generateMidtransOrderId(mockOrder.orderNumber);

    const validSig = await computeMidtransSignature(
      uniqueMidtransOrderId,
      '200',
      '250000.00',
      mockServerKey
    );

    const payload = {
      order_id: uniqueMidtransOrderId,
      status_code: '200',
      gross_amount: '250000.00',
      signature_key: validSig,
      transaction_status: 'settlement',
      transaction_id: 'tx-attempt-999',
      payment_type: 'qris',
    };

    const result = await paymentService.handleWebhookNotification(payload);

    expect(result.statusCode).toBe(200);
    expect(result.success).toBe(true);
    expect(completeOrderSpy).toHaveBeenCalledTimes(1);
    expect(completeOrderSpy).toHaveBeenCalledWith(
      mockOrder.id,
      expect.objectContaining({
        amount: 250000,
        currency: 'IDR',
        paymentMethod: 'qris',
        provider: 'midtrans',
        providerReference: 'tx-attempt-999',
      })
    );
  });

  it('2. Webhook with legacy direct order_number still matches cleanly (backward compatibility)', async () => {
    const legacyOrderId = mockOrder.orderNumber;

    const validSig = await computeMidtransSignature(
      legacyOrderId,
      '200',
      '250000.00',
      mockServerKey
    );

    const payload = {
      order_id: legacyOrderId,
      status_code: '200',
      gross_amount: '250000.00',
      signature_key: validSig,
      transaction_status: 'settlement',
      transaction_id: 'tx-legacy-111',
      payment_type: 'bank_transfer',
    };

    const result = await paymentService.handleWebhookNotification(payload);

    expect(result.statusCode).toBe(200);
    expect(result.success).toBe(true);
    expect(completeOrderSpy).toHaveBeenCalledTimes(1);
  });

  it('3. Webhook with tampered signature on unique midtrans_order_id is rejected with HTTP 401', async () => {
    const uniqueMidtransOrderId = generateMidtransOrderId(mockOrder.orderNumber);

    const payload = {
      order_id: uniqueMidtransOrderId,
      status_code: '200',
      gross_amount: '250000.00',
      signature_key: 'forged-signature-abc',
      transaction_status: 'settlement',
      transaction_id: 'tx-bad-sig',
      payment_type: 'qris',
    };

    const result = await paymentService.handleWebhookNotification(payload);

    expect(result.statusCode).toBe(401);
    expect(result.success).toBe(false);
    expect(completeOrderSpy).not.toHaveBeenCalled();
  });

  describe('Monotonic Webhook State Transitions & Duplicate Idempotency', () => {
    it('duplicate settlement webhook returns HTTP 200 with isIdempotentReplay=true without duplicate mutations', async () => {
      const attemptId = generateMidtransOrderId(mockOrder.orderNumber);
      const sig = await computeMidtransSignature(attemptId, '200', '250000.00', mockServerKey);

      const payload = {
        order_id: attemptId,
        status_code: '200',
        gross_amount: '250000.00',
        signature_key: sig,
        transaction_status: 'settlement',
        transaction_id: 'tx-settle-1',
        payment_type: 'qris',
      };

      // 1st delivery
      const res1 = await paymentService.handleWebhookNotification(payload);
      expect(res1.statusCode).toBe(200);
      expect(res1.success).toBe(true);
      expect(mockOrder.status).toBe('paid');

      // 2nd delivery (duplicate)
      const res2 = await paymentService.handleWebhookNotification(payload);
      expect(res2.statusCode).toBe(200);
      expect(res2.isIdempotentReplay).toBe(true);
      expect(res2.message).toContain('already paid');
    });

    it('settlement followed by pending webhook ignores pending and preserves paid status', async () => {
      // 1. Order is paid
      mockOrder.status = 'paid';
      const olderAttemptId = generateMidtransOrderId(mockOrder.orderNumber);
      const sig = await computeMidtransSignature(olderAttemptId, '201', '250000.00', mockServerKey);

      const payload = {
        order_id: olderAttemptId,
        status_code: '201',
        gross_amount: '250000.00',
        signature_key: sig,
        transaction_status: 'pending',
        transaction_id: 'tx-pending-delayed',
        payment_type: 'bank_transfer',
      };

      const res = await paymentService.handleWebhookNotification(payload);
      expect(res.statusCode).toBe(200);
      expect(res.isIdempotentReplay).toBe(true);
      expect(mockOrder.status).toBe('paid');
      expect(res.message).toContain('Order is already paid');
    });

    it('settlement followed by expire webhook ignores expire and preserves paid status', async () => {
      mockOrder.status = 'paid';
      const olderAttemptId = generateMidtransOrderId(mockOrder.orderNumber);
      const sig = await computeMidtransSignature(olderAttemptId, '202', '250000.00', mockServerKey);

      const payload = {
        order_id: olderAttemptId,
        status_code: '202',
        gross_amount: '250000.00',
        signature_key: sig,
        transaction_status: 'expire',
        transaction_id: 'tx-expire-delayed',
        payment_type: 'bank_transfer',
      };

      const res = await paymentService.handleWebhookNotification(payload);
      expect(res.statusCode).toBe(200);
      expect(res.isIdempotentReplay).toBe(true);
      expect(mockOrder.status).toBe('paid');
    });

    it('settlement followed by deny webhook ignores deny and preserves paid status', async () => {
      mockOrder.status = 'paid';
      const olderAttemptId = generateMidtransOrderId(mockOrder.orderNumber);
      const sig = await computeMidtransSignature(olderAttemptId, '202', '250000.00', mockServerKey);

      const payload = {
        order_id: olderAttemptId,
        status_code: '202',
        gross_amount: '250000.00',
        signature_key: sig,
        transaction_status: 'deny',
        transaction_id: 'tx-deny-delayed',
        payment_type: 'credit_card',
      };

      const res = await paymentService.handleWebhookNotification(payload);
      expect(res.statusCode).toBe(200);
      expect(res.isIdempotentReplay).toBe(true);
      expect(mockOrder.status).toBe('paid');
    });

    it('settlement followed by cancel webhook ignores cancel and preserves paid status', async () => {
      mockOrder.status = 'paid';
      const olderAttemptId = generateMidtransOrderId(mockOrder.orderNumber);
      const sig = await computeMidtransSignature(olderAttemptId, '202', '250000.00', mockServerKey);

      const payload = {
        order_id: olderAttemptId,
        status_code: '202',
        gross_amount: '250000.00',
        signature_key: sig,
        transaction_status: 'cancel',
        transaction_id: 'tx-cancel-delayed',
        payment_type: 'bank_transfer',
      };

      const res = await paymentService.handleWebhookNotification(payload);
      expect(res.statusCode).toBe(200);
      expect(res.isIdempotentReplay).toBe(true);
      expect(mockOrder.status).toBe('paid');
    });
  });
});
