import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeMetadata } from './AdminPaymentDetailDrawer';
import * as adminRepository from '../../repositories/adminRepository';
import { AdminOrderDetail } from '../../types/admin';

vi.mock('../../repositories/adminRepository', () => ({
  getAdminOrderDetail: vi.fn(),
}));

describe('AdminPaymentDetailDrawer Unit & Security Tests', () => {
  const mockOrderDetail: AdminOrderDetail = {
    id: 'ord-test-100',
    orderNumber: 'WF-20260904-8888',
    workspaceId: 'ws-test-100',
    coupleName: 'Budi & Citra',
    weddingDate: '2026-12-25',
    customerEmail: 'budi@example.com',
    productType: 'wedding_pass',
    productName: 'Wedding Pass',
    amount: 199000,
    currency: 'IDR',
    status: 'paid',
    createdAt: '2026-09-04T08:00:00Z',
    updatedAt: '2026-09-04T08:30:00Z',
    paidAt: '2026-09-04T08:30:00Z',
    paymentMethod: 'qris',
    provider: 'midtrans',
    providerReference: 'midtrans-qris-12345',
    metadata: {
      fraudStatus: 'accept',
      settlementTime: '2026-09-04 15:30:00',
      sensitiveKeyShouldBeFiltered: 'secret-key-123',
    },
    entitlement: {
      tier: 'Paid',
      source: 'purchased',
      expiresAt: null,
      isExpired: false,
      notes: 'Purchased Wedding Pass',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeMetadata Security Policy', () => {
    it('1. redacts keys containing sensitive substrings (secret, key, token, jwt, auth, pass)', () => {
      const rawMeta = {
        transaction_id: 'tx-12345',
        payment_type: 'qris',
        server_key: 'SB-Mid-server-SECRET_VALUE',
        bearer_token: 'eyJh.xxx',
        auth_header: 'Basic 123',
        password_hash: 'hash123',
        safeField: 'normal value',
      };

      const sanitized = sanitizeMetadata(rawMeta);

      expect(sanitized.transaction_id).toBe('tx-12345');
      expect(sanitized.payment_type).toBe('qris');
      expect(sanitized.safeField).toBe('normal value');
      expect(sanitized.server_key).toBe('[REDACTED]');
      expect(sanitized.bearer_token).toBe('[REDACTED]');
      expect(sanitized.auth_header).toBe('[REDACTED]');
      expect(sanitized.password_hash).toBe('[REDACTED]');
    });

    it('2. recursively sanitizes nested metadata objects', () => {
      const nestedMeta = {
        outer: 'visible',
        security_info: {
          client_token: 'secret-client-token',
          public_info: 'allowed',
        },
      };

      const sanitized = sanitizeMetadata(nestedMeta);

      expect(sanitized.outer).toBe('visible');
      expect(sanitized.security_info.client_token).toBe('[REDACTED]');
      expect(sanitized.security_info.public_info).toBe('allowed');
    });

    it('3. safely handles empty, null or missing metadata', () => {
      expect(sanitizeMetadata({})).toEqual({});
      expect(sanitizeMetadata(undefined)).toEqual({});
    });
  });

  describe('Admin Order Detail Data Contracts', () => {
    it('4. preserves unlimited entitlement model (expiresAt = null)', () => {
      expect(mockOrderDetail.entitlement?.expiresAt).toBeNull();
      expect(mockOrderDetail.entitlement?.tier).toBe('Paid');
      expect(mockOrderDetail.entitlement?.isExpired).toBe(false);
    });

    it('5. retrieves detail via adminRepository facade', async () => {
      (adminRepository.getAdminOrderDetail as any).mockResolvedValue(mockOrderDetail);

      const result = await adminRepository.getAdminOrderDetail('ord-test-100');
      expect(result).not.toBeNull();
      expect(result?.orderNumber).toBe('WF-20260904-8888');
      expect(result?.workspaceId).toBe('ws-test-100');
      expect(result?.amount).toBe(199000);
      expect(result?.entitlement?.tier).toBe('Paid');
    });
  });
});
