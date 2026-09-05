/**
 * Supabase Edge Function: midtrans-snap
 *
 * Creates or retrieves an active Midtrans Snap transaction token for a pending order.
 * Endpoint: POST /functions/v1/midtrans-snap
 *
 * Workflow:
 * 1. Authenticate user JWT from Authorization header via supabase.auth.getUser(jwt)
 * 2. Lookup order & verify workspace ownership (RLS-enforced via user client)
 * 3. Enforce order is strictly in 'pending' status
 * 4. Check for unexpired existing Snap session for pending order reuse
 * 5. If expired or missing, create transaction via Midtrans Snap API with server key
 * 6. Store unexpired session metadata in orders.metadata
 * 7. Return { token, redirectUrl, expiresAt } to caller
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import {
  corsHeaders,
  MIDTRANS_ENDPOINTS,
  getWedFlowWebhookUrl,
  generateMidtransOrderId,
} from '../_shared/midtrans.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY');
  const isProduction = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true';
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey;

  if (!serverKey || !supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Server environment not properly configured.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 1. Authenticate user via Supabase Auth header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Malformed Authorization header.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // User client: preserves caller's Authorization context for RLS-enforced queries
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  // Explicitly verify caller's JWT with Supabase Auth (supports ES256 & asymmetric signing)
  const { data: { user }, error: userError } = await userClient.auth.getUser(jwt);
  if (userError || !user) {
    console.error('[Midtrans Snap] Auth error verifying user token:', userError?.message);
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Admin client: used for updating session metadata without RLS friction after ownership check
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // 2. Parse request payload
  let body: { orderId?: string; customerEmail?: string; forceNew?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { orderId, customerEmail, forceNew } = body;
  if (!orderId) {
    return new Response(JSON.stringify({ error: 'orderId is required.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 3. Find Order & Validate Ownership (Enforced by PostgREST RLS using user's Authorization context)
  const { data: order, error: orderError } = await userClient
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return new Response(JSON.stringify({ error: 'Order not found.' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (order.status === 'paid') {
    return new Response(JSON.stringify({ error: 'Order is already paid.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (order.status !== 'pending') {
    return new Response(JSON.stringify({ error: `Cannot pay order with status ${order.status}.` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 4. Pending Session Reuse: check if an unexpired valid Snap token already exists
  const now = new Date();
  const existingSession = order.metadata?.midtransSession;

  console.log('[MIDTRANS_SNAP_REQUEST]', {
    orderId,
    forceNew: !!forceNew,
    activeMidtransOrderId: existingSession?.midtransOrderId,
    activeToken: existingSession?.token,
  });

  // Determine if session is explicitly active (pending and not cancelled/expired/superseded)
  const isSessionPending = !existingSession?.status || existingSession.status === 'pending';

  if (
    !forceNew &&
    isSessionPending &&
    existingSession &&
    existingSession.token &&
    existingSession.expiresAt &&
    existingSession.grossAmount === Math.round(Number(order.amount))
  ) {
    const expiresAtMs = new Date(existingSession.expiresAt).getTime();
    if (expiresAtMs - now.getTime() > 2 * 60 * 1000) {
      console.log('[MIDTRANS_SNAP_RESPONSE]', {
        midtransOrderId: existingSession.midtransOrderId || order.order_number,
        token: existingSession.token,
        isReusedSession: true,
      });

      return new Response(
        JSON.stringify({
          provider: 'midtrans',
          token: existingSession.token,
          redirectUrl: existingSession.redirectUrl,
          expiresAt: existingSession.expiresAt,
          midtransOrderId: existingSession.midtransOrderId || order.order_number,
          isReusedSession: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // 5. Generate Unique Midtrans Order ID for this new payment attempt
  // Separates internal WedSiap order_id from Midtrans transaction/attempt ID
  const midtransOrderId = generateMidtransOrderId(order.order_number);
  const grossAmount = Math.round(Number(order.amount));
  const snapUrl = isProduction ? MIDTRANS_ENDPOINTS.production.snap : MIDTRANS_ENDPOINTS.sandbox.snap;
  const snapAuth = `Basic ${btoa(`${serverKey}:`)}`;
  const expiryMinutes = 1440; // 24 hours
  const expiryDate = new Date(now.getTime() + expiryMinutes * 60 * 1000);

  const emailToUse = (customerEmail || user.email || 'customer@wedflow.id').trim();

  const snapPayload = {
    transaction_details: {
      order_id: midtransOrderId,
      gross_amount: grossAmount,
    },
    item_details: [
      {
        id: order.product_type || 'wedding_pass',
        price: grossAmount,
        quantity: 1,
        name: order.product_name || 'Wedding Pass',
      },
    ],
    customer_details: {
      email: emailToUse,
    },
    expiry: {
      unit: 'minute',
      duration: expiryMinutes,
    },
  };

  const midtransRes = await fetch(snapUrl, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': snapAuth,
      'X-Override-Notification': getWedFlowWebhookUrl(supabaseUrl),
    },
    body: JSON.stringify(snapPayload),
  });

  if (!midtransRes.ok) {
    const errorText = await midtransRes.text().catch(() => '');
    console.error(`[Midtrans Snap] Error from Midtrans API (${midtransRes.status}) for order ${order.order_number}:`, errorText);
    return new Response(
      JSON.stringify({ error: `Midtrans Snap API error: ${errorText}` }),
      {
        status: midtransRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const snapData = await midtransRes.json();
  if (!snapData.token || !snapData.redirect_url) {
    return new Response(
      JSON.stringify({ error: 'Invalid response from Midtrans Snap API: missing token or redirect_url.' }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 6. Atomically persist session token & payment attempt log to prevent concurrent lost updates
  const sessionData = {
    token: snapData.token,
    redirectUrl: snapData.redirect_url,
    midtransOrderId,
    createdAt: now.toISOString(),
    expiresAt: expiryDate.toISOString(),
    grossAmount,
    status: 'pending',
    provider: 'midtrans',
  };

  const attemptData = {
    midtransOrderId,
    token: snapData.token,
    createdAt: now.toISOString(),
    expiresAt: expiryDate.toISOString(),
    grossAmount,
    status: 'pending',
  };

  // Primary path: Atomic stored procedure with SELECT ... FOR UPDATE row-locking
  const { error: rpcError } = await adminClient.rpc('record_payment_attempt', {
    p_order_id: order.id,
    p_session: sessionData,
    p_attempt: attemptData,
  });

  if (rpcError) {
    console.warn('[Midtrans Snap] Notice running record_payment_attempt RPC, falling back to direct update:', rpcError.message);
    // Fallback path
    const existingAttempts = Array.isArray(order.metadata?.paymentAttempts)
      ? order.metadata.paymentAttempts.slice(-9)
      : [];

    const updatedMetadata = {
      ...(order.metadata || {}),
      midtransSession: sessionData,
      paymentAttempts: [...existingAttempts, attemptData],
    };

    await adminClient
      .from('orders')
      .update({ metadata: updatedMetadata, updated_at: now.toISOString() })
      .eq('id', order.id);
  }

  console.log('[MIDTRANS_SNAP_NEW_ATTEMPT]', {
    midtransOrderId,
    token: snapData.token,
  });

  console.log('[MIDTRANS_SNAP_RESPONSE]', {
    midtransOrderId,
    token: snapData.token,
    isReusedSession: false,
  });

  return new Response(
    JSON.stringify({
      provider: 'midtrans',
      token: snapData.token,
      redirectUrl: snapData.redirect_url,
      expiresAt: expiryDate.toISOString(),
      midtransOrderId,
      isReusedSession: false,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
