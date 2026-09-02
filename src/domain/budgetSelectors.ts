import { StoredBudget, BudgetCategory } from '../types/budget';
import { CATEGORY_LABELS } from './categories';
import { formatRupiahNumber } from './workspaceSelectors';

export interface BudgetOverview {
  totalBudget: number;
  totalAllocated: number;
  unallocated: number;
  totalSpent: number;
  totalRemaining: number;
}

export interface CategoryBudgetSummary {
  category: BudgetCategory;
  allocated: number;
  spent: number;
  remaining: number;
  utilization: number; // 0 to 1
  status: 'aman' | 'mendekati_batas' | 'melebihi_budget' | 'belum_dialokasikan';
}

export function calculateBudgetOverview(
  totalBudget: number,
  budget: StoredBudget
): BudgetOverview {
  const totalAllocated = budget.allocations.reduce((sum, a) => sum + a.amount, 0);
  const unallocated = Math.max(0, totalBudget - totalAllocated);
  const totalSpent = budget.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalRemaining = totalBudget - totalSpent;

  return {
    totalBudget,
    totalAllocated,
    unallocated,
    totalSpent,
    totalRemaining,
  };
}

export function calculateCategorySummaries(
  budget: StoredBudget
): Record<BudgetCategory, CategoryBudgetSummary> {
  const summaries = {} as Record<BudgetCategory, CategoryBudgetSummary>;

  // Initialize with zeros for all recognized categories + 'general'
  const allCategories = Object.keys(CATEGORY_LABELS) as BudgetCategory[];
  allCategories.forEach((cat) => {
    summaries[cat] = {
      category: cat,
      allocated: 0,
      spent: 0,
      remaining: 0,
      utilization: 0,
      status: 'belum_dialokasikan',
    };
  });

  // Apply allocations
  budget.allocations.forEach((alloc) => {
    if (summaries[alloc.category]) {
      summaries[alloc.category].allocated = alloc.amount;
    }
  });

  // Apply expenses
  budget.expenses.forEach((expense) => {
    if (summaries[expense.category]) {
      summaries[expense.category].spent += expense.amount;
    }
  });

  // Calculate derivatives
  allCategories.forEach((cat) => {
    const summary = summaries[cat];
    summary.remaining = summary.allocated - summary.spent;

    if (summary.allocated > 0) {
      summary.utilization = summary.spent / summary.allocated;
      
      if (summary.spent > summary.allocated) {
        summary.status = 'melebihi_budget';
      } else if (summary.utilization >= 0.8) {
        summary.status = 'mendekati_batas';
      } else {
        summary.status = 'aman';
      }
    } else {
      summary.utilization = summary.spent > 0 ? 1 : 0;
      if (summary.spent > 0) {
        summary.status = 'melebihi_budget';
      } else {
        summary.status = 'belum_dialokasikan';
      }
    }
  });

  return summaries;
}

export interface BudgetInsightMessage {
  title: string;
  subtitle?: string;
  isCritical?: boolean;
}

export function getBudgetInsights(
  overview: BudgetOverview,
  categorySummaries: Record<BudgetCategory, CategoryBudgetSummary>
): BudgetInsightMessage[] {
  const insights: BudgetInsightMessage[] = [];

  // 1. Total budget overrun
  if (overview.totalSpent > overview.totalBudget && overview.totalBudget > 0) {
    const totalOverrun = overview.totalSpent - overview.totalBudget;
    insights.push({
      title: `Anggaran keseluruhan terlampaui ${formatRupiahNumber(totalOverrun)}.`,
      subtitle: `Pengeluaran saat ini ${formatRupiahNumber(overview.totalSpent)} dari total budget ${formatRupiahNumber(overview.totalBudget)}.`,
      isCritical: true,
    });
  }

  // 2. Category over allocation
  const overBudgetCategories = Object.values(categorySummaries)
    .filter((s) => s.spent > s.allocated)
    .map((s) => ({
      category: s.category,
      name: s.category === 'general' ? 'Lainnya' : CATEGORY_LABELS[s.category] || s.category,
      overrun: s.spent - s.allocated,
    }))
    .sort((a, b) => b.overrun - a.overrun);

  if (overBudgetCategories.length > 0) {
    const topOverrun = overBudgetCategories[0];
    insights.push({
      title: `${topOverrun.name} melebihi alokasi sebesar ${formatRupiahNumber(topOverrun.overrun)}.`,
      isCritical: true,
    });
  }

  // 3. Over-allocation (planning error)
  if (overview.totalAllocated > overview.totalBudget && overview.totalBudget > 0) {
    const diff = overview.totalAllocated - overview.totalBudget;
    insights.push({
      title: `Total alokasi melebihi budget sebesar ${formatRupiahNumber(diff)}.`,
    });
  }

  // 4. Category approaching limit
  const approachingLimitCategories = Object.values(categorySummaries)
    .filter((s) => s.status === 'mendekati_batas')
    .sort((a, b) => b.utilization - a.utilization);
  
  if (approachingLimitCategories.length > 0) {
    const topApproaching = approachingLimitCategories[0];
    const name = topApproaching.category === 'general' ? 'Lainnya' : CATEGORY_LABELS[topApproaching.category] || topApproaching.category;
    insights.push({
      title: `Pengeluaran untuk ${name} sudah mendekati batas alokasi.`,
    });
  }

  // 5. Unallocated budget
  if (overview.unallocated > 0) {
    insights.push({
      title: `${formatRupiahNumber(overview.unallocated)} budget masih belum dialokasikan.`,
    });
  }

  // Return max 3 insights
  return insights.slice(0, 3);
}
