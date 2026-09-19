/**
 * WedSiap Seserahan Domain Derived Metrics & Signals (V2)
 *
 * Pure calculation functions deriving metrics, readiness, and NBA V3 signals
 * dynamically from source-of-truth items and plan data.
 * Zero database writes or persisted cache.
 */

import {
  SeserahanItem,
  SeserahanMetrics,
  SeserahanNbaSignals,
  SeserahanPlan,
  ResponsibleParty,
  RESPONSIBLE_PARTIES,
} from './types';
import { calculateSeserahanReadiness } from './readiness';
import { classifyItemDueStatus } from './deadlines';

/**
 * Calculates empty distribution object initialized to 0 for all parties.
 */
export function createEmptyResponsibilityDistribution(): Record<ResponsibleParty, number> {
  return {
    bride: 0,
    groom: 0,
    bride_family: 0,
    groom_family: 0,
    together: 0,
    custom: 0,
  };
}

/**
 * Calculates derived metrics from plan budget, items, plan lifecycle timestamps, and reference date.
 */
export function calculateSeserahanMetrics(
  budget: number,
  items: SeserahanItem[],
  plan?: SeserahanPlan | null,
  today: string = new Date().toISOString().split('T')[0]
): SeserahanMetrics {
  const safeBudget = typeof budget === 'number' && !Number.isNaN(budget) && budget >= 0 ? budget : 0;
  const safeItems = Array.isArray(items) ? items : [];

  const totalItems = safeItems.length;
  let completedItems = 0;
  let purchasedItems = 0;
  let pendingItems = 0;
  let estimatedTotal = 0;
  let actualTotal = 0;
  let estimatedRemainingCost = 0;
  let overdueItems = 0;
  let dueSoonItems = 0;

  const responsibilityDistribution = createEmptyResponsibilityDistribution();

  for (const item of safeItems) {
    const est = typeof item.estimatedCost === 'number' && !Number.isNaN(item.estimatedCost) && item.estimatedCost >= 0
      ? item.estimatedCost
      : 0;
    const act = typeof item.actualCost === 'number' && !Number.isNaN(item.actualCost) && item.actualCost >= 0
      ? item.actualCost
      : 0;

    estimatedTotal += est;
    actualTotal += act;

    if (item.status === 'completed') {
      completedItems += 1;
    } else if (item.status === 'purchased') {
      purchasedItems += 1;
    } else {
      // 'planned' or any uncompleted status
      pendingItems += 1;
      estimatedRemainingCost += est;
    }

    // Due date classification
    const dueStatus = classifyItemDueStatus(item, today);
    if (dueStatus === 'overdue') {
      overdueItems += 1;
    } else if (dueStatus === 'due_soon') {
      dueSoonItems += 1;
    }

    // Responsibility distribution
    if (item.responsibleParty && RESPONSIBLE_PARTIES.includes(item.responsibleParty)) {
      responsibilityDistribution[item.responsibleParty] += 1;
    }
  }

  const completionRate = totalItems === 0
    ? 0
    : Number(((completedItems / totalItems) * 100).toFixed(2));

  const remainingBudget = safeBudget - actualTotal;
  const budgetVariance = safeBudget - estimatedTotal;

  // Lifecycle status
  const packagingCompleted = Boolean(plan?.packagingCompletedAt);
  const packagingStarted = Boolean(plan?.packagingStartedAt);
  const finalCheckCompleted = Boolean(plan?.finalCheckedAt);

  // Readiness evaluation
  const readiness = calculateSeserahanReadiness(plan, safeItems);

  return {
    totalItems,
    completedItems,
    purchasedItems,
    pendingItems,
    completionRate,
    budget: safeBudget,
    estimatedTotal,
    actualTotal,
    remainingBudget,
    estimatedRemainingCost,
    budgetVariance,
    overdueItems,
    dueSoonItems,
    packagingCompleted,
    packagingStarted,
    finalCheckCompleted,
    readinessStatus: readiness.status,
    readiness,
    responsibilityDistribution,
  };
}

/**
 * Extracts normalized signal payload for authoritative NBA V3 consumption.
 * Does not modify or trigger NBA scoring directly.
 */
export function extractSeserahanSignals(
  plan: SeserahanPlan | null | undefined,
  items: SeserahanItem[],
  today: string = new Date().toISOString().split('T')[0]
): SeserahanNbaSignals {
  const metrics = calculateSeserahanMetrics(plan?.budget ?? 0, items, plan, today);

  const budgetUsage = metrics.budget > 0
    ? Number((metrics.actualTotal / metrics.budget).toFixed(4))
    : 0;

  return {
    completionRate: metrics.completionRate,
    pendingItems: metrics.pendingItems,
    overdueItems: metrics.overdueItems,
    dueSoonItems: metrics.dueSoonItems,
    budgetUsage,
    estimatedRemainingCost: metrics.estimatedRemainingCost,
    budgetVariance: metrics.budgetVariance,
    responsibilityDistribution: metrics.responsibilityDistribution,
    readinessStatus: metrics.readinessStatus,
    packagingCompleted: metrics.packagingCompleted,
    finalCheckCompleted: metrics.finalCheckCompleted,
  };
}
