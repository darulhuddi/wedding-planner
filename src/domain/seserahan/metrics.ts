/**
 * WedSiap Seserahan Domain Derived Metrics & Signals (V1 Phase 1)
 *
 * Pure calculation functions deriving metrics and future NBA V3 signals
 * dynamically from source-of-truth items and plan data.
 * Zero database writes or persisted cache.
 */

import { SeserahanItem, SeserahanMetrics, SeserahanNbaSignals, SeserahanPlan } from './types';

/**
 * Calculates derived metrics from plan budget and item collection.
 */
export function calculateSeserahanMetrics(
  budget: number,
  items: SeserahanItem[]
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
  }

  const completionRate = totalItems === 0
    ? 0
    : Number(((completedItems / totalItems) * 100).toFixed(2));

  const remainingBudget = safeBudget - actualTotal;
  const budgetVariance = safeBudget - estimatedTotal;

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
  };
}

/**
 * Extracts normalized signal payload for future NBA V3 consumption.
 * Does not modify or trigger NBA scoring directly.
 */
export function extractSeserahanSignals(
  plan: SeserahanPlan | null | undefined,
  items: SeserahanItem[]
): SeserahanNbaSignals {
  const metrics = calculateSeserahanMetrics(plan?.budget ?? 0, items);

  const budgetUsage = metrics.budget > 0
    ? Number((metrics.actualTotal / metrics.budget).toFixed(4))
    : 0;

  return {
    completionRate: metrics.completionRate,
    pendingItems: metrics.pendingItems,
    budgetUsage,
    estimatedRemainingCost: metrics.estimatedRemainingCost,
    budgetVariance: metrics.budgetVariance,
  };
}
