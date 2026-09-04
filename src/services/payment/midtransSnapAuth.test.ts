import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Midtrans Snap Edge Function Authentication & Ownership Verification Tests
 *
 * Simulates the request processing pipeline of supabase/functions/midtrans-snap/index.ts:
 * 1. Bearer JWT extraction
 * 2. supabase.auth.getUser(jwt) token verification
 * 3. RLS-enforced order lookup & workspace ownership guard
 * 4. Status validation before Midtrans Snap API call
 */

interface MockUser {
  id: string;
  email: string;
}

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

// Logic mirror of midtrans-snap authentication and order authorization guard
async function simulateMidtransSnapRequest(
  req: {
    headers: Map<string, string>;
    body: { orderId?: string; customerEmail?: string; forceNew?: boolean };
  },
  deps: {
    getUserFn: (jwt: string) => Promise<any>;
    findOrderFn: (orderId: string, authHeader: string) => Promise<any>;
    createSnapSessionFn: (order: any, customerEmail: string) => Promise<any>;
  }
): Promise<{ status: number; body: Record<string, any> }> {
  // 1. Authenticate user via Supabase Auth header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return {
      status: 401,
      body: { error: 'Unauthorized: Missing Authorization header.' },
    };
  }

  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) {
    return {
      status: 401,
      body: { error: 'Unauthorized: Malformed Authorization header.' },
    };
  }

  const { data: { user }, error: userError } = await deps.getUserFn(jwt);
  if (userError || !user) {
    return {
      status: 401,
      body: { error: 'Unauthorized: Invalid token.' },
    };
  }

  const { orderId, customerEmail } = req.body;
  if (!orderId) {
    return {
      status: 400,
      body: { error: 'orderId is required.' },
    };
  }

  // 2. Order Lookup & Workspace Ownership (RLS context)
  const { data: order, error: orderError } = await deps.findOrderFn(orderId, authHeader);
  if (orderError || !order) {
    return {
      status: 404,
      body: { error: 'Order not found.' },
    };
  }

  if (order.status === 'paid') {
    return {
      status: 400,
      body: { error: 'Order is already paid.' },
    };
  }

  if (order.status !== 'pending') {
    return {
      status: 400,
      body: { error: `Cannot pay order with status ${order.status}.` },
    };
  }

  // 3. Create Snap Session
  const emailToUse = customerEmail || user.email || 'customer@wedflow.id';
  const snapResult = await deps.createSnapSessionFn(order, emailToUse);

  return {
    status: 200,
    body: {
      provider: 'midtrans',
      token: snapResult.token,
      redirectUrl: snapResult.redirectUrl,
      isReusedSession: false,
    },
  };
}

