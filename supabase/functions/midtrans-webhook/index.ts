/**
 * Supabase Edge Function: midtrans-webhook
 *
 * Webhook endpoint to receive and process Midtrans payment notifications.
 * Endpoint: POST /functions/v1/midtrans-webhook
 *
 * Workflow:
 * 1. Rate limiting / flood protection
 * 2. Parse payload & verify required fields
 * 3. Verify SHA-512 signature using MIDTRANS_SERVER_KEY
 * 4. Find WedFlow Order by order_number
 * 5. Validate gross_amount and currency against orders table
 * 6. Evaluate transaction_status and fraud_status
 * 7. Call PostgreSQL atomic stored procedure `complete_paid_order()`
 * 8. Return HTTP 200 only for validly processed / acknowledged notifications
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import {
  corsHeaders,
  verifySignature,
  checkRateLimit,
  parseBaseOrderNumber,
} from '../_shared/midtrans.ts';

serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 2. Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Only POST is accepted.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 3. Rate limiting defense
  const clientIp = req.headers.get('x-forwarded-for') || 'default-ip';
  if (!checkRateLimit(clientIp, 120, 60000)) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 4. Server Key & Supabase Configuration
  const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!serverKey) {
    console.error('[Midtrans Webhook] Error: MIDTRANS_SERVER_KEY secret is not configured.');
    return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Midtrans Webhook] Error: Supabase service role credentials not configured.');
    return new Response(JSON.stringify({ error: 'Database service configuration error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 5. Parse JSON notification body
  let payload: Record<string, any>;
  try {
    payload = await req.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Malformed JSON payload.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const {
    order_id,
    status_code,
    gross_amount,
    signature_key,
    transaction_status,
    fraud_status,
    transaction_id,
    payment_type,
    currency,
  } = payload;

  if (!order_id || !status_code || gross_amount === undefined || !signature_key || !transaction_status) {
    return new Response(
      JSON.stringify({ error: 'Missing required Midtrans notification fields.' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 6. Verify SHA-512 Signature Key
  const isValidSignature = await verifySignature(
    {
      order_id,
      status_code,
      gross_amount,
      signature_key,
    },
    serverKey
  );

  if (!isValidSignature) {
    console.warn('[Midtrans Webhook] Security Alert: Invalid signature received for order', order_id);
    return new Response(JSON.stringify({ error: 'Invalid signature key.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 7. Initialize Supabase Admin Client (Service Role for atomic RPC)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // 8. Find Order by order_number or Midtrans attempt identifier
  const rawOrderId = String(order_id).trim();
  let order: any = null;

  // Attempt A: Direct match by order_number (legacy single-attempt transactions or exact match)
  const { data: directOrder, error: directError } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', rawOrderId)
    .maybeSingle();

  if (directError) {
    console.error('[Midtrans Webhook] Database lookup error (direct):', directError);
  }
  order = directOrder;

  // Attempt B: If not found directly, look up by metadata.midtransSession.midtransOrderId
  if (!order) {
    const { data: sessionOrder, error: sessionError } = await supabase
      .from('orders')
      .select('*')
      .filter('metadata->midtransSession->>midtransOrderId', 'eq', rawOrderId)
      .maybeSingle();

    if (sessionError) {
      console.warn('[Midtrans Webhook] Metadata session lookup notice:', sessionError);
    }
    order = sessionOrder;
  }

  // Attempt C: If not found, extract base order number and look up
  if (!order) {
    const baseOrderNumber = parseBaseOrderNumber(rawOrderId);
    if (baseOrderNumber && baseOrderNumber !== rawOrderId) {
      const { data: baseOrder, error: baseError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', baseOrderNumber)
        .maybeSingle();

      if (baseError) {
        console.warn('[Midtrans Webhook] Base order number lookup notice:', baseError);
      }
      order = baseOrder;
    }
  }

  if (!order) {
    console.warn('[Midtrans Webhook] Order not found for Midtrans order_id:', rawOrderId);
    return new Response(
      JSON.stringify({ error: `Order with order identifier ${rawOrderId} not found.` }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 9. Validate Amount Integrity (Integer nominal comparison)
  const webhookAmount = Math.round(parseFloat(String(gross_amount)));
  const orderAmount = Math.round(Number(order.amount));

  if (webhookAmount !== orderAmount) {
    console.error(
      `[Midtrans Webhook] Amount Mismatch Alert: order ${order_id} requires Rp${orderAmount}, but webhook reported Rp${webhookAmount}`
    );
    return new Response(
      JSON.stringify({
        error: `Amount mismatch: expected ${orderAmount}, received ${webhookAmount}.`,
      }),
      {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 10. Validate Currency
  if (currency && String(currency).toUpperCase() !== String(order.currency).toUpperCase()) {
    console.error(
      `[Midtrans Webhook] Currency Mismatch Alert: order ${order_id} is ${order.currency}, received ${currency}`
    );
    return new Response(
      JSON.stringify({
        error: `Currency mismatch: expected ${order.currency}, received ${currency}.`,
      }),
      {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 11. Evaluate Transaction Status & Fraud Status
  const txStatus = String(transaction_status).toLowerCase();
  const frStatus = String(fraud_status || '').toLowerCase();

  const isSuccess =
    txStatus === 'settlement' ||
    (txStatus === 'capture' && frStatus === 'accept');

  const isChallenge = txStatus === 'capture' && frStatus === 'challenge';

  // 12. Handle Payment Success -> Atomic PostgreSQL complete_paid_order
  if (isSuccess) {
    const paymentMetadata = {
      provider: 'midtrans',
      midtransOrderId: rawOrderId,
      transactionId: transaction_id,
      paymentType: payment_type,
      transactionStatus: txStatus,
      fraudStatus: frStatus || null,
      statusCode: status_code,
      grossAmount: webhookAmount,
      currency: order.currency,
      signatureKey: signature_key,
      settlementTime: payload.settlement_time || payload.transaction_time || null,
      bank: payload.bank || null,
      vaNumbers: payload.va_numbers || null,
      billerCode: payload.biller_code || null,
      billKey: payload.bill_key || null,
    };

    const { data: rpcResult, error: rpcError } = await supabase.rpc('complete_paid_order', {
      p_order_id: order.id,
      p_amount: order.amount,
      p_currency: order.currency,
      p_payment_method: payment_type || 'midtrans',
      p_provider: 'midtrans',
      p_provider_reference: transaction_id || `midtrans-${order.order_number}`,
      p_payment_metadata: paymentMetadata,
    });

    if (rpcError) {
      console.error('[Midtrans Webhook] Failed to execute complete_paid_order RPC:', rpcError);
      return new Response(
        JSON.stringify({
          error: `Failed to complete paid order in database: ${rpcError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment notification processed successfully.',
        isIdempotentReplay: rpcResult?.is_idempotent_replay || false,
        orderNumber: order.order_number,
        transactionId: transaction_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 13. Handle Full Refund or Chargeback (Revoke entitlement atomically)
  const isFullRefundOrChargeback = txStatus === 'refund' || txStatus === 'chargeback';
  if (isFullRefundOrChargeback) {
    console.warn(`[Midtrans Webhook] Refund/Chargeback received (${txStatus}) for order ${order_id}. Revoking access.`);
    const refundMetadata = {
      provider: 'midtrans',
      transactionId: transaction_id,
      paymentType: payment_type,
      transactionStatus: txStatus,
      statusCode: status_code,
      grossAmount: webhookAmount,
      currency: order.currency,
      signatureKey: signature_key,
      refundTime: payload.refund_time || payload.transaction_time || new Date().toISOString(),
      rawPayload: payload,
    };

    const { data: rpcResult, error: rpcError } = await supabase.rpc('process_refunded_order', {
      p_order_id: order.id,
      p_provider: 'midtrans',
      p_provider_reference: transaction_id || `midtrans-${order.order_number}`,
      p_reason: `Midtrans payment ${txStatus}`,
      p_refund_metadata: refundMetadata,
    });

    if (rpcError) {
      console.error('[Midtrans Webhook] Failed to execute process_refunded_order RPC:', rpcError);
      return new Response(
        JSON.stringify({
          error: `Failed to process refund in database: ${rpcError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Refund notification processed and access revoked.',
        isIdempotentReplay: rpcResult?.is_idempotent_replay || false,
        orderNumber: order.order_number,
        transactionId: transaction_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 14. Handle Partial Refund (Audit only, non-destructive, requires manual review)
  if (txStatus === 'partial_refund') {
    console.warn(`[Midtrans Webhook] Partial refund received for order ${order_id}. Recording notice without automatic revocation.`);
    const updatedMetadata = {
      ...(order.metadata || {}),
      partialRefundNotice: {
        receivedAt: new Date().toISOString(),
        transactionId: transaction_id,
        grossAmount: webhookAmount,
        currency: order.currency,
        status: 'manual_review_required',
      },
    };

    await supabase
      .from('orders')
      .update({ metadata: updatedMetadata, updated_at: new Date().toISOString() })
      .eq('id', order.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Partial refund recorded for manual review. Access left intact.',
        orderNumber: order.order_number,
        transactionId: transaction_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 15. Handle Fraud Challenge (Do NOT grant entitlement)
  if (isChallenge) {
    console.warn(`[Midtrans Webhook] Transaction flagged for fraud challenge: ${order_id}`);
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transaction flagged for fraud challenge. Entitlement held.',
        orderNumber: order.order_number,
        transactionId: transaction_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 16. Handle Non-Success States (pending, deny, cancel, expire, failure)
  if (order.status === 'paid') {
    console.info(`[Midtrans Webhook] Monotonic Guard: Order ${order.order_number} is already paid. Ignoring non-success status (${txStatus}) from attempt ${order_id}.`);
    return new Response(
      JSON.stringify({
        success: true,
        message: `Order is already paid. Non-success notification (${txStatus}) from older attempt ignored.`,
        orderNumber: order.order_number,
        transactionId: transaction_id,
        isIdempotentReplay: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  console.info(`[Midtrans Webhook] Received non-success status (${txStatus}) for order ${order_id}`);
  return new Response(
    JSON.stringify({
      success: true,
      message: `Transaction state acknowledged (${txStatus}). No access granted.`,
      orderNumber: order.order_number,
      transactionId: transaction_id,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
