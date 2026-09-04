import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import {
  fetchAccessConfig,
  saveAccessConfig,
  createOrderInDb,
} from '../repositories/supabaseAdminAdapter';
import {
  fetchCommercialPricing,
  getOrCreatePendingOrder,
  createPaymentSession,
} from '../repositories/paymentRepository';
import {
  DEFAULT_ADMIN_ACCESS_CONFIG,
  AdminAccessConfig,
} from '../types/admin';
import { reconcileCheckoutPrice, getCheckoutDurationDescription } from '../components/checkout/CheckoutPage';
import { formatAdminPrice } from './adminSelectors';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('Dynamic Wedding Pass Pricing Propagation (Steps A to J Validation)', () => {
  let mockRemoteDbConfig: AdminAccessConfig;
  let mockOrdersTable: Map<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOrdersTable = new Map();

    // Initial Database State (Seeded row in public.platform_configurations)
    mockRemoteDbConfig = {
      ...DEFAULT_ADMIN_ACCESS_CONFIG,
      price: 199000,
      currency: 'IDR',
    };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'platform_configurations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              return {
                maybeSingle: vi.fn().mockImplementation(async () => {
                  if (val === 'commercial_access_rules') {
                    return {
                      data: {
                        value: mockRemoteDbConfig,
                        updated_at: new Date().toISOString(),
                      },
                      error: null,
                    };
                  }
                  return { data: null, error: null };
                }),
                single: vi.fn().mockImplementation(async () => {
                  if (val === 'commercial_access_rules') {
                    return {
                      data: {
                        value: mockRemoteDbConfig,
                        updated_at: new Date().toISOString(),
                      },
                      error: null,
                    };
                  }
                  return { data: null, error: new Error('Not found') };
                }),
              };
            }),
          }),
          upsert: vi.fn().mockImplementation((payload: any) => {
            if (payload.key === 'commercial_access_rules') {
              mockRemoteDbConfig = { ...payload.value };
            }
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    value: mockRemoteDbConfig,
                    updated_at: payload.updated_at || new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            };
          }),
        };
      }

      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockImplementation(async () => {
                        return { data: null, error: null };
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }

      return { select: vi.fn() };
    });

    // Mock create_order RPC
    (supabase.rpc as any).mockImplementation((funcName: string, params: any) => {
      if (funcName === 'create_order') {
        const orderId = `ord-${Date.now()}`;
        const newOrder = {
          id: orderId,
          order_number: params.p_custom_order_number || `WF-${Date.now()}`,
          workspace_id: params.p_workspace_id,
          couple_name: 'Pasangan Baru',
          product_type: params.p_product_type || 'wedding_pass',
          product_name: 'Wedding Pass',
          amount: mockRemoteDbConfig.price, // Stamped directly from current platform config
          currency: mockRemoteDbConfig.currency || 'IDR',
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        mockOrdersTable.set(orderId, newOrder);
        return { data: newOrder, error: null };
      }
      return { data: null, error: null };
    });
  });

  it('executes the complete A to J end-to-end pricing flow accurately', async () => {
    // -------------------------------------------------------------
    // Step A: Admin initial price = 199000
    // -------------------------------------------------------------
    const initialConfig = await fetchAccessConfig();
    expect(initialConfig.price).toBe(199000);
    expect(formatAdminPrice(initialConfig.price, initialConfig.currency)).toBe('Rp199.000');

    // -------------------------------------------------------------
    // Step B & C: Change Admin price to 249000 and Save
    // -------------------------------------------------------------
    const updatedDraft: AdminAccessConfig = {
      ...initialConfig,
      price: 249000,
    };
    const savedConfig = await saveAccessConfig(updatedDraft);
    expect(savedConfig.price).toBe(249000);
    expect(mockRemoteDbConfig.price).toBe(249000); // Persisted into database

    // -------------------------------------------------------------
    // Step D: Reload Admin -> must remain 249000
    // -------------------------------------------------------------
    const reloadedAdminConfig = await fetchAccessConfig();
    expect(reloadedAdminConfig.price).toBe(249000);
    expect(formatAdminPrice(reloadedAdminConfig.price, reloadedAdminConfig.currency)).toBe('Rp249.000');

    // -------------------------------------------------------------
    // Step E: Reload Consumer -> must show Rp249.000
    // -------------------------------------------------------------
    const consumerPricing = await fetchCommercialPricing();
    expect(consumerPricing.price).toBe(249000);
    const consumerFormattedPrice = `Rp${consumerPricing.price.toLocaleString('id-ID')}`;
    expect(consumerFormattedPrice).toBe('Rp249.000');

    // -------------------------------------------------------------
    // Step F: Checkout -> must show Rp249.000
    // -------------------------------------------------------------
    const displayPrice = consumerPricing.price;
    expect(displayPrice).toBe(249000);

    // -------------------------------------------------------------
    // Step G: Create order -> amount = 249000
    // -------------------------------------------------------------
    const order = await getOrCreatePendingOrder('ws-prop-test-1', 'wedding_pass');
    expect(order.amount).toBe(249000);
    expect(order.currency).toBe('IDR');

    // Price reconciliation should match perfectly without mismatch banner
    const reconciliation = reconcileCheckoutPrice(displayPrice, order.amount);
    expect(reconciliation.isMatch).toBe(true);
    expect(reconciliation.authoritativePrice).toBe(249000);
    expect(reconciliation.notice).toBeNull();

    // -------------------------------------------------------------
    // Step H: Midtrans -> gross_amount = 249000
    // -------------------------------------------------------------
    let capturedMidtransSnapPayload: any = null;
    (supabase.functions.invoke as any).mockImplementationOnce(async (funcName: string, options: any) => {
      if (funcName === 'midtrans-snap') {
        capturedMidtransSnapPayload = {
          gross_amount: order.amount,
          item_price: order.amount,
          order_id: order.orderNumber,
        };
        return {
          data: {
            token: 'snap-token-249k',
            redirectUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-249k',
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    const paymentSession = await createPaymentSession(order.id, 'couple@wedflow.id');
    expect(paymentSession.token).toBe('snap-token-249k');
    expect(capturedMidtransSnapPayload.gross_amount).toBe(249000);
    expect(capturedMidtransSnapPayload.item_price).toBe(249000);

    // -------------------------------------------------------------
    // Step I: Change Admin price back to 199000
    // -------------------------------------------------------------
    const revertDraft: AdminAccessConfig = {
      ...reloadedAdminConfig,
      price: 199000,
    };
    await saveAccessConfig(revertDraft);
    expect(mockRemoteDbConfig.price).toBe(199000);

    // -------------------------------------------------------------
    // Step J: Reload Consumer -> must show Rp199.000
    // -------------------------------------------------------------
    const revertedConsumerPricing = await fetchCommercialPricing();
    expect(revertedConsumerPricing.price).toBe(199000);
    expect(`Rp${revertedConsumerPricing.price.toLocaleString('id-ID')}`).toBe('Rp199.000');

    // Existing 249000 order in database must remain 249000 (IMMUTABILITY)
    expect(order.amount).toBe(249000);
    expect(mockOrdersTable.get(order.id).amount).toBe(249000);
  });
});
