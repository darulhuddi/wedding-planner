import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateMidtransOrderId, parseBaseOrderNumber } from './midtransConfig';
import { createPaymentSession } from '../../repositories/paymentRepository';
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

describe('Midtrans Multi-Attempt Order ID Generator & Parser', () => {
  it('generates a unique midtrans order ID adhering to <= 50 chars constraint', () => {
    const orderNumber = 'WF-20260904-0001';
    const midtransOrderId1 = generateMidtransOrderId(orderNumber);
    const midtransOrderId2 = generateMidtransOrderId(orderNumber);

    expect(midtransOrderId1).not.toBe(midtransOrderId2);
    expect(midtransOrderId1.length).toBeLessThanOrEqual(50);
    expect(midtransOrderId2.length).toBeLessThanOrEqual(50);
    expect(midtransOrderId1.startsWith(orderNumber)).toBe(true);
    expect(/^[A-Za-z0-9-_]+$/.test(midtransOrderId1)).toBe(true);
  });

  it('guarantees <= 50 chars even for long base order numbers (e.g. 36-char UUID)', () => {
    const longOrderId = '182a189c-a03b-496f-a719-13987ac25caa';
    const midtransOrderId = generateMidtransOrderId(longOrderId);

    expect(midtransOrderId.length).toBeLessThanOrEqual(50);
    expect(/^[A-Za-z0-9-_]+$/.test(midtransOrderId)).toBe(true);
  });

  it('correctly parses base order number from unique attempt-suffixed strings', () => {
    const baseNumber = 'WF-20260904-1234';
    const attemptId = generateMidtransOrderId(baseNumber);

    const parsed = parseBaseOrderNumber(attemptId);
    expect(parsed).toBe(baseNumber);
  });

  it('returns original order number if no attempt suffix exists (legacy backward compatibility)', () => {
    const legacyNumber = 'WF-20260904-9999';
    expect(parseBaseOrderNumber(legacyNumber)).toBe(legacyNumber);
  });
});

