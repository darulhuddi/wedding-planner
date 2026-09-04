/**
 * WedFlow Customer Access Hook — useCustomerEntitlement
 *
 * Exposes the authenticated couple's current entitlement state.
 * Uses Supabase customer_access_entitlements via repository as source of truth.
 *
 * Guarantees:
 * - Read-only representation layer.
 * - Never mutates entitlements client-side.
 * - Provides clean refresh() trigger for post-payment status updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { CustomerEntitlement, AdminAccessTier, CustomerAccessSource } from '../types/admin';
import * as workspaceRepository from '../repositories/workspaceRepository';

export interface CustomerEntitlementState {
  entitlement: CustomerEntitlement | null;
  isLoading: boolean;
  error: string | null;
  tier: AdminAccessTier;
  source: CustomerAccessSource;
  remainingDays: number | null;
  isExpired: boolean;
  expiresAt: string | null;
  isPaid: boolean;
  isTrial: boolean;
  isComplimentary: boolean;
  refresh: () => Promise<void>;
}

export function deriveCustomerEntitlementState(
  entitlement: CustomerEntitlement | null,
  isLoading: boolean,
  error: string | null,
  refresh: () => Promise<void>
): CustomerEntitlementState {
  const tier: AdminAccessTier = entitlement?.tier || 'Trial';
  const source: CustomerAccessSource = entitlement?.source || 'trial';

  const isPaid = tier === 'Paid';
  const isTrial = tier === 'Trial';
  const isComplimentary = source === 'complimentary';

  const remainingDays: number | null = isPaid ? null : (entitlement?.remainingDays ?? 0);
  const isExpired: boolean = isPaid ? false : (entitlement?.isExpired ?? (tier === 'Expired'));
  const expiresAt: string | null = isPaid ? null : (entitlement?.expiresAt || null);

  return {
    entitlement,
    isLoading,
    error,
    tier,
    source,
    remainingDays,
    isExpired,
    expiresAt,
    isPaid,
    isTrial,
    isComplimentary,
    refresh,
  };
}

export function useCustomerEntitlement(workspaceId?: string | null): CustomerEntitlementState {
  const [entitlement, setEntitlement] = useState<CustomerEntitlement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntitlement = useCallback(async () => {
    if (!workspaceId) {
      setEntitlement(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await workspaceRepository.getCustomerEntitlement(workspaceId);
      setEntitlement(data);
    } catch (err: unknown) {
      console.warn('[useCustomerEntitlement] Warning fetching customer entitlement:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat status akses.');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchEntitlement();
  }, [fetchEntitlement]);

  return deriveCustomerEntitlementState(entitlement, isLoading, error, fetchEntitlement);
}
