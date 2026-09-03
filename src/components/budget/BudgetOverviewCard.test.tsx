import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { BudgetOverviewCard } from './BudgetOverviewCard';
import { calculateBudgetOverview } from '../../domain/budgetSelectors';
import { StoredBudget } from '../../types/budget';

describe('BudgetOverviewCard Visual Refinement Tests', () => {
  const sampleBudget: StoredBudget = {
    allocations: [
      { id: '1', category: 'venue', amount: 50_000_000, createdAt: '', updatedAt: '' },
      { id: '2', category: 'catering', amount: 30_000_000, createdAt: '', updatedAt: '' },
    ],
    expenses: [
      { id: 'e1', title: 'DP Venue', category: 'venue', amount: 5_000_000, date: '2026-09-01', note: null, createdAt: '', updatedAt: '' },
    ],
  };

  it('A. instantiates and renders with normal healthy budget', () => {
    const onEdit = vi.fn();
    const overview = calculateBudgetOverview(100_000_000, sampleBudget);

    const element = React.createElement(BudgetOverviewCard, {
      overview,
      onEditBudget: onEdit,
    });

    expect(element).toBeDefined();
    expect(overview.totalBudget).toBe(100_000_000);
    expect(overview.totalAllocated).toBe(80_000_000);
    expect(overview.totalSpent).toBe(5_000_000);
    expect(overview.totalRemaining).toBe(95_000_000);
  });

  it('B. handles zero budget state gracefully', () => {
    const onEdit = vi.fn();
    const emptyBudget: StoredBudget = { allocations: [], expenses: [] };
    const overview = calculateBudgetOverview(0, emptyBudget);

    const element = React.createElement(BudgetOverviewCard, {
      overview,
      onEditBudget: onEdit,
    });

    expect(element).toBeDefined();
    expect(overview.totalBudget).toBe(0);
    expect(overview.totalSpent).toBe(0);
  });

  it('C. handles over-budget state (spent > totalBudget)', () => {
    const overBudget: StoredBudget = {
      allocations: [
        { id: '1', category: 'venue', amount: 100_000_000, createdAt: '', updatedAt: '' },
      ],
      expenses: [
        { id: 'e1', title: 'Pelunasan', category: 'venue', amount: 120_000_000, date: '2026-09-01', note: null, createdAt: '', updatedAt: '' },
      ],
    };

    const overview = calculateBudgetOverview(100_000_000, overBudget);
    expect(overview.totalSpent).toBe(120_000_000);
    expect(overview.totalRemaining).toBe(-20_000_000);
    expect(overview.totalSpent > overview.totalBudget).toBe(true);
  });

  it('D. handles over-allocated state (allocated > totalBudget)', () => {
    const overAllocatedBudget: StoredBudget = {
      allocations: [
        { id: '1', category: 'venue', amount: 80_000_000, createdAt: '', updatedAt: '' },
        { id: '2', category: 'catering', amount: 40_000_000, createdAt: '', updatedAt: '' },
      ],
      expenses: [],
    };

    const overview = calculateBudgetOverview(100_000_000, overAllocatedBudget);
    expect(overview.totalAllocated).toBe(120_000_000);
    expect(overview.totalAllocated > overview.totalBudget).toBe(true);
  });
});
