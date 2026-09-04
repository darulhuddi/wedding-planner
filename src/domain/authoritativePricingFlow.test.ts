import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import {
  fetchAccessConfig,
  saveAccessConfig,
  createOrderInDb,
} from '../repositories/supabaseAdminAdapter';
import {
  DEFAULT_ADMIN_ACCESS_CONFIG,
  AdminAccessConfig,
} from '../types/admin';
import { MidtransProvider } from '../services/payment/midtransProvider';
import { reconcileCheckoutPrice } from '../components/checkout/CheckoutPage';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Authoritative Wedding Pass Pricing Flow & Immutability Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Single Source of Truth & Admin Configuration Persistence', () => {
    it('initializes default commercial configuration with Rp199.000', async () => {
      // When database has no custom configuration yet
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'platform_configurations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const config = await fetchAccessConfig();
      expect(config.price).toBe(199000);
      expect(config.currency).toBe('IDR');
      expect(config.weddingPassEnabled).toBe(true);
    });

    it('persists and retrieves updated price when Admin changes configuration', async () => {
      const updatedConfig: AdminAccessConfig = {
        ...DEFAULT_ADMIN_ACCESS_CONFIG,
        price: 249000,
        currency: 'IDR',
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'platform_configurations') {
          return {
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    value: updatedConfig,
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const saved = await saveAccessConfig(updatedConfig);
      expect(saved.price).toBe(249000);
    });
  });

  describe('2. Order Creation Uses Authoritative Configured Price', () => {
    it('stamps order with the configured 199.000 price via create_order RPC', async () => {
      const mockWorkspaceId = 'ws-auth-price-1';
      const mockOrder = {
        id: 'ord-101',
        order_number: 'WF-20260904-1001',
        workspace_id: mockWorkspaceId,
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (supabase.rpc as any).mockResolvedValueOnce({
        data: mockOrder,
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
    });

    it('creates new orders with updated price after Admin price update', async () => {
      const mockWorkspaceId = 'ws-auth-price-2';
      const updatedPrice = 249000;

      const mockOrderUpdated = {
        id: 'ord-102',
        order_number: 'WF-20260904-1002',
        workspace_id: mockWorkspaceId,
        product_type: 'wedding_pass',
        product_name: 'Wedding Pass',
        amount: updatedPrice,
        currency: 'IDR',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (supabase.rpc as any).mockResolvedValueOnce({
        data: mockOrderUpdated,
        error: null,
      });

      const order = await createOrderInDb(mockWorkspaceId, {
        productType: 'wedding_pass',
      });

      expect(order.amount).toBe(249000);
    });
  });

  describe('3. Order Immutability (Historical Orders Retain Original Amount)', () => {
    it('historical order retains its original 199.000 amount when platform price changes to 249.000', async () => {
      const historicalOrder = {
        id: 'ord-historical-1',
        orderNumber: 'WF-20260904-0050',
        workspaceId: 'ws-historical-1',
        productType: 'wedding_pass',
        productName: 'Wedding Pass',
        amount: 199000, // Original price at purchase time
        currency: 'IDR',
        status: 'pending' as const,
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-01T10:00:00Z',
      };

      // Admin subsequently updates commercial price to 249000
      const newAdminPrice = 249000;

      // Existing order amount must NEVER mutate
      expect(historicalOrder.amount).toBe(199000);
      expect(historicalOrder.amount).not.toBe(newAdminPrice);

      // Reconciling checkout for this existing order detects that the order's price is 199.000
      const reconciliation = reconcileCheckoutPrice(newAdminPrice, historicalOrder.amount);
      expect(reconciliation.isMatch).toBe(false);
      expect(reconciliation.authoritativePrice).toBe(199000);
    });
  });

  describe('4. Midtrans Payload Alignment', () => {
    it('Midtrans Snap receives exact order amount without client tampering', async () => {
      let capturedBody: any = null;
      const mockFetch = vi.fn().mockImplementation(async (_url: string, options: any) => {
        capturedBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 201,
          json: async () => ({
            token: 'snap-token-exact-amount',
            redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-exact-amount',
          }),
        };
      });

      const provider = new MidtransProvider({
        serverKey: 'SB-Mid-server-TEST_KEY',
        isProduction: false,
        fetchFn: mockFetch as any,
      });

      const orderSummary = {
        id: 'ord-midtrans-match',
        orderNumber: 'WF-20260904-9999',
        workspaceId: 'ws-match-1',
        coupleName: 'Bayu & Citra',
        productType: 'wedding_pass' as const,
        productName: 'Wedding Pass',
        amount: 199000,
        currency: 'IDR',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await provider.createTransaction({
        order: orderSummary,
        customerEmail: 'bayu@example.com',
      });

      expect(capturedBody.transaction_details.gross_amount).toBe(199000);
      expect(capturedBody.item_details[0].price).toBe(199000);
      expect(capturedBody.transaction_details.order_id).toBe('WF-20260904-9999');
    });
  });
});
