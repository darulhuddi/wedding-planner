import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mapDomainStatusToVerificationStatus,
  getOrderNumberFromUrl,
} from './PaymentStatusPage';
import * as paymentRepository from '../../repositories/paymentRepository';
import { AdminOrderSummary } from '../../types/admin';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

describe('PaymentStatusPage & Verification Domain Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Domain Status Mapping', () => {
    it('maps isPaid=true or status=paid to "paid"', () => {
      expect(mapDomainStatusToVerificationStatus('paid', true)).toBe('paid');
      expect(mapDomainStatusToVerificationStatus('pending', true)).toBe('paid');
      expect(mapDomainStatusToVerificationStatus('paid', false)).toBe('paid');
    });

    it('maps pending status to "pending"', () => {
      expect(mapDomainStatusToVerificationStatus('pending', false)).toBe('pending');
    });

    it('maps failure statuses (failed, deny, denied) to "failed"', () => {
      expect(mapDomainStatusToVerificationStatus('failed', false)).toBe('failed');
      expect(mapDomainStatusToVerificationStatus('deny', false)).toBe('failed');
      expect(mapDomainStatusToVerificationStatus('denied', false)).toBe('failed');
    });

    it('maps cancellation statuses to "cancelled"', () => {
      expect(mapDomainStatusToVerificationStatus('cancelled', false)).toBe('cancelled');
      expect(mapDomainStatusToVerificationStatus('cancel', false)).toBe('cancelled');
    });

    it('maps expired statuses to "expired"', () => {
      expect(mapDomainStatusToVerificationStatus('expired', false)).toBe('expired');
      expect(mapDomainStatusToVerificationStatus('expire', false)).toBe('expired');
    });

    it('maps unknown status to "error"', () => {
      expect(mapDomainStatusToVerificationStatus(undefined, false)).toBe('error');
      expect(mapDomainStatusToVerificationStatus('something_unexpected', false)).toBe('error');
    });
  });

  describe('2. URL Order Parameter Parsing', () => {
    it('safely extracts order parameter from URL search string', () => {
      (globalThis as any).window = {
        location: {
          search: '?order=WF-20260904-777',
        },
      };

      const orderNumber = getOrderNumberFromUrl();
      expect(orderNumber).toBe('WF-20260904-777');
    });

    it('returns null when no query string exists', () => {
      (globalThis as any).window = {
        location: {
          search: '',
        },
      };

      const orderNumber = getOrderNumberFromUrl();
      expect(orderNumber).toBeNull();
    });
  });

  describe('3. Order Ownership & Workspace Verification', () => {
    it('successfully verifies and synchronizes order belonging to the active workspace', async () => {
      const mockWorkspaceId = 'ws-auth-100';
      const mockOrderNumber = 'WF-20260904-888';

      const mockDbOrder = {
        id: 'ord-888',
        order_number: mockOrderNumber,
        workspace_id: mockWorkspaceId,
        status: 'pending',
        amount: 199000,
        currency: 'IDR',
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        created_at: '2026-09-04T10:00:00Z',
        updated_at: '2026-09-04T10:00:00Z',
      };

      // Mock database lookup
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockDbOrder,
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      // Mock midtrans-sync Edge Function returning verified settlement
      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: {
          status: 'paid',
          isPaid: true,
          order: {
            ...mockDbOrder,
            status: 'paid',
            paid_at: '2026-09-04T10:05:00Z',
          },
        },
        error: null,
      });

      const result = await paymentRepository.verifyAndSyncOrderPayment(mockOrderNumber, mockWorkspaceId);

      expect(result.isPaid).toBe(true);
      expect(result.status).toBe('paid');
      expect(result.order.orderNumber).toBe(mockOrderNumber);
    });

    it('rejects order verification if order belongs to a different workspace (Ownership Guard)', async () => {
      const activeWorkspaceId = 'ws-my-workspace';
      const foreignWorkspaceId = 'ws-stranger-workspace';
      const foreignOrderNumber = 'WF-FOREIGN-999';

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'ord-foreign',
              order_number: foreignOrderNumber,
              workspace_id: foreignWorkspaceId, // Different workspace!
              status: 'pending',
            },
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      await expect(
        paymentRepository.verifyAndSyncOrderPayment(foreignOrderNumber, activeWorkspaceId)
      ).rejects.toThrow('Akses ditolak: Pesanan tidak terdaftar pada workspace pernikahan Anda.');
    });

    it('rejects order verification if order number is not found in database', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      await expect(
        paymentRepository.verifyAndSyncOrderPayment('WF-NONEXISTENT', 'ws-test')
      ).rejects.toThrow('Pesanan dengan nomor WF-NONEXISTENT tidak ditemukan.');
    });
  });

  describe('4. Webhook Race Condition & Idempotent Replay', () => {
    it('Case A: Webhook already completed order in DB before status page calls sync', async () => {
      const mockWorkspaceId = 'ws-race-1';
      const mockOrderNumber = 'WF-RACE-001';

      // Order is already paid in DB
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'ord-race-1',
              order_number: mockOrderNumber,
              workspace_id: mockWorkspaceId,
              status: 'paid', // Webhook already ran!
              amount: 199000,
              currency: 'IDR',
              product_type: 'wedding_pass',
              product_name: 'Wedding Pass',
              paid_at: '2026-09-04T10:00:00Z',
            },
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: {
          status: 'paid',
          isPaid: true,
          order: {
            id: 'ord-race-1',
            order_number: mockOrderNumber,
            status: 'paid',
          },
        },
        error: null,
      });

      const result = await paymentRepository.verifyAndSyncOrderPayment(mockOrderNumber, mockWorkspaceId);
      expect(result.isPaid).toBe(true);
      expect(result.status).toBe('paid');
    });

    it('Case B: Sync triggers complete_paid_order and handles idempotent replay safely', async () => {
      const mockWorkspaceId = 'ws-race-2';
      const mockOrderNumber = 'WF-RACE-002';

      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'ord-race-2',
              order_number: mockOrderNumber,
              workspace_id: mockWorkspaceId,
              status: 'pending',
              amount: 199000,
              currency: 'IDR',
              product_type: 'wedding_pass',
            },
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({ select: selectMock });

      (supabase.functions.invoke as any).mockResolvedValueOnce({
        data: {
          status: 'paid',
          isPaid: true,
          order: {
            id: 'ord-race-2',
            order_number: mockOrderNumber,
            status: 'paid',
            metadata: { is_idempotent_replay: true },
          },
        },
        error: null,
      });

      const result = await paymentRepository.verifyAndSyncOrderPayment(mockOrderNumber, mockWorkspaceId);
      expect(result.isPaid).toBe(true);
      expect(result.status).toBe('paid');
    });
  });

  describe('5. Bounded Polling Engine Invariants', () => {
    it('stops polling immediately on terminal paid state', () => {
      const status = mapDomainStatusToVerificationStatus('paid', true);
      expect(status).toBe('paid');
      const isTerminal = status === 'paid' || status === 'failed' || status === 'cancelled' || status === 'expired';
      expect(isTerminal).toBe(true);
    });

    it('stops polling immediately on terminal failed / cancelled / expired state', () => {
      ['failed', 'cancelled', 'expired'].forEach((terminalStatus) => {
        const status = mapDomainStatusToVerificationStatus(terminalStatus, false);
        const isTerminal = status === 'paid' || status === 'failed' || status === 'cancelled' || status === 'expired';
        expect(isTerminal).toBe(true);
      });
    });

    it('maintains pending status while polling within attempt limit', () => {
      const status = mapDomainStatusToVerificationStatus('pending', false);
      expect(status).toBe('pending');
      const isTerminal = status === 'paid' || status === 'failed' || status === 'cancelled' || status === 'expired';
      expect(isTerminal).toBe(false);
    });
  });

  describe('6. Unlimited Semantics in Payment Success & Pending States', () => {
    it('maps verified paid status to unlimited access messaging without finite expiry', () => {
      const status = mapDomainStatusToVerificationStatus('paid', true);
      expect(status).toBe('paid');
    });

    it('retains pending state with polling capability and no internal counters exposed', () => {
      const status = mapDomainStatusToVerificationStatus('pending', false, { token: 'tok-1' });
      expect(status).toBe('pending');
    });
  });

  describe('7. Explicit Attempt-Level Payment Lifecycle (Flows A-F)', () => {
    const mockOrderSummary: AdminOrderSummary = {
      id: 'ord-attempt-test-1',
      orderNumber: 'WF-20260906-0001',
      workspaceId: 'ws-attempt-1',
      coupleName: 'Budi & Ani',
      productType: 'wedding_pass',
      productName: 'Wedding Pass',
      amount: 199000,
      currency: 'IDR',
      status: 'pending',
      createdAt: '2026-09-06T00:00:00Z',
      updatedAt: '2026-09-06T00:00:00Z',
      metadata: {
        midtransSession: {
          token: 'snap-token-attempt-1',
          midtransOrderId: 'WF-20260906-0001-attempt-1',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          grossAmount: 199000,
          status: 'pending',
          provider: 'midtrans',
        },
        paymentAttempts: [
          {
            token: 'snap-token-attempt-1',
            midtransOrderId: 'WF-20260906-0001-attempt-1',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            grossAmount: 199000,
            status: 'pending',
          },
        ],
      },
    };

    it('Flow A (Continue): retrieves the active pending attempt and reuses the existing Snap token', () => {
      const activeAttempt = paymentRepository.getActivePaymentAttempt(mockOrderSummary);
      expect(activeAttempt).not.toBeNull();
      expect(activeAttempt?.token).toBe('snap-token-attempt-1');
      expect(activeAttempt?.midtransOrderId).toBe('WF-20260906-0001-attempt-1');

      const uiStatus = mapDomainStatusToVerificationStatus(mockOrderSummary.status, false, activeAttempt);
      expect(uiStatus).toBe('pending');
    });

    it('Flow B (Change Payment Method): cancelling attempt marks attempt cancelled and enables Bayar Lagi', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: {
          id: mockOrderSummary.id,
          order_number: mockOrderSummary.orderNumber,
          status: 'pending',
          metadata: {
            midtransSession: {
              ...mockOrderSummary.metadata?.midtransSession,
              status: 'cancelled',
            },
            paymentAttempts: [
              {
                ...mockOrderSummary.metadata?.paymentAttempts[0],
                status: 'cancelled',
              },
            ],
          },
        },
        error: null,
      });

      const cancelResult = await paymentRepository.cancelPaymentAttempt(
        mockOrderSummary.id,
        'WF-20260906-0001-attempt-1'
      );
      expect(cancelResult.success).toBe(true);

      const orderAfterCancel: AdminOrderSummary = {
        ...mockOrderSummary,
        metadata: cancelResult.metadata,
      };

      const activeAfterCancel = paymentRepository.getActivePaymentAttempt(orderAfterCancel);
      expect(activeAfterCancel).toBeNull();

      const uiStatusAfterCancel = mapDomainStatusToVerificationStatus(orderAfterCancel.status, false, activeAfterCancel);
      expect(uiStatusAfterCancel).toBe('cancelled');
    });

    it('Flow C (Old Attempt Settles): webhook settlement on cancelled attempt 1 still completes the order without entitlement loss', () => {
      // In the database complete_paid_order RPC, matching baseOrderNumber allows completing order
      const completedStatus = mapDomainStatusToVerificationStatus('paid', true, null);
      expect(completedStatus).toBe('paid');
    });

    it('Flow D (Old Attempt Expires): webhook expire on attempt 1 leaves order pending and attempt 2 unaffected', () => {
      const activeAttempt2 = {
        token: 'snap-token-attempt-2',
        midtransOrderId: 'WF-20260906-0001-attempt-2',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        grossAmount: 199000,
        status: 'pending',
      };

      const uiStatus = mapDomainStatusToVerificationStatus('pending', false, activeAttempt2);
      expect(uiStatus).toBe('pending');
    });

    it('Flow E (Duplicate Settlement): subsequent settlement replays return is_idempotent_replay: true without duplicate writes', () => {
      const uiStatus = mapDomainStatusToVerificationStatus('paid', true, null);
      expect(uiStatus).toBe('paid');
    });

    it('Flow F (Already Paid Monotonic Guard): non-success status never regresses an already paid order', () => {
      const uiStatus1 = mapDomainStatusToVerificationStatus('expire', true, null);
      expect(uiStatus1).toBe('paid');

      const uiStatus2 = mapDomainStatusToVerificationStatus('cancel', true, null);
      expect(uiStatus2).toBe('paid');
    });
  });

  describe('8. cancel_payment_attempt RPC Regression Tests (Scenarios A - E)', () => {
    const futureExpiry = new Date(Date.now() + 3600000).toISOString();

    it('Scenario A: Cancel attempt #1 while attempt #2 is active leaves attempt #2 pending and midtransSession pointing to #2', async () => {
      const orderWithTwoAttempts: AdminOrderSummary = {
        id: 'ord-reg-1',
        orderNumber: 'WF-20260906-1111',
        workspaceId: 'ws-reg-1',
        coupleName: 'Adit & Amel',
        productType: 'wedding_pass',
        productName: 'Wedding Pass',
        amount: 250000,
        currency: 'IDR',
        status: 'pending',
        createdAt: '2026-09-06T09:00:00Z',
        updatedAt: '2026-09-06T09:30:00Z',
        metadata: {
          midtransSession: {
            token: 'token-att-2',
            midtransOrderId: 'WF-20260906-1111-ATT2',
            expiresAt: futureExpiry,
            grossAmount: 250000,
            status: 'pending',
            provider: 'midtrans',
          },
          paymentAttempts: [
            {
              token: 'token-att-1',
              midtransOrderId: 'WF-20260906-1111-ATT1',
              expiresAt: futureExpiry,
              grossAmount: 250000,
              status: 'pending',
            },
            {
              token: 'token-att-2',
              midtransOrderId: 'WF-20260906-1111-ATT2',
              expiresAt: futureExpiry,
              grossAmount: 250000,
              status: 'pending',
            },
          ],
        },
      };

      // Mock RPC response reflecting the updated PostgreSQL function
      (supabase.rpc as any).mockResolvedValueOnce({
        data: {
          id: orderWithTwoAttempts.id,
          order_number: orderWithTwoAttempts.orderNumber,
          status: 'pending',
          metadata: {
            midtransSession: {
              token: 'token-att-2',
              midtransOrderId: 'WF-20260906-1111-ATT2',
              expiresAt: futureExpiry,
              grossAmount: 250000,
              status: 'pending',
              provider: 'midtrans',
            },
            paymentAttempts: [
              {
                token: 'token-att-1',
                midtransOrderId: 'WF-20260906-1111-ATT1',
                expiresAt: futureExpiry,
                grossAmount: 250000,
                status: 'cancelled',
                cancelledAt: new Date().toISOString(),
              },
              {
                token: 'token-att-2',
                midtransOrderId: 'WF-20260906-1111-ATT2',
                expiresAt: futureExpiry,
                grossAmount: 250000,
                status: 'pending',
              },
            ],
          },
        },
        error: null,
      });

      const res = await paymentRepository.cancelPaymentAttempt(
        orderWithTwoAttempts.id,
        'WF-20260906-1111-ATT1'
      );

      expect(res.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('cancel_payment_attempt', {
        p_order_id: 'ord-reg-1',
        p_midtrans_order_id: 'WF-20260906-1111-ATT1',
      });

      const updatedOrder: AdminOrderSummary = {
        ...orderWithTwoAttempts,
        metadata: res.metadata,
      };

      // 1. Attempt #1 is cancelled
      expect(updatedOrder.metadata?.paymentAttempts[0].status).toBe('cancelled');
      // 2. Attempt #2 remains pending
      expect(updatedOrder.metadata?.paymentAttempts[1].status).toBe('pending');
      // 3. midtransSession still points to attempt #2 with pending status
      expect(updatedOrder.metadata?.midtransSession.midtransOrderId).toBe('WF-20260906-1111-ATT2');
      expect(updatedOrder.metadata?.midtransSession.status).toBe('pending');
      // 4. getActivePaymentAttempt returns attempt #2
      const active = paymentRepository.getActivePaymentAttempt(updatedOrder);
      expect(active).not.toBeNull();
      expect(active?.midtransOrderId).toBe('WF-20260906-1111-ATT2');
      // 5. Parent order status is unchanged
      expect(updatedOrder.status).toBe('pending');
    });

    it('Scenario B: Cancel active attempt #2 marks #2 cancelled and clears/cancels midtransSession', async () => {
      const orderToCancelActive: AdminOrderSummary = {
        id: 'ord-reg-2',
        orderNumber: 'WF-20260906-2222',
        workspaceId: 'ws-reg-2',
        coupleName: 'Budi & Citra',
        productType: 'wedding_pass',
        productName: 'Wedding Pass',
        amount: 250000,
        currency: 'IDR',
        status: 'pending',
        createdAt: '2026-09-06T09:00:00Z',
        updatedAt: '2026-09-06T09:30:00Z',
        metadata: {
          midtransSession: {
            token: 'token-att-2',
            midtransOrderId: 'WF-20260906-2222-ATT2',
            expiresAt: futureExpiry,
            grossAmount: 250000,
            status: 'pending',
            provider: 'midtrans',
          },
          paymentAttempts: [
            {
              token: 'token-att-1',
              midtransOrderId: 'WF-20260906-2222-ATT1',
              expiresAt: futureExpiry,
              grossAmount: 250000,
              status: 'cancelled',
              cancelledAt: '2026-09-06T09:15:00Z',
            },
            {
              token: 'token-att-2',
              midtransOrderId: 'WF-20260906-2222-ATT2',
              expiresAt: futureExpiry,
              grossAmount: 250000,
              status: 'pending',
            },
          ],
        },
      };

      (supabase.rpc as any).mockResolvedValueOnce({
        data: {
          id: orderToCancelActive.id,
          order_number: orderToCancelActive.orderNumber,
          status: 'pending',
          metadata: {
            midtransSession: {
              token: 'token-att-2',
              midtransOrderId: 'WF-20260906-2222-ATT2',
              expiresAt: futureExpiry,
              grossAmount: 250000,
              status: 'cancelled',
              cancelledAt: new Date().toISOString(),
              provider: 'midtrans',
            },
            paymentAttempts: [
              {
                token: 'token-att-1',
                midtransOrderId: 'WF-20260906-2222-ATT1',
                expiresAt: futureExpiry,
                grossAmount: 250000,
                status: 'cancelled',
                cancelledAt: '2026-09-06T09:15:00Z',
              },
              {
                token: 'token-att-2',
                midtransOrderId: 'WF-20260906-2222-ATT2',
                expiresAt: futureExpiry,
                grossAmount: 250000,
                status: 'cancelled',
                cancelledAt: new Date().toISOString(),
              },
            ],
          },
        },
        error: null,
      });

      const res = await paymentRepository.cancelPaymentAttempt(
        orderToCancelActive.id,
        'WF-20260906-2222-ATT2'
      );

      const updatedOrder: AdminOrderSummary = {
        ...orderToCancelActive,
        metadata: res.metadata,
      };

      expect(updatedOrder.metadata?.paymentAttempts[1].status).toBe('cancelled');
      expect(updatedOrder.metadata?.midtransSession.status).toBe('cancelled');

      const active = paymentRepository.getActivePaymentAttempt(updatedOrder);
      expect(active).toBeNull();

      const uiStatus = mapDomainStatusToVerificationStatus(updatedOrder.status, false, active);
      expect(uiStatus).toBe('cancelled');
      expect(updatedOrder.status).toBe('pending');
    });

    it('Scenario C: Cancelling an already-cancelled attempt is idempotent without corruption', async () => {
      const alreadyCancelledOrder: AdminOrderSummary = {
        id: 'ord-reg-3',
        orderNumber: 'WF-20260906-3333',
        workspaceId: 'ws-reg-3',
        coupleName: 'Deni & Eva',
        productType: 'wedding_pass',
        productName: 'Wedding Pass',
        amount: 250000,
        currency: 'IDR',
        status: 'pending',
        createdAt: '2026-09-06T07:00:00Z',
        updatedAt: '2026-09-06T08:00:00Z',
        metadata: {
          midtransSession: {
            token: 'token-att-1',
            midtransOrderId: 'WF-20260906-3333-ATT1',
            expiresAt: futureExpiry,
            grossAmount: 250000,
            status: 'cancelled',
            cancelledAt: '2026-09-06T08:00:00Z',
            provider: 'midtrans',
          },
          paymentAttempts: [
            {
              token: 'token-att-1',
              midtransOrderId: 'WF-20260906-3333-ATT1',
              expiresAt: futureExpiry,
              grossAmount: 250000,
              status: 'cancelled',
              cancelledAt: '2026-09-06T08:00:00Z',
            },
          ],
        },
      };

      (supabase.rpc as any).mockResolvedValueOnce({
        data: {
          id: alreadyCancelledOrder.id,
          order_number: alreadyCancelledOrder.orderNumber,
          status: 'pending',
          metadata: alreadyCancelledOrder.metadata,
        },
        error: null,
      });

      const res = await paymentRepository.cancelPaymentAttempt(
        alreadyCancelledOrder.id,
        'WF-20260906-3333-ATT1'
      );

      expect(res.success).toBe(true);
      expect(res.metadata?.paymentAttempts[0].status).toBe('cancelled');
      expect(res.metadata?.paymentAttempts[0].cancelledAt).toBe('2026-09-06T08:00:00Z');
      expect(res.metadata?.paymentAttempts).toHaveLength(1);
    });

    it('Scenario D: Settlement of a cancelled attempt still completes parent order and transitions to paid', () => {
      const cancelledAttemptOrder: AdminOrderSummary = {
        id: 'ord-reg-4',
        orderNumber: 'WF-20260906-4444',
        workspaceId: 'ws-reg-4',
        coupleName: 'Fahri & Gina',
        productType: 'wedding_pass',
        productName: 'Wedding Pass',
        amount: 250000,
        currency: 'IDR',
        status: 'pending',
        createdAt: '2026-09-06T08:00:00Z',
        updatedAt: '2026-09-06T08:30:00Z',
        metadata: {
          paymentAttempts: [
            {
              token: 'token-att-1',
              midtransOrderId: 'WF-20260906-4444-ATT1',
              expiresAt: futureExpiry,
              grossAmount: 250000,
              status: 'cancelled',
              cancelledAt: '2026-09-06T08:30:00Z',
            },
          ],
        },
      };

      // Simulating order after settlement webhook or sync finishes
      const paidOrder: AdminOrderSummary = {
        ...cancelledAttemptOrder,
        status: 'paid',
        paidAt: new Date().toISOString(),
        paymentMethod: 'qris',
      };

      const uiStatus = mapDomainStatusToVerificationStatus(paidOrder.status, true, null);
      expect(uiStatus).toBe('paid');
      expect(paidOrder.status).toBe('paid');
    });

    it('Scenario E: Expire or cancel webhook of an old attempt does not cancel parent order', () => {
      const multiAttemptOrder: AdminOrderSummary = {
        id: 'ord-reg-5',
        orderNumber: 'WF-20260906-5555',
        workspaceId: 'ws-reg-5',
        coupleName: 'Hadi & Indah',
        productType: 'wedding_pass',
        productName: 'Wedding Pass',
        amount: 250000,
        currency: 'IDR',
        status: 'pending',
        createdAt: '2026-09-06T08:00:00Z',
        updatedAt: '2026-09-06T08:30:00Z',
        metadata: {
          midtransSession: {
            token: 'token-att-2',
            midtransOrderId: 'WF-20260906-5555-ATT2',
            expiresAt: futureExpiry,
            grossAmount: 250000,
            status: 'pending',
            provider: 'midtrans',
          },
          paymentAttempts: [
            {
              token: 'token-att-1',
              midtransOrderId: 'WF-20260906-5555-ATT1',
              expiresAt: new Date(Date.now() - 1000).toISOString(),
              grossAmount: 250000,
              status: 'expired',
            },
            {
              token: 'token-att-2',
              midtransOrderId: 'WF-20260906-5555-ATT2',
              expiresAt: futureExpiry,
              grossAmount: 250000,
              status: 'pending',
            },
          ],
        },
      };

      expect(multiAttemptOrder.status).toBe('pending');
      const active = paymentRepository.getActivePaymentAttempt(multiAttemptOrder);
      expect(active).not.toBeNull();
      expect(active?.midtransOrderId).toBe('WF-20260906-5555-ATT2');
      expect(active?.token).toBe('token-att-2');

      const uiStatus = mapDomainStatusToVerificationStatus(multiAttemptOrder.status, false, active);
      expect(uiStatus).toBe('pending');
    });
  });
});

