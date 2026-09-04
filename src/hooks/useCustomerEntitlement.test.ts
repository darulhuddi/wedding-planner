import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  deriveCustomerEntitlementState,
} from './useCustomerEntitlement';
import * as workspaceRepository from '../repositories/workspaceRepository';
import { CustomerEntitlement } from '../types/admin';

vi.mock('../repositories/workspaceRepository', () => ({
  getCustomerEntitlement: vi.fn(),
}));

describe('useCustomerEntitlement & deriveCustomerEntitlementState', () => {
  const dummyRefresh = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deriveCustomerEntitlementState', () => {
    it('1. handles null entitlement with default Trial fallback state', () => {
      const state = deriveCustomerEntitlementState(null, false, null, dummyRefresh);

      expect(state.entitlement).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.tier).toBe('Trial');
      expect(state.source).toBe('trial');
      expect(state.remainingDays).toBe(0);
      expect(state.isExpired).toBe(false);
      expect(state.isPaid).toBe(false);
      expect(state.isTrial).toBe(true);
      expect(state.isComplimentary).toBe(false);
      expect(state.expiresAt).toBeNull();
    });

    it('2. derives active trial state correctly with remaining days', () => {
      const mockTrial: CustomerEntitlement = {
        workspaceId: 'ws-trial-1',
        coupleName: 'Budi & Ani',
        weddingDate: '2026-11-20',
        tier: 'Trial',
        source: 'trial',
        startedAt: '2026-09-01T00:00:00Z',
        expiresAt: '2026-09-15T00:00:00Z',
        remainingDays: 5,
        isExpired: false,
        updatedAt: '2026-09-01T00:00:00Z',
      };

      const state = deriveCustomerEntitlementState(mockTrial, false, null, dummyRefresh);

      expect(state.tier).toBe('Trial');
      expect(state.source).toBe('trial');
      expect(state.remainingDays).toBe(5);
      expect(state.isExpired).toBe(false);
      expect(state.isPaid).toBe(false);
      expect(state.isTrial).toBe(true);
      expect(state.isComplimentary).toBe(false);
      expect(state.expiresAt).toBe('2026-09-15T00:00:00Z');
    });

    it('3. derives expired trial state correctly', () => {
      const mockExpired: CustomerEntitlement = {
        workspaceId: 'ws-exp-1',
        coupleName: 'Reza & Maya',
        tier: 'Expired',
        source: 'trial',
        startedAt: '2026-08-01T00:00:00Z',
        expiresAt: '2026-08-15T00:00:00Z',
        remainingDays: 0,
        isExpired: true,
        updatedAt: '2026-08-15T00:00:00Z',
      };

      const state = deriveCustomerEntitlementState(mockExpired, false, null, dummyRefresh);

      expect(state.tier).toBe('Expired');
      expect(state.isExpired).toBe(true);
      expect(state.isPaid).toBe(false);
      expect(state.isTrial).toBe(false);
    });

    it('4. derives paid purchased entitlement correctly', () => {
      const mockPaid: CustomerEntitlement = {
        workspaceId: 'ws-paid-1',
        coupleName: 'Dika & Rani',
        weddingDate: '2026-12-25',
        tier: 'Paid',
        source: 'purchased',
        startedAt: '2026-09-04T00:00:00Z',
        expiresAt: '2027-01-25T00:00:00Z',
        remainingDays: 143,
        isExpired: false,
        updatedAt: '2026-09-04T00:00:00Z',
      };

      const state = deriveCustomerEntitlementState(mockPaid, false, null, dummyRefresh);

      expect(state.tier).toBe('Paid');
      expect(state.source).toBe('purchased');
      expect(state.isPaid).toBe(true);
      expect(state.isTrial).toBe(false);
      expect(state.isComplimentary).toBe(false);
      expect(state.isExpired).toBe(false);
    });

    it('5. derives complimentary access entitlement correctly', () => {
      const mockComplimentary: CustomerEntitlement = {
        workspaceId: 'ws-comp-1',
        coupleName: 'Fajar & Sarah',
        weddingDate: '2026-10-10',
        tier: 'Paid',
        source: 'complimentary',
        startedAt: '2026-09-04T00:00:00Z',
        expiresAt: '2026-11-10T00:00:00Z',
        remainingDays: 67,
        isExpired: false,
        updatedAt: '2026-09-04T00:00:00Z',
      };

      const state = deriveCustomerEntitlementState(mockComplimentary, false, null, dummyRefresh);

      expect(state.tier).toBe('Paid');
      expect(state.source).toBe('complimentary');
      expect(state.isPaid).toBe(true);
      expect(state.isComplimentary).toBe(true);
      expect(state.isTrial).toBe(false);
    });

    it('6. propagates error state and loading flags properly', () => {
      const loadingState = deriveCustomerEntitlementState(null, true, null, dummyRefresh);
      expect(loadingState.isLoading).toBe(true);

      const errorState = deriveCustomerEntitlementState(null, false, 'Network error', dummyRefresh);
      expect(errorState.isLoading).toBe(false);
      expect(errorState.error).toBe('Network error');
    });
  });

  describe('Repository integration delegation', () => {
    it('workspaceRepository.getCustomerEntitlement can be invoked with workspaceId', async () => {
      const mockResult: CustomerEntitlement = {
        workspaceId: 'ws-test',
        tier: 'Paid',
        source: 'purchased',
        remainingDays: 30,
        isExpired: false,
        startedAt: '2026-09-01T00:00:00Z',
        expiresAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      };

      (workspaceRepository.getCustomerEntitlement as any).mockResolvedValueOnce(mockResult);

      const res = await workspaceRepository.getCustomerEntitlement('ws-test');
      expect(res).toEqual(mockResult);
      expect(workspaceRepository.getCustomerEntitlement).toHaveBeenCalledWith('ws-test');
    });
  });
});
