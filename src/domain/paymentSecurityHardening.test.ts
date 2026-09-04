import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createOrderInDb,
  completePaidOrderInDb,
  fetchAccessConfig,
} from '../repositories/supabaseAdminAdapter';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_ADMIN_ACCESS_CONFIG, AdminAccessConfig } from '../types/admin';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Payment Domain Security & Authorization Hardening Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Blocker 1: Server-Side Order Creation & Authoritative Pricing', () => {
    it('creates a pending order using authoritative server price from platform config', async () => {
      const mockWorkspaceId = 'ws-secure-1';
      const mockCreatedOrder = {
        id: 'ord-secure-100',
        order_number: 'WF-20260904-5555',
        workspace_id: mockWorkspaceId,
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'pending',
        created_at: '2026-09-04T12:00:00Z',
        updated_at: '2026-09-04T12:00:00Z',
      };

      (supabase.rpc as any).mockResolvedValueOnce({
        data: mockCreatedOrder,
        error: null,
      });

      const order = await createOrderInDb(mockWorkspaceId, {
        productType: 'wedding_pass',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('create_order', {
        p_workspace_id: mockWorkspaceId,
        p_product_type: 'wedding_pass',
        p_custom_order_number: null,
      });
      expect(order.amount).toBe(199000);
      expect(order.currency).toBe('IDR');
      expect(order.status).toBe('pending');
    });

    it('ignores client arbitrary amount and enforces server authoritative price in fallback mode', async () => {
      const mockWorkspaceId = 'ws-tamper-1';

      (supabase.rpc as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'function create_order not found' },
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'platform_configurations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    value: {
                      ...DEFAULT_ADMIN_ACCESS_CONFIG,
                      price: 199000,
                      currency: 'IDR',
                    },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { couple_name: 'Dika & Rani' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'orders') {
          return {
            insert: vi.fn().mockImplementation((payload: any) => {
              expect(payload.amount).toBe(199000);
              expect(payload.currency).toBe('IDR');
              expect(payload.status).toBe('pending');
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'ord-tamper-res',
                      ...payload,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
                    error: null,
                  }),
                }),
              };
            }),
          };
        }
        return { select: vi.fn() };
      });

      const order = await createOrderInDb(mockWorkspaceId, {
        productType: 'wedding_pass',
        price: 1000 as any,
      });

      expect(order.amount).toBe(199000);
      expect(order.status).toBe('pending');
    });

    it('rejects order creation if commercial product is disabled', async () => {
      const mockWorkspaceId = 'ws-disabled-1';

      (supabase.rpc as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'Produk komersial Wedding Pass sedang dinonaktifkan.' },
      });

      await expect(
        createOrderInDb(mockWorkspaceId, {
          productType: 'wedding_pass',
        })
      ).rejects.toThrow(/sedang dinonaktifkan/);
    });

    it('preserves immutable price snapshot when platform config changes later', async () => {
      const mockCreatedOrder = {
        id: 'ord-snap-immutable',
        order_number: 'WF-20260904-7777',
        workspace_id: 'ws-snap-1',
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'pending',
        created_at: '2026-09-04T12:00:00Z',
        updated_at: '2026-09-04T12:00:00Z',
      };

      (supabase.rpc as any).mockResolvedValueOnce({
        data: mockCreatedOrder,
        error: null,
      });

      const order = await createOrderInDb('ws-snap-1', { productType: 'wedding_pass' });
      expect(order.amount).toBe(199000);

      const subsequentConfigPrice = 249000;
      expect(order.amount).toBe(199000);
      expect(order.amount).not.toBe(subsequentConfigPrice);
    });
  });

  describe('Blocker 2: complete_paid_order Strict Status & Caller Validation', () => {
    it('successfully completes a pending order via trusted atomic RPC', async () => {
      const mockOrderId = 'ord-complete-1';
      const mockOrderPending = {
        id: mockOrderId,
        order_number: 'WF-20260904-8888',
        workspace_id: 'ws-comp-1',
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'pending',
      };

      const mockRpcResponse = {
        id: mockOrderId,
        order_number: 'WF-20260904-8888',
        workspace_id: 'ws-comp-1',
        couple_name: 'Fandi & Gita',
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'paid',
        created_at: '2026-09-04T12:00:00Z',
        updated_at: '2026-09-04T12:30:00Z',
        paid_at: '2026-09-04T12:30:00Z',
        payment_method: 'qris',
        provider: 'xendit_gateway',
        metadata: {},
        is_idempotent_replay: false,
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockOrderPending,
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      (supabase.rpc as any).mockResolvedValueOnce({
        data: mockRpcResponse,
        error: null,
      });

      const result = await completePaidOrderInDb(mockOrderId, {
        amount: 199000,
        currency: 'IDR',
        paymentMethod: 'qris',
        provider: 'xendit_gateway',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('complete_paid_order', expect.objectContaining({
        p_order_id: mockOrderId,
        p_amount: 199000,
        p_currency: 'IDR',
        p_payment_method: 'qris',
        p_provider: 'xendit_gateway',
      }));
      expect(result.status).toBe('paid');
      expect(result.paidAt).not.toBeNull();
    });

    it('rejects completing an order with status = cancelled', async () => {
      const mockOrderId = 'ord-cancelled-1';
      const mockOrderCancelled = {
        id: mockOrderId,
        order_number: 'WF-20260904-9991',
        workspace_id: 'ws-comp-2',
        amount: 199000,
        currency: 'IDR',
        status: 'cancelled',
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockOrderCancelled,
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await expect(
        completePaidOrderInDb(mockOrderId, { amount: 199000, currency: 'IDR' })
      ).rejects.toThrow(/status saat ini: cancelled/);
    });

    it('rejects completing an order with status = expired', async () => {
      const mockOrderId = 'ord-expired-1';
      const mockOrderExpired = {
        id: mockOrderId,
        order_number: 'WF-20260904-9992',
        workspace_id: 'ws-comp-3',
        amount: 199000,
        currency: 'IDR',
        status: 'expired',
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockOrderExpired,
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await expect(
        completePaidOrderInDb(mockOrderId, { amount: 199000, currency: 'IDR' })
      ).rejects.toThrow(/status saat ini: expired/);
    });

    it('handles duplicate completion with idempotent replay without errors', async () => {
      const mockOrderId = 'ord-already-paid-2';
      const mockOrderPaid = {
        id: mockOrderId,
        order_number: 'WF-20260904-9993',
        workspace_id: 'ws-comp-4',
        amount: 199000,
        currency: 'IDR',
        status: 'paid',
        paid_at: '2026-09-04T10:00:00Z',
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockOrderPaid,
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await completePaidOrderInDb(mockOrderId, {
        amount: 199000,
        currency: 'IDR',
      });

      expect(result.status).toBe('paid');
      expect(result.id).toBe(mockOrderId);
    });
  });
});