describe('Edge Function Simulation: Multi-Attempt Payment & Session Reuse Lifecycle', () => {
  interface MockOrder {
    id: string;
    order_number: string;
    workspace_id: string;
    status: string;
    amount: number;
    currency: string;
    product_type: string;
    product_name: string;
    metadata?: Record<string, any>;
  }

  let mockOrder: MockOrder;
  let midtransApiCallSpy: any;

  async function simulateSnapEndpoint(
    reqBody: { orderId: string; customerEmail?: string; forceNew?: boolean },
    now = new Date()
  ) {
    if (mockOrder.status === 'paid') {
      return { status: 400, body: { error: 'Order is already paid.' } };
    }
    if (mockOrder.status !== 'pending') {
      return { status: 400, body: { error: `Cannot pay order with status ${mockOrder.status}.` } };
    }

    const existingSession = mockOrder.metadata?.midtransSession;
    const grossAmount = Math.round(Number(mockOrder.amount));

    // Session reuse check
    if (
      !reqBody.forceNew &&
      existingSession &&
      existingSession.token &&
      existingSession.expiresAt &&
      existingSession.grossAmount === grossAmount
    ) {
      const expiresAtMs = new Date(existingSession.expiresAt).getTime();
      if (expiresAtMs - now.getTime() > 2 * 60 * 1000) {
        return {
          status: 200,
          body: {
            provider: 'midtrans',
            token: existingSession.token,
            redirectUrl: existingSession.redirectUrl,
            expiresAt: existingSession.expiresAt,
            midtransOrderId: existingSession.midtransOrderId || mockOrder.order_number,
            isReusedSession: true,
          },
        };
      }
    }

    // New attempt creation
    const midtransOrderId = generateMidtransOrderId(mockOrder.order_number);
    const snapResult = await midtransApiCallSpy({
      orderId: midtransOrderId,
      grossAmount,
      customerEmail: reqBody.customerEmail || 'customer@wedflow.id',
    });

    if (!snapResult.ok) {
      return { status: snapResult.status, body: { error: snapResult.error } };
    }

    const expiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const existingAttempts = Array.isArray(mockOrder.metadata?.paymentAttempts)
      ? mockOrder.metadata.paymentAttempts
      : [];

    const newAttempt = {
      midtransOrderId,
      token: snapResult.data.token,
      createdAt: now.toISOString(),
      expiresAt: expiryDate.toISOString(),
      grossAmount,
      status: 'pending',
    };

    mockOrder.metadata = {
      ...(mockOrder.metadata || {}),
      midtransSession: {
        token: snapResult.data.token,
        redirectUrl: snapResult.data.redirect_url,
        midtransOrderId,
        createdAt: now.toISOString(),
        expiresAt: expiryDate.toISOString(),
        grossAmount,
        status: 'pending',
        provider: 'midtrans',
      },
      paymentAttempts: [...existingAttempts, newAttempt],
    };

    return {
      status: 200,
      body: {
        provider: 'midtrans',
        token: snapResult.data.token,
        redirectUrl: snapResult.data.redirect_url,
        expiresAt: expiryDate.toISOString(),
        midtransOrderId,
        isReusedSession: false,
      },
    };
  }

  beforeEach(() => {
    mockOrder = {
      id: 'ord-uuid-test-1',
      order_number: 'WF-20260904-7777',
      workspace_id: 'ws-test-1',
      status: 'pending',
      amount: 250000,
      currency: 'IDR',
      product_type: 'wedding_pass',
      product_name: 'Wedding Pass',
      metadata: {},
    };

    let tokenCounter = 1;
    midtransApiCallSpy = vi.fn().mockImplementation(async (payload: any) => {
      return {
        ok: true,
        status: 200,
        data: {
          token: `snap-token-attempt-${tokenCounter++}`,
          redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/token-${tokenCounter}`,
        },
      };
    });
  });

  it('1. First payment attempt generates unique midtrans_order_id and calls Midtrans Snap API', async () => {
    const res = await simulateSnapEndpoint({ orderId: mockOrder.id });

    expect(res.status).toBe(200);
    expect(res.body.isReusedSession).toBe(false);
    expect(res.body.midtransOrderId).toBeDefined();
    expect(res.body.midtransOrderId).not.toBe(mockOrder.order_number);
    expect(res.body.midtransOrderId.startsWith(mockOrder.order_number)).toBe(true);
    expect(midtransApiCallSpy).toHaveBeenCalledTimes(1);

    expect(mockOrder.metadata?.paymentAttempts).toHaveLength(1);
    expect(mockOrder.metadata?.midtransSession.midtransOrderId).toBe(res.body.midtransOrderId);
  });

  it('2. Subsequent payment attempt without forceNew reuses the existing active Snap token', async () => {
    // Initial attempt
    const firstRes = await simulateSnapEndpoint({ orderId: mockOrder.id });
    expect(midtransApiCallSpy).toHaveBeenCalledTimes(1);

    // Re-requesting without forceNew within valid window
    const secondRes = await simulateSnapEndpoint({ orderId: mockOrder.id, forceNew: false });
    expect(secondRes.status).toBe(200);
    expect(secondRes.body.isReusedSession).toBe(true);
    expect(secondRes.body.token).toBe(firstRes.body.token);
    expect(secondRes.body.midtransOrderId).toBe(firstRes.body.midtransOrderId);
    // Provider API was NOT called again
    expect(midtransApiCallSpy).toHaveBeenCalledTimes(1);
    expect(mockOrder.metadata?.paymentAttempts).toHaveLength(1);
  });

  it('3. Retrying payment with forceNew: true generates a NEW unique Midtrans order ID, keeping internal order_number identical', async () => {
    // Attempt 1
    const firstRes = await simulateSnapEndpoint({ orderId: mockOrder.id });
    const firstAttemptId = firstRes.body.midtransOrderId;

    // Attempt 2 (forceNew: true)
    const secondRes = await simulateSnapEndpoint({ orderId: mockOrder.id, forceNew: true });
    const secondAttemptId = secondRes.body.midtransOrderId;

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.isReusedSession).toBe(false);
    expect(secondAttemptId).not.toBe(firstAttemptId);
    expect(secondRes.body.token).not.toBe(firstRes.body.token);
    // Internal WedSiap order identifier remains completely unchanged
    expect(mockOrder.order_number).toBe('WF-20260904-7777');
    expect(mockOrder.id).toBe('ord-uuid-test-1');

    expect(midtransApiCallSpy).toHaveBeenCalledTimes(2);
    expect(mockOrder.metadata?.paymentAttempts).toHaveLength(2);
    expect(mockOrder.metadata?.paymentAttempts[0].midtransOrderId).toBe(firstAttemptId);
    expect(mockOrder.metadata?.paymentAttempts[1].midtransOrderId).toBe(secondAttemptId);
  });

  it('4. Expired token triggers automatic new attempt with fresh Midtrans order ID', async () => {
    const now = new Date();
    await simulateSnapEndpoint({ orderId: mockOrder.id }, now);

    // Simulate time forward 25 hours (session expired)
    const future = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const retryRes = await simulateSnapEndpoint({ orderId: mockOrder.id, forceNew: false }, future);

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.isReusedSession).toBe(false);
    expect(midtransApiCallSpy).toHaveBeenCalledTimes(2);
    expect(mockOrder.metadata?.paymentAttempts).toHaveLength(2);
  });

  it('5. End-to-End "Bayar Lagi" Flow: cancel Attempt #1 -> forceNew=true produces new token & midtransOrderId, isReusedSession=false', async () => {
    // Step 1: User clicks "Bayar" (Attempt #1)
    const attempt1Res = await simulateSnapEndpoint({ orderId: mockOrder.id });
    expect(attempt1Res.status).toBe(200);
    const attempt1Token = attempt1Res.body.token;
    const attempt1OrderId = attempt1Res.body.midtransOrderId;

    // Step 2: User selects QRIS, closes Snap, and clicks "Batalkan Pembayaran"
    // Mock cancellation of Attempt #1 in order metadata
    mockOrder.metadata = {
      ...mockOrder.metadata,
      midtransSession: {
        ...mockOrder.metadata?.midtransSession,
        status: 'cancelled',
      },
      paymentAttempts: [
        {
          ...mockOrder.metadata?.paymentAttempts[0],
          status: 'cancelled',
        },
      ],
    };

    // Step 3: User clicks "Bayar Lagi" (which calls createPaymentSession with forceNew: true)
    const attempt2Res = await simulateSnapEndpoint({ orderId: mockOrder.id, forceNew: true });
    expect(attempt2Res.status).toBe(200);

    const attempt2Token = attempt2Res.body.token;
    const attempt2OrderId = attempt2Res.body.midtransOrderId;

    // Concretely verify that Attempt #2 is genuinely distinct from Attempt #1
    expect(attempt2OrderId).not.toBe(attempt1OrderId);
    expect(attempt2Token).not.toBe(attempt1Token);
    expect(attempt2Res.body.isReusedSession).toBe(false);

    // Verify metadata reflects both attempts with attempt #2 active
    expect(mockOrder.metadata?.paymentAttempts).toHaveLength(2);
    expect(mockOrder.metadata?.paymentAttempts[0].status).toBe('cancelled');
    expect(mockOrder.metadata?.paymentAttempts[1].status).toBe('pending');
    expect(mockOrder.metadata?.midtransSession.midtransOrderId).toBe(attempt2OrderId);
    expect(mockOrder.metadata?.midtransSession.token).toBe(attempt2Token);
  });

  it('6. forceNew: true NEVER returns active midtransSession even if session is unexpired and pending', async () => {
    // Create attempt #1
    const firstRes = await simulateSnapEndpoint({ orderId: mockOrder.id });
    expect(firstRes.status).toBe(200);
    const firstToken = firstRes.body.token;

    // Active session is still pending and fresh. forceNew: true MUST bypass it completely.
    const secondRes = await simulateSnapEndpoint({ orderId: mockOrder.id, forceNew: true });
    expect(secondRes.status).toBe(200);
    expect(secondRes.body.isReusedSession).toBe(false);
    expect(secondRes.body.token).not.toBe(firstToken);
    expect(secondRes.body.midtransOrderId).not.toBe(firstRes.body.midtransOrderId);
  });
});

describe('Frontend paymentRepository Error Message Extraction', () => {
  it('extracts detailed error body from FunctionsHttpError context', async () => {
    const mockFunctionsHttpError = {
      message: 'Edge Function returned a non-2xx status code',
      context: {
        json: async () => ({
          error: 'Midtrans Snap API error: {"error_messages":["transaction_details.order_id sudah digunakan"]}',
        }),
      },
    };

    vi.spyOn(supabase.functions, 'invoke').mockResolvedValueOnce({
      data: null,
      error: mockFunctionsHttpError as any,
    });

    await expect(
      createPaymentSession('ord-123', 'test@example.com', { forceNew: false })
    ).rejects.toThrow('Midtrans Snap API error: {"error_messages":["transaction_details.order_id sudah digunakan"]}');
  });

  it('successfully passes forceNew flag and extracts midtransOrderId from response', async () => {
    const invokeSpy = vi.spyOn(supabase.functions, 'invoke').mockResolvedValueOnce({
      data: {
        token: 'snap-token-success',
        redirectUrl: 'https://midtrans.com/pay/xyz',
        expiresAt: '2026-09-07T12:00:00Z',
        midtransOrderId: 'WF-20260904-0001-attempt1',
      },
      error: null,
    });

    const result = await createPaymentSession('ord-123', 'test@example.com', { forceNew: true });

    expect(invokeSpy).toHaveBeenCalledWith('midtrans-snap', {
      body: {
        orderId: 'ord-123',
        customerEmail: 'test@example.com',
        forceNew: true,
      },
    });

    expect(result.token).toBe('snap-token-success');
    expect(result.midtransOrderId).toBe('WF-20260904-0001-attempt1');
  });
});

describe('Concurrency & Secret Boundary Verification', () => {
  it('handles concurrent forceNew requests without colliding midtrans_order_id', async () => {
    const baseOrderNumber = 'WF-20260904-CONCURRENT';
    
    // Simulate 5 simultaneous forceNew payment attempt creations
    const attemptIds = await Promise.all([
      Promise.resolve(generateMidtransOrderId(baseOrderNumber)),
      Promise.resolve(generateMidtransOrderId(baseOrderNumber)),
      Promise.resolve(generateMidtransOrderId(baseOrderNumber)),
      Promise.resolve(generateMidtransOrderId(baseOrderNumber)),
      Promise.resolve(generateMidtransOrderId(baseOrderNumber)),
    ]);

    const uniqueSet = new Set(attemptIds);
    expect(uniqueSet.size).toBe(5);
    for (const id of attemptIds) {
      expect(id.length).toBeLessThanOrEqual(50);
      expect(parseBaseOrderNumber(id)).toBe(baseOrderNumber);
    }
  });

  it('verifies secret boundary: client configuration never contains server secrets', async () => {
    const { getClientMidtransConfig } = await import('./midtransConfig');
    const clientConfig = getClientMidtransConfig();

    expect(clientConfig).toBeDefined();
    expect(clientConfig.clientKey).toBeDefined();
    expect((clientConfig as any).serverKey).toBeUndefined();
    expect((clientConfig as any).MIDTRANS_SERVER_KEY).toBeUndefined();
    expect((clientConfig as any).SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });
});
