import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import { checkIsAdmin, bootstrapFirstAdmin } from '../auth/authService';
import {
  fetchAdminCouples,
  fetchAdminOrders,
  fetchAdminOrderDetail,
  adminMarkOrderPaidInDb,
  adminCancelOrderInDb,
  processRefundedOrderInDb,
} from '../repositories/supabaseAdminAdapter';
import { fetchWorkspaceByUserId } from '../repositories/supabaseWorkspaceAdapter';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
    },
  },
}));

describe('Admin Identity & Authorization Foundation (P0)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Authoritative Admin Identity Verification', () => {
    it('returns true when user is verified active admin via RPC', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: true,
        error: null,
      });

      const isAdmin = await checkIsAdmin('admin-user-uuid');
      expect(supabase.rpc).toHaveBeenCalledWith('check_current_user_is_admin');
      expect(isAdmin).toBe(true);
    });

    it('returns false when user is a regular customer', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: false,
        error: null,
      });

      const isAdmin = await checkIsAdmin('customer-user-uuid');
      expect(isAdmin).toBe(false);
    });

    it('returns false when admin record exists but is_active is false (Inactive Admin)', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: false,
        error: null,
      });

      const isAdmin = await checkIsAdmin('inactive-admin-uuid');
      expect(isAdmin).toBe(false);
    });

    it('falls back to admin_users table query if RPC is not found and verifies is_active = true', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'function check_current_user_is_admin not found' },
      });

      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { is_active: true },
                error: null,
              }),
            }),
          }),
        }),
      });

      const isAdmin = await checkIsAdmin('admin-fallback-uuid');
      expect(isAdmin).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('admin_users');
    });

    it('rejects fallback query if admin_users record is inactive or missing', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'function check_current_user_is_admin not found' },
      });

      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      });

      const isAdmin = await checkIsAdmin('regular-customer-uuid');
      expect(isAdmin).toBe(false);
    });
  });

  describe('2. Initial Admin Bootstrap Mechanism', () => {
    it('successfully calls bootstrap_admin_user RPC for initial provisioning', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: { success: true, user_id: 'first-admin-uuid' },
        error: null,
      });

      const success = await bootstrapFirstAdmin('first-admin-uuid');
      expect(supabase.rpc).toHaveBeenCalledWith('bootstrap_admin_user', {
        p_user_id: 'first-admin-uuid',
      });
      expect(success).toBe(true);
    });

    it('throws when bootstrap is rejected by server (e.g. non-empty table without admin privilege)', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'Akses ditolak: Hanya admin aktif atau service_role yang dapat mendaftarkan admin baru.' },
      });

      await expect(bootstrapFirstAdmin('unauthorized-user-uuid')).rejects.toThrow(
        'Akses ditolak'
      );
    });
  });

  describe('3. RLS Data Scope: Customer Isolation vs Admin Cross-Workspace Visibility', () => {
    const workspaceA = {
      id: 'ws-a',
      user_id: 'customer-a-uuid',
      couple_name: 'Adit & Nisa (Workspace A)',
      wedding_date: '2026-10-10',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    };

    const workspaceB = {
      id: 'ws-b',
      user_id: 'customer-b-uuid',
      couple_name: 'Budi & Sari (Workspace B)',
      wedding_date: '2026-11-11',
      created_at: '2026-09-02T00:00:00Z',
      updated_at: '2026-09-02T00:00:00Z',
    };

    it('Customer A fetching their workspace receives only Workspace A', async () => {
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: workspaceA,
              error: null,
            }),
          }),
        }),
      });

      const result = await fetchWorkspaceByUserId('customer-a-uuid');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('ws-a');
      expect(result?.userId).toBe('customer-a-uuid');
    });

    it('Customer B fetching their workspace receives only Workspace B and cannot access Workspace A', async () => {
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: workspaceB,
              error: null,
            }),
          }),
        }),
      });

      const result = await fetchWorkspaceByUserId('customer-b-uuid');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('ws-b');
      expect(result?.userId).toBe('customer-b-uuid');
      expect(result?.id).not.toBe('ws-a');
    });

    it('Admin querying fetchAdminCouples sees all workspaces (Workspace A + Workspace B)', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [workspaceA, workspaceB],
                error: null,
              }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { workspace_id: 'ws-a', status: 'completed' },
                  { workspace_id: 'ws-b', status: 'pending' },
                ],
                error: null,
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const couples = await fetchAdminCouples();
      expect(couples).toHaveLength(2);
      expect(couples.some((c) => c.id === 'ws-a')).toBe(true);
      expect(couples.some((c) => c.id === 'ws-b')).toBe(true);
    });

    it('Admin querying fetchAdminOrders sees orders across all customer workspaces', async () => {
      const orderA = {
        id: 'ord-a',
        order_number: 'WF-A-100',
        workspace_id: 'ws-a',
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'paid',
        created_at: '2026-09-04T10:00:00Z',
        updated_at: '2026-09-04T10:00:00Z',
      };

      const orderB = {
        id: 'ord-b',
        order_number: 'WF-B-200',
        workspace_id: 'ws-b',
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'pending',
        created_at: '2026-09-04T11:00:00Z',
        updated_at: '2026-09-04T11:00:00Z',
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [orderA, orderB],
                error: null,
              }),
            }),
          };
        }
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  { id: 'ws-a', couple_name: 'Couple A' },
                  { id: 'ws-b', couple_name: 'Couple B' },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const orders = await fetchAdminOrders();
      expect(orders).toHaveLength(2);
      expect(orders[0].workspaceId).toBe('ws-a');
      expect(orders[1].workspaceId).toBe('ws-b');
    });
  });

  describe('4. Administrative Mutation Authorization Enforcement', () => {
    it('Admin can invoke authorized admin_mark_order_paid RPC', async () => {
      const mockResult = {
        id: 'ord-target-1',
        order_number: 'WF-20260904-001',
        workspace_id: 'ws-target-1',
        couple_name: 'Pasangan Target',
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'paid',
        paid_at: '2026-09-04T12:00:00Z',
        created_at: '2026-09-04T10:00:00Z',
        updated_at: '2026-09-04T12:00:00Z',
        metadata: { admin_intervention: true },
      };

      (supabase.rpc as any).mockResolvedValueOnce({
        data: mockResult,
        error: null,
      });

      const order = await adminMarkOrderPaidInDb({
        orderId: 'ord-target-1',
        reason: 'Bank transfer verified via BCA statement',
        actorId: 'admin-actor-1',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('admin_mark_order_paid', {
        p_order_id: 'ord-target-1',
        p_reason: 'Bank transfer verified via BCA statement',
        p_admin_notes: null,
        p_actor_id: 'admin-actor-1',
      });
      expect(order.status).toBe('paid');
      expect(order.paymentMethod).toBe('manual_admin');
    });

    it('Non-admin or unauthenticated user is rejected by admin_mark_order_paid RPC', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'Otorisasi ditolak: Hanya administrator terotorisasi yang dapat melakukan aksi ini.' },
      });

      await expect(
        adminMarkOrderPaidInDb({
          orderId: 'ord-target-1',
          reason: 'Attempted hack by non-admin',
        })
      ).rejects.toThrow('Otorisasi ditolak');
    });

    it('Admin can invoke authorized admin_cancel_order RPC', async () => {
      const mockResult = {
        id: 'ord-target-2',
        order_number: 'WF-20260904-002',
        workspace_id: 'ws-target-2',
        couple_name: 'Pasangan Target 2',
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'cancelled',
        created_at: '2026-09-04T10:00:00Z',
        updated_at: '2026-09-04T12:00:00Z',
        metadata: { admin_cancellation: true },
      };

      (supabase.rpc as any).mockResolvedValueOnce({
        data: mockResult,
        error: null,
      });

      const order = await adminCancelOrderInDb({
        orderId: 'ord-target-2',
        reason: 'Customer requested manual cancellation',
        actorId: 'admin-actor-1',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('admin_cancel_order', {
        p_order_id: 'ord-target-2',
        p_reason: 'Customer requested manual cancellation',
        p_actor_id: 'admin-actor-1',
      });
      expect(order.status).toBe('cancelled');
    });

    it('Non-admin is rejected by admin_cancel_order RPC', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'Otorisasi ditolak: Hanya administrator terotorisasi yang dapat melakukan aksi ini.' },
      });

      await expect(
        adminCancelOrderInDb({
          orderId: 'ord-target-2',
          reason: 'Cancel order by non-admin',
        })
      ).rejects.toThrow('Otorisasi ditolak');
    });

    it('Admin can invoke authorized process_refunded_order RPC', async () => {
      const mockResult = {
        id: 'ord-target-3',
        order_number: 'WF-20260904-003',
        workspace_id: 'ws-target-3',
        couple_name: 'Pasangan Target 3',
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'cancelled',
        created_at: '2026-09-04T10:00:00Z',
        updated_at: '2026-09-04T12:00:00Z',
      };

      (supabase.rpc as any).mockResolvedValueOnce({
        data: mockResult,
        error: null,
      });

      const order = await processRefundedOrderInDb('ord-target-3', {
        reason: 'Authorized bank refund processed',
        provider: 'midtrans',
        providerReference: 'ref-12345',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('process_refunded_order', {
        p_order_id: 'ord-target-3',
        p_reason: 'Authorized bank refund processed',
        p_provider: 'midtrans',
        p_provider_reference: 'ref-12345',
        p_refund_metadata: {},
      });
      expect(order.status).toBe('cancelled');
    });

    it('Non-admin is rejected by process_refunded_order RPC', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'Otorisasi ditolak: Hanya administrator terotorisasi yang dapat memproses refund pesanan.' },
      });

      await expect(
        processRefundedOrderInDb('ord-target-3', {
          reason: 'Non-admin refund attempt',
        })
      ).rejects.toThrow('Otorisasi ditolak');
    });
  });
});
