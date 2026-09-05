/**
 * WedFlow Payment Domain — Payment Application Service
 *
 * Coordinates order payment sessions, pending Snap token reuse,
 * active status synchronization, and webhook notification handling.
 *
 * Guaranteed invariants:
 * - Gross amount is strictly derived from orders.amount.
 * - Snap Token validity is checked against expiration metadata before reuse.
 * - Webhooks and sync operations route strictly through atomic completePaidOrderInDb.
 * - Direct mutation of customer_access_entitlements is forbidden.
 */

import { AdminOrderSummary } from '../../types/admin';
import { IPaymentProvider, CreateTransactionResult } from './paymentProviderInterface';
import {
  NormalizedPaymentResult,
  WebhookProcessingResult,
  SnapSessionMetadata,
} from './midtransTypes';
import { parseBaseOrderNumber } from './midtransConfig';
import { completePaidOrderInDb } from '../../repositories/supabaseAdminAdapter';
import { supabase } from '../../lib/supabaseClient';

export interface PaymentServiceDependencies {
  provider: IPaymentProvider;
  findOrderByOrderNumber?: (orderNumber: string) => Promise<AdminOrderSummary | null>;
  saveOrderSnapSession?: (orderId: string, session: SnapSessionMetadata) => Promise<void>;
  completeOrder?: typeof completePaidOrderInDb;
}

export class PaymentService {
  private readonly provider: IPaymentProvider;
  private readonly findOrderByOrderNumberFn: (orderNumber: string) => Promise<AdminOrderSummary | null>;
  private readonly saveOrderSnapSessionFn: (orderId: string, session: SnapSessionMetadata) => Promise<void>;
  private readonly completeOrderFn: typeof completePaidOrderInDb;

  constructor(deps: PaymentServiceDependencies) {
    this.provider = deps.provider;
    this.findOrderByOrderNumberFn = deps.findOrderByOrderNumber || this.defaultFindOrderByOrderNumber;
    this.saveOrderSnapSessionFn = deps.saveOrderSnapSession || this.defaultSaveOrderSnapSession;
    this.completeOrderFn = deps.completeOrder || completePaidOrderInDb;
  }

  /**
   * Generates or reuses a Snap payment session token for a pending order.
   * If an unexpired session already exists and matches the order amount, reuses it.
   */
  async getOrCreatePaymentSession(
    order: AdminOrderSummary,
    customerEmail: string,
    customerName?: string,
    options: { forceNew?: boolean; now?: Date } = {}
  ): Promise<CreateTransactionResult> {
    if (order.status === 'paid') {
      throw new Error(`Pesanan ${order.orderNumber} sudah dibayar.`);
    }

    if (order.status !== 'pending') {
      throw new Error(`Pesanan ${order.orderNumber} tidak dalam status pending (status: ${order.status}).`);
    }

    const now = options.now || new Date();
    const existingSession = order.metadata?.midtransSession as SnapSessionMetadata | undefined;

    // 1. Check if unexpired pending session can be safely reused
    if (
      !options.forceNew &&
      existingSession &&
      existingSession.token &&
      existingSession.expiresAt &&
      existingSession.grossAmount === Math.round(Number(order.amount))
    ) {
      const expiresAtTime = new Date(existingSession.expiresAt).getTime();
      // Only reuse if there is at least 2 minutes remaining before expiration
      if (expiresAtTime - now.getTime() > 2 * 60 * 1000) {
        return {
          provider: this.provider.providerName,
          token: existingSession.token,
          redirectUrl: existingSession.redirectUrl,
          expiresAt: existingSession.expiresAt,
          midtransOrderId: existingSession.midtransOrderId || order.orderNumber,
        };
      }
    }

    // 2. Create new transaction via provider
    const newSession = await this.provider.createTransaction({
      order,
      customerEmail,
      customerName,
    });

    const sessionMetadata: SnapSessionMetadata = {
      token: newSession.token,
      redirectUrl: newSession.redirectUrl,
      midtransOrderId: newSession.midtransOrderId || order.orderNumber,
      createdAt: now.toISOString(),
      expiresAt: newSession.expiresAt,
      grossAmount: Math.round(Number(order.amount)),
      provider: 'midtrans',
    };

    // 3. Persist session metadata into order
    await this.saveOrderSnapSessionFn(order.id, sessionMetadata);

    return newSession;
  }

