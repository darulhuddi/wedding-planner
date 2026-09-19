import { describe, it, expect } from 'vitest';
import { calculateSeserahanMetrics, extractSeserahanSignals } from './metrics';
import { SeserahanItem, SeserahanPlan } from './types';

describe('Seserahan Metrics and Signals Tests', () => {
  it('handles empty items and zero budget gracefully', () => {
    const metrics = calculateSeserahanMetrics(0, []);
    expect(metrics.totalItems).toBe(0);
    expect(metrics.completedItems).toBe(0);
    expect(metrics.purchasedItems).toBe(0);
    expect(metrics.pendingItems).toBe(0);
    expect(metrics.completionRate).toBe(0);
    expect(metrics.budget).toBe(0);
    expect(metrics.estimatedTotal).toBe(0);
    expect(metrics.actualTotal).toBe(0);
    expect(metrics.remainingBudget).toBe(0);
    expect(metrics.estimatedRemainingCost).toBe(0);
    expect(metrics.budgetVariance).toBe(0);
  });

  it('correctly calculates metrics for the standard 12-item example', () => {
    // 7 completed, 3 purchased, 2 planned (total 12)
    // Budget: 5,000,000
    // Total Estimated: 4,850,000
    // Total Actual: 3,250,000
    const items: SeserahanItem[] = [
      // 7 completed items: est 300,000 each = 2,100,000, act 300,000 each = 2,100,000
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `c-${i}`,
        planId: 'plan-1',
        categoryId: 'cat-1',
        name: `Completed Item ${i + 1}`,
        status: 'completed' as const,
        estimatedCost: 300000,
        actualCost: 300000,
        notes: null,
        sortOrder: i,
        createdAt: '2026-09-08T00:00:00Z',
        updatedAt: '2026-09-08T00:00:00Z',
      })),
      // 3 purchased items: est 450,000, 350,000, 350,000 = 1,150,000, act 400,000, 375,000, 375,000 = 1,150,000
      {
        id: 'p-1',
        planId: 'plan-1',
        categoryId: 'cat-2',
        name: 'Purchased Item 1',
        status: 'purchased',
        estimatedCost: 450000,
        actualCost: 400000,
        notes: null,
        sortOrder: 7,
        createdAt: '2026-09-08T00:00:00Z',
        updatedAt: '2026-09-08T00:00:00Z',
      },
      {
        id: 'p-2',
        planId: 'plan-1',
        categoryId: 'cat-2',
        name: 'Purchased Item 2',
        status: 'purchased',
        estimatedCost: 350000,
        actualCost: 375000,
        notes: null,
        sortOrder: 8,
        createdAt: '2026-09-08T00:00:00Z',
        updatedAt: '2026-09-08T00:00:00Z',
      },
      {
        id: 'p-3',
        planId: 'plan-1',
        categoryId: 'cat-2',
        name: 'Purchased Item 3',
        status: 'purchased',
        estimatedCost: 350000,
        actualCost: 375000,
        notes: null,
        sortOrder: 9,
        createdAt: '2026-09-08T00:00:00Z',
        updatedAt: '2026-09-08T00:00:00Z',
      },
      // 2 planned items: est 800,000, 800,000 = 1,600,000, act 0
      {
        id: 'pl-1',
        planId: 'plan-1',
        categoryId: 'cat-3',
        name: 'Planned Item 1',
        status: 'planned',
        estimatedCost: 800000,
        actualCost: 0,
        notes: null,
        sortOrder: 10,
        createdAt: '2026-09-08T00:00:00Z',
        updatedAt: '2026-09-08T00:00:00Z',
      },
      {
        id: 'pl-2',
        planId: 'plan-1',
        categoryId: 'cat-3',
        name: 'Planned Item 2',
        status: 'planned',
        estimatedCost: 800000,
        actualCost: 0,
        notes: null,
        sortOrder: 11,
        createdAt: '2026-09-08T00:00:00Z',
        updatedAt: '2026-09-08T00:00:00Z',
      },
    ];

    // Estimated sum: 2,100,000 + 1,150,000 + 1,600,000 = 4,850,000
    // Actual sum: 2,100,000 + 1,150,000 + 0 = 3,250,000
    const budget = 5000000;
    const metrics = calculateSeserahanMetrics(budget, items);

    expect(metrics.totalItems).toBe(12);
    expect(metrics.completedItems).toBe(7);
    expect(metrics.purchasedItems).toBe(3);
    expect(metrics.pendingItems).toBe(2);

    // 7 / 12 = 58.3333... -> 58.33%
    expect(metrics.completionRate).toBe(58.33);

    expect(metrics.budget).toBe(5000000);
    expect(metrics.estimatedTotal).toBe(4850000);
    expect(metrics.actualTotal).toBe(3250000);

    // Remaining budget: 5,000,000 - 3,250,000 = 1,750,000
    expect(metrics.remainingBudget).toBe(1750000);

    // Estimated remaining cost: sum of planned items = 1,600,000
    expect(metrics.estimatedRemainingCost).toBe(1600000);

    // Budget variance: 5,000,000 - 4,850,000 = 150,000 (surplus)
    expect(metrics.budgetVariance).toBe(150000);
  });

  it('extracts normalized signals for NBA V3 readiness', () => {
    const plan: SeserahanPlan = {
      id: 'plan-1',
      workspaceId: 'ws-1',
      name: 'Seserahan',
      budget: 5000000,
      createdAt: '2026-09-08T00:00:00Z',
      updatedAt: '2026-09-08T00:00:00Z',
    };

    const items: SeserahanItem[] = [
      {
        id: 'item-1',
        planId: 'plan-1',
        categoryId: null,
        name: 'Item 1',
        status: 'completed',
        estimatedCost: 1000000,
        actualCost: 1000000,
        notes: null,
        sortOrder: 0,
        createdAt: '2026-09-08T00:00:00Z',
        updatedAt: '2026-09-08T00:00:00Z',
      },
      {
        id: 'item-2',
        planId: 'plan-1',
        categoryId: null,
        name: 'Item 2',
        status: 'planned',
        estimatedCost: 2000000,
        actualCost: 0,
        notes: null,
        sortOrder: 1,
        createdAt: '2026-09-08T00:00:00Z',
        updatedAt: '2026-09-08T00:00:00Z',
      },
    ];

    const signals = extractSeserahanSignals(plan, items);

    // 1 of 2 completed = 50%
    expect(signals.completionRate).toBe(50);
    expect(signals.pendingItems).toBe(1);
    // 1,000,000 / 5,000,000 = 0.2
    expect(signals.budgetUsage).toBe(0.2);
    expect(signals.estimatedRemainingCost).toBe(2000000);
    expect(signals.budgetVariance).toBe(2000000); // 5M - 3M
  });
});
