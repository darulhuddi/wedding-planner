/**
 * WedFlow Payment Domain — Midtrans Status & Fraud Evaluator
 *
 * Maps Midtrans provider transaction status & fraud status
 * to canonical WedFlow order & payment lifecycle states.
 */

import { OrderStatus, PaymentStatus } from '../../types/admin';
import {
  MidtransTransactionStatus,
  MidtransFraudStatus,
  MidtransNotificationPayload,
  NormalizedPaymentResult,
} from './midtransTypes';

export interface EvaluatedMidtransStatus {
  isSuccess: boolean;
  isPending: boolean;
  isFailed: boolean;
  isChallenge: boolean;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  reason?: string;
}

/**
 * Pure evaluation function for Midtrans transaction status and fraud status.
 */
export function evaluateMidtransStatus(
  transactionStatus: MidtransTransactionStatus,
  fraudStatus?: MidtransFraudStatus
): EvaluatedMidtransStatus {
  const normalizedStatus = (transactionStatus || '').toLowerCase() as MidtransTransactionStatus;
  const normalizedFraud = (fraudStatus || '').toLowerCase() as MidtransFraudStatus;

  // 1. Settlement (instant payment, bank transfer, QRIS, e-wallet, etc.)
  if (normalizedStatus === 'settlement') {
    return {
      isSuccess: true,
      isPending: false,
      isFailed: false,
      isChallenge: false,
      orderStatus: 'paid',
      paymentStatus: 'paid',
    };
  }

  // 2. Capture (Credit Card)
  if (normalizedStatus === 'capture') {
    if (normalizedFraud === 'accept') {
      return {
        isSuccess: true,
        isPending: false,
        isFailed: false,
        isChallenge: false,
        orderStatus: 'paid',
        paymentStatus: 'paid',
      };
    }

    if (normalizedFraud === 'challenge') {
      return {
        isSuccess: false,
        isPending: true,
        isFailed: false,
        isChallenge: true,
        orderStatus: 'pending',
        paymentStatus: 'pending',
        reason: 'Payment flagged for fraud challenge by Midtrans risk engine.',
      };
    }

    // Default capture without explicit accept
    return {
      isSuccess: false,
      isPending: true,
      isFailed: false,
      isChallenge: false,
      orderStatus: 'pending',
      paymentStatus: 'pending',
      reason: `Capture with non-accept fraud status: ${normalizedFraud || 'none'}.`,
    };
  }

  // 3. Pending (Customer opened payment session or generated VA/QRIS, awaiting payment)
  if (normalizedStatus === 'pending') {
    return {
      isSuccess: false,
      isPending: true,
      isFailed: false,
      isChallenge: false,
      orderStatus: 'pending',
      paymentStatus: 'pending',
    };
  }

  // 4. Deny / Failure / Expire / Cancel (Non-success states)
  if (normalizedStatus === 'deny') {
    return {
      isSuccess: false,
      isPending: false,
      isFailed: true,
      isChallenge: false,
      orderStatus: 'failed',
      paymentStatus: 'failed',
      reason: 'Transaction was denied by payment provider or bank.',
    };
  }

  if (normalizedStatus === 'cancel') {
    return {
      isSuccess: false,
      isPending: false,
      isFailed: true,
      isChallenge: false,
      orderStatus: 'cancelled',
      paymentStatus: 'failed',
      reason: 'Transaction was cancelled by customer or merchant.',
    };
  }

  if (normalizedStatus === 'expire') {
    return {
      isSuccess: false,
      isPending: false,
      isFailed: true,
      isChallenge: false,
      orderStatus: 'expired',
      paymentStatus: 'expired',
      reason: 'Transaction payment window expired.',
    };
  }

  if (normalizedStatus === 'failure') {
    return {
      isSuccess: false,
      isPending: false,
      isFailed: true,
      isChallenge: false,
      orderStatus: 'failed',
      paymentStatus: 'failed',
      reason: 'Transaction failed at provider.',
    };
  }

  if (
    normalizedStatus === 'refund' ||
    normalizedStatus === 'partial_refund' ||
    normalizedStatus === 'chargeback'
  ) {
    return {
      isSuccess: false,
      isPending: false,
      isFailed: false,
      isChallenge: false,
      orderStatus: 'cancelled',
      paymentStatus: 'refunded',
      reason: `Transaction was refunded/charged back (${normalizedStatus}).`,
    };
  }

  // Unknown fallback
  return {
    isSuccess: false,
    isPending: false,
    isFailed: true,
    isChallenge: false,
    orderStatus: 'failed',
    paymentStatus: 'failed',
    reason: `Unknown transaction status: ${transactionStatus}`,
  };
}

/**
 * Normalizes a Midtrans notification payload into a standardized NormalizedPaymentResult.
 */
export function normalizeMidtransNotification(
  payload: MidtransNotificationPayload
): NormalizedPaymentResult {
  const evaluated = evaluateMidtransStatus(
    payload.transaction_status,
    payload.fraud_status
  );

  const parsedAmount = Math.round(parseFloat(String(payload.gross_amount || '0')));

  return {
    isSuccess: evaluated.isSuccess,
    isPending: evaluated.isPending,
    isFailed: evaluated.isFailed,
    isChallenge: evaluated.isChallenge,
    domainOrderStatus: evaluated.orderStatus,
    domainPaymentStatus: evaluated.paymentStatus,
    orderNumber: payload.order_id,
    transactionId: payload.transaction_id,
    amount: parsedAmount,
    currency: payload.currency || 'IDR',
    paymentMethod: payload.payment_type || 'midtrans',
    provider: 'midtrans',
    rawStatus: payload.transaction_status,
    fraudStatus: payload.fraud_status,
    settledAt: payload.settlement_time || payload.transaction_time,
    metadata: {
      provider: 'midtrans',
      transactionId: payload.transaction_id,
      paymentType: payload.payment_type,
      transactionStatus: payload.transaction_status,
      fraudStatus: payload.fraud_status || null,
      statusCode: payload.status_code,
      statusMessage: payload.status_message || null,
      bank: payload.bank || null,
      vaNumbers: payload.va_numbers || null,
      billerCode: payload.biller_code || null,
      billKey: payload.bill_key || null,
      merchantId: payload.merchant_id || null,
      settlementTime: payload.settlement_time || null,
    },
  };
}
