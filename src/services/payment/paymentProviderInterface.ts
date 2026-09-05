/**
 * WedFlow Payment Domain — Generic Payment Provider Interface
 *
 * Provides a clean architectural boundary between WedFlow Payment Domain
 * and specific payment gateway providers (Midtrans, Xendit, Stripe, etc.).
 */

import { AdminOrderSummary } from '../../types/admin';
import { NormalizedPaymentResult } from './midtransTypes';

export interface CreateTransactionParams {
  order: AdminOrderSummary;
  customerEmail: string;
  customerName?: string;
  expiryMinutes?: number;
  midtransOrderId?: string;
}

export interface CreateTransactionResult {
  provider: string;
  token: string;
  redirectUrl: string;
  expiresAt: string; // ISO date string
  midtransOrderId?: string;
  rawResponse?: Record<string, any>;
}

export interface IPaymentProvider {
  readonly providerName: string;

  /**
   * Creates a client-side payment session / token for an order.
   */
  createTransaction(params: CreateTransactionParams): Promise<CreateTransactionResult>;

  /**
   * Verifies the authenticity of an incoming webhook notification.
   */
  verifyNotificationSignature(payload: Record<string, any>): Promise<boolean>;

  /**
   * Queries the live transaction status from the payment provider.
   */
  getTransactionStatus(orderNumber: string): Promise<NormalizedPaymentResult>;

  /**
   * Normalizes incoming provider payload into standardized payment outcome.
   */
  normalizePayload(payload: Record<string, any>): NormalizedPaymentResult;
}
