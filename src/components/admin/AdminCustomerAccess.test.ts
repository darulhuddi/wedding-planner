import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CustomerEntitlement,
  CustomerAccessHistoryItem,
  ExtendTrialPayload,
  GrantWeddingPassPayload,
  DEFAULT_ADMIN_ACCESS_CONFIG,
} from '../../types/admin';
import {
  calculateExtendedExpiryDate,
  calculateWeddingPassExpiryDate,
  formatAccessSourceLabel,
  formatAccessEventDescription,
  deriveCustomerAccessDetail,
} from '../../domain/adminSelectors';
import {
  fetchCustomerEntitlement,
  fetchCustomerAccessHistory,
  extendCustomerTrialInDb,
  grantComplimentaryWeddingPassInDb,
} from '../../repositories/supabaseAdminAdapter';
import * as adminRepository from '../../repositories/adminRepository';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Individual Customer Access Management V1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Domain Selectors & Business Logic', () => {
    const fixedNow = new Date('2026-09-04T12:00:00Z');

    it('extends trial smoothly without penalizing remaining days', () => {
      const futureExpiry = '2026-09-11T12:00:00.000Z'; // 7 days remaining
      const newExpiry = calculateExtendedExpiryDate(futureExpiry, 7, fixedNow);
      expect(newExpiry).toBe('2026-09-18T12:00:00.000Z'); // 14 days total
    });

    it('extends trial starting from today if current trial is already expired', () => {
      const pastExpiry = '2026-08-20T12:00:00.000Z';
      const newExpiry = calculateExtendedExpiryDate(pastExpiry, 3, fixedNow);
      expect(newExpiry).toBe('2026-09-07T12:00:00.000Z');
    });

    it('calculates complimentary wedding pass expiration until wedding date + grace period', () => {
      const weddingDate = '2026-11-20T00:00:00.000Z';
      const expiry = calculateWeddingPassExpiryDate(
        weddingDate,
        30,
        'until_wedding_day',
        18,
        fixedNow
      );
      expect(expiry).toBe('2026-12-20T00:00:00.000Z');
    });

    it('formats access source labels cleanly in Indonesian', () => {
      expect(formatAccessSourceLabel('complimentary')).toBe('Wedding Pass (Complimentary)');
      expect(formatAccessSourceLabel('purchased')).toBe('Wedding Pass (Pembelian)');
      expect(formatAccessSourceLabel('trial')).toBe('Free Trial (Sistem)');
    });

    it('formats audit log event descriptions accurately', () => {
      const extEvent = formatAccessEventDescription('trial_extended', {
        daysAdded: 14,
        newExpiresAt: '2026-09-25T00:00:00.000Z',
        reason: 'Customer need',
      });
      expect(extEvent.title).toBe('Perpanjangan Trial (+14 Hari)');
      expect(extEvent.description).toContain('25 Sep 2026');
      expect(extEvent.description).toContain('Customer need');

      const grantEvent = formatAccessEventDescription('wedding_pass_granted', {
        newExpiresAt: '2026-12-31T00:00:00.000Z',
        reason: 'VIP',
      });
      expect(grantEvent.title).toBe('Wedding Pass Diberikan (Complimentary)');
      expect(grantEvent.description).toContain('31 Des 2026');
    });
  });

  describe('Repository & Supabase Adapter Layer', () => {
    it('fetches customer entitlement from database when record exists', async () => {
      const mockWorkspace = {
        id: 'ws-123',
        couple_name: 'Budi & Siti',
        wedding_date: '2026-10-15',
        created_at: '2026-09-01T10:00:00Z',
        updated_at: '2026-09-02T10:00:00Z',
      };

      const mockEntitlement = {
        workspace_id: 'ws-123',
        tier: 'Paid',
        source: 'complimentary',
        started_at: '2026-09-02T10:00:00Z',
        expires_at: '2026-11-15T00:00:00Z',
        granted_by: 'admin@wedflow.id',
        notes: 'VIP Family',
        updated_at: '2026-09-02T10:00:00Z',
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockWorkspace, error: null }),
              }),
            }),
          };
        }
        if (table === 'customer_access_entitlements') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockEntitlement, error: null }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await fetchCustomerEntitlement('ws-123');
      expect(result).not.toBeNull();
      expect(result?.coupleName).toBe('Budi & Siti');
      expect(result?.tier).toBe('Paid');
      expect(result?.source).toBe('complimentary');
      expect(result?.grantedBy).toBe('admin@wedflow.id');
      expect(result?.notes).toBe('VIP Family');
    });

    it('falls back to default trial calculation when no custom entitlement exists', async () => {
      const mockWorkspace = {
        id: 'ws-456',
        couple_name: 'Rian & Maya',
        wedding_date: '2026-12-01',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockWorkspace, error: null }),
              }),
            }),
          };
        }
        if (table === 'customer_access_entitlements') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        if (table === 'platform_configurations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { value: DEFAULT_ADMIN_ACCESS_CONFIG },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const result = await fetchCustomerEntitlement('ws-456');
      expect(result).not.toBeNull();
      expect(result?.tier).toBe('Trial');
      expect(result?.source).toBe('trial');
      expect(result?.remainingDays).toBeGreaterThan(0);
    });

    it('records trial extension and writes audit history log', async () => {
      const mockWorkspace = {
        id: 'ws-extend-1',
        couple_name: 'Dimas & Anisa',
        wedding_date: '2026-11-01',
        created_at: '2026-09-01T10:00:00Z',
        updated_at: '2026-09-01T10:00:00Z',
      };

      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      const insertMock = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockWorkspace, error: null }),
              }),
            }),
          };
        }
        if (table === 'customer_access_entitlements') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    workspace_id: 'ws-extend-1',
                    tier: 'Trial',
                    source: 'trial',
                    started_at: '2026-09-01T10:00:00Z',
                    expires_at: '2026-09-15T10:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
            upsert: upsertMock,
          };
        }
        if (table === 'customer_access_history') {
          return {
            insert: insertMock,
          };
        }
        return { select: vi.fn() };
      });

      const payload: ExtendTrialPayload = {
        daysToAdd: 7,
        reason: 'Customer requested 7 more days',
        actorId: 'admin@wedflow.id',
      };

      const result = await extendCustomerTrialInDb('ws-extend-1', payload);

      expect(upsertMock).toHaveBeenCalled();
      expect(insertMock).toHaveBeenCalled();
      expect(result.workspaceId).toBe('ws-extend-1');
    });

    it('records complimentary wedding pass grant and writes audit history log', async () => {
      const mockWorkspace = {
        id: 'ws-grant-1',
        couple_name: 'Reza & Sarah',
        wedding_date: '2026-12-25',
        created_at: '2026-09-01T10:00:00Z',
        updated_at: '2026-09-01T10:00:00Z',
      };

      const upsertMock = vi.fn().mockResolvedValue({ error: null });
      const insertMock = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockWorkspace, error: null }),
              }),
            }),
          };
        }
        if (table === 'customer_access_entitlements') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    workspace_id: 'ws-grant-1',
                    tier: 'Paid',
                    source: 'complimentary',
                    started_at: '2026-09-04T10:00:00Z',
                    expires_at: '2027-01-25T00:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
            upsert: upsertMock,
          };
        }
        if (table === 'customer_access_history') {
          return {
            insert: insertMock,
          };
        }
        if (table === 'platform_configurations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { value: DEFAULT_ADMIN_ACCESS_CONFIG },
                  error: null,
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const payload: GrantWeddingPassPayload = {
        accessDurationRule: 'until_wedding_day',
        reason: 'VIP Sponsorship',
        actorId: 'admin@wedflow.id',
      };

      const result = await grantComplimentaryWeddingPassInDb('ws-grant-1', payload);

      expect(upsertMock).toHaveBeenCalled();
      expect(insertMock).toHaveBeenCalled();
      expect(result.tier).toBe('Paid');
      expect(result.source).toBe('complimentary');
    });

    it('fetches customer access history list correctly', async () => {
      const mockHistoryRows = [
        {
          id: 'hist-1',
          workspace_id: 'ws-hist-1',
          event_type: 'trial_extended',
          source: 'admin',
          actor_id: 'admin@wedflow.id',
          metadata: { daysAdded: 7, reason: 'Demo test' },
          created_at: '2026-09-04T10:00:00Z',
        },
      ];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'customer_access_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockHistoryRows, error: null }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      const history = await fetchCustomerAccessHistory('ws-hist-1');
      expect(history).toHaveLength(1);
      expect(history[0].eventType).toBe('trial_extended');
      expect(history[0].metadata.daysAdded).toBe(7);
    });
  });

  describe('Repository Facade Layer', () => {
    it('exposes customer entitlement methods via adminRepository', async () => {
      expect(typeof adminRepository.getCustomerEntitlement).toBe('function');
      expect(typeof adminRepository.getCustomerAccessHistory).toBe('function');
      expect(typeof adminRepository.extendCustomerTrial).toBe('function');
      expect(typeof adminRepository.grantComplimentaryWeddingPass).toBe('function');
    });
  });
});
