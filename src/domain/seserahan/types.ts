/**
 * WedSiap Seserahan Domain Types (V1 Phase 1)
 *
 * Core models and types for the Seserahan planning domain.
 * Clean, extensible TypeScript types decoupled from database-specific representations.
 */

export type SeserahanItemStatus = 'planned' | 'purchased' | 'completed';

export const SESERAHAN_ITEM_STATUSES: readonly SeserahanItemStatus[] = [
  'planned',
  'purchased',
  'completed',
] as const;

export interface SeserahanPlan {
  id: string;
  workspaceId: string;
  name: string;
  budget: number;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

export interface SeserahanCategory {
  id: string;
  planId: string;
  name: string;
  sortOrder: number;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

export interface SeserahanItem {
  id: string;
  planId: string;
  categoryId: string | null;
  name: string;
  status: SeserahanItemStatus;
  estimatedCost: number;
  actualCost: number;
  notes: string | null;
  sortOrder: number;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

/**
 * Derived metrics calculated dynamically from source-of-truth items and plan.
 * Not stored in database.
 */
export interface SeserahanMetrics {
  totalItems: number;
  completedItems: number;
  purchasedItems: number;
  pendingItems: number;
  completionRate: number; // percentage (0 - 100, up to 2 decimal places)

  budget: number;
  estimatedTotal: number;
  actualTotal: number;
  remainingBudget: number; // budget - actualTotal
  estimatedRemainingCost: number; // sum of estimatedCost for pending ('planned') items
  budgetVariance: number; // budget - estimatedTotal (positive = surplus/under budget, negative = deficit)
}

/**
 * Clean data structure prepared for future NBA V3 signals consumption.
 */
export interface SeserahanNbaSignals {
  completionRate: number;
  pendingItems: number;
  budgetUsage: number; // ratio (0 to 1+) of actualTotal / budget (0 if budget is 0)
  estimatedRemainingCost: number;
  budgetVariance: number;
}
