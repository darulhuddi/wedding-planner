/**
 * WedFlow Admin & Checkout — Payment Repository
 *
 * Provides a clean interface for application features to interact
 * with payment gateway operations (Snap sessions, status sync, webhooks)
 * following WedFlow's architectural pattern:
 * UI -> Application Logic -> Repository -> Supabase Adapter / Edge Function -> Supabase
 */

import { supabase } from '../lib/supabaseClient';
import { AdminOrderSummary, ProductType, AdminAccessConfig } from '../types/admin';
import {
  CreateTransactionResult,
} from '../services/payment/paymentProviderInterface';
import {
  NormalizedPaymentResult,
} from '../services/payment/midtransTypes';
import { fetchAccessConfig, createOrderInDb } from './supabaseAdminAdapter';

/**
 * Retrieves the current commercial access pricing configuration for display UX.
 */
export async function fetchCommercialPricing(): Promise<AdminAccessConfig> {
  return await fetchAccessConfig();
}

/**
 * Retrieves a valid existing pending order for the workspace, or creates a new one.
 * Lifecycle Guarantees:
 * - Case A: No pending order exists -> creates new pending order with current authoritative price.
 * - Case B: Pending order exists with SAME price -> reuses the existing pending order.
 * - Case C: Pending order exists with DIFFERENT price -> does NOT reuse old order, does NOT modify old order amount,
 *           marks old pending order as 'expired' (superseded), and creates a new pending order with current authoritative price.
 * - Invariant: At most one payable active pending Wedding Pass order per workspace.
 */
export async function getOrCreatePendingOrder(
  workspaceId: string,
  productType: ProductType = 'wedding_pass'
): Promise<AdminOrderSummary> {
  // 1. Fetch current authoritative commercial pricing
  const config = await fetchCommercialPricing();
  const authoritativePrice = config.price;

  try {
    // 2. Query for an existing pending order for this workspace and product
    const { data: existingOrder, error } = await supabase
      .from('orders')
      .select('id, order_number, workspace_id, product_type, product_name, amount, currency, status, created_at, updated_at, paid_at, metadata')
      .eq('workspace_id', workspaceId)
      .eq('product_type', productType)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && existingOrder) {
      const existingAmount = Math.round(Number(existingOrder.amount));

      // Case B: Existing pending order matches current authoritative price -> REUSE
      if (existingAmount === Math.round(Number(authoritativePrice))) {
        return {
          id: existingOrder.id,
          orderNumber: existingOrder.order_number,
          workspaceId: existingOrder.workspace_id,
          coupleName: 'Pasangan',
          productType: existingOrder.product_type,
          productName: existingOrder.product_name,
          amount: existingAmount,
          currency: existingOrder.currency,
          status: existingOrder.status,
          createdAt: existingOrder.created_at,
          updatedAt: existingOrder.updated_at,
          paidAt: existingOrder.paid_at,
          metadata: existingOrder.metadata || {},
        };
      }

      // Case C: Existing pending order has DIFFERENT price -> SUPERSEDE (mark as expired, amount remains immutable)
      console.log(`[PaymentRepository] Pending order ${existingOrder.order_number} price mismatch (existing: ${existingAmount}, authoritative: ${authoritativePrice}). Superseding old order.`);
      try {
        await supabase
          .from('orders')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString(),
            metadata: {
              ...(existingOrder.metadata || {}),
              expired_reason: 'superseded_by_price_change',
              superseded_at: new Date().toISOString(),
              superseded_by_price: authoritativePrice,
            },
          })
          .eq('id', existingOrder.id);
      } catch (updateErr) {
        console.warn('[PaymentRepository] Warning marking stale pending order as expired:', updateErr);
      }
    }
  } catch (err) {
    console.warn('[PaymentRepository] Warning querying pending order:', err);
  }

  // 3. Create new order authoritatively (Case A or after Case C)
  return await createOrderInDb(workspaceId, { productType });
}

/**
 * Creates or retrieves an active Snap payment session for an order via the Edge Function.
 */
export async function createPaymentSession(
  orderId: string,
  customerEmail?: string,
  options?: { forceNew?: boolean }
): Promise<CreateTransactionResult> {
  try {
    const { data, error } = await supabase.functions.invoke('midtrans-snap', {
      body: {
        orderId,
        customerEmail,
        forceNew: options?.forceNew ?? false,
      },
    });

    if (error) {
      let detailedMessage = error.message;
      try {
        if (error.context && typeof error.context.json === 'function') {
          const errorBody = await error.context.json();
          if (errorBody && errorBody.error) {
            detailedMessage = errorBody.error;
          }
        }
      } catch {
        // Fallback to error.message if context parsing fails
      }
      throw new Error(detailedMessage || 'Gagal membuat sesi pembayaran Midtrans.');
    }

    if (!data || !data.token) {
      throw new Error('Respon sesi pembayaran tidak valid dari server.');
    }

    return {
      provider: 'midtrans',
      token: data.token,
      redirectUrl: data.redirectUrl || data.redirect_url,
      expiresAt: data.expiresAt || data.expires_at,
      midtransOrderId: data.midtransOrderId || data.midtrans_order_id,
      rawResponse: data,
    };
  } catch (err: any) {
    console.error('[PaymentRepository] Error creating payment session:', err);
    throw err;
  }
}

/**
 * Actively synchronizes an order's payment status via the Edge Function.
 */
