import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isSnapReady, SNAP_SCRIPT_ID } from './useSnapScript';
import * as midtransConfig from '../../services/payment/midtransConfig';

describe('useSnapScript & Midtrans Client Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof (globalThis as any).window !== 'undefined') {
      delete (globalThis as any).window.snap;
    }
  });

  afterEach(() => {
    if (typeof (globalThis as any).window !== 'undefined') {
      delete (globalThis as any).window.snap;
    }
  });

  it('1. isSnapReady detects presence of window.snap.pay', () => {
    (globalThis as any).window = {
      snap: {
        pay: vi.fn(),
      },
    };

    expect(isSnapReady()).toBe(true);
  });

  it('2. isSnapReady returns false when window.snap is undefined', () => {
    (globalThis as any).window = {};

    expect(isSnapReady()).toBe(false);
  });

  it('3. resolves correct Sandbox Snap.js URL and client key from client configuration', () => {
    const config = midtransConfig.getClientMidtransConfig();
    expect(config.snapJsUrl).toBe('https://app.sandbox.midtrans.com/snap/snap.js');
    expect(config.isProduction).toBe(false);
  });

  it('4. uses designated SNAP_SCRIPT_ID constant for DOM deduplication', () => {
    expect(SNAP_SCRIPT_ID).toBe('midtrans-snap-script');
  });
});
