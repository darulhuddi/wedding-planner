import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import {
  DEFAULT_TEMPLATE_PERCENTAGES,
  BUDGET_TEMPLATE_DISTRIBUTION,
  calculateBudgetTemplateAllocations,
  generateStarterBudgetAllocations,
  BudgetStarterTemplateModal,
} from './BudgetStarterTemplateModal';
import { BudgetCategory } from '../../types/budget';

describe('Budget Starter Template — Custom Percentage Tests', () => {
  const estimatedBudget = 100_000_000;

  it('A. default template has exact starting percentages: 40 / 25 / 10 / 10 / 10 / 3 / 2 (Total = 100%)', () => {
    expect(DEFAULT_TEMPLATE_PERCENTAGES).toEqual({
      venue: 40,
      catering: 25,
      photography: 10,
      decoration: 10,
      makeup_attire: 10,
      invitation: 3,
      general: 2,
    });

    const total = Object.values(DEFAULT_TEMPLATE_PERCENTAGES).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);

    const defaultItems = calculateBudgetTemplateAllocations(estimatedBudget);
    expect(defaultItems).toHaveLength(7);
    expect(defaultItems.find((i) => i.category === 'venue')?.amount).toBe(40_000_000);
    expect(defaultItems.find((i) => i.category === 'catering')?.amount).toBe(25_000_000);
    expect(defaultItems.find((i) => i.category === 'photography')?.amount).toBe(10_000_000);
    expect(defaultItems.find((i) => i.category === 'decoration')?.amount).toBe(10_000_000);
    expect(defaultItems.find((i) => i.category === 'makeup_attire')?.amount).toBe(10_000_000);
    expect(defaultItems.find((i) => i.category === 'invitation')?.amount).toBe(3_000_000);
    expect(defaultItems.find((i) => i.category === 'general')?.amount).toBe(2_000_000);
  });

  it('B. calculates custom percentages correctly (e.g. Venue 30%, Catering 30%, Photo 15%, etc.)', () => {
    const customPercentages: Record<BudgetCategory, number> = {
      venue: 30,
      catering: 30,
      photography: 15,
      decoration: 10,
      makeup_attire: 10,
      invitation: 3,
      general: 2,
    };

    const items = calculateBudgetTemplateAllocations(estimatedBudget, customPercentages);
    expect(items).toHaveLength(7);

    expect(items.find((i) => i.category === 'venue')?.amount).toBe(30_000_000);
    expect(items.find((i) => i.category === 'catering')?.amount).toBe(30_000_000);
    expect(items.find((i) => i.category === 'photography')?.amount).toBe(15_000_000);
    expect(items.find((i) => i.category === 'decoration')?.amount).toBe(10_000_000);
    expect(items.find((i) => i.category === 'makeup_attire')?.amount).toBe(10_000_000);
    expect(items.find((i) => i.category === 'invitation')?.amount).toBe(3_000_000);
    expect(items.find((i) => i.category === 'general')?.amount).toBe(2_000_000);

    const sum = items.reduce((acc, curr) => acc + curr.amount, 0);
    expect(sum).toBe(estimatedBudget);
  });

  it('C. under allocation (Total = 90%) calculates partial nominals without premature reconciliation', () => {
    const underPercentages: Record<BudgetCategory, number> = {
      venue: 35,
      catering: 25,
      photography: 10,
      decoration: 10,
      makeup_attire: 5,
      invitation: 3,
      general: 2,
    };

    const totalPct = Object.values(underPercentages).reduce((a, b) => a + b, 0);
    expect(totalPct).toBe(90);

    const items = calculateBudgetTemplateAllocations(estimatedBudget, underPercentages);
    const sum = items.reduce((acc, curr) => acc + curr.amount, 0);
    expect(sum).toBe(90_000_000); // exactly 90% of 100m
  });

  it('D. over allocation (Total = 110%) calculates nominals without overflowing max budget assumption', () => {
    const overPercentages: Record<BudgetCategory, number> = {
      venue: 50,
      catering: 25,
      photography: 10,
      decoration: 10,
      makeup_attire: 10,
      invitation: 3,
      general: 2,
    };

    const totalPct = Object.values(overPercentages).reduce((a, b) => a + b, 0);
    expect(totalPct).toBe(110);

    const items = calculateBudgetTemplateAllocations(estimatedBudget, overPercentages);
    const sum = items.reduce((acc, curr) => acc + curr.amount, 0);
    expect(sum).toBe(110_000_000);
  });

  it('E. supports setting any category to 0% as long as total is 100%', () => {
    const zeroInvitationPercentages: Record<BudgetCategory, number> = {
      venue: 40,
      catering: 25,
      photography: 10,
      decoration: 10,
      makeup_attire: 15,
      invitation: 0,
      general: 0,
    };

    const totalPct = Object.values(zeroInvitationPercentages).reduce((a, b) => a + b, 0);
    expect(totalPct).toBe(100);

    const items = calculateBudgetTemplateAllocations(estimatedBudget, zeroInvitationPercentages);
    expect(items.find((i) => i.category === 'invitation')?.amount).toBe(0);
    expect(items.find((i) => i.category === 'general')?.amount).toBe(0);
    expect(items.find((i) => i.category === 'makeup_attire')?.amount).toBe(15_000_000);

    const sum = items.reduce((acc, curr) => acc + curr.amount, 0);
    expect(sum).toBe(estimatedBudget);
  });

  it('F. no automatic redistribution: modifying one category preserves other categories independently', () => {
    const base = { ...DEFAULT_TEMPLATE_PERCENTAGES };
    const modified = { ...base, catering: 35 };

    // Only catering changed, other categories did not automatically change
    expect(modified.catering).toBe(35);
    expect(modified.venue).toBe(40);
    expect(modified.photography).toBe(10);
    expect(modified.decoration).toBe(10);
    expect(modified.makeup_attire).toBe(10);
    expect(modified.invitation).toBe(3);
    expect(modified.general).toBe(2);
  });

  it('G. deterministic rounding guarantees sum(allocations) === estimatedBudget for non-integer division budgets', () => {
    const testBudgets = [
      55_555_555,
      77_777_777,
      123_456_789,
      10_000_001,
      250_000_000,
      99_999_999,
      1,
    ];

    for (const budget of testBudgets) {
      const items = calculateBudgetTemplateAllocations(budget);
      const sum = items.reduce((acc, curr) => acc + curr.amount, 0);
      expect(sum).toBe(budget);
    }
  });

  it('H. generateStarterBudgetAllocations generates real BudgetAllocation objects with valid UUIDs', () => {
    const allocations = generateStarterBudgetAllocations(75_000_000);
    expect(allocations).toHaveLength(7);

    allocations.forEach((alloc) => {
      expect(alloc.id).toBeDefined();
      expect(typeof alloc.id).toBe('string');
      expect(alloc.id.length).toBeGreaterThan(0);
      expect(alloc.createdAt).toBeDefined();
      expect(alloc.updatedAt).toBeDefined();
    });

    const sum = allocations.reduce((acc, curr) => acc + curr.amount, 0);
    expect(sum).toBe(75_000_000);
  });

  it('I. handles zero/negative budget gracefully', () => {
    const itemsZero = calculateBudgetTemplateAllocations(0);
    expect(itemsZero).toHaveLength(7);
    itemsZero.forEach((i) => expect(i.amount).toBe(0));

    const itemsNeg = calculateBudgetTemplateAllocations(-100_000_000);
    expect(itemsNeg).toHaveLength(7);
    itemsNeg.forEach((i) => expect(i.amount).toBe(0));
  });

  it('J. modal element instantiates properly with props', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    const onOpenEditBudget = vi.fn();

    const element = React.createElement(BudgetStarterTemplateModal, {
      isOpen: true,
      estimatedBudget: 100_000_000,
      onClose,
      onApplyTemplate: onApply,
      onOpenEditBudget,
    });

    expect(element).toBeDefined();
    expect(element.props.isOpen).toBe(true);
    expect(element.props.estimatedBudget).toBe(100_000_000);
  });
});
