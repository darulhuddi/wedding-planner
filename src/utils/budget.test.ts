import { describe, it, expect } from 'vitest';
import {
  calculateBudgetOverview,
  calculateCategorySummaries,
  getBudgetInsights,
  calculateBudgetDistribution,
  calculateSpendingTrend,
  calculateTopSpendingCategories,
  getBudgetHealthAssessment,
  calculateUpcomingPayments,
  calculateBudgetProjection,
} from '../domain/budgetSelectors';
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

  describe('calculateBudgetDistribution', () => {
    it('handles empty allocations', () => {
      const dist = calculateBudgetDistribution(100_000_000, emptyBudget);
      expect(dist.hasAllocations).toBe(false);
      expect(dist.items).toHaveLength(0);
      expect(dist.dominantCategoryName).toBeNull();
    });

    it('calculates distribution with correct sorting and percentage', () => {
      const dist = calculateBudgetDistribution(100_000_000, sampleBudget);
      expect(dist.hasAllocations).toBe(true);
      expect(dist.items).toHaveLength(2);
      expect(dist.items[0].category).toBe('venue');
      expect(dist.items[0].allocatedAmount).toBe(50_000_000);
      expect(dist.items[0].percentage).toBe(63); // 50m / 80m total allocated * 100
      expect(dist.items[1].category).toBe('catering');
      expect(dist.items[1].allocatedAmount).toBe(30_000_000);
      expect(dist.items[1].percentage).toBe(38); // 30m / 80m total allocated * 100
      expect(dist.dominantCategoryName).toBe('Venue & Gedung');
    });
  });

  describe('calculateSpendingTrend', () => {
    it('returns empty data when no expenses exist', () => {
      const trend = calculateSpendingTrend(emptyBudget);
      expect(trend.hasData).toBe(false);
      expect(trend.points).toHaveLength(0);
      expect(trend.totalSpent).toBe(0);
    });

    it('aggregates expenses by month and computes cumulative trend', () => {
      const trend = calculateSpendingTrend(sampleBudget, '2026-12-01', 100_000_000);
      expect(trend.hasData).toBe(true);
      expect(trend.points).toHaveLength(1); // all sample expenses in 2026-09
      expect(trend.points[0].periodKey).toBe('2026-09');
      expect(trend.points[0].monthlySpent).toBe(65_000_000);
      expect(trend.points[0].cumulativeSpent).toBe(65_000_000);
      expect(trend.totalSpent).toBe(65_000_000);
    });

    it('handles multi-month transactions and calculates linear baseline if valid', () => {
      const multiMonthBudget: StoredBudget = {
        allocations: [],
        expenses: [
          { id: '1', title: 'DP Venue', category: 'venue', amount: 20_000_000, date: '2026-06-15', note: null, createdAt: '', updatedAt: '' },
          { id: '2', title: 'DP Catering', category: 'catering', amount: 15_000_000, date: '2026-07-20', note: null, createdAt: '', updatedAt: '' },
          { id: '3', title: 'Pelunasan', category: 'venue', amount: 30_000_000, date: '2026-08-10', note: null, createdAt: '', updatedAt: '' },
        ],
      };

      const trend = calculateSpendingTrend(multiMonthBudget, '2026-10-01', 100_000_000);
      expect(trend.points).toHaveLength(3);
      expect(trend.points[0].periodKey).toBe('2026-06');
      expect(trend.points[0].cumulativeSpent).toBe(20_000_000);
      expect(trend.points[1].periodKey).toBe('2026-07');
      expect(trend.points[1].cumulativeSpent).toBe(35_000_000);
      expect(trend.points[2].periodKey).toBe('2026-08');
      expect(trend.points[2].cumulativeSpent).toBe(65_000_000);
      expect(trend.hasBaseline).toBe(true);
    });
  });

  describe('calculateTopSpendingCategories', () => {
    it('returns empty array when no expenses', () => {
      const top = calculateTopSpendingCategories(emptyBudget, 100_000_000);
      expect(top).toHaveLength(0);
    });

    it('ranks categories by actual spending and computes percentage', () => {
      const top = calculateTopSpendingCategories(sampleBudget, 100_000_000, 5);
      expect(top).toHaveLength(3); // venue (50m), general (10m), catering (5m)
      expect(top[0].category).toBe('venue');
      expect(top[0].spentAmount).toBe(50_000_000);
      expect(top[0].rank).toBe(1);
      expect(top[0].percentageOfTotalSpent).toBe(77); // 50 / 65 * 100
      expect(top[1].category).toBe('general');
      expect(top[1].spentAmount).toBe(10_000_000);
      expect(top[1].rank).toBe(2);
      expect(top[2].category).toBe('catering');
      expect(top[2].spentAmount).toBe(5_000_000);
      expect(top[2].rank).toBe(3);
    });
  });

  describe('getBudgetHealthAssessment', () => {
    it('returns low_data when budget is 0', () => {
      const overview = calculateBudgetOverview(0, emptyBudget);
      const assessment = getBudgetHealthAssessment(overview, 0);
      expect(assessment.status).toBe('low_data');
      expect(assessment.variant).toBe('charcoal');
    });

    it('returns low_data when budget > 0 but 0 expenses', () => {
      const overview = calculateBudgetOverview(100_000_000, emptyBudget);
      const assessment = getBudgetHealthAssessment(overview, 0);
      expect(assessment.status).toBe('low_data');
      expect(assessment.badgeLabel).toBe('Belum Ada Pengeluaran');
    });

    it('returns healthy when spending is low (<=70%)', () => {
      const budget: StoredBudget = {
        allocations: [{ id: '1', category: 'venue', amount: 50_000_000, createdAt: '', updatedAt: '' }],
        expenses: [{ id: '1', title: 'DP', category: 'venue', amount: 30_000_000, date: '', note: null, createdAt: '', updatedAt: '' }],
      };
      const overview = calculateBudgetOverview(100_000_000, budget);
      const assessment = getBudgetHealthAssessment(overview, budget.expenses.length);
      expect(assessment.status).toBe('healthy');
      expect(assessment.variant).toBe('emerald');
      expect(assessment.badgeLabel).toBe('Budget Terkendali');
    });

    it('returns high_spending when spending > 70% but <= 100%', () => {
      const budget: StoredBudget = {
        allocations: [{ id: '1', category: 'venue', amount: 85_000_000, createdAt: '', updatedAt: '' }],
        expenses: [{ id: '1', title: 'DP', category: 'venue', amount: 80_000_000, date: '', note: null, createdAt: '', updatedAt: '' }],
      };
      const overview = calculateBudgetOverview(100_000_000, budget);
      const assessment = getBudgetHealthAssessment(overview, budget.expenses.length);
      expect(assessment.status).toBe('high_spending');
      expect(assessment.variant).toBe('amber');
      expect(assessment.badgeLabel).toBe('Pengeluaran Meningkat');
    });

    it('returns over_budget when spending > total budget', () => {
      const budget: StoredBudget = {
        allocations: [],
        expenses: [{ id: '1', title: 'DP', category: 'venue', amount: 120_000_000, date: '', note: null, createdAt: '', updatedAt: '' }],
      };
      const overview = calculateBudgetOverview(100_000_000, budget);
      const assessment = getBudgetHealthAssessment(overview, budget.expenses.length);
      expect(assessment.status).toBe('over_budget');
      expect(assessment.variant).toBe('rose');
      expect(assessment.badgeLabel).toBe('Budget Terlampaui');
    });
  });

  describe('calculateUpcomingPayments', () => {
    it('returns empty array when no selected vendors or payment tasks', () => {
      const payments = calculateUpcomingPayments([], [], emptyBudget);
      expect(payments).toHaveLength(0);
    });

    it('derives upcoming payments for selected vendors with remaining balance', () => {
      const vendors = [
        {
          id: 'v1',
          name: 'Grand Ballroom',
          category: 'venue' as const,
          status: 'selected' as const,
          quotedPrice: 60_000_000,
          contactName: null,
          phone: null,
          instagram: null,
          notes: null,
          createdAt: '',
          updatedAt: '',
        },
      ];

      const tasks = [
        {
          id: 't1',
          title: 'Pelunasan Gedung',
          description: null,
          category: 'venue' as const,
          status: 'todo' as const,
          priority: 'high' as const,
          dueDate: '2026-10-15',
          estimatedMinutes: null,
          source: 'custom' as const,
          templateId: null,
          vendorId: 'v1',
          eventIds: [],
          createdAt: '',
          updatedAt: '',
          completedAt: null,
        },
      ];

      // Sample budget has 50m spent on venue. Quoted is 60m. Remaining is 10m.
      const payments = calculateUpcomingPayments(vendors, tasks, sampleBudget, '2026-09-18');
      expect(payments).toHaveLength(1);
      expect(payments[0].amount).toBe(10_000_000);
      expect(payments[0].vendorName).toBe('Grand Ballroom');
      expect(payments[0].dueDate).toBe('2026-10-15');
      expect(payments[0].status).toBe('partial');
    });
  });

  describe('calculateBudgetProjection', () => {
    it('handles empty data gracefully', () => {
      const proj = calculateBudgetProjection(0, emptyBudget, []);
      expect(proj.hasSufficientData).toBe(false);
      expect(proj.projectedBalance).toBe(0);
    });

    it('projects surplus accurately when within budget', () => {
      // 100m total budget, 65m spent, remaining budget = 35m
      // Venue allocated 50m (spent 50m -> remaining need 0)
      // Catering allocated 30m (spent 5m -> remaining need 25m)
      // Total estimated remaining needs = 25m
      // Projected balance = 35m - 25m = 10m (Surplus)
      const proj = calculateBudgetProjection(100_000_000, sampleBudget, []);
      expect(proj.hasSufficientData).toBe(true);
      expect(proj.actualSpent).toBe(65_000_000);
      expect(proj.remainingBudget).toBe(35_000_000);
      expect(proj.estimatedRemainingNeeds).toBe(25_000_000);
      expect(proj.projectedBalance).toBe(10_000_000);
      expect(proj.isWithinBudget).toBe(true);
    });

    it('projects potential shortfall with selected vendor quotes', () => {
      // 100m total budget, 65m spent -> remaining budget = 35m
      // Selected vendor for Catering: quoted 45m (spent 5m -> remaining need 40m)
      // Total remaining needs = 40m
      // Projected balance = 35m - 40m = -5m (Shortfall)
      const vendors = [
        {
          id: 'v1',
          name: 'Catering Prima',
          category: 'catering' as const,
          status: 'selected' as const,
          quotedPrice: 45_000_000,
          contactName: null,
          phone: null,
          instagram: null,
          notes: null,
          createdAt: '',
          updatedAt: '',
        },
      ];

      const proj = calculateBudgetProjection(100_000_000, sampleBudget, vendors);
      expect(proj.hasSufficientData).toBe(true);
      expect(proj.remainingBudget).toBe(35_000_000);
      expect(proj.estimatedRemainingNeeds).toBe(40_000_000);
      expect(proj.projectedBalance).toBe(-5_000_000);
      expect(proj.isWithinBudget).toBe(false);
    });

    // ─── 13 AUDIT SCENARIOS: ZERO DOUBLE COUNTING & INTEGRITY ───

    it('Scenario 1: Allocation without vendor calculates remaining need from allocation', () => {
      const budget: StoredBudget = {
        allocations: [{ id: '1', category: 'venue', amount: 50_000_000, createdAt: '', updatedAt: '' }],
        expenses: [],
      };
      const proj = calculateBudgetProjection(100_000_000, budget, []);
      expect(proj.estimatedRemainingNeeds).toBe(50_000_000);
      expect(proj.remainingBudget).toBe(100_000_000);
      expect(proj.projectedBalance).toBe(50_000_000);
    });

    it('Scenario 2: Vendor without expense calculates need from quote', () => {
      const budget: StoredBudget = { allocations: [], expenses: [] };
      const vendors = [{
        id: 'v1', name: 'Gedung A', category: 'venue' as const, status: 'selected' as const, quotedPrice: 40_000_000,
        contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: ''
      }];
      const proj = calculateBudgetProjection(100_000_000, budget, vendors);
      expect(proj.estimatedRemainingNeeds).toBe(40_000_000);
      expect(proj.remainingBudget).toBe(100_000_000);
      expect(proj.projectedBalance).toBe(60_000_000);
    });

    it('Scenario 3: Vendor with partial payment subtracts paid amount from future obligation', () => {
      const budget: StoredBudget = {
        allocations: [],
        expenses: [{ id: 'e1', title: 'DP Gedung', category: 'venue', amount: 15_000_000, date: '2026-09-01', note: null, createdAt: '', updatedAt: '' }],
      };
      const vendors = [{
        id: 'v1', name: 'Gedung A', category: 'venue' as const, status: 'selected' as const, quotedPrice: 40_000_000,
        contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: ''
      }];
      const proj = calculateBudgetProjection(100_000_000, budget, vendors);
      expect(proj.actualSpent).toBe(15_000_000);
      expect(proj.remainingBudget).toBe(85_000_000);
      expect(proj.estimatedRemainingNeeds).toBe(25_000_000); // 40m - 15m
      expect(proj.projectedBalance).toBe(60_000_000); // 85m - 25m = 60m (total cost remains 40m)
    });

    it('Scenario 4: Vendor already fully paid has 0 remaining future need', () => {
      const budget: StoredBudget = {
        allocations: [],
        expenses: [
          { id: 'e1', title: 'DP', category: 'venue', amount: 20_000_000, date: '2026-09-01', note: null, createdAt: '', updatedAt: '' },
          { id: 'e2', title: 'Pelunasan', category: 'venue', amount: 20_000_000, date: '2026-09-02', note: null, createdAt: '', updatedAt: '' },
        ],
      };
      const vendors = [{
        id: 'v1', name: 'Gedung A', category: 'venue' as const, status: 'selected' as const, quotedPrice: 40_000_000,
        contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: ''
      }];
      const proj = calculateBudgetProjection(100_000_000, budget, vendors);
      expect(proj.actualSpent).toBe(40_000_000);
      expect(proj.remainingBudget).toBe(60_000_000);
      expect(proj.estimatedRemainingNeeds).toBe(0); // Fully paid
      expect(proj.projectedBalance).toBe(60_000_000);
    });

    it('Scenario 5: Expense without vendor reduces remaining budget without double counting', () => {
      const budget: StoredBudget = {
        allocations: [],
        expenses: [{ id: 'e1', title: 'Biaya Tak Terduga', category: 'general', amount: 5_000_000, date: '2026-09-01', note: null, createdAt: '', updatedAt: '' }],
      };
      const proj = calculateBudgetProjection(100_000_000, budget, []);
      expect(proj.actualSpent).toBe(5_000_000);
      expect(proj.remainingBudget).toBe(95_000_000);
      expect(proj.estimatedRemainingNeeds).toBe(0);
    });

    it('Scenario 6 & 7: Allocation + vendor in same category where quote < allocation uses vendor quote', () => {
      const budget: StoredBudget = {
        allocations: [{ id: '1', category: 'catering', amount: 50_000_000, createdAt: '', updatedAt: '' }],
        expenses: [{ id: 'e1', title: 'DP Catering', category: 'catering', amount: 10_000_000, date: '2026-09-01', note: null, createdAt: '', updatedAt: '' }],
      };
      const vendors = [{
        id: 'v1', name: 'Catering Murah', category: 'catering' as const, status: 'selected' as const, quotedPrice: 40_000_000,
        contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: ''
      }];
      const proj = calculateBudgetProjection(100_000_000, budget, vendors);
      // Committed need is 40m - 10m spent = 30m remaining need (saved 10m from initial 50m allocation)
      expect(proj.estimatedRemainingNeeds).toBe(30_000_000);
      expect(proj.remainingBudget).toBe(90_000_000);
      expect(proj.projectedBalance).toBe(60_000_000); // 100m total - 40m vendor cost = 60m
    });

    it('Scenario 8: Vendor quote > allocation uses vendor quote commitment', () => {
      const budget: StoredBudget = {
        allocations: [{ id: '1', category: 'catering', amount: 30_000_000, createdAt: '', updatedAt: '' }],
        expenses: [],
      };
      const vendors = [{
        id: 'v1', name: 'Catering Mewah', category: 'catering' as const, status: 'selected' as const, quotedPrice: 45_000_000,
        contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: ''
      }];
      const proj = calculateBudgetProjection(100_000_000, budget, vendors);
      expect(proj.estimatedRemainingNeeds).toBe(45_000_000);
      expect(proj.projectedBalance).toBe(55_000_000);
    });

    it('Scenario 9: Multiple selected vendors in same category aggregates quotes', () => {
      const budget: StoredBudget = {
        allocations: [],
        expenses: [{ id: 'e1', title: 'DP Foto', category: 'photography', amount: 5_000_000, date: '2026-09-01', note: null, createdAt: '', updatedAt: '' }],
      };
      const vendors = [
        { id: 'v1', name: 'Photographer A', category: 'photography' as const, status: 'selected' as const, quotedPrice: 12_000_000, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' },
        { id: 'v2', name: 'Videographer B', category: 'photography' as const, status: 'selected' as const, quotedPrice: 8_000_000, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' },
      ];
      const proj = calculateBudgetProjection(100_000_000, budget, vendors);
      // Total photography quote = 12m + 8m = 20m. Spent = 5m. Remaining need = 15m.
      expect(proj.estimatedRemainingNeeds).toBe(15_000_000);
      expect(proj.remainingBudget).toBe(95_000_000);
      expect(proj.projectedBalance).toBe(80_000_000);
    });

    it('Scenario 10: Cancelled / non-selected vendors are ignored from future obligations', () => {
      const budget: StoredBudget = { allocations: [], expenses: [] };
      const vendors = [
        { id: 'v1', name: 'Vendor Batal', category: 'venue' as const, status: 'not_selected' as const, quotedPrice: 50_000_000, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' },
        { id: 'v2', name: 'Vendor Negosiasi', category: 'catering' as const, status: 'negotiating' as const, quotedPrice: 40_000_000, contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: '' },
      ];
      const proj = calculateBudgetProjection(100_000_000, budget, vendors);
      expect(proj.estimatedRemainingNeeds).toBe(0);
    });

    it('Scenario 11: Cancelled / completed payment tasks do not generate unassigned obligations', () => {
      const tasks = [
        { id: 't1', title: 'Bayar DP Gedung', description: null, category: 'venue' as const, status: 'completed' as const, priority: 'high' as const, dueDate: '2026-09-01', estimatedMinutes: null, source: 'custom' as const, templateId: null, eventIds: [], createdAt: '', updatedAt: '', completedAt: '2026-09-01' }
      ];
      const payments = calculateUpcomingPayments([], tasks, emptyBudget);
      expect(payments).toHaveLength(0);
    });

    it('Scenario 12 & 13: Multiple expenses for same category correctly reduce remaining obligations', () => {
      const budget: StoredBudget = {
        allocations: [{ id: '1', category: 'venue', amount: 50_000_000, createdAt: '', updatedAt: '' }],
        expenses: [
          { id: 'e1', title: 'DP 1', category: 'venue', amount: 10_000_000, date: '2026-06-01', note: null, createdAt: '', updatedAt: '' },
          { id: 'e2', title: 'DP 2', category: 'venue', amount: 15_000_000, date: '2026-07-01', note: null, createdAt: '', updatedAt: '' },
          { id: 'e3', title: 'Pelunasan', category: 'venue', amount: 25_000_000, date: '2026-08-01', note: null, createdAt: '', updatedAt: '' },
        ],
      };
      const proj = calculateBudgetProjection(100_000_000, budget, []);
      expect(proj.actualSpent).toBe(50_000_000);
      expect(proj.remainingBudget).toBe(50_000_000);
      expect(proj.estimatedRemainingNeeds).toBe(0); // Fully satisfied
      expect(proj.projectedBalance).toBe(50_000_000);
    });
  });

  describe('Budget Health Assessment with Projection Deficit Awareness', () => {
    it('detects projected deficit even when actual spent is low (<70%)', () => {
      // 100m total budget, only 10m spent (10%), but selected vendor quote is 95m (remaining need = 85m)
      // Remaining budget = 90m. Remaining need = 95m. Projected balance = -5m (Deficit!)
      const budget: StoredBudget = {
        allocations: [],
        expenses: [{ id: 'e1', title: 'DP', category: 'venue', amount: 10_000_000, date: '', note: null, createdAt: '', updatedAt: '' }],
      };
      const vendors = [{
        id: 'v1', name: 'Venue Mahal', category: 'venue' as const, status: 'selected' as const, quotedPrice: 105_000_000,
        contactName: null, phone: null, instagram: null, notes: null, createdAt: '', updatedAt: ''
      }];

      const overview = calculateBudgetOverview(100_000_000, budget);
      const proj = calculateBudgetProjection(100_000_000, budget, vendors);

      const assessment = getBudgetHealthAssessment(overview, budget.expenses.length, proj);
      expect(assessment.status).toBe('projected_deficit');
      expect(assessment.badgeLabel).toBe('Potensi Defisit');
      expect(assessment.variant).toBe('rose');
      expect(assessment.title).toContain('Potensi Kekurangan Anggaran');
    });

    it('returns healthy when both actual spent is low and projection is within budget', () => {
      const budget: StoredBudget = {
        allocations: [{ id: '1', category: 'venue', amount: 50_000_000, createdAt: '', updatedAt: '' }],
        expenses: [{ id: 'e1', title: 'DP', category: 'venue', amount: 20_000_000, date: '', note: null, createdAt: '', updatedAt: '' }],
      };
      const overview = calculateBudgetOverview(100_000_000, budget);
      const proj = calculateBudgetProjection(100_000_000, budget, []);

      const assessment = getBudgetHealthAssessment(overview, budget.expenses.length, proj);
      expect(assessment.status).toBe('healthy');
      expect(assessment.variant).toBe('emerald');
      expect(assessment.badgeLabel).toBe('Budget Terkendali');
    });
  });
});
