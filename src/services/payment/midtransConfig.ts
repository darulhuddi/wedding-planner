/**
 * WedFlow Payment Domain — Midtrans Configuration & Environment Resolver
 *
 * Resolves API endpoints, token durations, and key separation.
 * Ensures MIDTRANS_SERVER_KEY is never accessible to client bundles.
 */

export interface MidtransEnvironmentConfig {
  isProduction: boolean;
  clientKey?: string;
  serverKey?: string;
}

export const MIDTRANS_ENDPOINTS = {
  sandbox: {
    snap: 'https://app.sandbox.midtrans.com/snap/v1/transactions',
    api: 'https://api.sandbox.midtrans.com/v2',
    snapJs: 'https://app.sandbox.midtrans.com/snap/snap.js',
  },
  production: {
    snap: 'https://app.midtrans.com/snap/v1/transactions',
    api: 'https://api.midtrans.com/v2',
    snapJs: 'https://app.midtrans.com/snap/snap.js',
  },
} as const;

/** Default Snap token lifetime in minutes (24 hours) */
export const DEFAULT_SNAP_EXPIRY_MINUTES = 1440;

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
 * Returns the Snap API URL for the given environment.
 */
export function getSnapApiUrl(isProduction: boolean): string {
  return isProduction
    ? MIDTRANS_ENDPOINTS.production.snap
    : MIDTRANS_ENDPOINTS.sandbox.snap;
}

/**
 * Returns the Core API base URL for querying transaction status.
 */
export function getCoreApiBaseUrl(isProduction: boolean): string {
  return isProduction
    ? MIDTRANS_ENDPOINTS.production.api
    : MIDTRANS_ENDPOINTS.sandbox.api;
}

/**
 * Returns the Snap.js script URL for client-side modal rendering.
 */
export function getSnapJsUrl(isProduction: boolean): string {
  return isProduction
    ? MIDTRANS_ENDPOINTS.production.snapJs
    : MIDTRANS_ENDPOINTS.sandbox.snapJs;
}

/**
 * Resolves client-safe Midtrans configuration.
 * Only accesses client keys; never accesses server keys.
 */
export function getClientMidtransConfig(): { clientKey: string; isProduction: boolean; snapJsUrl: string } {
  // Read from Vite environment if in browser context
  const clientKey =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_MIDTRANS_CLIENT_KEY as string) || ''
      : '';

  const isProduction =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true' || import.meta.env.MODE === 'production'
      : false;

  return {
    clientKey,
    isProduction,
    snapJsUrl: getSnapJsUrl(isProduction),
  };
}

/**
 * Builds HTTP Basic Auth Header for Midtrans Server API calls.
 * Format: "Basic " + Base64(serverKey + ":")
 */
export function buildMidtransAuthHeader(serverKey: string): string {
  if (!serverKey) {
    throw new Error('Midtrans Server Key is required for server authentication.');
  }

  // Support both browser/Deno btoa and Node Buffer
  let encoded: string;
  if (typeof btoa === 'function') {
    encoded = btoa(`${serverKey}:`);
  } else if (typeof Buffer !== 'undefined') {
    encoded = Buffer.from(`${serverKey}:`).toString('base64');
  } else {
    throw new Error('No base64 encoding function available in runtime.');
  }

  return `Basic ${encoded}`;
}
