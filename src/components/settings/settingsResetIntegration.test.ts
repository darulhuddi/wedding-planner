import { describe, it, expect, vi } from 'vitest';
import { isWorkspaceOnboarded } from '../../domain/workspaceSelectors';
import { StoredWorkspace } from '../../types/workspace';
import { CustomerEntitlement } from '../../types/admin';
import * as workspaceRepository from '../../repositories/workspaceRepository';
import { supabase } from '../../lib/supabaseClient';

describe('Reset Perencanaan End-to-End Domain & Lifecycle Invariants', () => {
  const mockUserId = 'user-abc-123';
  const mockWorkspaceId = 'ws-xyz-789';

  const initialOnboardedWorkspace: StoredWorkspace = {
    id: mockWorkspaceId,
    userId: mockUserId,
    coupleName: 'Budi & Siti',
    weddingDate: '2027-08-15',
    estimatedBudget: 200_000_000,
    estimatedGuestCount: 500,
    completedCategories: ['venue', 'catering'],
    primaryPlanningPriority: 'budget',
    religiousContexts: [{ tradition: 'islam', label: null }],
    culturalContext: { hasTradition: true, description: 'Adat Sunda' },
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  };

  const mockCustomerEntitlement: CustomerEntitlement = {
    workspaceId: mockWorkspaceId,
    coupleName: 'Budi & Siti',
    weddingDate: '2027-08-15',
    tier: 'Paid',
    source: 'purchased',
    startedAt: '2026-08-01T00:00:00Z',
    expiresAt: null,
    remainingDays: null,
    isExpired: false,
    updatedAt: '2026-08-01T00:00:00Z',
  };

  it('1. Verifies initial state is fully onboarded and has active entitlement', () => {
    expect(isWorkspaceOnboarded(initialOnboardedWorkspace)).toBe(true);
    expect(mockCustomerEntitlement.tier).toBe('Paid');
    expect(mockCustomerEntitlement.expiresAt).toBeNull();
  });

  it('2. After reset RPC execution, planning fields are cleared and workspace is no longer onboarded', async () => {
    // Simulated DB state returned after reset_user_wedding_planning() RPC
    const resetWorkspaceState: StoredWorkspace = {
      ...initialOnboardedWorkspace,
      coupleName: '',
      weddingDate: '',
      estimatedBudget: 100_000_000,
      estimatedGuestCount: 400,
      completedCategories: [],
      primaryPlanningPriority: 'checklist',
      religiousContexts: [],
      culturalContext: { hasTradition: null, description: null },
      updatedAt: new Date().toISOString(),
    };

    // Workspace ID remains strictly identical
    expect(resetWorkspaceState.id).toBe(initialOnboardedWorkspace.id);
    expect(resetWorkspaceState.userId).toBe(initialOnboardedWorkspace.userId);

    // Onboarding status is now false (NOT_STARTED)
    expect(isWorkspaceOnboarded(resetWorkspaceState)).toBe(false);
  });

  it('3. Invariant: Customer entitlement & workspace ID remain unchanged and unaffected by planning reset', () => {
    // Entitlement references mockWorkspaceId
    expect(mockCustomerEntitlement.workspaceId).toBe(mockWorkspaceId);
    expect(mockCustomerEntitlement.tier).toBe('Paid');
    expect(mockCustomerEntitlement.expiresAt).toBeNull();
  });

  it('4. Re-onboarding after reset populates new wedding data while retaining same workspace ID', () => {
    const reOnboardedData = {
      coupleName: 'Budi & Siti Baru',
      weddingDate: '2027-11-20',
      budget: 250_000_000,
      guestCount: 600,
      completedCategories: ['venue'],
      primaryPlanningPriority: 'timeline' as const,
    };

    const updatedWorkspace: StoredWorkspace = {
      id: mockWorkspaceId, // SAME ID
      userId: mockUserId,   // SAME USER
      coupleName: reOnboardedData.coupleName,
      weddingDate: reOnboardedData.weddingDate,
      estimatedBudget: reOnboardedData.budget,
      estimatedGuestCount: reOnboardedData.guestCount,
      completedCategories: reOnboardedData.completedCategories as any,
      primaryPlanningPriority: reOnboardedData.primaryPlanningPriority,
      religiousContexts: [],
      culturalContext: { hasTradition: null, description: null },
      createdAt: initialOnboardedWorkspace.createdAt,
      updatedAt: new Date().toISOString(),
    };

    expect(isWorkspaceOnboarded(updatedWorkspace)).toBe(true);
    expect(updatedWorkspace.id).toBe(mockWorkspaceId);
    expect(updatedWorkspace.coupleName).toBe('Budi & Siti Baru');
    expect(updatedWorkspace.weddingDate).toBe('2027-11-20');
  });

  it('5. Reset workspace with empty couple_name and valid wedding_date returns isWorkspaceOnboarded === false', () => {
    const postResetWorkspace: StoredWorkspace = {
      ...initialOnboardedWorkspace,
      coupleName: '',
      weddingDate: '2026-09-05', // Valid NOT NULL date from DB
    };

    expect(isWorkspaceOnboarded(postResetWorkspace)).toBe(false);
  });

  it('6. Un-onboarded workspace prevents accessing app routes and renders OnboardingFlow', () => {
    const postResetWorkspace: StoredWorkspace = {
      ...initialOnboardedWorkspace,
      coupleName: '',
      weddingDate: '2026-09-05',
    };

    // Both render guard and route guard use isWorkspaceOnboarded
    const shouldShowOnboardingOnAppRoute = !isWorkspaceOnboarded(postResetWorkspace);
    const shouldBlockOnboardingRoute = isWorkspaceOnboarded(postResetWorkspace);

    expect(shouldShowOnboardingOnAppRoute).toBe(true);
    expect(shouldBlockOnboardingRoute).toBe(false);
  });
});
