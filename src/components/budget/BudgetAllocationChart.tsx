import React, { useEffect, useState } from 'react';
import { BudgetCategory } from '../../types/budget';
import { CategoryBudgetSummary } from '../../domain/budgetSelectors';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../../domain/categories';
import { formatRupiahNumber } from '../../domain/workspaceSelectors';

interface BudgetAllocationChartProps {
  categorySummaries: Record<BudgetCategory, CategoryBudgetSummary>;
  totalBudget: number;
}

export const BudgetAllocationChart: React.FC<BudgetAllocationChartProps> = ({
  categorySummaries,
  totalBudget,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Small delay to trigger CSS transitions after mount
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (totalBudget === 0) {
    return null; // Do not show empty chart if no budget is set
  }

  const categories: BudgetCategory[] = [...CATEGORY_ORDER, 'general'];
  
  // Find max allocation to scale the bars relative to the largest category or total budget
  // Actually, scaling relative to total budget might make small categories invisible.
  // But scaling relative to max allocation makes it easier to compare categories.
  // Wait, let's scale to max allocation for better visibility, but capped at totalBudget if a category exceeds it.
  const maxAllocation = Math.max(...categories.map(c => Math.max(categorySummaries[c].allocated, categorySummaries[c].spent)));
  
  // Use a sensible max scale denominator. If nothing is allocated yet, use totalBudget.
  const scaleDenominator = maxAllocation > 0 ? maxAllocation : totalBudget;

  const totalAllocated = categories.reduce((sum, c) => sum + categorySummaries[c].allocated, 0);
  if (totalAllocated === 0 && maxAllocation === 0) {
    return (
      <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 border border-beige-300 shadow-card">
        <h3 className="font-serif text-xl font-bold text-charcoal mb-3">Ke Mana Budgetmu Dialokasikan?</h3>
        <div className="py-8 text-center bg-ivory-50 rounded-xl border border-beige border-dashed">
          <p className="text-charcoal-600 font-medium mb-1">Budget kamu sudah tercatat.</p>
          <p className="text-sm text-charcoal-400">
            Mulai alokasikan budget ke kebutuhan utama pernikahanmu di bawah.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 border border-beige-300 shadow-card">
      <h3 className="font-serif text-xl font-bold text-charcoal mb-6">Ke Mana Budgetmu Dialokasikan?</h3>
      
      <div className="space-y-5">
        {categories.map((cat) => {
          const summary = categorySummaries[cat];
          // Hide categories with 0 allocation and 0 spent to keep chart clean, 
          // unless user wants to see all. "Show the relative size of budget allocations across categories."
          if (summary.allocated === 0 && summary.spent === 0) return null;

          const allocatedPercent = scaleDenominator > 0 ? (summary.allocated / scaleDenominator) * 100 : 0;
          // Spent percent is relative to allocated if allocated > 0, otherwise relative to spent itself (which means 100% of the bar)
          // Actually, visually, spent should be a nested bar inside allocated, OR a layered bar.
          // Let's make the base bar the allocated width, and a darker bar inside it for spent width.
          // Wait, the spent bar width should be relative to the *same* denominator (scaleDenominator).
          const spentPercent = scaleDenominator > 0 ? (summary.spent / scaleDenominator) * 100 : 0;

          // Status colors
          let spentBgClass = "bg-burgundy";
          if (summary.status === 'melebihi_budget') spentBgClass = "bg-red-500";
          else if (summary.status === 'mendekati_batas') spentBgClass = "bg-amber-500";

          return (
            <div key={cat} className="group">
              <div className="flex justify-between items-end mb-1.5 gap-4">
                <span className="text-sm font-semibold text-charcoal truncate">
                  {cat === 'general' ? 'Lainnya' : CATEGORY_LABELS[cat]}
                </span>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-sm font-medium text-charcoal">
                    {formatRupiahNumber(summary.allocated)}
                  </span>
                  {summary.spent > 0 && (
                    <span className="text-[10px] sm:text-xs text-charcoal-400 font-medium">
                      Terpakai {formatRupiahNumber(summary.spent)}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Chart Track */}
              <div className="h-3 sm:h-4 w-full bg-ivory-100 rounded-full overflow-hidden flex relative">
                {/* Allocated Bar */}
                <div 
                  className="absolute top-0 left-0 h-full bg-beige-300 transition-all duration-700 ease-out motion-reduce:transition-none"
                  style={{ width: isMounted ? `${Math.min(allocatedPercent, 100)}%` : '0%' }}
                />
                
                {/* Spent Bar */}
                <div 
                  className={`absolute top-0 left-0 h-full ${spentBgClass} transition-all duration-700 delay-150 ease-out motion-reduce:transition-none`}
                  style={{ width: isMounted ? `${Math.min(spentPercent, 100)}%` : '0%' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
