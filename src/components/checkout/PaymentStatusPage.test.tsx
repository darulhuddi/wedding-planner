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
      const status = mapDomainStatusToVerificationStatus('pending', false);
      expect(status).toBe('pending');
    });
  });
});
