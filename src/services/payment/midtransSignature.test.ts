import { describe, it, expect } from 'vitest';
import {
  calculateSha512,
  computeMidtransSignature,
  verifyMidtransNotificationSignature,
  timingSafeEqualStrings,
} from './midtransSignature';

describe('Midtrans SHA-512 Signature & Verification', () => {
  const mockOrderId = 'WF-20260904-0001';
  const mockStatusCode = '200';
  const mockGrossAmount = '199000.00';
  const mockServerKey = 'SB-Mid-server-TEST_SECRET_KEY_123';

  it('computes expected SHA-512 hash matching manual calculation', async () => {
    // SHA-512("hello")
    const hash = await calculateSha512('hello');
    expect(hash).toBe(
      '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043'
    );
  });

  it('computes consistent Midtrans signature according to specification', async () => {
    const rawString = `${mockOrderId}${mockStatusCode}${mockGrossAmount}${mockServerKey}`;
    const expectedDirect = await calculateSha512(rawString);

    const sig = await computeMidtransSignature(
      mockOrderId,
      mockStatusCode,
      mockGrossAmount,
      mockServerKey
    );

    expect(sig).toBe(expectedDirect);
    expect(sig.length).toBe(128); // 512 bits = 128 hex chars
  });

  it('successfully verifies a valid notification signature', async () => {
    const validSignature = await computeMidtransSignature(
      mockOrderId,
      mockStatusCode,
      mockGrossAmount,
      mockServerKey
    );

    const payload = {
      order_id: mockOrderId,
      status_code: mockStatusCode,
      gross_amount: mockGrossAmount,
      signature_key: validSignature,
    };

    const isValid = await verifyMidtransNotificationSignature(payload, mockServerKey);
    expect(isValid).toBe(true);
  });

  it('verifies signature when gross_amount is formatted as integer or decimal', async () => {
    // Generated with "199000.00"
    const sigDecimal = await computeMidtransSignature(
      mockOrderId,
      mockStatusCode,
      '199000.00',
      mockServerKey
    );

    // Payload sent as "199000"
    const payloadInt = {
      order_id: mockOrderId,
      status_code: mockStatusCode,
      gross_amount: '199000',
      signature_key: sigDecimal,
    };

    const isValid = await verifyMidtransNotificationSignature(payloadInt, mockServerKey);
    expect(isValid).toBe(true);
  });

  it('rejects signature if serverKey is incorrect', async () => {
    const validSignature = await computeMidtransSignature(
      mockOrderId,
      mockStatusCode,
      mockGrossAmount,
      mockServerKey
    );

    const payload = {
      order_id: mockOrderId,
      status_code: mockStatusCode,
      gross_amount: mockGrossAmount,
      signature_key: validSignature,
    };

    const isWrongKey = await verifyMidtransNotificationSignature(
      payload,
      'SB-Mid-server-WRONG_KEY'
    );
    expect(isWrongKey).toBe(false);
  });

  it('rejects signature if order_id has been tampered with', async () => {
    const validSignature = await computeMidtransSignature(
      mockOrderId,
      mockStatusCode,
      mockGrossAmount,
      mockServerKey
    );

    const payload = {
      order_id: 'WF-TAMPERED-9999',
      status_code: mockStatusCode,
      gross_amount: mockGrossAmount,
      signature_key: validSignature,
    };

    const isValid = await verifyMidtransNotificationSignature(payload, mockServerKey);
    expect(isValid).toBe(false);
  });

  it('rejects signature if gross_amount has been altered', async () => {
    const validSignature = await computeMidtransSignature(
      mockOrderId,
      mockStatusCode,
      mockGrossAmount,
      mockServerKey
    );

    const payload = {
      order_id: mockOrderId,
      status_code: mockStatusCode,
      gross_amount: '10000.00', // Tampered lower amount
      signature_key: validSignature,
    };

    const isValid = await verifyMidtransNotificationSignature(payload, mockServerKey);
    expect(isValid).toBe(false);
  });

  it('performs constant-time string comparison', () => {
    expect(timingSafeEqualStrings('abc', 'abc')).toBe(true);
    expect(timingSafeEqualStrings('abc', 'abd')).toBe(false);
    expect(timingSafeEqualStrings('abc', 'abcd')).toBe(false);
    expect(timingSafeEqualStrings('', '')).toBe(true);
  });
});
