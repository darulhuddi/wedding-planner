import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AdminAccessConfig,
  DEFAULT_ADMIN_ACCESS_CONFIG,
} from '../../types/admin';
import {
  validateAccessConfig,
  formatAdminPrice,
  getWeddingPassDurationDescription,
} from '../../domain/adminSelectors';
import {
  fetchAccessConfig,
  saveAccessConfig,
} from '../../repositories/supabaseAdminAdapter';
import * as adminRepository from '../../repositories/adminRepository';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Admin Access & Monetization Configuration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Default Configuration Schema', () => {
    it('provides sensible initial business defaults', () => {
      expect(DEFAULT_ADMIN_ACCESS_CONFIG.trialEnabled).toBe(true);
      expect(DEFAULT_ADMIN_ACCESS_CONFIG.trialDurationDays).toBe(14);
      expect(DEFAULT_ADMIN_ACCESS_CONFIG.trialStartTrigger).toBe('account_created');
      expect(DEFAULT_ADMIN_ACCESS_CONFIG.trialGracePeriodDays).toBe(0);

      expect(DEFAULT_ADMIN_ACCESS_CONFIG.weddingPassEnabled).toBe(true);
      expect(DEFAULT_ADMIN_ACCESS_CONFIG.price).toBe(199000);
      expect(DEFAULT_ADMIN_ACCESS_CONFIG.currency).toBe('IDR');
      expect(DEFAULT_ADMIN_ACCESS_CONFIG.accessDurationRule).toBe('unlimited');
      expect(DEFAULT_ADMIN_ACCESS_CONFIG.maxDurationMonths).toBe(18);
      expect(DEFAULT_ADMIN_ACCESS_CONFIG.postWeddingGracePeriodDays).toBe(30);
    });
  });

  describe('Configuration Validation (validateAccessConfig)', () => {
    it('validates a correct configuration successfully', () => {
      const validConfig: AdminAccessConfig = {
        ...DEFAULT_ADMIN_ACCESS_CONFIG,
        trialDurationDays: 14,
        price: 249000,
      };

      const result = validateAccessConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('rejects non-positive trial duration', () => {
      const invalidConfig: AdminAccessConfig = {
        ...DEFAULT_ADMIN_ACCESS_CONFIG,
        trialDurationDays: 0,
      };

      const result = validateAccessConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.trialDurationDays).toBeDefined();
    });

    it('rejects negative grace period', () => {
      const invalidConfig: AdminAccessConfig = {
        ...DEFAULT_ADMIN_ACCESS_CONFIG,
        trialGracePeriodDays: -1,
      };

      const result = validateAccessConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.trialGracePeriodDays).toBeDefined();
    });

    it('rejects negative price', () => {
      const invalidConfig: AdminAccessConfig = {
        ...DEFAULT_ADMIN_ACCESS_CONFIG,
        price: -50000,
      };

      const result = validateAccessConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.price).toBeDefined();
    });

    it('rejects empty currency string', () => {
      const invalidConfig: AdminAccessConfig = {
        ...DEFAULT_ADMIN_ACCESS_CONFIG,
        currency: '   ',
      };

      const result = validateAccessConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.currency).toBeDefined();
    });

    it('rejects non-positive max duration months', () => {
      const invalidConfig: AdminAccessConfig = {
        ...DEFAULT_ADMIN_ACCESS_CONFIG,
        maxDurationMonths: 0,
      };

      const result = validateAccessConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.maxDurationMonths).toBeDefined();
    });

    it('rejects negative post wedding grace period', () => {
      const invalidConfig: AdminAccessConfig = {
        ...DEFAULT_ADMIN_ACCESS_CONFIG,
        postWeddingGracePeriodDays: -5,
      };

      const result = validateAccessConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.postWeddingGracePeriodDays).toBeDefined();
    });
  });

  describe('Price & Duration Formatting Helpers', () => {
    it('formats price in Indonesian Rupiah format', () => {
      expect(formatAdminPrice(199000, 'IDR')).toBe('Rp199.000');
      expect(formatAdminPrice(250000, 'IDR')).toBe('Rp250.000');
      expect(formatAdminPrice(0, 'IDR')).toBe('Rp0');
    });

    it('formats duration description for until_wedding_day rule', () => {
      const configWithGrace: AdminAccessConfig = {
        ...DEFAULT_ADMIN_ACCESS_CONFIG,
        accessDurationRule: 'until_wedding_day',
        postWeddingGracePeriodDays: 30,
      };
      expect(getWeddingPassDurationDescription(configWithGrace)).toBe(
        'Akses penuh sampai hari-H (+ 30 hari)'
      );

      const configWithoutGrace: AdminAccessConfig = {
        ...DEFAULT_ADMIN_ACCESS_CONFIG,
        accessDurationRule: 'until_wedding_day',
        postWeddingGracePeriodDays: 0,
      };
      expect(getWeddingPassDurationDescription(configWithoutGrace)).toBe(
        'Akses penuh sampai hari-H'
      );
    });

    it('formats duration description for fixed_duration rule', () => {
      const configFixed: AdminAccessConfig = {
        ...DEFAULT_ADMIN_ACCESS_CONFIG,
        accessDurationRule: 'fixed_duration',
        maxDurationMonths: 12,
      };
      expect(getWeddingPassDurationDescription(configFixed)).toBe(
        'Akses penuh selama 12 bulan'
      );
    });
  });

  describe('Supabase Adapter Integration (fetchAccessConfig & saveAccessConfig)', () => {
    it('returns saved configuration from database when row exists', async () => {
      const customConfig: AdminAccessConfig = {
        ...DEFAULT_ADMIN_ACCESS_CONFIG,
        price: 299000,
        trialDurationDays: 7,
      };

      const fromMock = vi.mocked(supabase.from);
      fromMock.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                value: customConfig,
                updated_at: '2026-09-04T10:00:00Z',
              },
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await fetchAccessConfig();
      expect(result.price).toBe(299000);
      expect(result.trialDurationDays).toBe(7);
      expect(result.updatedAt).toBe('2026-09-04T10:00:00Z');
    });

    it('returns DEFAULT_ADMIN_ACCESS_CONFIG fallback when database has no record', async () => {
      const fromMock = vi.mocked(supabase.from);
      fromMock.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await fetchAccessConfig();
      expect(result.price).toBe(DEFAULT_ADMIN_ACCESS_CONFIG.price);
      expect(result.trialDurationDays).toBe(DEFAULT_ADMIN_ACCESS_CONFIG.trialDurationDays);
    });

    it('persists updated configuration via upsert', async () => {
      const updatedConfig: AdminAccessConfig = {
        ...DEFAULT_ADMIN_ACCESS_CONFIG,
        price: 349000,
      };

      const fromMock = vi.mocked(supabase.from);
      fromMock.mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                value: updatedConfig,
                updated_at: '2026-09-04T11:00:00Z',
              },
              error: null,
            }),
          }),
        }),
      } as any);

      const saved = await saveAccessConfig(updatedConfig);
      expect(saved.price).toBe(349000);
      expect(saved.updatedAt).toBe('2026-09-04T11:00:00Z');
    });
  });
});
