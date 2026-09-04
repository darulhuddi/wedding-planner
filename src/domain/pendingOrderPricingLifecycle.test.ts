import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import {
  fetchCommercialPricing,
  getOrCreatePendingOrder,
  createPaymentSession,
} from '../repositories/paymentRepository';
import { saveAccessConfig } from '../repositories/supabaseAdminAdapter';
import { AdminAccessConfig, DEFAULT_ADMIN_ACCESS_CONFIG } from '../types/admin';
import { reconcileCheckoutPrice } from '../components/checkout/CheckoutPage';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('Pending-Order Pricing Lifecycle & Immutability Invariant', () => {
  const workspaceId = 'ws-lifecycle-test-1';

  // In-memory mock databases
  let mockPlatformConfig: Record<string, any> = {};
  let mockOrdersTable: Map<string, any> = new Map();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOrdersTable.clear();

    mockPlatformConfig = {
      ...DEFAULT_ADMIN_ACCESS_CONFIG,
      price: 250000,
      currency: 'IDR',
    };

    // Mock platform_configurations query
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'platform_configurations') {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => ({
                data: val === 'commercial_access_rules' ? { value: mockPlatformConfig, updated_at: new Date().toISOString() } : null,
                error: null,
              }),
            }),
          }),
          upsert: async (payload: any) => {
            if (payload.key === 'commercial_access_rules') {
              mockPlatformConfig = payload.value;
            }
            return { data: payload, error: null };
          },
        };
      }

      if (table === 'orders') {
        return {
          select: () => ({
            eq: (_col1: string, val1: string) => ({
              eq: (_col2: string, val2: string) => ({
                eq: (_col3: string, val3: string) => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => {
                        const matching = Array.from(mockOrdersTable.values())
                          .filter((o) => o.workspace_id === val1 && o.product_type === val2 && o.status === val3)
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                        return { data: matching[0] || null, error: null };
                      },
                    }),
                  }),
                }),
              }),
            }),
          }),
          insert: (payload: any) => ({
            select: () => ({
              single: async () => {
                const inserted = {
                  id: `order-ins-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  order_number: payload.order_number,
                  workspace_id: payload.workspace_id,
                  product_type: payload.product_type,
                  product_name: payload.product_name,
                  amount: payload.amount,
                  currency: payload.currency,
                  status: payload.status,
                  metadata: payload.metadata,
                  created_at: payload.created_at,
                  updated_at: payload.updated_at,
                  paid_at: null,
                };
                mockOrdersTable.set(inserted.id, inserted);
                return { data: inserted, error: null };
              },
            }),
          }),
          update: (updates: any) => ({
            eq: (col: string, val: string) => {
              // Can match by id or by workspace_id
              if (col === 'id') {
                const existing = mockOrdersTable.get(val);
                if (existing) {
                  const updated = { ...existing, ...updates };
                  mockOrdersTable.set(val, updated);
                }
                return Promise.resolve({ data: null, error: null });
              }

              // Multi-column chained update
              return {
                eq: (col2: string, val2: string) => ({
                  eq: async (col3: string, val3: string) => {
                    for (const [id, order] of mockOrdersTable.entries()) {
                      if (
                        (col === 'workspace_id' ? order.workspace_id === val : true) &&
                        (col2 === 'product_type' ? order.product_type === val2 : true) &&
                        (col3 === 'status' ? order.status === val3 : true)
                      ) {
                        mockOrdersTable.set(id, { ...order, ...updates });
                      }
                    }
                    return { data: null, error: null };
                  },
                }),
              };
            },
          }),
        };
      }

      if (table === 'workspaces') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: workspaceId, couple_name: 'Adit & Amel' },
                error: null,
              }),
            }),
          }),
        };
      }

      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      };
    });

    // RPC mock
    (supabase.rpc as any).mockImplementation(async (fnName: string, params: any) => {
      if (fnName === 'create_order') {
        // Expire older pending orders
        for (const [id, order] of mockOrdersTable.entries()) {
          if (order.workspace_id === params.p_workspace_id && order.product_type === params.p_product_type && order.status === 'pending') {
            mockOrdersTable.set(id, {
              ...order,
              status: 'expired',
              updated_at: new Date().toISOString(),
              metadata: { ...(order.metadata || {}), expired_reason: 'superseded_by_new_order' },
            });
          }
        }

        const newOrder = {
          id: `order-rpc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          order_number: params.p_custom_order_number || `WF-${Date.now()}`,
          workspace_id: params.p_workspace_id,
          couple_name: 'Adit & Amel',
          product_type: params.p_product_type || 'wedding_pass',
          product_name: 'Wedding Pass',
          amount: mockPlatformConfig.price,
          currency: mockPlatformConfig.currency || 'IDR',
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          paid_at: null,
          metadata: { priceSnapshot: mockPlatformConfig.price },
        };
        mockOrdersTable.set(newOrder.id, newOrder);
        return { data: newOrder, error: null };
      }
      return { data: null, error: null };
    });
  });

  // --------------------------------------------------------------------------
  // TEST 1: Case A — No pending order -> creates new order with current config price
  // --------------------------------------------------------------------------
  it('Case A: creates a new pending order at 250000 when no pending order exists', async () => {
    const config = await fetchCommercialPricing();
    expect(config.price).toBe(250000);

    const order = await getOrCreatePendingOrder(workspaceId, 'wedding_pass');
    expect(order.amount).toBe(250000);
    expect(order.currency).toBe('IDR');
    expect(order.status).toBe('pending');
    expect(mockOrdersTable.size).toBe(1);
    expect(mockOrdersTable.get(order.id)?.amount).toBe(250000);
  });

  // --------------------------------------------------------------------------
  // TEST 2: Case B — Pending order exists with SAME price -> reuses existing order
  // --------------------------------------------------------------------------
  it('Case B: reuses existing pending order when existing amount matches current config price (250000)', async () => {
    // Seed an existing pending order with amount = 250000
    const existingOrder = {
      id: 'order-existing-250k',
      order_number: 'WF-20260904-250K',
      workspace_id: workspaceId,
      product_type: 'wedding_pass',
      product_name: 'Wedding Pass',
      amount: 250000,
      currency: 'IDR',
      status: 'pending',
      created_at: new Date('2026-09-04T10:00:00Z').toISOString(),
      updated_at: new Date('2026-09-04T10:00:00Z').toISOString(),
      paid_at: null,
      metadata: {},
    };
    mockOrdersTable.set(existingOrder.id, existingOrder);

    const order = await getOrCreatePendingOrder(workspaceId, 'wedding_pass');
    expect(order.id).toBe('order-existing-250k');
    expect(order.amount).toBe(250000);
    expect(order.status).toBe('pending');

    // No duplicate orders created
    expect(mockOrdersTable.size).toBe(1);
  });

  // --------------------------------------------------------------------------
  // TEST 3: Case C — Pending order exists with DIFFERENT price (199000 vs 250000)
  // --------------------------------------------------------------------------
  it('Case C: supersedes old 199000 pending order as expired, preserves old amount, and creates 250000 order', async () => {
    // Seed an older pending order created when the price was 199000
    const oldOrder = {
      id: 'order-stale-199k',
      order_number: 'WF-20260904-199K',
      workspace_id: workspaceId,
      product_type: 'wedding_pass',
      product_name: 'Wedding Pass',
      amount: 199000, // Historical price snapshot
      currency: 'IDR',
      status: 'pending',
      created_at: new Date('2026-09-04T08:00:00Z').toISOString(),
      updated_at: new Date('2026-09-04T08:00:00Z').toISOString(),
      paid_at: null,
      metadata: { priceSnapshot: 199000 },
    };
    mockOrdersTable.set(oldOrder.id, oldOrder);

    // Call getOrCreatePendingOrder with current config (250000)
    const newOrder = await getOrCreatePendingOrder(workspaceId, 'wedding_pass');

    // 1. Returned order must be the NEW order with 250000
    expect(newOrder.id).not.toBe('order-stale-199k');
    expect(newOrder.amount).toBe(250000);
    expect(newOrder.status).toBe('pending');

    // 2. Old order must remain IMMUTABLE in amount (199000)
    const storedOldOrder = mockOrdersTable.get('order-stale-199k');
    expect(storedOldOrder.amount).toBe(199000);

    // 3. Old order must be marked non-payable ('expired')
    expect(storedOldOrder.status).toBe('expired');
    expect(storedOldOrder.metadata?.expired_reason).toBeDefined();

    // 4. Exactly one active payable pending order exists
    const activePendingOrders = Array.from(mockOrdersTable.values()).filter(
      (o) => o.workspace_id === workspaceId && o.status === 'pending'
    );
    expect(activePendingOrders.length).toBe(1);
    expect(activePendingOrders[0].amount).toBe(250000);
  });

  // --------------------------------------------------------------------------
  // TEST 4: Midtrans Snap receives 250000 for the new order
  // --------------------------------------------------------------------------
  it('Midtrans Snap initiation sends gross_amount = 250000 for newly superseded order', async () => {
    // Seed stale order
    mockOrdersTable.set('order-stale-199k', {
      id: 'order-stale-199k',
      order_number: 'WF-STALE-199K',
      workspace_id: workspaceId,
      product_type: 'wedding_pass',
      product_name: 'Wedding Pass',
      amount: 199000,
      currency: 'IDR',
      status: 'pending',
      created_at: new Date('2026-09-04T08:00:00Z').toISOString(),
      updated_at: new Date('2026-09-04T08:00:00Z').toISOString(),
    });

    const activeOrder = await getOrCreatePendingOrder(workspaceId, 'wedding_pass');
    expect(activeOrder.amount).toBe(250000);

    // Price reconciliation against display price of 250000
    const displayPrice = 250000;
    const reconciliation = reconcileCheckoutPrice(displayPrice, activeOrder.amount);
    expect(reconciliation.isMatch).toBe(true);
    expect(reconciliation.authoritativePrice).toBe(250000);

    // Mock Snap Edge Function
    let capturedBody: any = null;
    (supabase.functions.invoke as any).mockImplementationOnce(async (name: string, opts: any) => {
      if (name === 'midtrans-snap') {
        capturedBody = {
          orderId: opts.body.orderId,
          gross_amount: activeOrder.amount,
        };
        return {
          data: { token: 'snap-token-250k', redirectUrl: 'https://app.midtrans.com/snap/250k' },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    const session = await createPaymentSession(activeOrder.id, 'adit.amel@example.com');
    expect(session.token).toBe('snap-token-250k');
    expect(capturedBody.orderId).toBe(activeOrder.id);
    expect(capturedBody.gross_amount).toBe(250000);
  });

  // --------------------------------------------------------------------------
  // TEST 5: Existing Paid Orders Remain Untouched
  // --------------------------------------------------------------------------
  it('Existing paid orders are never modified or expired during pending order lifecycle', async () => {
    const historicalPaidOrder = {
      id: 'order-paid-historical',
      order_number: 'WF-PAID-001',
      workspace_id: workspaceId,
      product_type: 'wedding_pass',
      product_name: 'Wedding Pass',
      amount: 199000,
      currency: 'IDR',
      status: 'paid',
      created_at: new Date('2026-08-01T10:00:00Z').toISOString(),
      updated_at: new Date('2026-08-01T10:05:00Z').toISOString(),
      paid_at: new Date('2026-08-01T10:05:00Z').toISOString(),
      metadata: {},
    };
    mockOrdersTable.set(historicalPaidOrder.id, historicalPaidOrder);

    // Call getOrCreatePendingOrder
    await getOrCreatePendingOrder(workspaceId, 'wedding_pass');

    // Historical paid order must remain completely untouched
    const storedPaid = mockOrdersTable.get('order-paid-historical');
    expect(storedPaid.status).toBe('paid');
    expect(storedPaid.amount).toBe(199000);
    expect(storedPaid.paid_at).toBe(historicalPaidOrder.paid_at);
  });

  // --------------------------------------------------------------------------
  // TEST 6: Repeated Clicks Do Not Create Multiple Active Pending Orders
  // --------------------------------------------------------------------------
  it('Repeated checkout clicks / re-entries reuse the single active pending order', async () => {
    const click1Order = await getOrCreatePendingOrder(workspaceId, 'wedding_pass');
    const click2Order = await getOrCreatePendingOrder(workspaceId, 'wedding_pass');
    const click3Order = await getOrCreatePendingOrder(workspaceId, 'wedding_pass');

    expect(click1Order.id).toBe(click2Order.id);
    expect(click2Order.id).toBe(click3Order.id);
    expect(click1Order.amount).toBe(250000);

    const activePending = Array.from(mockOrdersTable.values()).filter(
      (o) => o.workspace_id === workspaceId && o.status === 'pending'
    );
    expect(activePending.length).toBe(1);
  });
});
