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
});
