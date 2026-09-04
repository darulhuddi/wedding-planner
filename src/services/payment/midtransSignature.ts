/**
 * WedFlow Payment Domain — Midtrans SHA-512 Signature & Verification
 *
 * Implements the SHA-512 notification signature formula:
 * Signature = SHA-512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)
 *
 * Provides constant-time string comparison for timing attack defense.
 */

/**
 * Computes SHA-512 hash of a string in lowercase hex.
 * Works seamlessly across Web Crypto (Browser/Deno/Edge Functions) and Node.js.
 */
export async function calculateSha512(input: string): Promise<string> {
  // 1. Try Web Crypto API (standard in modern browsers, Deno, Supabase Edge Functions, Node 18+)
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // 2. Fallback to Node crypto module if in Node environment without subtle crypto
  try {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHash('sha512').update(input, 'utf8').digest('hex');
  } catch (err) {
    throw new Error(`Failed to compute SHA-512 hash: no crypto implementation available. ${err}`);
  }
}

/**
 * Computes the expected Midtrans signature for a transaction notification.
 * Formula: SHA-512(order_id + status_code + gross_amount + server_key)
 */
export async function computeMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string | number,
  serverKey: string
): Promise<string> {
  if (!orderId || !statusCode || grossAmount === undefined || grossAmount === null || !serverKey) {
    throw new Error('All parameters (orderId, statusCode, grossAmount, serverKey) are required to compute Midtrans signature.');
  }

  // Ensure grossAmount matches the string format provided in the payload
  const formattedGrossAmount = typeof grossAmount === 'number' ? grossAmount.toFixed(2) : grossAmount.trim();
  const rawString = `${orderId.trim()}${statusCode.trim()}${formattedGrossAmount}${serverKey.trim()}`;

  return calculateSha512(rawString);
}

/**
 * Constant-time comparison of two strings to prevent timing attacks.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const lengthA = a.length;
  const lengthB = b.length;

  let result = lengthA ^ lengthB;

  for (let i = 0; i < lengthA; i++) {
    const charA = a.charCodeAt(i);
    const charB = i < lengthB ? b.charCodeAt(i) : 0;
    result |= charA ^ charB;
  }

  return result === 0;
}

/**
 * Verifies that the signature_key provided in a Midtrans notification matches
 * the computed SHA-512 hash with the server key.
 *
 * Supports checking with the exact raw gross_amount string from the payload
 * and falls back to .toFixed(2) or integer string if needed.
 */
export async function verifyMidtransNotificationSignature(
  payload: {
    order_id: string;
    status_code: string;
    gross_amount: string | number;
    signature_key: string;
  },
  serverKey: string
): Promise<boolean> {
  if (!payload || !payload.signature_key || !serverKey) {
    return false;
  }

  const rawGross = String(payload.gross_amount).trim();
  const providedSig = payload.signature_key.trim().toLowerCase();

  // Primary check with exact raw gross_amount from payload
  const expectedPrimary = await computeMidtransSignature(
    payload.order_id,
    payload.status_code,
    rawGross,
    serverKey
  );

  if (timingSafeEqualStrings(providedSig, expectedPrimary)) {
    return true;
  }

  // Secondary check if raw was integer e.g. "199000" vs "199000.00"
  const numericAmount = parseFloat(rawGross);
  if (!isNaN(numericAmount)) {
    const fixedGross = numericAmount.toFixed(2);
    if (fixedGross !== rawGross) {
      const expectedFixed = await computeMidtransSignature(
        payload.order_id,
        payload.status_code,
        fixedGross,
        serverKey
      );
      if (timingSafeEqualStrings(providedSig, expectedFixed)) {
        return true;
      }
    }

    const intGross = String(Math.round(numericAmount));
    if (intGross !== rawGross && intGross !== fixedGross) {
      const expectedInt = await computeMidtransSignature(
        payload.order_id,
        payload.status_code,
        intGross,
        serverKey
      );
      if (timingSafeEqualStrings(providedSig, expectedInt)) {
        return true;
      }
    }
  }

  return false;
}