describe('midtrans-snap Authentication & Ownership Flow', () => {
  const mockValidUser: MockUser = {
    id: 'user-authenticated-123',
    email: 'couple@wedflow.id',
  };

  const mockPendingOrder: MockOrder = {
    id: 'ord-uuid-100',
    order_number: 'WF-20260904-001',
    workspace_id: 'ws-couple-123',
    status: 'pending',
    amount: 199000,
    currency: 'IDR',
    product_type: 'wedding_pass',
    product_name: 'Wedding Pass',
  };

  let getUserMock: any;
  let findOrderMock: any;
  let createSnapMock: any;

  beforeEach(() => {
    getUserMock = vi.fn().mockImplementation(async (jwt: string) => {
      if (jwt === 'valid-es256-jwt-token') {
        return { data: { user: mockValidUser }, error: null };
      }
      return { data: { user: null }, error: new Error('Invalid JWT signature') };
    });

    findOrderMock = vi.fn().mockImplementation(async (orderId: string, authHeader: string) => {
      // Simulates PostgREST RLS: user can only see their own workspace order
      if (orderId === 'ord-uuid-100' && authHeader.includes('valid-es256-jwt-token')) {
        return { data: mockPendingOrder, error: null };
      }
      return { data: null, error: null };
    });

    createSnapMock = vi.fn().mockResolvedValue({
      token: 'snap-token-xyz',
      redirectUrl: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-xyz',
    });
  });

  it('a. valid authenticated JWT successfully authenticates and generates Snap session', async () => {
    const headers = new Map<string, string>();
    headers.set('Authorization', 'Bearer valid-es256-jwt-token');

    const response = await simulateMidtransSnapRequest(
      {
        headers,
        body: { orderId: 'ord-uuid-100' },
      },
      {
        getUserFn: getUserMock,
        findOrderFn: findOrderMock,
        createSnapSessionFn: createSnapMock,
      }
    );

    expect(getUserMock).toHaveBeenCalledWith('valid-es256-jwt-token');
    expect(response.status).toBe(200);
    expect(response.body.token).toBe('snap-token-xyz');
    expect(response.body.provider).toBe('midtrans');
  });

  it('b. missing Authorization header returns HTTP 401 Unauthorized', async () => {
    const headers = new Map<string, string>(); // No Authorization header

    const response = await simulateMidtransSnapRequest(
      {
        headers,
        body: { orderId: 'ord-uuid-100' },
      },
      {
        getUserFn: getUserMock,
        findOrderFn: findOrderMock,
        createSnapSessionFn: createSnapMock,
      }
    );

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized: Missing Authorization header.');
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it('c. malformed Bearer header returns HTTP 401 Unauthorized', async () => {
    const headers = new Map<string, string>();
    headers.set('Authorization', 'Bearer    '); // Empty/whitespace token

    const response = await simulateMidtransSnapRequest(
      {
        headers,
        body: { orderId: 'ord-uuid-100' },
      },
      {
        getUserFn: getUserMock,
        findOrderFn: findOrderMock,
        createSnapSessionFn: createSnapMock,
      }
    );

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized: Malformed Authorization header.');
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it('d. invalid or expired JWT returns HTTP 401 Unauthorized', async () => {
    const headers = new Map<string, string>();
    headers.set('Authorization', 'Bearer expired-or-tampered-token');

    const response = await simulateMidtransSnapRequest(
      {
        headers,
        body: { orderId: 'ord-uuid-100' },
      },
      {
        getUserFn: getUserMock,
        findOrderFn: findOrderMock,
        createSnapSessionFn: createSnapMock,
      }
    );

    expect(getUserMock).toHaveBeenCalledWith('expired-or-tampered-token');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized: Invalid token.');
    expect(findOrderMock).not.toHaveBeenCalled();
  });

  describe('e. Authenticated user reaching workspace/order ownership validation', () => {
    it('returns HTTP 404 if order does not belong to the authenticated user workspace (RLS rejection)', async () => {
      const headers = new Map<string, string>();
      headers.set('Authorization', 'Bearer valid-es256-jwt-token');

      const response = await simulateMidtransSnapRequest(
        {
          headers,
          body: { orderId: 'ord-foreign-workspace-order' },
        },
        {
          getUserFn: getUserMock,
          findOrderFn: findOrderMock,
          createSnapSessionFn: createSnapMock,
        }
      );

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Order not found.');
      expect(createSnapMock).not.toHaveBeenCalled();
    });

    it('returns HTTP 400 if order is already paid', async () => {
      const headers = new Map<string, string>();
      headers.set('Authorization', 'Bearer valid-es256-jwt-token');

      const paidOrder: MockOrder = {
        ...mockPendingOrder,
        status: 'paid',
      };

      const customFindOrder = vi.fn().mockResolvedValue({ data: paidOrder, error: null });

      const response = await simulateMidtransSnapRequest(
        {
          headers,
          body: { orderId: 'ord-uuid-100' },
        },
        {
          getUserFn: getUserMock,
          findOrderFn: customFindOrder,
          createSnapSessionFn: createSnapMock,
        }
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Order is already paid.');
      expect(createSnapMock).not.toHaveBeenCalled();
    });

    it('returns HTTP 400 if order status is non-pending (e.g. cancelled)', async () => {
      const headers = new Map<string, string>();
      headers.set('Authorization', 'Bearer valid-es256-jwt-token');

      const cancelledOrder: MockOrder = {
        ...mockPendingOrder,
        status: 'cancelled',
      };

      const customFindOrder = vi.fn().mockResolvedValue({ data: cancelledOrder, error: null });

      const response = await simulateMidtransSnapRequest(
        {
          headers,
          body: { orderId: 'ord-uuid-100' },
        },
        {
          getUserFn: getUserMock,
          findOrderFn: customFindOrder,
          createSnapSessionFn: createSnapMock,
        }
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot pay order with status cancelled.');
      expect(createSnapMock).not.toHaveBeenCalled();
    });
  });
});