export async function syncOrderPaymentStatus(
  orderNumber: string
): Promise<{ order: AdminOrderSummary; normalized?: NormalizedPaymentResult; isPaid?: boolean; status?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('midtrans-sync', {
      body: { orderNumber },
    });

    if (error) {
      throw new Error(error.message || 'Gagal sinkronisasi status pembayaran.');
    }

    return data;
  } catch (err: any) {
    console.error('[PaymentRepository] Error syncing payment status:', err);
    throw err;
  }
}

/**
 * Verifies that the order belongs to the specified active workspace,
 * and actively synchronizes its authoritative payment status.
 */
export async function verifyAndSyncOrderPayment(
  orderNumber: string,
  workspaceId: string
): Promise<{ order: AdminOrderSummary; isPaid?: boolean; status?: string }> {
  const cleanOrderNumber = String(orderNumber || '').trim();
  if (!cleanOrderNumber) {
    throw new Error('Nomor pesanan tidak valid.');
  }

  // 1. Verify workspace ownership from database
  const { data: orderData, error: lookupError } = await supabase
    .from('orders')
    .select('id, order_number, workspace_id, status, amount, currency, product_type, product_name, created_at, updated_at, paid_at, metadata')
    .eq('order_number', cleanOrderNumber)
    .maybeSingle();

  if (lookupError || !orderData) {
    throw new Error(`Pesanan dengan nomor ${cleanOrderNumber} tidak ditemukan.`);
  }

  if (orderData.workspace_id !== workspaceId) {
    throw new Error('Akses ditolak: Pesanan tidak terdaftar pada workspace pernikahan Anda.');
  }

  // 2. Query synchronization from backend
  const syncResult = await syncOrderPaymentStatus(cleanOrderNumber);

  const syncOrder = syncResult.order as any;
  const finalOrder: AdminOrderSummary = syncOrder
    ? {
        id: syncOrder.id,
        orderNumber: syncOrder.order_number || syncOrder.orderNumber,
        workspaceId: syncOrder.workspace_id || syncOrder.workspaceId,
        coupleName: syncOrder.coupleName || 'Pasangan',
        productType: syncOrder.product_type || syncOrder.productType || 'wedding_pass',
        productName: syncOrder.product_name || syncOrder.productName || 'Wedding Pass',
        amount: Number(syncOrder.amount),
        currency: syncOrder.currency || 'IDR',
        status: syncOrder.status,
        createdAt: syncOrder.created_at || syncOrder.createdAt,
        updatedAt: syncOrder.updated_at || syncOrder.updatedAt,
        paidAt: syncOrder.paid_at || syncOrder.paidAt,
        metadata: syncOrder.metadata || {},
      }
    : {
        id: orderData.id,
        orderNumber: orderData.order_number,
        workspaceId: orderData.workspace_id,
        coupleName: 'Pasangan',
        productType: orderData.product_type,
        productName: orderData.product_name,
        amount: Number(orderData.amount),
        currency: orderData.currency,
        status: orderData.status,
        createdAt: orderData.created_at,
        updatedAt: orderData.updated_at,
        paidAt: orderData.paid_at,
        metadata: orderData.metadata || {},
      };

  const isPaid = syncResult.isPaid ?? (finalOrder.status === 'paid');

  return {
    order: finalOrder,
    isPaid,
    status: finalOrder.status,
  };
}

/**
 * Cancels a specific Midtrans payment attempt atomically via PostgreSQL RPC.
 * Does NOT cancel or alter the business order status.
 */
export async function cancelPaymentAttempt(
  orderId: string,
  midtransOrderId: string
): Promise<{ success: boolean; orderId: string; metadata?: Record<string, any> }> {
  try {
    const { data, error } = await supabase.rpc('cancel_payment_attempt', {
      p_order_id: orderId,
      p_midtrans_order_id: midtransOrderId,
    });

    if (error) {
      console.error('[PaymentRepository] Error cancelling payment attempt RPC:', error);
      throw new Error(error.message || 'Gagal membatalkan sesi pembayaran.');
    }

    return {
      success: true,
      orderId,
      metadata: data?.metadata,
    };
  } catch (err: any) {
    console.error('[PaymentRepository] Error cancelling payment attempt:', err);
    throw err;
  }
}

/**
 * Extracts the authoritative active pending payment attempt from order metadata if unexpired.
 */
export function getActivePaymentAttempt(order: AdminOrderSummary): {
  token: string;
  midtransOrderId: string;
  expiresAt: string;
  grossAmount: number;
} | null {
  const metadata = order.metadata || {};
  const session = metadata.midtransSession;

  // 1. Check if direct midtransSession exists and is pending
  if (
    session &&
    session.token &&
    session.expiresAt &&
    (!session.status || session.status === 'pending')
  ) {
    const expiresMs = new Date(session.expiresAt).getTime();
    if (expiresMs > Date.now()) {
      return {
        token: session.token,
        midtransOrderId: session.midtransOrderId || order.orderNumber,
        expiresAt: session.expiresAt,
        grossAmount: session.grossAmount || Math.round(Number(order.amount)),
      };
    }
  }

  // 2. Fallback: check paymentAttempts array for latest unexpired pending attempt
  if (Array.isArray(metadata.paymentAttempts) && metadata.paymentAttempts.length > 0) {
    for (const att of [...metadata.paymentAttempts].reverse()) {
      if (
        att &&
        att.token &&
        att.expiresAt &&
        (!att.status || att.status === 'pending')
      ) {
        const expiresMs = new Date(att.expiresAt).getTime();
        if (expiresMs > Date.now()) {
          return {
            token: att.token,
            midtransOrderId: att.midtransOrderId || order.orderNumber,
            expiresAt: att.expiresAt,
            grossAmount: att.grossAmount || Math.round(Number(order.amount)),
          };
        }
      }
    }
  }

  return null;
}
