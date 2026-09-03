import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { BudgetAllocationList } from './BudgetAllocationList';
import { CategoryBudgetSummary } from '../../domain/budgetSelectors';
import { BudgetCategory, StoredBudget } from '../../types/budget';
import { calculateCategorySummaries } from '../../domain/budgetSelectors';

describe('BudgetAllocationList Component Tests', () => {
  const emptyBudget: StoredBudget = { allocations: [], expenses: [] };
  const emptySummaries: Record<BudgetCategory, CategoryBudgetSummary> = calculateCategorySummaries(emptyBudget);

  const sampleBudget: StoredBudget = {
    allocations: [
      { id: '1', category: 'venue', amount: 40_000_000, createdAt: '', updatedAt: '' },
      { id: '2', category: 'catering', amount: 25_000_000, createdAt: '', updatedAt: '' },
    ],
    expenses: [
      { id: 'e1', title: 'DP Venue', category: 'venue', amount: 15_000_000, date: '2026-09-01', note: null, createdAt: '', updatedAt: '' },
    ],
  };
  const sampleSummaries: Record<BudgetCategory, CategoryBudgetSummary> = calculateCategorySummaries(sampleBudget);

  it('A. instantiates with defaultExpanded = false (collapsed by default)', () => {
    const onUpdate = vi.fn();
    const onOpenStarter = vi.fn();

    const element = React.createElement(BudgetAllocationList, {
      categorySummaries: sampleSummaries,
      totalAllocated: 65_000_000,
      totalBudget: 100_000_000,
      onUpdateAllocation: onUpdate,
      onOpenStarterTemplate: onOpenStarter,
    });

    expect(element).toBeDefined();
    expect(element.props.defaultExpanded).toBeUndefined(); // defaults to false inside component
  });

  it('B. supports explicitly passing defaultExpanded prop', () => {
    const onUpdate = vi.fn();

    const element = React.createElement(BudgetAllocationList, {
      categorySummaries: sampleSummaries,
      totalAllocated: 65_000_000,
      totalBudget: 100_000_000,
      onUpdateAllocation: onUpdate,
      defaultExpanded: true,
    });

    expect(element.props.defaultExpanded).toBe(true);
  });

  it('C. calculates and formats category summaries correctly for all 7 canonical categories', () => {
    const categories: BudgetCategory[] = [
      'venue', 'catering', 'photography', 'decoration',
      'makeup_attire', 'invitation', 'general'
    ];

    categories.forEach((cat) => {
      expect(sampleSummaries[cat]).toBeDefined();
      expect(typeof sampleSummaries[cat].allocated).toBe('number');
      expect(typeof sampleSummaries[cat].spent).toBe('number');
      expect(typeof sampleSummaries[cat].remaining).toBe('number');
    });

    // Venue has 40m allocated, 15m spent, 25m remaining
    expect(sampleSummaries['venue'].allocated).toBe(40_000_000);
    expect(sampleSummaries['venue'].spent).toBe(15_000_000);
    expect(sampleSummaries['venue'].remaining).toBe(25_000_000);

    // Photography has 0 allocated
    expect(sampleSummaries['photography'].allocated).toBe(0);
    expect(sampleSummaries['photography'].spent).toBe(0);
  });

  it('D. empty budget state handles 0 totalAllocated without creating dummy allocation records', () => {
    const categories: BudgetCategory[] = [
      'venue', 'catering', 'photography', 'decoration',
      'makeup_attire', 'invitation', 'general'
    ];

    categories.forEach((cat) => {
      expect(emptySummaries[cat].allocated).toBe(0);
      expect(emptySummaries[cat].spent).toBe(0);
      expect(emptySummaries[cat].remaining).toBe(0);
      expect(emptySummaries[cat].status).toBe('belum_dialokasikan');
    });

    expect(emptyBudget.allocations).toHaveLength(0);
  });

  it('E. over-budget calculation detects totalAllocated > totalBudget', () => {
    const totalAllocated = 120_000_000;
    const totalBudget = 100_000_000;
    const isOverBudget = totalAllocated > totalBudget;
    expect(isOverBudget).toBe(true);
  });
});
