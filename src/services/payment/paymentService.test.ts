import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService, PaymentServiceDependencies } from './paymentService';
import { IPaymentProvider } from './paymentProviderInterface';
import { AdminOrderSummary } from '../../types/admin';
import { NormalizedPaymentResult } from './midtransTypes';

describe('PaymentService (Application Service Layer)', () => {
  let mockProvider: IPaymentProvider;
  let mockOrder: AdminOrderSummary;
  let savedSessions: Map<string, any>;
  let completedOrders: Map<string, any>;

  beforeEach(() => {
    savedSessions = new Map();
    completedOrders = new Map();

    mockOrder = {
      id: 'ord-uuid-1',
      orderNumber: 'WF-20260904-0001',
      workspaceId: 'ws-1',
      coupleName: 'Budi & Ani',
      productType: 'wedding_pass',
      productName: 'Wedding Pass',
      amount: 199000,
      currency: 'IDR',
      status: 'pending',
      createdAt: '2026-09-04T12:00:00Z',
      updatedAt: '2026-09-04T12:00:00Z',
      metadata: {},
    };

    mockProvider = {
      providerName: 'midtrans',
      createTransaction: vi.fn().mockResolvedValue({
        provider: 'midtrans',
        token: 'new-snap-token-123',
        redirectUrl: 'https://snap.url/token-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
      verifyNotificationSignature: vi.fn().mockResolvedValue(true),
      getTransactionStatus: vi.fn(),
      normalizePayload: vi.fn(),
    };
  });

  function createService(overrides: Partial<PaymentServiceDependencies> = {}) {
    return new PaymentService({
      provider: mockProvider,
      findOrderByOrderNumber: async (num) => (num === mockOrder.orderNumber ? mockOrder : null),
      saveOrderSnapSession: async (orderId, session) => {
        savedSessions.set(orderId, session);
        mockOrder.metadata = { ...mockOrder.metadata, midtransSession: session };
      },
      completeOrder: async (orderId, paymentData) => {
        completedOrders.set(orderId, paymentData);
        mockOrder.status = 'paid';
        return {
          ...mockOrder,
          status: 'paid',
          paidAt: new Date().toISOString(),
          metadata: { is_idempotent_replay: false },
        };
      },
      ...overrides,
    });
  }

  describe('getOrCreatePaymentSession (Pending Token Reuse)', () => {
    it('creates a new Snap session if no session exists yet', async () => {
      const service = createService();
      const result = await service.getOrCreatePaymentSession(mockOrder, 'budi@example.com');

      expect(mockProvider.createTransaction).toHaveBeenCalledTimes(1);
      expect(result.token).toBe('new-snap-token-123');
      expect(savedSessions.get(mockOrder.id)?.token).toBe('new-snap-token-123');
    });

    it('reuses an existing unexpired Snap session without calling provider API', async () => {
      const now = new Date();
      const futureExpiry = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour from now

      mockOrder.metadata = {
        midtransSession: {
          token: 'cached-snap-token-999',
          redirectUrl: 'https://snap.url/cached',
          createdAt: now.toISOString(),
          expiresAt: futureExpiry,
          grossAmount: 199000,
          provider: 'midtrans',
        },
      };

      const service = createService();
      const result = await service.getOrCreatePaymentSession(
        mockOrder,
        'budi@example.com',
        undefined,
        { now }
      );

      expect(mockProvider.createTransaction).not.toHaveBeenCalled();
      expect(result.token).toBe('cached-snap-token-999');
      expect(result.redirectUrl).toBe('https://snap.url/cached');
    });

    it('creates a new Snap session if existing token has expired or is about to expire', async () => {
      const now = new Date();
      // Token expiring in only 30 seconds (less than 2-minute safety window)
      const expiringSoon = new Date(now.getTime() + 30 * 1000).toISOString();

      mockOrder.metadata = {
        midtransSession: {
          token: 'about-to-expire-token',
          redirectUrl: 'https://snap.url/old',
          createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          expiresAt: expiringSoon,
          grossAmount: 199000,
          provider: 'midtrans',
        },
      };

      const service = createService();
      const result = await service.getOrCreatePaymentSession(
        mockOrder,
        'budi@example.com',
        undefined,
        { now }
      );

      expect(mockProvider.createTransaction).toHaveBeenCalledTimes(1);
      expect(result.token).toBe('new-snap-token-123');
    });

    it('rejects creating session if order is already paid', async () => {
      mockOrder.status = 'paid';
      const service = createService();

      await expect(
        service.getOrCreatePaymentSession(mockOrder, 'budi@example.com')
      ).rejects.toThrow(/sudah dibayar/);
    });
  });

  describe('handleWebhookNotification', () => {
    it('rejects notification with HTTP 401 if signature is invalid', async () => {
      (mockProvider.verifyNotificationSignature as any).mockResolvedValueOnce(false);

      const service = createService();
      const result = await service.handleWebhookNotification({
        order_id: 'WF-20260904-0001',
        signature_key: 'invalid-sig',
      });

      expect(result.statusCode).toBe(401);
      expect(result.success).toBe(false);
      expect(completedOrders.size).toBe(0);
    });

    it('rejects notification with HTTP 404 if order does not exist', async () => {
      const service = createService({
        findOrderByOrderNumber: async () => null,
      });

      const result = await service.handleWebhookNotification({
        order_id: 'WF-NONEXISTENT',
        signature_key: 'valid-sig',
      });

      expect(result.statusCode).toBe(404);
      expect(result.success).toBe(false);
      expect(completedOrders.size).toBe(0);
    });

    it('rejects notification with HTTP 422 if gross_amount does not match order amount', async () => {
      (mockProvider.normalizePayload as any).mockReturnValueOnce({
        isSuccess: true,
        amount: 100000, // Mismatch (expected 199000)
        currency: 'IDR',
        orderNumber: mockOrder.orderNumber,
        transactionId: 'tx-1',
        paymentMethod: 'qris',
        provider: 'midtrans',
      });

      const service = createService();
      const result = await service.handleWebhookNotification({
        order_id: mockOrder.orderNumber,
        gross_amount: '100000.00',
        signature_key: 'valid-sig',
      });

      expect(result.statusCode).toBe(422);
      expect(result.message).toContain('Amount mismatch');
      expect(completedOrders.size).toBe(0);
    });

    it('processes settlement notification and triggers atomic completeOrder with HTTP 200', async () => {
      const normalizedResult: NormalizedPaymentResult = {
        isSuccess: true,
        isPending: false,
        isFailed: false,
        isChallenge: false,
        domainOrderStatus: 'paid',
        domainPaymentStatus: 'paid',
        orderNumber: mockOrder.orderNumber,
        transactionId: 'tx-settled-888',
        amount: 199000,
        currency: 'IDR',
        paymentMethod: 'qris',
        provider: 'midtrans',
        rawStatus: 'settlement',
        metadata: { bank: 'bca' },
      };

      (mockProvider.normalizePayload as any).mockReturnValueOnce(normalizedResult);

      const service = createService();
      const result = await service.handleWebhookNotification({
        order_id: mockOrder.orderNumber,
        gross_amount: '199000.00',
        signature_key: 'valid-sig',
        transaction_status: 'settlement',
      });

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(completedOrders.get(mockOrder.id)).toEqual({
        amount: 199000,
        currency: 'IDR',
        paymentMethod: 'qris',
        provider: 'midtrans',
        providerReference: 'tx-settled-888',
        metadata: { bank: 'bca' },
      });
    });

    it('processes capture with accept as valid payment completion', async () => {
      const normalizedResult: NormalizedPaymentResult = {
        isSuccess: true,
        isPending: false,
        isFailed: false,
        isChallenge: false,
        domainOrderStatus: 'paid',
        domainPaymentStatus: 'paid',
        orderNumber: mockOrder.orderNumber,
        transactionId: 'tx-card-999',
        amount: 199000,
        currency: 'IDR',
        paymentMethod: 'credit_card',
        provider: 'midtrans',
        rawStatus: 'capture',
        fraudStatus: 'accept',
        metadata: {},
      };

      (mockProvider.normalizePayload as any).mockReturnValueOnce(normalizedResult);

      const service = createService();
      const result = await service.handleWebhookNotification({
        order_id: mockOrder.orderNumber,
        gross_amount: '199000.00',
        signature_key: 'valid-sig',
        transaction_status: 'capture',
        fraud_status: 'accept',
      });

      expect(result.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(completedOrders.size).toBe(1);
    });

    it('does NOT complete order when capture has fraud_status = challenge', async () => {
      const normalizedResult: NormalizedPaymentResult = {
        isSuccess: false,
        isPending: true,
        isFailed: false,
        isChallenge: true,
        domainOrderStatus: 'pending',
        domainPaymentStatus: 'pending',
        orderNumber: mockOrder.orderNumber,
        transactionId: 'tx-challenge-111',
        amount: 199000,
        currency: 'IDR',
        paymentMethod: 'credit_card',
        provider: 'midtrans',
        rawStatus: 'capture',
        fraudStatus: 'challenge',
        metadata: {},
      };

      (mockProvider.normalizePayload as any).mockReturnValueOnce(normalizedResult);

      const service = createService();
      const result = await service.handleWebhookNotification({
        order_id: mockOrder.orderNumber,
        gross_amount: '199000.00',
        signature_key: 'valid-sig',
        transaction_status: 'capture',
        fraud_status: 'challenge',
      });

      expect(result.statusCode).toBe(200);
      expect(result.message).toContain('challenge');
      expect(result.message).toContain('fraud review');
      expect(completedOrders.size).toBe(0);
    });

    it('acknowledges non-success states (expire, deny, cancel) without granting entitlement', async () => {
      const normalizedResult: NormalizedPaymentResult = {
        isSuccess: false,
        isPending: false,
        isFailed: true,
        isChallenge: false,
        domainOrderStatus: 'expired',
        domainPaymentStatus: 'expired',
        orderNumber: mockOrder.orderNumber,
        transactionId: 'tx-expired-222',
        amount: 199000,
        currency: 'IDR',
        paymentMethod: 'bank_transfer',
        provider: 'midtrans',
        rawStatus: 'expire',
        metadata: {},
      };

      (mockProvider.normalizePayload as any).mockReturnValueOnce(normalizedResult);

      const service = createService();
      const result = await service.handleWebhookNotification({
        order_id: mockOrder.orderNumber,
        gross_amount: '199000.00',
        signature_key: 'valid-sig',
        transaction_status: 'expire',
      });

      expect(result.statusCode).toBe(200);
      expect(completedOrders.size).toBe(0);
    });

    it('returns HTTP 500 when database error occurs during completeOrder', async () => {
      const normalizedResult: NormalizedPaymentResult = {
        isSuccess: true,
        isPending: false,
        isFailed: false,
        isChallenge: false,
        domainOrderStatus: 'paid',
        domainPaymentStatus: 'paid',
        orderNumber: mockOrder.orderNumber,
        transactionId: 'tx-err',
        amount: 199000,
        currency: 'IDR',
        paymentMethod: 'qris',
        provider: 'midtrans',
        rawStatus: 'settlement',
        metadata: {},
      };

      (mockProvider.normalizePayload as any).mockReturnValueOnce(normalizedResult);

      const service = createService({
        completeOrder: async () => {
          throw new Error('Connection timeout');
        },
      });

      const result = await service.handleWebhookNotification({
        order_id: mockOrder.orderNumber,
        gross_amount: '199000.00',
        signature_key: 'valid-sig',
      });

      expect(result.statusCode).toBe(500);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection timeout');
    });
  });

  describe('syncPaymentStatus (Active Status Sync)', () => {
    it('queries provider status and completes order if provider reports settlement', async () => {
      const normalizedResult: NormalizedPaymentResult = {
        isSuccess: true,
        isPending: false,
        isFailed: false,
        isChallenge: false,
        domainOrderStatus: 'paid',
        domainPaymentStatus: 'paid',
        orderNumber: mockOrder.orderNumber,
        transactionId: 'tx-sync-settled',
        amount: 199000,
        currency: 'IDR',
        paymentMethod: 'bank_transfer',
        provider: 'midtrans',
        rawStatus: 'settlement',
        metadata: {},
      };

      (mockProvider.getTransactionStatus as any).mockResolvedValueOnce(normalizedResult);

      const service = createService();
      const { order, normalized } = await service.syncPaymentStatus(mockOrder.orderNumber);

      expect(mockProvider.getTransactionStatus).toHaveBeenCalledWith(mockOrder.orderNumber);
      expect(order.status).toBe('paid');
      expect(normalized.isSuccess).toBe(true);
      expect(completedOrders.get(mockOrder.id)).toBeDefined();
    });

    it('does not complete order if provider reports pending status during sync', async () => {
      const normalizedResult: NormalizedPaymentResult = {
        isSuccess: false,
        isPending: true,
        isFailed: false,
        isChallenge: false,
        domainOrderStatus: 'pending',
        domainPaymentStatus: 'pending',
        orderNumber: mockOrder.orderNumber,
        transactionId: 'tx-sync-pending',
        amount: 199000,
        currency: 'IDR',
        paymentMethod: 'bank_transfer',
        provider: 'midtrans',
        rawStatus: 'pending',
        metadata: {},
      };

      (mockProvider.getTransactionStatus as any).mockResolvedValueOnce(normalizedResult);

      const service = createService();
      const { order, normalized } = await service.syncPaymentStatus(mockOrder.orderNumber);

      expect(order.status).toBe('pending');
      expect(normalized.isPending).toBe(true);
      expect(completedOrders.size).toBe(0);
    });

    it('returns existing order if order is already paid before syncing', async () => {
      mockOrder.status = 'paid';
      const service = createService();

      const { order, normalized } = await service.syncPaymentStatus(mockOrder.orderNumber);

      expect(mockProvider.getTransactionStatus).not.toHaveBeenCalled();
      expect(order.status).toBe('paid');
      expect(normalized.isSuccess).toBe(true);
    });
  });
});
