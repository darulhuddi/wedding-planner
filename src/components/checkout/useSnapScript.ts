/**
 * WedFlow Checkout — Midtrans Snap.js Loader Hook
 *
 * Dynamically loads Snap.js script into the browser context.
 * Guarantees:
 * - Uses client configuration only (no server key exposure).
 * - Appends script only once (checks for existing DOM element #midtrans-snap-script).
 * - Reacts cleanly to environment changes (sandbox by default).
 */

import { useState, useEffect } from 'react';
import { getClientMidtransConfig } from '../../services/payment/midtransConfig';

export interface SnapPayOptions {
  onSuccess?: (result: any) => void;
  onPending?: (result: any) => void;
  onError?: (result: any) => void;
  onClose?: () => void;
}

export interface SnapInstance {
  pay: (token: string, options?: SnapPayOptions) => void;
  embed?: (token: string, options?: any) => void;
}

declare global {
  interface Window {
    snap?: SnapInstance;
  }
}

export interface UseSnapScriptResult {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

export const SNAP_SCRIPT_ID = 'midtrans-snap-script';

export function isSnapReady(): boolean {
  return typeof window !== 'undefined' && typeof window.snap?.pay === 'function';
}

export function useSnapScript(): UseSnapScriptResult {
  const [isLoaded, setIsLoaded] = useState<boolean>(() => isSnapReady());
  const [isLoading, setIsLoading] = useState<boolean>(() => typeof window !== 'undefined' && !isSnapReady());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      setIsLoading(false);
      return;
    }

    // 1. If window.snap is already present and ready
    if (isSnapReady()) {
      setIsLoaded(true);
      setIsLoading(false);
      return;
    }

    const { clientKey, snapJsUrl } = getClientMidtransConfig();

    // 2. Check if script tag is already attached
    let scriptElement = document.getElementById(SNAP_SCRIPT_ID) as HTMLScriptElement | null;

    if (scriptElement) {
      if (isSnapReady()) {
        setIsLoaded(true);
        setIsLoading(false);
        return;
      }

      const handleLoad = () => {
        setIsLoaded(true);
        setIsLoading(false);
      };

      const handleError = () => {
        setError('Gagal memuat skrip pembayaran Midtrans.');
        setIsLoading(false);
      };

      scriptElement.addEventListener('load', handleLoad);
      scriptElement.addEventListener('error', handleError);

      return () => {
        scriptElement?.removeEventListener('load', handleLoad);
        scriptElement?.removeEventListener('error', handleError);
      };
    }

    // 3. Create and append new script tag
    setIsLoading(true);
    setError(null);

    scriptElement = document.createElement('script');
    scriptElement.id = SNAP_SCRIPT_ID;
    scriptElement.src = snapJsUrl;
    scriptElement.type = 'text/javascript';
    scriptElement.async = true;

    if (clientKey) {
      scriptElement.setAttribute('data-client-key', clientKey);
    }

    const handleLoad = () => {
      setIsLoaded(true);
      setIsLoading(false);
    };

    const handleError = () => {
      setError('Gagal memuat skrip pembayaran Midtrans.');
      setIsLoading(false);
    };

    scriptElement.addEventListener('load', handleLoad);
    scriptElement.addEventListener('error', handleError);

    if (document.head) {
      document.head.appendChild(scriptElement);
    }

    return () => {
      scriptElement?.removeEventListener('load', handleLoad);
      scriptElement?.removeEventListener('error', handleError);
    };
  }, []);

  return { isLoaded, isLoading, error };
}
