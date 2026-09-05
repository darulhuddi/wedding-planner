/**
 * Supabase Edge Functions Shared Helper — Midtrans Core Utilities
 *
 * Designed for Deno runtime in Supabase Edge Functions.
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export const MIDTRANS_ENDPOINTS = {
  sandbox: {
    snap: 'https://app.sandbox.midtrans.com/snap/v1/transactions',
    api: 'https://api.sandbox.midtrans.com/v2',
  },
  production: {
    snap: 'https://app.midtrans.com/snap/v1/transactions',
    api: 'https://api.midtrans.com/v2',
  },
};

/** WedFlow Supabase Project Reference & Default Webhook URL */
export const WEDFLOW_SUPABASE_PROJECT_ID = 'heavutiajotepwfhlccx';
export const DEFAULT_WEDFLOW_WEBHOOK_URL = `https://${WEDFLOW_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/midtrans-webhook`;

/**
 * Returns the WedFlow Webhook URL for Midtrans per-transaction notification override.
 */
export function getWedFlowWebhookUrl(customBaseUrl?: string): string {
  if (customBaseUrl && customBaseUrl.trim()) {
    return `${customBaseUrl.replace(/\/+$/, '')}/functions/v1/midtrans-webhook`;
  }
  return DEFAULT_WEDFLOW_WEBHOOK_URL;
}

/**
 * Computes SHA-512 hash in lowercase hex using standard Web Crypto API.
 */
export async function calculateSha512(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Computes the expected Midtrans signature for a notification.
 */
export async function computeMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string | number,
  serverKey: string
): Promise<string> {
  const formattedGross = typeof grossAmount === 'number' ? grossAmount.toFixed(2) : String(grossAmount).trim();
  const raw = `${orderId.trim()}${statusCode.trim()}${formattedGross}${serverKey.trim()}`;
  return calculateSha512(raw);
}

/**
 * Constant-time string comparison.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let result = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) {
    const charA = a.charCodeAt(i);
    const charB = i < b.length ? b.charCodeAt(i) : 0;
    result |= charA ^ charB;
  }
  return result === 0;
}

/**
 * Verifies the incoming signature against Midtrans Server Key.
 */
export async function verifySignature(
  payload: {
    order_id: string;
    status_code: string;
    gross_amount: string | number;
    signature_key: string;
  },
  serverKey: string
): Promise<boolean> {
  if (!payload || !payload.signature_key || !serverKey) return false;

  const rawGross = String(payload.gross_amount).trim();
  const provided = payload.signature_key.trim().toLowerCase();

  // Primary check: exact raw string
  const expectedPrimary = await computeMidtransSignature(
    payload.order_id,
    payload.status_code,
    rawGross,
    serverKey
  );
  if (timingSafeEqualStrings(provided, expectedPrimary)) return true;

  // Secondary check: numeric formatted
  const num = parseFloat(rawGross);
  if (!isNaN(num)) {
    const fixed = num.toFixed(2);
    if (fixed !== rawGross) {
      const expFixed = await computeMidtransSignature(
        payload.order_id,
        payload.status_code,
        fixed,
        serverKey
      );
      if (timingSafeEqualStrings(provided, expFixed)) return true;
    }

    const intStr = String(Math.round(num));
    if (intStr !== rawGross && intStr !== fixed) {
      const expInt = await computeMidtransSignature(
        payload.order_id,
        payload.status_code,
        intStr,
        serverKey
      );
      if (timingSafeEqualStrings(provided, expInt)) return true;
    }
  }

  return false;
}

/**
 * In-memory rate limiting map for basic flood defense.
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(ip: string, maxRequests = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count += 1;
  return true;
}

/**
 * Generates a globally unique Midtrans Order ID for a specific payment attempt.
 * Ensures the generated string:
 * - is <= 50 characters (Midtrans max order_id limit)
 * - contains only safe characters (alphanumeric, hyphen, underscore)
 * - is unique across multiple retries/attempts for the same WedSiap order
 */
export function generateMidtransOrderId(orderNumber: string): string {
  const cleanOrderNumber = orderNumber.trim();
  const timestampSuffix = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  const attemptSuffix = `${timestampSuffix}-${randomSuffix}`;

  // Ensure total length strictly <= 50 chars
  const maxBaseLen = 50 - 1 - attemptSuffix.length;
  const base = cleanOrderNumber.length > maxBaseLen 
    ? cleanOrderNumber.substring(0, maxBaseLen) 
    : cleanOrderNumber;

  return `${base}-${attemptSuffix}`;
}

/**
 * Parses the base WedSiap order number from a unique Midtrans attempt order ID.
 * Returns the original string if no attempt suffix is detected.
 */
export function parseBaseOrderNumber(midtransOrderId: string): string {
  if (!midtransOrderId) return '';
  const trimmed = midtransOrderId.trim();

  // Pattern 1: WF-YYYYMMDD-XXXX-<attemptSuffix> (Standard WedFlow format with attempt suffix)
  const wfMatch = trimmed.match(/^(WF-\d{8}-\d{4})-[a-z0-9]+-[a-z0-9]+$/i);
  if (wfMatch && wfMatch[1]) {
    return wfMatch[1];
  }

  // Exact standard WedFlow order number without suffix
  if (/^WF-\d{8}-\d{4}$/i.test(trimmed)) {
    return trimmed;
  }

  // Pattern 2: Generic <baseOrderNumber>-<timestampBase36>-<randomBase36> (where base is not WF- format)
  const parts = trimmed.split('-');
  if (parts.length >= 3 && !trimmed.startsWith('WF-')) {
    const last1 = parts[parts.length - 1];
    const last2 = parts[parts.length - 2];
    if (/^[a-z0-9]{3,10}$/i.test(last1) && /^[a-z0-9]{4,12}$/i.test(last2)) {
      return parts.slice(0, parts.length - 2).join('-');
    }
  }

  return trimmed;
}
