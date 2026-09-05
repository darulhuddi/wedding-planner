/**
 * WedFlow Payment Domain — Midtrans Provider Implementation
 *
 * Implements IPaymentProvider boundary for Midtrans Snap & Core APIs.
 * Handles server-side transaction creation, signature verification,
 * status query, and payload normalization.
 */

import { AdminOrderSummary } from '../../types/admin';
import {
  IPaymentProvider,
  CreateTransactionParams,
  CreateTransactionResult,
} from './paymentProviderInterface';
import {
  MidtransSnapTransactionRequest,
  MidtransSnapTransactionResponse,
  MidtransNotificationPayload,
  MidtransStatusResponse,
  NormalizedPaymentResult,
} from './midtransTypes';
import {
  getSnapApiUrl,
  getCoreApiBaseUrl,
  buildMidtransAuthHeader,
  DEFAULT_SNAP_EXPIRY_MINUTES,
  getWedFlowWebhookUrl,
} from './midtransConfig';
import {
  verifyMidtransNotificationSignature,
  computeMidtransSignature,
} from './midtransSignature';
import {
  normalizeMidtransNotification,
  evaluateMidtransStatus,
} from './midtransStatusMapper';

export interface MidtransProviderOptions {
  serverKey: string;
  isProduction?: boolean;
  fetchFn?: typeof fetch;
  overrideNotificationUrl?: string;
}

export class MidtransProvider implements IPaymentProvider {
  readonly providerName = 'midtrans';
  private readonly serverKey: string;
  private readonly isProduction: boolean;
  private readonly fetch: typeof fetch;
  private readonly overrideNotificationUrl: string;

  constructor(options: MidtransProviderOptions) {
    if (!options.serverKey) {
      throw new Error('MidtransProvider requires a valid serverKey.');
    }
    this.serverKey = options.serverKey;
    this.isProduction = options.isProduction ?? false;
    this.fetch = options.fetchFn || (typeof fetch !== 'undefined' ? fetch : (globalThis.fetch as typeof fetch));
    this.overrideNotificationUrl = options.overrideNotificationUrl || getWedFlowWebhookUrl();
  }

  /**
   * Creates a Midtrans Snap transaction server-side.
   */
  async createTransaction(params: CreateTransactionParams): Promise<CreateTransactionResult> {
    const { order, customerEmail, expiryMinutes = DEFAULT_SNAP_EXPIRY_MINUTES } = params;

    if (!order || !order.orderNumber || !order.amount) {
      throw new Error('Valid order with orderNumber and amount is required for Midtrans Snap transaction.');
    }

    if (!customerEmail || !customerEmail.includes('@')) {
      throw new Error('Valid customer email is required for Midtrans transaction.');
    }

    // 1. Authoritative Gross Amount strictly from order.amount
    const grossAmount = Math.round(Number(order.amount));
    if (grossAmount <= 0) {
      throw new Error(`Invalid order gross amount: ${order.amount}`);
    }

    const snapUrl = getSnapApiUrl(this.isProduction);
    const authHeader = buildMidtransAuthHeader(this.serverKey);

    const now = new Date();
    const expiryDate = new Date(now.getTime() + expiryMinutes * 60 * 1000);

    const midtransOrderId = params.midtransOrderId || order.orderNumber;

    // 2. Build Snap Transaction Request Payload
    const requestPayload: MidtransSnapTransactionRequest = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: grossAmount,
      },
      item_details: [
        {
          id: order.productType || 'wedding_pass',
          price: grossAmount,
          quantity: 1,
          name: order.productName || 'Wedding Pass',
        },
      ],
      customer_details: {
        email: customerEmail.trim(),
        first_name: params.customerName || undefined,
      },
      expiry: {
        unit: 'minute',
        duration: expiryMinutes,
      },
    };

    // 3. Native fetch call to Midtrans Snap API
    const response = await this.fetch(snapUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'X-Override-Notification': this.overrideNotificationUrl,
      },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Midtrans Snap API error (${response.status} ${response.statusText}): ${errorText}`
      );
    }

    const data: MidtransSnapTransactionResponse = await response.json();

    if (!data.token || !data.redirect_url) {
      throw new Error('Invalid Snap response from Midtrans: missing token or redirect_url.');
    }

    return {
      provider: this.providerName,
      token: data.token,
      redirectUrl: data.redirect_url,
      expiresAt: expiryDate.toISOString(),
      midtransOrderId,
      rawResponse: data,
    };
  }

  /**
   * Verifies the SHA-512 signature of an incoming webhook notification.
   */
  async verifyNotificationSignature(payload: Record<string, any>): Promise<boolean> {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    return verifyMidtransNotificationSignature(
      {
        order_id: payload.order_id,
        status_code: payload.status_code,
        gross_amount: payload.gross_amount,
        signature_key: payload.signature_key,
      },
      this.serverKey
    );
  }

  /**
   * Queries Midtrans Core API GET /v2/{order_id}/status.
   */
  async getTransactionStatus(orderNumber: string): Promise<NormalizedPaymentResult> {
    if (!orderNumber) {
      throw new Error('orderNumber is required to query Midtrans transaction status.');
    }

    const apiBase = getCoreApiBaseUrl(this.isProduction);
    const statusUrl = `${apiBase}/${encodeURIComponent(orderNumber)}/status`;
    const authHeader = buildMidtransAuthHeader(this.serverKey);

    const response = await this.fetch(statusUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `Midtrans Status API error (${response.status} ${response.statusText}): ${errorText}`
      );
    }

    const data: MidtransStatusResponse = await response.json();

    return this.normalizePayload(data);
  }

  /**
   * Normalizes any Midtrans notification or status payload into NormalizedPaymentResult.
   */
  normalizePayload(payload: Record<string, any>): NormalizedPaymentResult {
    return normalizeMidtransNotification(payload as MidtransNotificationPayload);
  }
}
