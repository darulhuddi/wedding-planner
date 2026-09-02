import { describe, it, expect } from 'vitest';
import { calculateBudgetOverview, calculateCategorySummaries, getBudgetInsights } from '../domain/budgetSelectors';
import { StoredBudget, BudgetCategory } from '../types/budget';

describe('Budget Selectors', () => {
  const emptyBudget: StoredBudget = {
    allocations: [],
    expenses: [],
  };

  const sampleBudget: StoredBudget = {
    allocations: [
      { id: '1', category: 'venue', amount: 50_000_000, createdAt: '', updatedAt: '' },
      { id: '2', category: 'catering', amount: 30_000_000, createdAt: '', updatedAt: '' },
    ],
    expenses: [
      { id: 'e1', title: 'DP Venue', category: 'venue', amount: 10_000_000, date: '2026-09-01', note: null, createdAt: '', updatedAt: '' },
      { id: 'e2', title: 'Pelunasan Venue', category: 'venue', amount: 40_000_000, date: '2026-09-02', note: null, createdAt: '', updatedAt: '' },
      { id: 'e3', title: 'DP Catering', category: 'catering', amount: 5_000_000, date: '2026-09-03', note: null, createdAt: '', updatedAt: '' },
      { id: 'e4', title: 'Cincin', category: 'general', amount: 10_000_000, date: '2026-09-04', note: null, createdAt: '', updatedAt: '' },
    ],
  };

  describe('calculateBudgetOverview', () => {
    it('handles empty budget', () => {
      const overview = calculateBudgetOverview(100_000_000, emptyBudget);
      expect(overview.totalBudget).toBe(100_000_000);
      expect(overview.totalAllocated).toBe(0);
      expect(overview.unallocated).toBe(100_000_000);
      expect(overview.totalSpent).toBe(0);
      expect(overview.totalRemaining).toBe(100_000_000);
    });

    it('calculates totals correctly with allocations and expenses', () => {
      const overview = calculateBudgetOverview(100_000_000, sampleBudget);
      expect(overview.totalAllocated).toBe(80_000_000);
      expect(overview.unallocated).toBe(20_000_000);
      expect(overview.totalSpent).toBe(65_000_000); // 10m + 40m + 5m + 10m
      expect(overview.totalRemaining).toBe(35_000_000); // 100m - 65m
    });

    it('handles over-allocation without negative unallocated', () => {
      const overview = calculateBudgetOverview(50_000_000, sampleBudget);
      expect(overview.totalAllocated).toBe(80_000_000);
      expect(overview.unallocated).toBe(0); // Should not be negative
      expect(overview.totalRemaining).toBe(-15_000_000); // Remaining can be negative if spent > budget
    });
  });

  describe('calculateCategorySummaries', () => {
    it('initializes all canonical categories', () => {
      const summaries = calculateCategorySummaries(emptyBudget);
      
      const expectedCategories: BudgetCategory[] = [
        'general', 'venue', 'catering', 'photography', 
        'decoration', 'makeup_attire', 'invitation'
      ];

      expectedCategories.forEach(cat => {
        expect(summaries[cat]).toBeDefined();
        expect(summaries[cat].status).toBe('belum_dialokasikan');
        expect(summaries[cat].allocated).toBe(0);
        expect(summaries[cat].spent).toBe(0);
      });
    });

    it('calculates category metrics correctly', () => {
      const summaries = calculateCategorySummaries(sampleBudget);
      
      // Venue: Allocated 50m, Spent 50m
      expect(summaries['venue'].allocated).toBe(50_000_000);
      expect(summaries['venue'].spent).toBe(50_000_000);
      expect(summaries['venue'].remaining).toBe(0);
      expect(summaries['venue'].utilization).toBe(1);
      expect(summaries['venue'].status).toBe('mendekati_batas'); // >= 0.8 and <= 1.0

      // Catering: Allocated 30m, Spent 5m
      expect(summaries['catering'].allocated).toBe(30_000_000);
      expect(summaries['catering'].spent).toBe(5_000_000);
      expect(summaries['catering'].remaining).toBe(25_000_000);
      expect(summaries['catering'].utilization).toBeCloseTo(0.1667, 3);
      expect(summaries['catering'].status).toBe('aman');

      // General: Allocated 0m, Spent 10m
      expect(summaries['general'].allocated).toBe(0);
      expect(summaries['general'].spent).toBe(10_000_000);
      expect(summaries['general'].remaining).toBe(-10_000_000);
      expect(summaries['general'].utilization).toBe(1);
      expect(summaries['general'].status).toBe('melebihi_budget');
    });

    it('handles zero allocation zero expense', () => {
      const summaries = calculateCategorySummaries(emptyBudget);
      expect(summaries['venue'].status).toBe('belum_dialokasikan');
    });
    
    it('handles zero allocation positive expense', () => {
      const budget: StoredBudget = {
        allocations: [],
        expenses: [{ id: '1', title: 'DP', category: 'venue', amount: 1000, date: '', note: null, createdAt: '', updatedAt: '' }]
      };
      const summaries = calculateCategorySummaries(budget);
      expect(summaries['venue'].status).toBe('melebihi_budget');
      expect(summaries['venue'].utilization).toBe(1);
    });
  });

  describe('getBudgetInsights', () => {
    it('returns empty array when budget is safe and fully allocated', () => {
      const budget: StoredBudget = {
        allocations: [{ id: '1', category: 'venue', amount: 100_000_000, createdAt: '', updatedAt: '' }],
        expenses: [{ id: 'e1', title: 'DP', category: 'venue', amount: 50_000_000, date: '', note: null, createdAt: '', updatedAt: '' }]
      };
      const overview = calculateBudgetOverview(100_000_000, budget);
      const summaries = calculateCategorySummaries(budget);
      
      const insights = getBudgetInsights(overview, summaries);
      expect(insights).toHaveLength(0); // healthy budget
    });

    it('detects unallocated budget when not over budget', () => {
      const overview = calculateBudgetOverview(100_000_000, emptyBudget);
      const summaries = calculateCategorySummaries(emptyBudget);
      
      const insights = getBudgetInsights(overview, summaries);
      expect(insights[0].title).toContain('100.000.000 budget masih belum dialokasikan.');
    });

    it('prioritizes total budget overrun over unallocated budget', () => {
      // 250m budget, 127m allocated (123m unallocated), 618.7m spent.
      const budget: StoredBudget = {
        allocations: [{ id: '1', category: 'venue', amount: 127_000_000, createdAt: '', updatedAt: '' }],
        expenses: [{ id: 'e1', title: 'Payment', category: 'venue', amount: 618_700_000, date: '', note: null, createdAt: '', updatedAt: '' }]
      };
      const overview = calculateBudgetOverview(250_000_000, budget);
      const summaries = calculateCategorySummaries(budget);
      
      const insights = getBudgetInsights(overview, summaries);
      
      // 1st Priority: Total budget overrun
      expect(insights[0].title).toContain('Anggaran keseluruhan terlampaui Rp368.700.000.');
      expect(insights[0].isCritical).toBe(true);
      
      // 2nd Priority: Category overrun
      expect(insights[1].title).toContain('Venue & Gedung melebihi alokasi sebesar Rp491.700.000.');
      
      // 3rd Priority: Unallocated budget
      expect(insights[2].title).toContain('Rp123.000.000 budget masih belum dialokasikan.');
    });

    it('prioritizes largest absolute category overrun', () => {
      const budget: StoredBudget = {
        allocations: [
          { id: '1', category: 'venue', amount: 50_000_000, createdAt: '', updatedAt: '' },
          { id: '2', category: 'catering', amount: 30_000_000, createdAt: '', updatedAt: '' },
        ],
        expenses: [
          { id: 'e1', title: 'Payment', category: 'venue', amount: 60_000_000, date: '', note: null, createdAt: '', updatedAt: '' }, // overrun 10m
          { id: 'e2', title: 'Payment', category: 'catering', amount: 45_000_000, date: '', note: null, createdAt: '', updatedAt: '' } // overrun 15m
        ]
      };
      const overview = calculateBudgetOverview(200_000_000, budget);
      const summaries = calculateCategorySummaries(budget);
      
      const insights = getBudgetInsights(overview, summaries);
      
      // First insight should be the catering overrun since 15m > 10m
      expect(insights[0].title).toContain('Catering melebihi alokasi sebesar Rp15.000.000.');
      expect(insights[0].isCritical).toBe(true);
    });
    
    it('detects over-allocation planning error', () => {
      const overview = calculateBudgetOverview(70_000_000, sampleBudget); // allocated is 80m
      const summaries = calculateCategorySummaries(sampleBudget);
      
      const insights = getBudgetInsights(overview, summaries);
      const hasOverAllocation = insights.some(i => i.title.includes('Total alokasi melebihi budget sebesar Rp10.000.000.'));
      expect(hasOverAllocation).toBe(true);
    });

    it('detects categories approaching limit', () => {
      const budget: StoredBudget = {
        allocations: [{ id: '1', category: 'venue', amount: 100_000_000, createdAt: '', updatedAt: '' }],
        expenses: [{ id: 'e1', title: 'DP', category: 'venue', amount: 85_000_000, date: '', note: null, createdAt: '', updatedAt: '' }]
      };
      const overview = calculateBudgetOverview(100_000_000, budget);
      const summaries = calculateCategorySummaries(budget);
      
      const insights = getBudgetInsights(overview, summaries);
      expect(insights[0].title).toContain('Pengeluaran untuk Venue & Gedung sudah mendekati batas alokasi.');
    });
  });
});
