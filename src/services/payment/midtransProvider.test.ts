import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MidtransProvider } from './midtransProvider';
import { AdminOrderSummary } from '../../types/admin';
import { computeMidtransSignature } from './midtransSignature';
import {
  getSnapApiUrl,
  getCoreApiBaseUrl,
  buildMidtransAuthHeader,
  getWedFlowWebhookUrl,
  WEDFLOW_SUPABASE_PROJECT_ID,
  DEFAULT_WEDFLOW_WEBHOOK_URL,
} from './midtransConfig';

describe('MidtransProvider Boundary & Implementation', () => {
  const mockServerKey = 'SB-Mid-server-TEST_KEY_456';
  const mockOrder: AdminOrderSummary = {
    id: 'ord-test-1',
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
  };

  describe('Configuration & Auth Headers', () => {
    it('throws if constructed without serverKey', () => {
      expect(() => new MidtransProvider({ serverKey: '' })).toThrow(/requires a valid serverKey/);
    });

    it('builds valid Basic Auth header with base64 encoding', () => {
      const auth = buildMidtransAuthHeader('secret-key');
      expect(auth).toBe(`Basic ${btoa('secret-key:')}`);
    });

    it('resolves sandbox vs production endpoints accurately', () => {
      expect(getSnapApiUrl(false)).toBe('https://app.sandbox.midtrans.com/snap/v1/transactions');
      expect(getSnapApiUrl(true)).toBe('https://app.midtrans.com/snap/v1/transactions');
      expect(getCoreApiBaseUrl(false)).toBe('https://api.sandbox.midtrans.com/v2');
      expect(getCoreApiBaseUrl(true)).toBe('https://api.midtrans.com/v2');
    });

    it('resolves default and custom WedFlow webhook URLs for Midtrans override', () => {
      expect(WEDFLOW_SUPABASE_PROJECT_ID).toBe('heavutiajotepwfhlccx');
      expect(DEFAULT_WEDFLOW_WEBHOOK_URL).toBe(
        'https://heavutiajotepwfhlccx.supabase.co/functions/v1/midtrans-webhook'
      );
      expect(getWedFlowWebhookUrl()).toBe(
        'https://heavutiajotepwfhlccx.supabase.co/functions/v1/midtrans-webhook'
      );
      expect(getWedFlowWebhookUrl('https://my-project.supabase.co')).toBe(
        'https://my-project.supabase.co/functions/v1/midtrans-webhook'
      );
      expect(getWedFlowWebhookUrl('https://my-project.supabase.co/')).toBe(
        'https://my-project.supabase.co/functions/v1/midtrans-webhook'
      );
    });
  });

  describe('createTransaction (Snap API)', () => {
    it('creates Snap transaction with authoritative amount, item_details, and minimal customer email', async () => {
      let capturedUrl = '';
      let capturedHeaders: Record<string, string> = {};
      let capturedBody: any = null;

      const mockFetch = vi.fn().mockImplementation(async (url: string, options: any) => {
        capturedUrl = url;
        capturedHeaders = options.headers;
        capturedBody = JSON.parse(options.body);

        return {
          ok: true,
          status: 201,
          json: async () => ({
            token: 'snap-token-abc-123',
            redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-abc-123',
          }),
        };
      });

      const provider = new MidtransProvider({
        serverKey: mockServerKey,
        isProduction: false,
        fetchFn: mockFetch as any,
      });

      const result = await provider.createTransaction({
        order: mockOrder,
        customerEmail: 'budi@example.com',
        customerName: 'Budi',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(capturedUrl).toBe('https://app.sandbox.midtrans.com/snap/v1/transactions');
      expect(capturedHeaders['Authorization']).toBe(buildMidtransAuthHeader(mockServerKey));
      expect(capturedHeaders['X-Override-Notification']).toBe(
        'https://heavutiajotepwfhlccx.supabase.co/functions/v1/midtrans-webhook'
      );
      expect(capturedHeaders['X-Append-Notification']).toBeUndefined();

      // Assert payload properties
      expect(capturedBody.transaction_details.order_id).toBe('WF-20260904-0001');
      expect(capturedBody.transaction_details.gross_amount).toBe(199000);
      expect(capturedBody.customer_details.email).toBe('budi@example.com');
      expect(capturedBody.item_details).toEqual([
        {
          id: 'wedding_pass',
          price: 199000,
          quantity: 1,
          name: 'Wedding Pass',
        },
      ]);
      expect(capturedBody.expiry.unit).toBe('minute');

      // Assert result
      expect(result.provider).toBe('midtrans');
      expect(result.token).toBe('snap-token-abc-123');
      expect(result.redirectUrl).toBe(
        'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-abc-123'
      );
      expect(result.expiresAt).toBeDefined();
    });

    it('supports custom override notification URL if explicitly configured', async () => {
      let capturedHeaders: Record<string, string> = {};

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          token: 'snap-token-custom',
          redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-custom',
        }),
      });

      const customWebhookUrl = 'https://custom-staging.supabase.co/functions/v1/midtrans-webhook';
      const provider = new MidtransProvider({
        serverKey: mockServerKey,
        isProduction: false,
        overrideNotificationUrl: customWebhookUrl,
        fetchFn: mockFetch as any,
      });

      await provider.createTransaction({
        order: mockOrder,
        customerEmail: 'budi@example.com',
      });

      capturedHeaders = (mockFetch.mock.calls[0] as any)[1].headers;
      expect(capturedHeaders['X-Override-Notification']).toBe(customWebhookUrl);
      expect(capturedHeaders['X-Append-Notification']).toBeUndefined();
    });

    it('rejects if customer email is invalid or missing', async () => {
      const provider = new MidtransProvider({
        serverKey: mockServerKey,
        fetchFn: vi.fn(),
      });

      await expect(
        provider.createTransaction({
          order: mockOrder,
          customerEmail: 'invalid-email',
        })
      ).rejects.toThrow(/Valid customer email is required/);
    });

    it('handles Midtrans Snap API HTTP error responses', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => '["order_id already exists"]',
      });

      const provider = new MidtransProvider({
        serverKey: mockServerKey,
        fetchFn: mockFetch as any,
      });

      await expect(
        provider.createTransaction({
          order: mockOrder,
          customerEmail: 'test@example.com',
        })
      ).rejects.toThrow(/Midtrans Snap API error \(400 Bad Request\)/);
    });
  });

  describe('verifyNotificationSignature', () => {
    it('verifies valid notification payload', async () => {
      const validSig = await computeMidtransSignature(
        'WF-20260904-0001',
        '200',
        '199000.00',
        mockServerKey
      );

      const provider = new MidtransProvider({ serverKey: mockServerKey });
      const isValid = await provider.verifyNotificationSignature({
        order_id: 'WF-20260904-0001',
        status_code: '200',
        gross_amount: '199000.00',
        signature_key: validSig,
      });

      expect(isValid).toBe(true);
    });
  });

  describe('getTransactionStatus (Core API)', () => {
    it('queries GET /v2/{order_id}/status and normalizes the response', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string, options: any) => {
        expect(url).toBe('https://api.sandbox.midtrans.com/v2/WF-20260904-0001/status');
        expect(options.headers['Authorization']).toBe(buildMidtransAuthHeader(mockServerKey));

        return {
          ok: true,
          status: 200,
          json: async () => ({
            status_code: '200',
            status_message: 'Success, transaction found',
            transaction_id: 'tx-query-123',
            order_id: 'WF-20260904-0001',
            gross_amount: '199000.00',
            currency: 'IDR',
            payment_type: 'bank_transfer',
            transaction_time: '2026-09-04 12:00:00',
            transaction_status: 'settlement',
          }),
        };
      });

      const provider = new MidtransProvider({
        serverKey: mockServerKey,
        fetchFn: mockFetch as any,
      });

      const result = await provider.getTransactionStatus('WF-20260904-0001');

      expect(result.isSuccess).toBe(true);
      expect(result.orderNumber).toBe('WF-20260904-0001');
      expect(result.transactionId).toBe('tx-query-123');
      expect(result.amount).toBe(199000);
      expect(result.rawStatus).toBe('settlement');
    });
  });
});
