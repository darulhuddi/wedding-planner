/**
 * WedSiap Seserahan Domain Types (V2 Planning Foundation)
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

export type ResponsibleParty =
  | 'bride'
  | 'groom'
  | 'bride_family'
  | 'groom_family'
  | 'together'
  | 'custom';

export const RESPONSIBLE_PARTIES: readonly ResponsibleParty[] = [
  'bride',
  'groom',
  'bride_family',
  'groom_family',
  'together',
  'custom',
] as const;

export const RESPONSIBLE_PARTY_LABELS: Record<ResponsibleParty, string> = {
  bride: 'Pihak Wanita',
  groom: 'Pihak Pria',
  bride_family: 'Keluarga Wanita',
  groom_family: 'Keluarga Pria',
  together: 'Bersama',
  custom: 'Lainnya',
};

export type SeserahanReadinessStatus =
  | 'not_ready'
  | 'in_progress'
  | 'almost_ready'
  | 'ready';

export type ItemDueStatus =
  | 'overdue'
  | 'due_soon'
  | 'normal'
  | 'completed'
  | 'no_date';

export interface SeserahanReadiness {
  status: SeserahanReadinessStatus;
  label: string; // "Belum Siap" | "Sedang Berjalan" | "Hampir Siap" | "Sudah Siap"
  reasons: string[];
  targetMilestone?: string;
  score: number;
  facts: {
    totalItems: number;
    completedItems: number;
    purchasedItems: number;
    pendingItems: number;
    packagingCompleted: boolean;
    packagingStarted: boolean;
    finalCheckCompleted: boolean;
  };
}

export interface SeserahanPlan {
  id: string;
  workspaceId: string;
  name: string;
  budget: number;
  packagingStartedAt?: string | null; // ISO 8601 string
  packagingCompletedAt?: string | null; // ISO 8601 string
  finalCheckedAt?: string | null; // ISO 8601 string
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
  responsibleParty?: ResponsibleParty | null;
  responsiblePartyCustom?: string | null;
  dueDate?: string | null; // YYYY-MM-DD
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

/**
 * Derived metrics calculated dynamically from source-of-truth items and plan.
 * V2 extends V1 while maintaining complete backward compatibility.
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

  // V2 extensions
  overdueItems: number;
  dueSoonItems: number;
  packagingCompleted: boolean;
  packagingStarted: boolean;
  finalCheckCompleted: boolean;
  readinessStatus: SeserahanReadinessStatus;
  readiness: SeserahanReadiness;
  responsibilityDistribution: Record<ResponsibleParty, number>;
}

export type SeserahanMetricsV2 = SeserahanMetrics;

/**
 * Clean data structure prepared for NBA V3 signals consumption.
 */
export interface SeserahanNbaSignals {
  completionRate: number;
  pendingItems: number;
  overdueItems: number;
  dueSoonItems: number;
  budgetUsage: number; // ratio (0 to 1+) of actualTotal / budget (0 if budget is 0)
  estimatedRemainingCost: number;
  budgetVariance: number;
  responsibilityDistribution: Record<ResponsibleParty, number>;
  readinessStatus: SeserahanReadinessStatus;
  packagingCompleted: boolean;
  finalCheckCompleted: boolean;
}