  /**
   * Processes an incoming payment webhook notification.
   * Performs signature verification, order lookup, amount check, fraud check,
   * and routes success through the atomic completion procedure.
   */
  async handleWebhookNotification(
    payload: Record<string, any>
  ): Promise<WebhookProcessingResult> {
    // 1. Verify provider signature
    const isSignatureValid = await this.provider.verifyNotificationSignature(payload);
    if (!isSignatureValid) {
      console.warn('[PaymentService] Webhook rejected: Invalid signature for order', payload?.order_id);
      return {
        statusCode: 401,
        success: false,
        message: 'Invalid notification signature.',
        orderNumber: payload?.order_id,
        transactionId: payload?.transaction_id,
      };
    }

    const orderNumber = String(payload.order_id || '').trim();
    if (!orderNumber) {
      return {
        statusCode: 400,
        success: false,
        message: 'Missing order_id in notification payload.',
      };
    }

    // 2. Find order in database (Direct match or parse base order number)
    let order = await this.findOrderByOrderNumberFn(orderNumber);
    if (!order) {
      const baseNumber = parseBaseOrderNumber(orderNumber);
      if (baseNumber && baseNumber !== orderNumber) {
        order = await this.findOrderByOrderNumberFn(baseNumber);
      }
    }

    if (!order) {
      console.warn('[PaymentService] Webhook rejected: Order not found for orderNumber', orderNumber);
      return {
        statusCode: 404,
        success: false,
        message: `Order with order_number ${orderNumber} not found.`,
        orderNumber,
        transactionId: payload.transaction_id,
      };
    }

    // 3. Normalize notification payload
    const normalized = this.provider.normalizePayload(payload);

    // 4. Validate Amount integrity (Anti-tampering / Amount mismatch)
    const expectedAmount = Math.round(Number(order.amount));
    if (normalized.amount !== expectedAmount) {
      console.error(
        `[PaymentService] Amount mismatch for order ${orderNumber}: expected ${expectedAmount}, received ${normalized.amount}`
      );
      return {
        statusCode: 422,
        success: false,
        message: `Amount mismatch: expected ${expectedAmount}, received ${normalized.amount}.`,
        orderNumber,
        transactionId: normalized.transactionId,
      };
    }

    // 5. Evaluate status & fraud
    if (normalized.isSuccess) {
      try {
        // Execute atomic database RPC completion
        const completedOrder = await this.completeOrderFn(order.id, {
          amount: normalized.amount,
          currency: normalized.currency,
          paymentMethod: normalized.paymentMethod,
          provider: normalized.provider,
          providerReference: normalized.transactionId,
          metadata: normalized.metadata,
        });

        const isReplay = Boolean(completedOrder.metadata?.is_idempotent_replay);

        return {
          statusCode: 200,
          success: true,
          message: isReplay ? 'Idempotent replay: order already paid.' : 'Payment successfully completed and access granted.',
          isIdempotentReplay: isReplay,
          orderNumber,
          transactionId: normalized.transactionId,
        };
      } catch (err: any) {
        console.error('[PaymentService] Error executing completePaidOrder:', err);
        return {
          statusCode: 500,
          success: false,
          message: `Database error during payment completion: ${err.message || 'Unknown error'}`,
          orderNumber,
          transactionId: normalized.transactionId,
        };
      }
    }

    // Monotonic State Guard: If order is already paid, non-success notifications for other attempts must not alter order state
    if (order.status === 'paid') {
      return {
        statusCode: 200,
        success: true,
        message: `Order is already paid. Non-success notification (${normalized.rawStatus}) from attempt ${orderNumber} ignored.`,
        isIdempotentReplay: true,
        orderNumber,
        transactionId: normalized.transactionId,
      };
    }

    if (normalized.isChallenge) {
      return {
        statusCode: 200,
        success: true,
        message: 'Transaction flagged for challenge: fraud review required. No access granted.',
        orderNumber,
        transactionId: normalized.transactionId,
      };
    }

    if (normalized.isPending) {
      return {
        statusCode: 200,
        success: true,
        message: 'Transaction is pending: awaiting customer payment.',
        orderNumber,
        transactionId: normalized.transactionId,
      };
    }

    // Non-success states (deny, cancel, expire, failure)
    return {
      statusCode: 200,
      success: true,
      message: `Transaction non-success state acknowledged (${normalized.rawStatus}). No access granted.`,
      orderNumber,
      transactionId: normalized.transactionId,
    };
  }

