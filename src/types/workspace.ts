/**
 * WedFlow Workspace Domain Types
 *
 * StoredWorkspace: the lean persisted shape. Only source data — no formatted strings,
 *   no computed counts, no derived values. This is what lives in localStorage.
 *
 * WorkspaceViewModel: StoredWorkspace + all computed display values, produced at
 *   runtime by deriveWorkspaceViewModel(). Never persisted to storage.
 *
 * UI components receive WorkspaceViewModel.
 * The repository layer reads/writes StoredWorkspace.
 */

import { CategoryId, PlanningPriority, NextBestAction } from './onboarding';

/**
 * Canonical persisted workspace shape (v2).
 * Only source data — rename from WeddingWorkspace.
 *   budget      → estimatedBudget
 *   guestCount  → estimatedGuestCount
 * Derived fields removed: formattedDate, daysUntilWedding, formattedBudget,
 *   completedCategoriesCount, totalCategoriesCount, completionPercentage, initialNextBestAction.
 */
export interface StoredWorkspace {
  id: string;
  coupleName: string;
  weddingDate: string;             // YYYY-MM-DD — canonical date format
  estimatedBudget: number;         // numeric IDR — no formatting stored
  estimatedGuestCount: number;     // integer
  completedCategories: CategoryId[];
  primaryPlanningPriority: PlanningPriority;
  createdAt: string;               // ISO timestamp
  updatedAt: string;               // ISO timestamp
}

/**
 * WorkspaceViewModel = StoredWorkspace + all derived display values.
 * Computed at application boundary via deriveWorkspaceViewModel().
 * Passed to all UI components. Never written to storage.
 */
export interface WorkspaceViewModel extends StoredWorkspace {
  // Formatted display values
  formattedDate: string;
  formattedBudget: string;
  // Computed quantities
  daysUntilWedding: number;
  completedCategoriesCount: number;
  totalCategoriesCount: number;
  completionPercentage: number;
  // NBA — always computed from current state, never stored
  nextBestAction: NextBestAction;
}
