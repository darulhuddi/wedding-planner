/**
 * WedFlow Payment Domain — Midtrans Contracts & Types
 *
 * Types for Midtrans Snap API requests, responses, webhook payloads,
 * and normalized payment provider abstractions.
 */

import { OrderStatus, PaymentStatus } from '../../types/admin';

export type MidtransTransactionStatus =
  | 'capture'
  | 'settlement'
  | 'pending'
  | 'deny'
  | 'cancel'
  | 'expire'
  | 'failure'
  | 'refund'
  | 'partial_refund'
  | 'chargeback';

export type MidtransFraudStatus = 'accept' | 'challenge' | 'deny';

export interface MidtransCustomerDetails {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface MidtransItemDetail {
  id: string;
  price: number;
  quantity: number;
  name: string;
  category?: string;
}

export interface MidtransTransactionDetails {
  order_id: string;
  gross_amount: number;
}

export interface MidtransSnapTransactionRequest {
  transaction_details: MidtransTransactionDetails;
  item_details?: MidtransItemDetail[];
  customer_details?: MidtransCustomerDetails;
  expiry?: {
    start_time?: string;
    unit: 'minute' | 'hour' | 'day';
    duration: number;
  };
}

export interface MidtransSnapTransactionResponse {
  token: string;
  redirect_url: string;
}

export interface MidtransNotificationPayload {
  transaction_id: string;
  order_id: string;
  gross_amount: string; // Midtrans sends gross_amount as string, e.g. "199000.00"
  payment_type: string;
  transaction_time: string;
  transaction_status: MidtransTransactionStatus;
  fraud_status?: MidtransFraudStatus;
  status_code: string;
  signature_key: string;
  currency?: string;
  settlement_time?: string;
  status_message?: string;
  merchant_id?: string;
  masked_card?: string;
  bank?: string;
  va_numbers?: Array<{
    bank: string;
    va_number: string;
  }>;
  bill_key?: string;
  biller_code?: string;
  pdf_url?: string;
  finish_redirect_url?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface MidtransStatusResponse {
  status_code: string;
  status_message: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  currency?: string;
  payment_type: string;
  transaction_time: string;
  transaction_status: MidtransTransactionStatus;
  fraud_status?: MidtransFraudStatus;
  signature_key?: string;
  settlement_time?: string;
  expiry_time?: string;
  [key: string]: any;
}

export type PaymentAttemptStatus = 'pending' | 'cancelled' | 'expired' | 'paid' | 'superseded';

export interface PaymentAttemptMetadata {
  midtransOrderId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  grossAmount: number;
  status: PaymentAttemptStatus;
  cancelledAt?: string;
  paidAt?: string;
}

/**
 * Metadata stored on an order when a Snap token is generated.
 * Used for safe pending token reuse within its unexpired lifetime.
 */
export interface SnapSessionMetadata {
  token: string;
  redirectUrl: string;
  createdAt: string; // ISO string
  expiresAt: string; // ISO string
  grossAmount: number;
  midtransOrderId?: string;
  status?: PaymentAttemptStatus;
  provider: 'midtrans';
}

/**
 * Normalized payment outcome resulting from status/fraud evaluation
 */
export interface NormalizedPaymentResult {
  isSuccess: boolean;
  isPending: boolean;
  isFailed: boolean;
  isChallenge: boolean;
  domainOrderStatus: OrderStatus;
  domainPaymentStatus: PaymentStatus;
  orderNumber: string;
  transactionId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  provider: 'midtrans';
  rawStatus: MidtransTransactionStatus;
  fraudStatus?: MidtransFraudStatus;
  settledAt?: string;
  metadata: Record<string, any>;
}

export interface WebhookProcessingResult {
  statusCode: number;
  success: boolean;
  message: string;
  isIdempotentReplay?: boolean;
  orderNumber?: string;
  transactionId?: string;
}
