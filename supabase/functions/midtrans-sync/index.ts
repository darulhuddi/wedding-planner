/**
 * Supabase Edge Function: midtrans-sync
 *
 * Actively queries Midtrans Status API to synchronize transaction status.
 * Used when customer returns to frontend before webhook delivery.
 * Endpoint: POST /functions/v1/midtrans-sync
 *
 * Guaranteed invariants:
 * - Uses the exact same authoritative completion path: `complete_paid_order()`
 * - Never mutates entitlements or history sequentially
 * - Gross amount is strictly validated against orders table
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders, MIDTRANS_ENDPOINTS } from '../_shared/midtrans.ts';

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
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!serverKey || !supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Server environment not properly configured.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { orderNumber?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { orderNumber } = body;
  if (!orderNumber) {
    return new Response(JSON.stringify({ error: 'orderNumber is required.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // 1. Lookup order in database
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', String(orderNumber).trim())
    .maybeSingle();

  if (orderError || !order) {
    return new Response(
      JSON.stringify({ error: `Order with order_number ${orderNumber} not found.` }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 2. If order is already paid, return status
  if (order.status === 'paid') {
    return new Response(
      JSON.stringify({
        status: 'paid',
        isPaid: true,
        order,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 3. Query Midtrans Status API
  const apiBase = isProduction ? MIDTRANS_ENDPOINTS.production.api : MIDTRANS_ENDPOINTS.sandbox.api;
  const statusUrl = `${apiBase}/${encodeURIComponent(order.order_number)}/status`;
  const authHeader = `Basic ${btoa(`${serverKey}:`)}`;

  const midtransRes = await fetch(statusUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': authHeader,
    },
  });

  if (!midtransRes.ok) {
    const errorText = await midtransRes.text().catch(() => '');
    console.warn(`[Midtrans Sync] Notice querying status (${midtransRes.status}):`, errorText);
    return new Response(
      JSON.stringify({
        status: order.status,
        isPaid: false,
        message: `Status could not be queried from Midtrans (${midtransRes.status}).`,
        order,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const statusData = await midtransRes.json();
  const txStatus = String(statusData.transaction_status || '').toLowerCase();
  const frStatus = String(statusData.fraud_status || '').toLowerCase();

  const isSuccess =
    txStatus === 'settlement' ||
    (txStatus === 'capture' && frStatus === 'accept');

  // 4. If transaction is settled/accepted, invoke authoritative complete_paid_order RPC
  if (isSuccess) {
    const midtransGross = Math.round(parseFloat(String(statusData.gross_amount || '0')));
    const orderGross = Math.round(Number(order.amount));

    if (midtransGross !== orderGross) {
      console.error(
        `[Midtrans Sync] Amount Mismatch: order requires ${orderGross}, Midtrans reported ${midtransGross}`
      );
      return new Response(
        JSON.stringify({
          error: `Amount mismatch between order (${orderGross}) and provider (${midtransGross}).`,
        }),
        {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const paymentMetadata = {
      provider: 'midtrans',
      transactionId: statusData.transaction_id,
      paymentType: statusData.payment_type,
      transactionStatus: txStatus,
      fraudStatus: frStatus || null,
      statusCode: statusData.status_code,
      grossAmount: midtransGross,
      currency: order.currency,
      settlementTime: statusData.settlement_time || statusData.transaction_time || null,
      syncSource: 'active_status_sync',
    };

    const { data: rpcResult, error: rpcError } = await supabase.rpc('complete_paid_order', {
      p_order_id: order.id,
      p_amount: order.amount,
      p_currency: order.currency,
      p_payment_method: statusData.payment_type || 'midtrans',
      p_provider: 'midtrans',
      p_provider_reference: statusData.transaction_id || `midtrans-${order.order_number}`,
      p_payment_metadata: paymentMetadata,
    });

    if (rpcError) {
      console.error('[Midtrans Sync] Error running complete_paid_order:', rpcError);
      return new Response(
        JSON.stringify({ error: `Failed to complete order in database: ${rpcError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        status: 'paid',
        isPaid: true,
        order: rpcResult,
        statusData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 5. Handle Refund / Chargeback
  const isRefundOrChargeback = txStatus === 'refund' || txStatus === 'chargeback';
  if (isRefundOrChargeback) {
    const refundMetadata = {
      provider: 'midtrans',
      transactionId: statusData.transaction_id,
      paymentType: statusData.payment_type,
      transactionStatus: txStatus,
      statusCode: statusData.status_code,
      grossAmount: Math.round(parseFloat(String(statusData.gross_amount || '0'))),
      currency: order.currency,
      refundTime: statusData.refund_time || statusData.transaction_time || null,
      syncSource: 'active_status_sync',
    };

    const { data: rpcResult, error: rpcError } = await supabase.rpc('process_refunded_order', {
      p_order_id: order.id,
      p_provider: 'midtrans',
      p_provider_reference: statusData.transaction_id || `midtrans-${order.order_number}`,
      p_reason: `Midtrans payment ${txStatus}`,
      p_refund_metadata: refundMetadata,
    });

    if (rpcError) {
      console.error('[Midtrans Sync] Error running process_refunded_order:', rpcError);
    }

    return new Response(
      JSON.stringify({
        status: 'cancelled',
        isPaid: false,
        isRefunded: true,
        order: rpcResult || order,
        statusData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // 6. Return non-paid status
  return new Response(
    JSON.stringify({
      status: order.status,
      isPaid: false,
      providerStatus: txStatus,
      fraudStatus: frStatus || null,
      order,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
