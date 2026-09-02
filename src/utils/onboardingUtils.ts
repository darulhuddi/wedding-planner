/**
 * WedFlow Onboarding Utilities
 *
 * Pure utilities for the onboarding flow.
 * No localStorage access — persistence is handled by workspaceRepository.
 *
 * createStoredWorkspace() produces a lean StoredWorkspace (no derived values).
 * Derived values (daysUntilWedding, formattedDate, NBA, etc.) are computed by
 * deriveWorkspaceViewModel() in domain/workspaceSelectors.ts.
 */

import { OnboardingData, CategoryId } from '../types/onboarding';
import { StoredWorkspace } from '../types/workspace';

// Re-export formatting and date utilities from domain/workspaceSelectors
// so that onboarding step components can continue importing from here.
export {
  calculateDaysUntilWedding,
  formatIndonesianDate,
  formatRupiahNumber,
  getDaysUntilWedding,
} from '../domain/workspaceSelectors';

/**
 * Parses user input currency string back to raw number.
 * e.g. "Rp 100.000.000" → 100000000
 */
export function parseRupiahInput(str: string): number {
  const digitsOnly = str.replace(/\D/g, '');
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}

/**
 * Creates a lean StoredWorkspace from onboarding form data.
 * Only source data is stored — no formatted strings or computed values.
 * Call deriveWorkspaceViewModel() afterwards to get display values.
 */
export function createStoredWorkspace(data: OnboardingData): StoredWorkspace {
  const now = new Date().toISOString();
  return {
    id: `workspace-${Date.now()}`,
    coupleName: data.coupleName.trim() || 'Adit & Nisa',
    weddingDate: data.weddingDate,
    estimatedBudget: data.budget || 100_000_000,
    estimatedGuestCount: data.guestCount || 400,
    completedCategories: (data.completedCategories as CategoryId[]) || [],
    primaryPlanningPriority: data.primaryPlanningPriority || 'checklist',
    createdAt: now,
    updatedAt: now,
  };
}
