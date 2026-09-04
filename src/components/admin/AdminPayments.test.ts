import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CommercialProduct,
  AdminOrderSummary,
  DEFAULT_ADMIN_ACCESS_CONFIG,
  AdminOrderDetail,
} from '../../types/admin';
import {
  getWeddingPassProduct,
  generateOrderNumber,
  computePaymentMetrics,
  filterOrders,
  paginateOrders,
  evaluateEntitlementMismatch,
} from '../../domain/adminSelectors';
import {
  fetchAdminOrders,
  fetchAdminOrderDetail,
  fetchPaginatedAdminOrders,
  createOrderInDb,
  completePaidOrderInDb,
  processRefundedOrderInDb,
  adminMarkOrderPaidInDb,
  adminCancelOrderInDb,
  syncAdminPaymentStatus,
} from '../../repositories/supabaseAdminAdapter';
import * as adminRepository from '../../repositories/adminRepository';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('Payment Architecture V1 & Admin Payments Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.rpc as any).mockResolvedValue({ data: null, error: { message: 'function not found' } });
  });

  describe('Price Snapshot Invariant', () => {
    it('snapshots the product price at order creation time', async () => {
      const productAtCreation: CommercialProduct = {
        id: 'prod_wedding_pass',
        productType: 'wedding_pass',
        name: 'Wedding Pass',
        isActive: true,
        price: 199000,
        currency: 'IDR',
        accessDurationRule: 'unlimited',
        maxDurationMonths: 18,
        postWeddingGracePeriodDays: 30,
      };

      const mockInsertedRow = {
        id: 'ord-100',
        order_number: 'WF-20260904-9999',
        workspace_id: 'ws-snap-1',
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'pending',
        created_at: '2026-09-04T10:00:00Z',
        updated_at: '2026-09-04T10:00:00Z',
        paid_at: null,
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { couple_name: 'Adit & Nisa' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'orders') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockInsertedRow, error: null }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const order = await createOrderInDb('ws-snap-1', productAtCreation, 'WF-20260904-9999');
      expect(order.amount).toBe(199000);
      expect(order.orderNumber).toBe('WF-20260904-9999');

      // If price changes later in global config:
      const updatedProductConfig: CommercialProduct = {
        ...productAtCreation,
        price: 249000,
      };

      // Existing order's amount remains fixed at 199k
      expect(order.amount).toBe(199000);
      expect(order.amount).not.toBe(updatedProductConfig.price);
    });
  });

  describe('Order & Payment Lifecycle Transitions', () => {
    it('transitions order from pending to paid and activates customer entitlement', async () => {
      const mockOrderPending = {
        id: 'ord-pay-1',
        order_number: 'WF-20260904-1111',
        workspace_id: 'ws-pay-1',
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'pending',
        created_at: '2026-09-04T08:00:00Z',
        updated_at: '2026-09-04T08:00:00Z',
        paid_at: null,
      };

      const mockOrderPaid = {
        ...mockOrderPending,
        status: 'paid',
        paid_at: '2026-09-04T08:30:00Z',
      };

      const upsertEntitlementMock = vi.fn().mockResolvedValue({ error: null });
      const insertHistoryMock = vi.fn().mockResolvedValue({ error: null });
      const insertPaymentMock = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockOrderPending, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockOrderPaid, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'payments') {
          return { insert: insertPaymentMock };
        }
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { wedding_date: '2026-12-31' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'customer_access_entitlements') {
          return { upsert: upsertEntitlementMock };
        }
        if (table === 'customer_access_history') {
          return { insert: insertHistoryMock };
        }
        if (table === 'commercial_access_rules') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { raw_value: DEFAULT_ADMIN_ACCESS_CONFIG },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await completePaidOrderInDb('ord-pay-1', {
        paymentMethod: 'qris',
        amount: 199000,
        currency: 'IDR',
        provider: 'midtrans',
        providerReference: 'midtrans-123456',
      });

      expect(result.status).toBe('paid');
      expect(result.paidAt).toBe('2026-09-04T08:30:00Z');
      expect(insertPaymentMock).toHaveBeenCalledTimes(1);
      expect(upsertEntitlementMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: 'ws-pay-1',
          tier: 'Paid',
          source: 'purchased',
          expires_at: null,
        }),
        expect.anything()
      );
      expect(insertHistoryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: 'ws-pay-1',
          event_type: 'wedding_pass_purchased',
        })
      );
    });

    it('rejects completing an order with amount mismatch', async () => {
      const mockOrder = {
        id: 'ord-mismatch-1',
        amount: 199000,
        currency: 'IDR',
        status: 'pending',
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await expect(
        completePaidOrderInDb('ord-mismatch-1', {
          amount: 150000,
          currency: 'IDR',
        })
      ).rejects.toThrow(/Jumlah pembayaran tidak sesuai/);
    });

    it('rejects completing an order with currency mismatch', async () => {
      const mockOrder = {
        id: 'ord-mismatch-2',
        amount: 199000,
        currency: 'IDR',
        status: 'pending',
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await expect(
        completePaidOrderInDb('ord-mismatch-2', {
          amount: 199000,
          currency: 'USD',
        })
      ).rejects.toThrow(/Mata uang pembayaran tidak sesuai/);
    });
  });

  describe('Real Persisted Data & Empty State', () => {
    it('returns clean empty array when no orders exist in database', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const orders = await fetchAdminOrders();
      expect(orders).toEqual([]);
    });

    it('exposes order management functions via adminRepository facade', () => {
      expect(typeof adminRepository.getAdminOrders).toBe('function');
      expect(typeof adminRepository.getPaginatedAdminOrders).toBe('function');
      expect(typeof adminRepository.getAdminOrderDetail).toBe('function');
      expect(typeof adminRepository.createCustomerOrder).toBe('function');
      expect(typeof adminRepository.completePaidOrder).toBe('function');
      expect(typeof adminRepository.processRefundedOrder).toBe('function');
      expect(typeof adminRepository.adminMarkOrderPaid).toBe('function');
      expect(typeof adminRepository.adminCancelOrder).toBe('function');
      expect(typeof adminRepository.syncAdminPaymentStatus).toBe('function');
    });
  });

  describe('Refund / Chargeback Entitlement Revocation', () => {
    it('cancels order, marks payment refunded, revokes entitlement to Expired, and logs access_revoked', async () => {
      const mockPaidOrder = {
        id: 'ord-refund-1',
        order_number: 'WF-20260904-5555',
        workspace_id: 'ws-ref-1',
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'paid',
        created_at: '2026-09-04T08:00:00Z',
        updated_at: '2026-09-04T08:30:00Z',
        paid_at: '2026-09-04T08:30:00Z',
        metadata: {},
      };

      const mockCancelledOrder = {
        ...mockPaidOrder,
        status: 'cancelled',
        metadata: {
          refunded_at: '2026-09-04T09:00:00Z',
          refund_reason: 'Midtrans refund notification',
        },
      };

      const updateOrderMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockCancelledOrder, error: null }),
          }),
        }),
      });

      const updatePaymentMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const upsertEntitlementMock = vi.fn().mockResolvedValue({ error: null });
      const insertHistoryMock = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockPaidOrder, error: null }),
              }),
            }),
            update: updateOrderMock,
          };
        }
        if (table === 'payments') {
          return { update: updatePaymentMock };
        }
        if (table === 'customer_access_entitlements') {
          return { upsert: upsertEntitlementMock };
        }
        if (table === 'customer_access_history') {
          return { insert: insertHistoryMock };
        }
        return { select: vi.fn() };
      });

      const result = await processRefundedOrderInDb('ord-refund-1', {
        reason: 'Customer requested refund',
        provider: 'midtrans',
        providerReference: 'midtrans-refund-123',
      });

      expect(result.status).toBe('cancelled');
      expect(updateOrderMock).toHaveBeenCalled();
      expect(updatePaymentMock).toHaveBeenCalled();
      expect(upsertEntitlementMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: 'ws-ref-1',
          tier: 'Expired',
        }),
        expect.anything()
      );
      expect(insertHistoryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: 'ws-ref-1',
          event_type: 'access_revoked',
        })
      );
    });
  });

  describe('Admin Order Detail Inspection', () => {
    it('returns complete AdminOrderDetail with customer context, payment, and entitlement', async () => {
      const mockOrder = {
        id: 'ord-detail-1',
        order_number: 'WF-20260904-7777',
        workspace_id: 'ws-detail-1',
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'paid',
        created_at: '2026-09-04T08:00:00Z',
        updated_at: '2026-09-04T08:30:00Z',
        paid_at: '2026-09-04T08:30:00Z',
        metadata: {
          customerEmail: 'couple@example.com',
          fraudStatus: 'accept',
        },
      };

      const mockWorkspace = {
        id: 'ws-detail-1',
        couple_name: 'Rian & Maya',
        wedding_date: '2026-11-20',
        user_id: 'user-detail-1',
      };

      const mockPayment = {
        id: 'pay-1',
        order_id: 'ord-detail-1',
        amount: 199000,
        currency: 'IDR',
        status: 'paid',
        payment_method: 'gopay',
        provider: 'midtrans',
        provider_reference: 'midtrans-tx-999',
        created_at: '2026-09-04T08:15:00Z',
        paid_at: '2026-09-04T08:30:00Z',
        metadata: { settlementTime: '2026-09-04 15:30:00' },
      };

      const mockEntitlement = {
        workspace_id: 'ws-detail-1',
        tier: 'Paid',
        source: 'purchased',
        expires_at: null,
        notes: 'Purchased Wedding Pass',
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
              }),
            }),
          };
        }
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockWorkspace, error: null }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { email: 'couple@example.com' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: mockPayment, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'customer_access_entitlements') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockEntitlement, error: null }),
              }),
            }),
          };
        }
        if (table === 'customer_access_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const detail = await fetchAdminOrderDetail('ord-detail-1');
      expect(detail).not.toBeNull();
      expect(detail?.orderNumber).toBe('WF-20260904-7777');
      expect(detail?.coupleName).toBe('Rian & Maya');
      expect(detail?.weddingDate).toBe('2026-11-20');
      expect(detail?.customerEmail).toBe('couple@example.com');
      expect(detail?.amount).toBe(199000);
      expect(detail?.paymentMethod).toBe('gopay');
      expect(detail?.providerReference).toBe('midtrans-tx-999');
      expect(detail?.entitlement?.tier).toBe('Paid');
      expect(detail?.entitlement?.expiresAt).toBeNull();
    });
  });

  /* =======================================================================
   * P1 OPERATIONAL CONTROL CENTER TESTS
   * ======================================================================= */

  describe('P1: Entitlement Mismatch Diagnostics (evaluateEntitlementMismatch)', () => {
    it('evaluates paid order with Paid entitlement as healthy', () => {
      const evaluation = evaluateEntitlementMismatch('paid', {
        tier: 'Paid',
        expiresAt: null,
        isExpired: false,
      });

      expect(evaluation.hasMismatch).toBe(false);
      expect(evaluation.severity).toBe('healthy');
    });

    it('evaluates paid order with Trial entitlement as warning/mismatch', () => {
      const evaluation = evaluateEntitlementMismatch('paid', {
        tier: 'Trial',
        expiresAt: '2026-09-18T00:00:00Z',
        isExpired: false,
      });

      expect(evaluation.hasMismatch).toBe(true);
      expect(evaluation.severity).toBe('warning');
      expect(evaluation.title).toContain('Hak Akses Pasangan Bukan Paid');
      expect(evaluation.message).toContain('berstatus Trial');
    });

    it('evaluates paid order with expiring Paid entitlement as mismatch', () => {
      const evaluation = evaluateEntitlementMismatch('paid', {
        tier: 'Paid',
        expiresAt: '2026-12-31T00:00:00Z',
        isExpired: false,
      });

      expect(evaluation.hasMismatch).toBe(true);
      expect(evaluation.severity).toBe('warning');
      expect(evaluation.title).toContain('Durasi Akses Paid Memiliki Batas Waktu');
    });

    it('evaluates cancelled order with active Paid entitlement as critical mismatch', () => {
      const evaluation = evaluateEntitlementMismatch('cancelled', {
        tier: 'Paid',
        expiresAt: null,
        isExpired: false,
      });

      expect(evaluation.hasMismatch).toBe(true);
      expect(evaluation.severity).toBe('critical');
      expect(evaluation.title).toContain('KRITIS');
    });

    it('evaluates cancelled order with Expired entitlement as healthy', () => {
      const evaluation = evaluateEntitlementMismatch('cancelled', {
        tier: 'Expired',
        expiresAt: null,
        isExpired: true,
      });

      expect(evaluation.hasMismatch).toBe(false);
      expect(evaluation.severity).toBe('healthy');
    });

    it('evaluates pending order with Paid entitlement as informative healthy', () => {
      const evaluation = evaluateEntitlementMismatch('pending', {
        tier: 'Paid',
        expiresAt: null,
        isExpired: false,
      });

      expect(evaluation.hasMismatch).toBe(false);
      expect(evaluation.severity).toBe('healthy');
    });

    it('handles null entitlement gracefully', () => {
      const evaluation = evaluateEntitlementMismatch('paid', null);
      expect(evaluation.hasMismatch).toBe(true);
      expect(evaluation.severity).toBe('warning');
      expect(evaluation.title).toContain('Entitlement Tidak Ditemukan');
    });
  });

  describe('P1: Date Range, Filter, and Pagination Selectors', () => {
    const mockOrdersList: AdminOrderSummary[] = [
      {
        id: 'ord-today',
        orderNumber: 'WF-TODAY-001',
        workspaceId: 'ws-1',
        coupleName: 'Budi & Ani',
        productType: 'wedding_pass',
        productName: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'paid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ord-3days',
        orderNumber: 'WF-3DAYS-002',
        workspaceId: 'ws-2',
        coupleName: 'Citra & Doni',
        productType: 'wedding_pass',
        productName: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'pending',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'ord-10days',
        orderNumber: 'WF-10DAYS-003',
        workspaceId: 'ws-3',
        coupleName: 'Eka & Fani',
        productType: 'wedding_pass',
        productName: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'cancelled',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'ord-40days',
        orderNumber: 'WF-40DAYS-004',
        workspaceId: 'ws-4',
        coupleName: 'Gita & Hadi',
        productType: 'wedding_pass',
        productName: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'failed',
        createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    it('filters orders by date range correctly', () => {
      // All
      const all = filterOrders(mockOrdersList, { search: '', status: 'all', dateRange: 'all' });
      expect(all.length).toBe(4);

      // Today
      const today = filterOrders(mockOrdersList, { search: '', status: 'all', dateRange: 'today' });
      expect(today.length).toBe(1);
      expect(today[0].id).toBe('ord-today');

      // Last 7 days
      const last7 = filterOrders(mockOrdersList, { search: '', status: 'all', dateRange: 'last_7_days' });
      expect(last7.length).toBe(2);

      // Last 30 days
      const last30 = filterOrders(mockOrdersList, { search: '', status: 'all', dateRange: 'last_30_days' });
      expect(last30.length).toBe(3);
    });

    it('combines query, status, and date range filters', () => {
      const filtered = filterOrders(mockOrdersList, {
        search: 'Citra',
        status: 'pending',
        dateRange: 'last_7_days',
      });
      expect(filtered.length).toBe(1);
      expect(filtered[0].coupleName).toBe('Citra & Doni');
    });

    it('paginates orders correctly', () => {
      const items: AdminOrderSummary[] = Array.from({ length: 25 }, (_, i) => ({
        id: `ord-${i + 1}`,
        orderNumber: `WF-ORD-${i + 1}`,
        workspaceId: `ws-${i + 1}`,
        coupleName: `Couple ${i + 1}`,
        productType: 'wedding_pass',
        productName: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'paid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Page 1 with pageSize 10
      const page1 = paginateOrders(items, 1, 10);
      expect(page1.orders.length).toBe(10);
      expect(page1.page).toBe(1);
      expect(page1.pageSize).toBe(10);
      expect(page1.totalPages).toBe(3);
      expect(page1.totalCount).toBe(25);
      expect(page1.orders[0].id).toBe('ord-1');

      // Page 3 with pageSize 10
      const page3 = paginateOrders(items, 3, 10);
      expect(page3.orders.length).toBe(5);
      expect(page3.page).toBe(3);
      expect(page3.orders[0].id).toBe('ord-21');

      // Out of bounds page clamps
      const pageOutOfBounds = paginateOrders(items, 99, 10);
      expect(pageOutOfBounds.page).toBe(3);
      expect(pageOutOfBounds.orders.length).toBe(5);
    });
  });

  describe('P1: Admin Payment Intervention (Mark as Paid)', () => {
    it('marks pending order as paid with manual_admin provider and grants unlimited Wedding Pass', async () => {
      const mockPendingOrder = {
        id: 'ord-intervene-1',
        order_number: 'WF-20260904-INT1',
        workspace_id: 'ws-int-1',
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'pending',
        created_at: '2026-09-04T08:00:00Z',
        updated_at: '2026-09-04T08:00:00Z',
        paid_at: null,
      };

      const mockPaidOrder = {
        ...mockPendingOrder,
        status: 'paid',
        paid_at: '2026-09-04T12:00:00Z',
      };

      const updateOrderMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockPaidOrder, error: null }),
          }),
        }),
      });

      const insertPaymentMock = vi.fn().mockResolvedValue({ error: null });
      const upsertEntitlementMock = vi.fn().mockResolvedValue({ error: null });
      const insertHistoryMock = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockPendingOrder, error: null }),
              }),
            }),
            update: updateOrderMock,
          };
        }
        if (table === 'payments') {
          return { insert: insertPaymentMock };
        }
        if (table === 'customer_access_entitlements') {
          return { upsert: upsertEntitlementMock };
        }
        if (table === 'customer_access_history') {
          return { insert: insertHistoryMock };
        }
        return { select: vi.fn() };
      });

      // RPC mock fallback to JS execution
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'function not found in schema cache' },
      });

      const result = await adminMarkOrderPaidInDb('ord-intervene-1', {
        adminId: 'admin-usr-99',
        reason: 'Transfer BCA manual confirmed by finance',
      });

      expect(result.status).toBe('paid');
      expect(insertPaymentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'manual_admin',
          status: 'paid',
        })
      );
      expect(upsertEntitlementMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: 'ws-int-1',
          tier: 'Paid',
          source: 'manual_admin',
          expires_at: null, // Unlimited Wedding Pass invariant
        }),
        expect.anything()
      );
      expect(insertHistoryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: 'ws-int-1',
          actor_id: 'admin-usr-99',
          event_type: 'wedding_pass_granted_admin',
        })
      );
    });

    it('rejects marking as paid if reason is empty or whitespace', async () => {
      await expect(
        adminMarkOrderPaidInDb('ord-1', {
          adminId: 'admin-1',
          reason: '   ',
        })
      ).rejects.toThrow(/Alasan intervensi administratif wajib diisi/);
    });

    it('rejects marking as paid if order is already paid or cancelled', async () => {
      const mockCancelledOrder = {
        id: 'ord-already-cancelled',
        status: 'cancelled',
        metadata: { refunded_at: '2026-09-04T10:00:00Z' },
      };

      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'function not found' },
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockCancelledOrder, error: null }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await expect(
        adminMarkOrderPaidInDb('ord-already-cancelled', {
          adminId: 'admin-1',
          reason: 'Valid reason here',
        })
      ).rejects.toThrow(/Pesanan yang telah direfund\/chargeback/);
    });
  });

  describe('P1: Admin Order Cancellation (Cancel Pending Order)', () => {
    it('cancels pending order atomically with mandatory reason and logs history', async () => {
      const mockPendingOrder = {
        id: 'ord-cancel-1',
        order_number: 'WF-20260904-CAN1',
        workspace_id: 'ws-can-1',
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'pending',
        created_at: '2026-09-04T08:00:00Z',
        updated_at: '2026-09-04T08:00:00Z',
      };

      const mockCancelledOrder = {
        ...mockPendingOrder,
        status: 'cancelled',
      };

      const updateOrderMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockCancelledOrder, error: null }),
          }),
        }),
      });

      const insertHistoryMock = vi.fn().mockResolvedValue({ error: null });

      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'function not found' },
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockPendingOrder, error: null }),
              }),
            }),
            update: updateOrderMock,
          };
        }
        if (table === 'customer_access_history') {
          return { insert: insertHistoryMock };
        }
        if (table === 'payments') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await adminCancelOrderInDb('ord-cancel-1', {
        adminId: 'admin-usr-99',
        reason: 'Customer abandoned order and requested cancellation',
      });

      expect(result.status).toBe('cancelled');
      expect(insertHistoryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: 'ws-can-1',
          event_type: 'admin_override',
        })
      );
    });

    it('rejects cancelling if reason is empty or whitespace', async () => {
      await expect(
        adminCancelOrderInDb('ord-1', {
          adminId: 'admin-1',
          reason: '',
        })
      ).rejects.toThrow(/Alasan pembatalan pesanan wajib diisi/);
    });

    it('rejects cancelling if order is already paid or refunded', async () => {
      const mockPaidOrder = {
        id: 'ord-paid-cannot-cancel',
        status: 'paid',
      };

      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'function not found' },
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockPaidOrder, error: null }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await expect(
        adminCancelOrderInDb('ord-paid-cannot-cancel', {
          adminId: 'admin-1',
          reason: 'Attempting invalid cancel on paid order',
        })
      ).rejects.toThrow(/Pesanan yang telah berstatus Paid tidak dapat dibatalkan/);
    });
  });

  describe('P1: Midtrans Status Synchronization (syncAdminPaymentStatus)', () => {
    it('syncs settlement transaction successfully via Edge Function', async () => {
      const mockPendingOrder = {
        id: 'ord-sync-1',
        order_number: 'WF-SYNC-001',
        workspace_id: 'ws-sync-1',
        amount: 199000,
        currency: 'IDR',
        status: 'pending',
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockPendingOrder, error: null }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      (supabase.functions.invoke as any).mockResolvedValue({
        data: {
          order: {
            ...mockPendingOrder,
            status: 'paid',
          },
        },
        error: null,
      });

      const syncResult = await syncAdminPaymentStatus('ord-sync-1');
      expect(syncResult.success).toBe(true);
      expect(syncResult.message).toContain('Status Midtrans berhasil disinkronkan');
      expect(syncResult.order?.status).toBe('paid');
    });

    it('rejects sync for non-existent order gracefully', async () => {
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const syncResult = await syncAdminPaymentStatus('ord-nonexistent');
      expect(syncResult.success).toBe(false);
      expect(syncResult.message).toContain('Pesanan tidak ditemukan');
    });
  });

  describe('P1: Server-Side Paginated Admin Orders (fetchPaginatedAdminOrders)', () => {
    it('returns paginated data structure with totalCount and pages calculation', async () => {
      const mockDbRows = Array.from({ length: 25 }, (_, i) => ({
        id: `ord-p-${i + 1}`,
        order_number: `WF-P1-${i + 1}`,
        workspace_id: `ws-${i + 1}`,
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'paid',
        created_at: new Date(Date.now() - i * 3600000).toISOString(),
        updated_at: new Date(Date.now() - i * 3600000).toISOString(),
      }));

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockDbRows,
                error: null,
              }),
            }),
          };
        }
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: 'ws-11', couple_name: 'Agus & Bunga' }],
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

      const paginated = await fetchPaginatedAdminOrders({ search: '', status: 'all', dateRange: 'all' }, { page: 2, pageSize: 10 });
      expect(paginated.page).toBe(2);
      expect(paginated.pageSize).toBe(10);
      expect(paginated.totalCount).toBe(25);
      expect(paginated.totalPages).toBe(3);
      expect(paginated.orders.length).toBe(10);
      expect(paginated.orders[0].id).toBe('ord-p-11');
    });
  });
});
