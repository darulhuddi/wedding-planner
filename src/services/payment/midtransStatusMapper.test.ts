import { describe, it, expect } from 'vitest';
import {
  evaluateMidtransStatus,
  normalizeMidtransNotification,
} from './midtransStatusMapper';
import { MidtransNotificationPayload } from './midtransTypes';

describe('Midtrans Status & Fraud Evaluator Tests', () => {
  describe('evaluateMidtransStatus', () => {
    it('evaluates settlement as successful paid state', () => {
      const result = evaluateMidtransStatus('settlement');
      expect(result.isSuccess).toBe(true);
      expect(result.isPending).toBe(false);
      expect(result.isFailed).toBe(false);
      expect(result.isChallenge).toBe(false);
      expect(result.orderStatus).toBe('paid');
      expect(result.paymentStatus).toBe('paid');
    });

    it('evaluates capture with fraud_status = accept as successful paid state', () => {
      const result = evaluateMidtransStatus('capture', 'accept');
      expect(result.isSuccess).toBe(true);
      expect(result.isPending).toBe(false);
      expect(result.isFailed).toBe(false);
      expect(result.isChallenge).toBe(false);
      expect(result.orderStatus).toBe('paid');
      expect(result.paymentStatus).toBe('paid');
    });

    it('evaluates capture with fraud_status = challenge as pending/challenge without granting paid access', () => {
      const result = evaluateMidtransStatus('capture', 'challenge');
      expect(result.isSuccess).toBe(false);
      expect(result.isPending).toBe(true);
      expect(result.isChallenge).toBe(true);
      expect(result.isFailed).toBe(false);
      expect(result.orderStatus).toBe('pending');
      expect(result.paymentStatus).toBe('pending');
      expect(result.reason).toContain('fraud challenge');
    });

    it('evaluates capture without fraud_status as pending', () => {
      const result = evaluateMidtransStatus('capture');
      expect(result.isSuccess).toBe(false);
      expect(result.isPending).toBe(true);
      expect(result.orderStatus).toBe('pending');
    });

    it('evaluates pending transaction status as pending (no access)', () => {
      const result = evaluateMidtransStatus('pending');
      expect(result.isSuccess).toBe(false);
      expect(result.isPending).toBe(true);
      expect(result.isFailed).toBe(false);
      expect(result.orderStatus).toBe('pending');
      expect(result.paymentStatus).toBe('pending');
    });

    it('evaluates deny as failed payment', () => {
      const result = evaluateMidtransStatus('deny');
      expect(result.isSuccess).toBe(false);
      expect(result.isFailed).toBe(true);
      expect(result.orderStatus).toBe('failed');
      expect(result.paymentStatus).toBe('failed');
    });

    it('evaluates cancel as cancelled order and failed payment', () => {
      const result = evaluateMidtransStatus('cancel');
      expect(result.isSuccess).toBe(false);
      expect(result.isFailed).toBe(true);
      expect(result.orderStatus).toBe('cancelled');
      expect(result.paymentStatus).toBe('failed');
    });

    it('evaluates expire as expired order and payment', () => {
      const result = evaluateMidtransStatus('expire');
      expect(result.isSuccess).toBe(false);
      expect(result.isFailed).toBe(true);
      expect(result.orderStatus).toBe('expired');
      expect(result.paymentStatus).toBe('expired');
    });

    it('evaluates failure as failed', () => {
      const result = evaluateMidtransStatus('failure');
      expect(result.isSuccess).toBe(false);
      expect(result.isFailed).toBe(true);
      expect(result.orderStatus).toBe('failed');
      expect(result.paymentStatus).toBe('failed');
    });

    it('evaluates refund as refunded payment and cancelled order', () => {
      const result = evaluateMidtransStatus('refund');
      expect(result.isSuccess).toBe(false);
      expect(result.orderStatus).toBe('cancelled');
      expect(result.paymentStatus).toBe('refunded');
    });
  });

  describe('normalizeMidtransNotification', () => {
    it('normalizes a full settlement notification payload', () => {
      const payload: MidtransNotificationPayload = {
        transaction_id: '4770172e-0632-4d29-ab54-20a2e0a296b1',
        order_id: 'WF-20260904-0001',
        gross_amount: '199000.00',
        payment_type: 'qris',
        transaction_time: '2026-09-04 12:00:00',
        settlement_time: '2026-09-04 12:01:00',
        transaction_status: 'settlement',
        status_code: '200',
        signature_key: 'abc123sig',
        currency: 'IDR',
        bank: 'bca',
      };

      const normalized = normalizeMidtransNotification(payload);

      expect(normalized.isSuccess).toBe(true);
      expect(normalized.orderNumber).toBe('WF-20260904-0001');
      expect(normalized.transactionId).toBe('4770172e-0632-4d29-ab54-20a2e0a296b1');
      expect(normalized.amount).toBe(199000);
      expect(normalized.currency).toBe('IDR');
      expect(normalized.paymentMethod).toBe('qris');
      expect(normalized.provider).toBe('midtrans');
      expect(normalized.settledAt).toBe('2026-09-04 12:01:00');
      expect(normalized.metadata.bank).toBe('bca');
      expect(normalized.metadata.transactionId).toBe('4770172e-0632-4d29-ab54-20a2e0a296b1');
    });

    it('handles gross_amount without decimals e.g. "199000"', () => {
      const payload: MidtransNotificationPayload = {
        transaction_id: 'tx-2',
        order_id: 'WF-20260904-0002',
        gross_amount: '199000',
        payment_type: 'bank_transfer',
        transaction_time: '2026-09-04 12:00:00',
        transaction_status: 'pending',
        status_code: '201',
        signature_key: 'sig2',
      };

      const normalized = normalizeMidtransNotification(payload);
      expect(normalized.amount).toBe(199000);
      expect(normalized.isPending).toBe(true);
      expect(normalized.isSuccess).toBe(false);
    });
  });
});