  /**
   * Synchronizes transaction status actively from Midtrans Core API.
   * Useful when customer returns to frontend before webhook delivery.
   * Routes success through the exact same complete_paid_order path.
   */
  async syncPaymentStatus(orderNumber: string): Promise<{
    order: AdminOrderSummary;
    normalized: NormalizedPaymentResult;
  }> {
    const order = await this.findOrderByOrderNumberFn(orderNumber);
    if (!order) {
      throw new Error(`Pesanan dengan nomor ${orderNumber} tidak ditemukan.`);
    }

    // If order is already paid, return existing state
    if (order.status === 'paid') {
      const normalized: NormalizedPaymentResult = {
        isSuccess: true,
        isPending: false,
        isFailed: false,
        isChallenge: false,
        domainOrderStatus: 'paid',
        domainPaymentStatus: 'paid',
        orderNumber: order.orderNumber,
        transactionId: order.providerReference || `synced-${order.orderNumber}`,
        amount: order.amount,
        currency: order.currency,
        paymentMethod: order.paymentMethod || 'midtrans',
        provider: 'midtrans',
        rawStatus: 'settlement',
        metadata: order.metadata || {},
      };
      return { order, normalized };
    }

    // Query status from provider using active attempt midtransOrderId if available
    const targetQueryId = order.metadata?.midtransSession?.midtransOrderId || orderNumber;
    const normalized = await this.provider.getTransactionStatus(targetQueryId);

    if (normalized.isSuccess) {
      // Validate amount
      const expectedAmount = Math.round(Number(order.amount));
      if (normalized.amount !== expectedAmount) {
        throw new Error(
          `Jumlah pembayaran dari provider (${normalized.amount}) tidak sesuai dengan tagihan (${expectedAmount}).`
        );
      }

      // Complete order via authoritative RPC
      const completedOrder = await this.completeOrderFn(order.id, {
        amount: normalized.amount,
        currency: normalized.currency,
        paymentMethod: normalized.paymentMethod,
        provider: normalized.provider,
        providerReference: normalized.transactionId,
        metadata: normalized.metadata,
      });

      return { order: completedOrder, normalized };
    }

    return { order, normalized };
  }

  // --- Default Database Helpers ---

  private async defaultFindOrderByOrderNumber(orderNumber: string): Promise<AdminOrderSummary | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, workspace_id, product_type, product_name, amount, currency, status, created_at, updated_at, paid_at, metadata')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      orderNumber: data.order_number,
      workspaceId: data.workspace_id,
      coupleName: 'Pasangan',
      productType: data.product_type,
      productName: data.product_name,
      amount: Number(data.amount),
      currency: data.currency,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      paidAt: data.paid_at,
      metadata: data.metadata || {},
    };
  }

  private async defaultSaveOrderSnapSession(orderId: string, session: SnapSessionMetadata): Promise<void> {
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('metadata')
      .eq('id', orderId)
      .maybeSingle();

    const currentMetadata = currentOrder?.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      midtransSession: session,
    };

    await supabase
      .from('orders')
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
  }
}
