import { StoredBudget, BudgetCategory } from '../types/budget';
import { CATEGORY_LABELS, CATEGORY_ORDER } from './categories';
import { formatRupiahNumber, formatIndonesianDate } from './workspaceSelectors';
import { Vendor } from '../types/vendor';
import { TaskItem } from '../types/checklist';

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

export const CATEGORY_COLORS: Record<BudgetCategory, string> = {
  venue: '#71343B', // Burgundy
  catering: '#B89A70', // Muted Gold
  photography: '#3D5A80', // Slate Blue
  decoration: '#9A6B79', // Rose Burgundy
  makeup_attire: '#D4A373', // Warm Sand
  invitation: '#6B705C', // Olive Grey
  general: '#8D99AE', // Soft Steel
};

export function calculateBudgetOverview(
  totalBudget: number,
  budget: StoredBudget
): BudgetOverview {
  const safeBudget = Math.max(0, totalBudget || 0);
  const totalAllocated = (budget.allocations || []).reduce((sum, a) => sum + (a.amount || 0), 0);
  const unallocated = Math.max(0, safeBudget - totalAllocated);
  const totalSpent = (budget.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalRemaining = safeBudget - totalSpent;

  return {
    totalBudget: safeBudget,
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
  (budget.allocations || []).forEach((alloc) => {
    if (summaries[alloc.category]) {
      summaries[alloc.category].allocated = alloc.amount || 0;
    }
  });

  // Apply expenses
  (budget.expenses || []).forEach((expense) => {
    if (summaries[expense.category]) {
      summaries[expense.category].spent += (expense.amount || 0);
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

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 2: DISTRIBUSI BUDGET DONUT DATA
// ─────────────────────────────────────────────────────────────────────────────

export interface BudgetDistributionItem {
  category: BudgetCategory;
  name: string;
  allocatedAmount: number;
  percentage: number; // percentage of total allocated or total budget
  color: string;
  spentAmount: number;
}

export interface BudgetDistributionResult {
  totalBudget: number;
  totalAllocated: number;
  items: BudgetDistributionItem[];
  dominantCategoryName: string | null;
  dominantCategoryPercentage: number;
  hasAllocations: boolean;
}

export function calculateBudgetDistribution(
  totalBudget: number,
  budget: StoredBudget
): BudgetDistributionResult {
  const safeTotalBudget = Math.max(0, totalBudget || 0);
  const allocations = budget.allocations || [];
  const expenses = budget.expenses || [];

  const totalAllocated = allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
  const baseForPercentage = totalAllocated > 0 ? totalAllocated : safeTotalBudget;

  const allCategories: BudgetCategory[] = [...CATEGORY_ORDER, 'general'];

  const items: BudgetDistributionItem[] = allCategories
    .map((cat) => {
      const alloc = allocations.find((a) => a.category === cat);
      const allocatedAmount = alloc?.amount || 0;
      const spentAmount = expenses
        .filter((e) => e.category === cat)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      const percentage = baseForPercentage > 0 ? Math.round((allocatedAmount / baseForPercentage) * 100) : 0;

      return {
        category: cat,
        name: cat === 'general' ? 'Lainnya' : CATEGORY_LABELS[cat] || cat,
        allocatedAmount,
        percentage,
        color: CATEGORY_COLORS[cat] || '#8D99AE',
        spentAmount,
      };
    })
    .filter((item) => item.allocatedAmount > 0)
    .sort((a, b) => b.allocatedAmount - a.allocatedAmount);

  const dominant = items.length > 0 ? items[0] : null;

  return {
    totalBudget: safeTotalBudget,
    totalAllocated,
    items,
    dominantCategoryName: dominant ? dominant.name : null,
    dominantCategoryPercentage: dominant ? dominant.percentage : 0,
    hasAllocations: items.length > 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 3: TREN PENGELUARAN (SPENDING TREND)
// ─────────────────────────────────────────────────────────────────────────────

export interface SpendingTrendPoint {
  periodKey: string; // YYYY-MM
  periodLabel: string; // "Jun 2026"
  monthlySpent: number;
  cumulativeSpent: number;
  plannedCumulative?: number;
}

export interface SpendingTrendResult {
  points: SpendingTrendPoint[];
  hasData: boolean;
  totalSpent: number;
  hasBaseline: boolean;
  maxAmount: number;
}

const SHORT_MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

export function formatPeriodLabel(yearMonth: string): string {
  const parts = yearMonth.split('-');
  if (parts.length < 2) return yearMonth;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${SHORT_MONTHS_ID[monthIdx]} ${year}`;
  }
  return yearMonth;
}

export function calculateSpendingTrend(
  budget: StoredBudget,
  weddingDate?: string,
  totalBudget?: number
): SpendingTrendResult {
  const expenses = (budget.expenses || [])
    .filter((e) => e.amount > 0 && e.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (expenses.length === 0) {
    return {
      points: [],
      hasData: false,
      totalSpent: 0,
      hasBaseline: false,
      maxAmount: 0,
    };
  }

  // Aggregate by YYYY-MM
  const monthlyTotals = new Map<string, number>();
  for (const exp of expenses) {
    const period = exp.date.substring(0, 7); // YYYY-MM
    monthlyTotals.set(period, (monthlyTotals.get(period) || 0) + exp.amount);
  }

  const sortedPeriods = Array.from(monthlyTotals.keys()).sort();

  // Compute cumulative spending
  let runningTotal = 0;
  const points: SpendingTrendPoint[] = [];

  for (const period of sortedPeriods) {
    const monthlySpent = monthlyTotals.get(period) || 0;
    runningTotal += monthlySpent;

    points.push({
      periodKey: period,
      periodLabel: formatPeriodLabel(period),
      monthlySpent,
      cumulativeSpent: runningTotal,
    });
  }

  const totalSpent = runningTotal;

  // Compute baseline only if totalBudget > 0 and weddingDate is valid and later than first expense
  let hasBaseline = false;
  if (totalBudget && totalBudget > 0 && weddingDate && points.length > 0) {
    const firstPeriod = points[0].periodKey;
    const weddingPeriod = weddingDate.substring(0, 7);

    if (weddingPeriod >= firstPeriod && sortedPeriods.length > 1) {
      // Deterministic planning baseline: linear distribution up to wedding month
      const startYear = parseInt(firstPeriod.substring(0, 4), 10);
      const startMonth = parseInt(firstPeriod.substring(5, 7), 10);
      const endYear = parseInt(weddingPeriod.substring(0, 4), 10);
      const endMonth = parseInt(weddingPeriod.substring(5, 7), 10);

      const totalSpanMonths = Math.max(1, (endYear - startYear) * 12 + (endMonth - startMonth) + 1);

      points.forEach((pt) => {
        const pYear = parseInt(pt.periodKey.substring(0, 4), 10);
        const pMonth = parseInt(pt.periodKey.substring(5, 7), 10);
        const monthsFromStart = (pYear - startYear) * 12 + (pMonth - startMonth) + 1;
        const progressRatio = Math.min(1, monthsFromStart / totalSpanMonths);
        pt.plannedCumulative = Math.round(totalBudget * progressRatio);
      });
      hasBaseline = true;
    }
  }

  const maxAmount = Math.max(
    ...points.map((p) => Math.max(p.cumulativeSpent, p.plannedCumulative || 0)),
    totalBudget || 0
  );

  return {
    points,
    hasData: true,
    totalSpent,
    hasBaseline,
    maxAmount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 4: TOP 5 PENGELUARAN (LARGEST ACTUAL EXPENSES)
// ─────────────────────────────────────────────────────────────────────────────

export interface TopSpendingCategoryItem {
  category: BudgetCategory;
  name: string;
  spentAmount: number;
  percentageOfTotalSpent: number; // 0 to 100
  percentageOfBudget: number; // 0 to 100
  color: string;
  rank: number;
}

export function calculateTopSpendingCategories(
  budget: StoredBudget,
  totalBudget: number = 0,
  limit: number = 5
): TopSpendingCategoryItem[] {
  const expenses = budget.expenses || [];
  const safeTotalBudget = Math.max(0, totalBudget);

  const categorySpentMap = new Map<BudgetCategory, number>();
  let grandTotalSpent = 0;

  for (const exp of expenses) {
    if (exp.amount > 0) {
      categorySpentMap.set(exp.category, (categorySpentMap.get(exp.category) || 0) + exp.amount);
      grandTotalSpent += exp.amount;
    }
  }

  if (grandTotalSpent === 0) {
    return [];
  }

  const sortedCategories = Array.from(categorySpentMap.entries())
    .map(([category, spentAmount]) => {
      const percentageOfTotalSpent = Math.round((spentAmount / grandTotalSpent) * 100);
      const percentageOfBudget = safeTotalBudget > 0 ? Math.round((spentAmount / safeTotalBudget) * 100) : 0;
      const name = category === 'general' ? 'Lainnya' : CATEGORY_LABELS[category] || category;

      return {
        category,
        name,
        spentAmount,
        percentageOfTotalSpent,
        percentageOfBudget,
        color: CATEGORY_COLORS[category] || '#8D99AE',
        rank: 0,
      };
    })
    .sort((a, b) => b.spentAmount - a.spentAmount)
    .slice(0, limit);

  return sortedCategories.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 5: BUDGET HEALTH & INSIGHT DETERMINISTIC EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

export type BudgetHealthStatus = 'healthy' | 'high_spending' | 'over_budget' | 'over_allocated' | 'projected_deficit' | 'low_data';

export interface BudgetHealthAssessment {
  status: BudgetHealthStatus;
  badgeLabel: string;
  title: string;
  description: string;
  variant: 'emerald' | 'amber' | 'rose' | 'charcoal';
  spentPercentage: number;
  remainingPercentage: number;
}

export function getBudgetHealthAssessment(
  overview: BudgetOverview,
  expenseCount: number,
  projection?: BudgetProjectionResult
): BudgetHealthAssessment {
  const { totalBudget, totalSpent, totalRemaining, totalAllocated } = overview;

  if (totalBudget === 0) {
    return {
      status: 'low_data',
      badgeLabel: 'Belum Diatur',
      title: 'Atur Target Budget Pernikahan',
      description: 'Tentukan estimasi total anggaran pernikahanmu untuk mengaktifkan pemantauan kesehatan pengeluaran secara real-time.',
      variant: 'charcoal',
      spentPercentage: 0,
      remainingPercentage: 0,
    };
  }

  const spentPercentage = Math.round((totalSpent / totalBudget) * 100);
  const remainingPercentage = Math.max(0, Math.round((totalRemaining / totalBudget) * 100));

  // Condition 1: OVER BUDGET (actual spending exceeds total budget)
  if (totalSpent > totalBudget) {
    const overrun = totalSpent - totalBudget;
    return {
      status: 'over_budget',
      badgeLabel: 'Budget Terlampaui',
      title: 'Pengeluaran Melebihi Anggaran',
      description: `Pengeluaran saat ini sudah melebihi total budget sebesar ${formatRupiahNumber(overrun)}. Tinjau kembali alokasi pengeluaran berikutnya.`,
      variant: 'rose',
      spentPercentage,
      remainingPercentage: 0,
    };
  }

  // Condition 2: PROJECTED DEFICIT (future obligations exceed remaining budget)
  if (projection && projection.hasSufficientData && !projection.isWithinBudget) {
    const shortfall = Math.abs(projection.projectedBalance);
    return {
      status: 'projected_deficit',
      badgeLabel: 'Potensi Defisit',
      title: 'Potensi Kekurangan Anggaran Terdeteksi',
      description: `Sisa budget (${formatRupiahNumber(projection.remainingBudget)}) diperkirakan tidak mencukupi estimasi kebutuhan mendatang (${formatRupiahNumber(projection.estimatedRemainingNeeds)}) dengan potensi kekurangan ${formatRupiahNumber(shortfall)}. Pertimbangkan negosiasi vendor atau penyesuaian alokasi.`,
      variant: 'rose',
      spentPercentage,
      remainingPercentage,
    };
  }

  // Condition 3: LOW DATA (no expenses yet)
  if (expenseCount === 0 && totalSpent === 0) {
    return {
      status: 'low_data',
      badgeLabel: 'Belum Ada Pengeluaran',
      title: 'Belum Ada Pengeluaran Dicatat',
      description: 'Mulai catat pembayaran DP atau pengeluaran vendor pertamamu untuk melihat tren pengeluaran dan analisis alokasi yang akurat.',
      variant: 'charcoal',
      spentPercentage: 0,
      remainingPercentage: 100,
    };
  }

  // Condition 4: HIGH SPENDING (> 70% used)
  if (spentPercentage > 70) {
    return {
      status: 'high_spending',
      badgeLabel: 'Pengeluaran Meningkat',
      title: 'Sebagian Besar Budget Telah Digunakan',
      description: `Kamu telah menggunakan ${spentPercentage}% dari total budget. Sisa budget sebesar ${formatRupiahNumber(totalRemaining)} (${remainingPercentage}%). Pastikan kewajiban pembayaran berikutnya tetap terkendali.`,
      variant: 'amber',
      spentPercentage,
      remainingPercentage,
    };
  }

  // Condition 5: OVER ALLOCATED (Total allocations > budget)
  if (totalAllocated > totalBudget) {
    const diff = totalAllocated - totalBudget;
    return {
      status: 'over_allocated',
      badgeLabel: 'Perlu Penyesuaian Alokasi',
      title: 'Rencana Alokasi Melebihi Budget',
      description: `Total alokasi kategori melebihi total budget sebesar ${formatRupiahNumber(diff)}. Sesuaikan target alokasi agar seimbang dengan total budget.`,
      variant: 'amber',
      spentPercentage,
      remainingPercentage,
    };
  }

  // Condition 6: HEALTHY (Budget is controlled and projection is balanced)
  return {
    status: 'healthy',
    badgeLabel: 'Budget Terkendali',
    title: 'Kondisi Anggaran Masih Sehat',
    description: `Kamu masih memiliki ${formatRupiahNumber(totalRemaining)} (${remainingPercentage}%) dari total budget. Pengeluaran dan proyeksi kebutuhan berjalan sesuai rencana.`,
    variant: 'emerald',
    spentPercentage,
    remainingPercentage,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 6: UPCOMING PAYMENT INSIGHT
// ─────────────────────────────────────────────────────────────────────────────

export interface UpcomingPaymentItem {
  id: string;
  title: string;
  vendorName?: string;
  category: BudgetCategory;
  categoryLabel: string;
  amount: number;
  dueDate: string | null; // YYYY-MM-DD
  dueDateFormatted: string;
  isOverdue: boolean;
  daysRemaining: number | null;
  sourceType: 'vendor' | 'task';
  status: 'unpaid' | 'partial' | 'pending';
  taskId?: string;
}

function calculateDaysDifference(targetDate: string, today: string): number {
  const target = new Date(targetDate + 'T00:00:00');
  const current = new Date(today + 'T00:00:00');
  return Math.ceil((target.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
}

export function calculateUpcomingPayments(
  vendors: Vendor[] = [],
  tasks: TaskItem[] = [],
  budget: StoredBudget,
  today: string = new Date().toISOString().split('T')[0]
): UpcomingPaymentItem[] {
  const items: UpcomingPaymentItem[] = [];
  const expenses = budget.expenses || [];

  // Group actual expenses by category
  const categorySpentMap = new Map<BudgetCategory, number>();
  for (const exp of expenses) {
    categorySpentMap.set(exp.category, (categorySpentMap.get(exp.category) || 0) + (exp.amount || 0));
  }

  // 1. Identify selected vendors with remaining balance (exclude considering, contacted, negotiating, not_selected)
  const selectedVendors = vendors.filter(
    (v) => v.status === 'selected' && v.quotedPrice !== null && v.quotedPrice > 0
  );

  const selectedVendorsCountByCategory = new Map<BudgetCategory, number>();
  for (const v of selectedVendors) {
    selectedVendorsCountByCategory.set(v.category, (selectedVendorsCountByCategory.get(v.category) || 0) + 1);
  }

  for (const vendor of selectedVendors) {
    const quotedPrice = vendor.quotedPrice || 0;
    const vendorCount = selectedVendorsCountByCategory.get(vendor.category) || 1;

    // Attribute expenses: check if expense title/note mentions vendor name
    const directVendorExpenses = expenses
      .filter((e) => e.category === vendor.category && (
        (vendor.name && e.title.toLowerCase().includes(vendor.name.toLowerCase())) ||
        (vendor.name && e.note && e.note.toLowerCase().includes(vendor.name.toLowerCase()))
      ))
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const effectiveSpent = directVendorExpenses > 0
      ? directVendorExpenses
      : (vendorCount === 1 ? (categorySpentMap.get(vendor.category) || 0) : 0);

    const remainingToPay = Math.max(0, quotedPrice - effectiveSpent);

    // Only include in upcoming payments if there is an unpaid balance (> 0)
    if (remainingToPay > 0) {
      // Find matching task for this vendor to extract due date if available
      const linkedTask = tasks.find(
        (t) => (t.vendorId === vendor.id || (t.category === vendor.category && !t.vendorId)) &&
               t.status !== 'completed' &&
               Boolean(t.dueDate)
      );

      const dueDate = linkedTask?.dueDate || null;
      let daysRemaining: number | null = null;
      let isOverdue = false;

      if (dueDate) {
        daysRemaining = calculateDaysDifference(dueDate, today);
        isOverdue = daysRemaining < 0;
      }

      items.push({
        id: `vendor-payment-${vendor.id}`,
        taskId: linkedTask?.id,
        title: `Pembayaran ${vendor.name}`,
        vendorName: vendor.name,
        category: vendor.category,
        categoryLabel: CATEGORY_LABELS[vendor.category] || vendor.category,
        amount: remainingToPay,
        dueDate,
        dueDateFormatted: dueDate ? formatIndonesianDate(dueDate) : 'Belum ada tanggal',
        isOverdue,
        daysRemaining,
        sourceType: 'vendor',
        status: effectiveSpent > 0 ? 'partial' : 'unpaid',
      });
    }
  }

  // 2. Also check payment-specific tasks with deadlines not covered by selected vendors
  const paymentKeywords = ['bayar', 'pembayaran', 'pelunasan', 'dp', 'angsuran', 'tagihan'];
  const activePaymentTasks = tasks.filter(
    (t) => t.status !== 'completed' &&
           Boolean(t.dueDate) &&
           paymentKeywords.some((kw) => t.title.toLowerCase().includes(kw)) &&
           !items.some((item) => (item.dueDate === t.dueDate && item.category === t.category) || (t.vendorId && item.id.includes(t.vendorId)))
  );

  for (const task of activePaymentTasks) {
    const dueDate = task.dueDate!;
    const daysRemaining = calculateDaysDifference(dueDate, today);
    const isOverdue = daysRemaining < 0;
    const cat = (task.category as BudgetCategory) || 'general';

    // Estimate amount from allocation if unassigned
    const alloc = (budget.allocations || []).find((a) => a.category === cat);
    const catSpent = categorySpentMap.get(cat) || 0;
    const estimatedAmount = alloc ? Math.max(0, alloc.amount - catSpent) : 0;

    if (estimatedAmount > 0) {
      items.push({
        id: `task-payment-${task.id}`,
        taskId: task.id,
        title: task.title,
        category: cat,
        categoryLabel: CATEGORY_LABELS[cat] || 'Lainnya',
        amount: estimatedAmount,
        dueDate,
        dueDateFormatted: formatIndonesianDate(dueDate),
        isOverdue,
        daysRemaining,
        sourceType: 'task',
        status: 'pending',
      });
    }
  }

  // Sort upcoming payments: Overdue first, then by earliest due date, then by largest amount
  items.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    if (a.dueDate && b.dueDate) {
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    } else if (a.dueDate && !b.dueDate) {
      return -1;
    } else if (!a.dueDate && b.dueDate) {
      return 1;
    }
    return b.amount - a.amount;
  });

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE 7: PROYEKSI BUDGET (BUDGET PROJECTION)
// ─────────────────────────────────────────────────────────────────────────────

export interface BudgetProjectionBreakdown {
  category: BudgetCategory;
  categoryName: string;
  allocated: number;
  spent: number;
  vendorQuotedPrice: number | null;
  selectedVendorName?: string;
  remainingNeed: number;
  source: 'selected_vendor' | 'allocation' | 'none';
}

export interface BudgetProjectionResult {
  totalBudget: number;
  actualSpent: number;
  remainingBudget: number;
  estimatedRemainingNeeds: number;
  projectedBalance: number;
  isWithinBudget: boolean;
  hasSufficientData: boolean;
  categoryBreakdowns: BudgetProjectionBreakdown[];
}

export function calculateBudgetProjection(
  totalBudget: number,
  budget: StoredBudget,
  vendors: Vendor[] = []
): BudgetProjectionResult {
  const safeTotalBudget = Math.max(0, totalBudget || 0);
  const allocations = budget.allocations || [];
  const expenses = budget.expenses || [];

  const actualSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const remainingBudget = safeTotalBudget - actualSpent;

  // Group actual expenses by category
  const categorySpentMap = new Map<BudgetCategory, number>();
  for (const exp of expenses) {
    categorySpentMap.set(exp.category, (categorySpentMap.get(exp.category) || 0) + (exp.amount || 0));
  }

  // Group selected vendors with quotes by category (supporting multiple selected vendors per category)
  const selectedVendorsByCategory = new Map<BudgetCategory, Vendor[]>();
  for (const v of vendors) {
    if (v.status === 'selected' && v.quotedPrice !== null && v.quotedPrice > 0) {
      const existing = selectedVendorsByCategory.get(v.category) || [];
      existing.push(v);
      selectedVendorsByCategory.set(v.category, existing);
    }
  }

  const allCategories: BudgetCategory[] = [...CATEGORY_ORDER, 'general'];
  const categoryBreakdowns: BudgetProjectionBreakdown[] = [];
  let totalEstimatedRemainingNeeds = 0;

  for (const cat of allCategories) {
    const alloc = allocations.find((a) => a.category === cat);
    const allocated = alloc?.amount || 0;
    const spent = categorySpentMap.get(cat) || 0;
    const catVendors = selectedVendorsByCategory.get(cat) || [];
    
    const totalVendorQuote = catVendors.reduce((sum, v) => sum + (v.quotedPrice || 0), 0);
    const vendorQuotedPrice = catVendors.length > 0 ? totalVendorQuote : null;
    const selectedVendorName = catVendors.length > 0 ? catVendors.map((v) => v.name).join(', ') : undefined;

    let remainingNeed = 0;
    let source: 'selected_vendor' | 'allocation' | 'none' = 'none';

    if (vendorQuotedPrice !== null && vendorQuotedPrice > 0) {
      // Priority 1: If user has agreed selected vendor quote(s)
      remainingNeed = Math.max(0, vendorQuotedPrice - spent);
      source = 'selected_vendor';
    } else if (allocated > 0) {
      // Priority 2: Fallback to budget allocation target for this category
      remainingNeed = Math.max(0, allocated - spent);
      source = 'allocation';
    }

    if (allocated > 0 || spent > 0 || vendorQuotedPrice !== null) {
      categoryBreakdowns.push({
        category: cat,
        categoryName: cat === 'general' ? 'Lainnya' : CATEGORY_LABELS[cat] || cat,
        allocated,
        spent,
        vendorQuotedPrice,
        selectedVendorName,
        remainingNeed,
        source,
      });

      totalEstimatedRemainingNeeds += remainingNeed;
    }
  }

  const projectedBalance = remainingBudget - totalEstimatedRemainingNeeds;
  const isWithinBudget = projectedBalance >= 0;

  // Sufficient data requires having a totalBudget > 0 and either allocations or selected vendor quotes
  const hasSufficientData =
    safeTotalBudget > 0 &&
    (allocations.length > 0 || selectedVendorsByCategory.size > 0);

  return {
    totalBudget: safeTotalBudget,
    actualSpent,
    remainingBudget,
    estimatedRemainingNeeds: totalEstimatedRemainingNeeds,
    projectedBalance,
    isWithinBudget,
    hasSufficientData,
    categoryBreakdowns,
  };
}
