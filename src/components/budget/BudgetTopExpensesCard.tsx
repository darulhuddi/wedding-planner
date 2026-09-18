import React from 'react';
import { TopSpendingCategoryItem } from '../../domain/budgetSelectors';
import { formatRupiahNumber } from '../../domain/workspaceSelectors';
import { BarChart3, Plus } from 'lucide-react';

interface BudgetTopExpensesCardProps {
  topCategories: TopSpendingCategoryItem[];
  totalSpent: number;
  onAddExpense?: () => void;
}

export const BudgetTopExpensesCard: React.FC<BudgetTopExpensesCardProps> = ({
  topCategories,
  totalSpent,
  onAddExpense,
}) => {
  if (topCategories.length === 0 || totalSpent === 0) {
    return (
      <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 lg:p-8 border border-beige-300 shadow-card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal">Pengeluaran Terbesar</h3>
            <p className="text-xs text-charcoal-400">Kategori dengan pengeluaran terbesar</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-ivory-100 flex items-center justify-center text-charcoal-400">
            <BarChart3 className="w-4 h-4" />
          </div>
        </div>

        <div className="py-10 text-center bg-ivory-50/60 rounded-2xl border border-beige border-dashed p-6 space-y-3">
          <p className="text-xs sm:text-sm text-charcoal-500 font-medium">
            Belum ada pengeluaran yang dicatat.
          </p>
          <p className="text-xs text-charcoal-400 max-w-sm mx-auto">
            Catat transaksi pembayaran vendor untuk melihat 5 kategori pengeluaran terbesarmu.
          </p>
          {onAddExpense && (
            <button
              type="button"
              onClick={onAddExpense}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-burgundy text-white hover:bg-burgundy-700 transition-colors shadow-xs cursor-pointer min-h-touch mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Pengeluaran</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Find max single category spent for bar proportion
  const maxCategorySpent = Math.max(...topCategories.map((c) => c.spentAmount));

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 lg:p-8 border border-beige-300 shadow-card space-y-6">
      
      {/* Header Row */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-beige">
        <div>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal">Pengeluaran Terbesar</h3>
          <p className="text-xs text-charcoal-400">Kategori dengan pengeluaran aktual terbesar</p>
        </div>
        <span className="text-xs font-bold text-charcoal-500 bg-ivory-100 px-2.5 py-1 rounded-lg border border-beige">
          Top {topCategories.length} Kategori
        </span>
      </div>

      {/* Category Bars */}
      <div className="space-y-4">
        {topCategories.map((item) => {
          const barWidthPercent = maxCategorySpent > 0 ? (item.spentAmount / maxCategorySpent) * 100 : 0;

          return (
            <div key={item.category} className="space-y-1.5">
              
              {/* Category Label and Values */}
              <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-ivory-100 border border-beige flex items-center justify-center text-[10px] font-bold text-charcoal-600 shrink-0">
                    {item.rank}
                  </span>
                  <span className="font-semibold text-charcoal truncate">
                    {item.name}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 text-right">
                  <span className="font-bold text-charcoal">
                    {formatRupiahNumber(item.spentAmount)}
                  </span>
                  <span className="text-[11px] font-semibold text-charcoal-400 w-12 text-right">
                    {item.percentageOfTotalSpent}%
                  </span>
                </div>
              </div>

              {/* Progress Track */}
              <div className="h-2.5 sm:h-3 w-full bg-ivory-100 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(100, Math.max(4, barWidthPercent))}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>

            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="pt-3 border-t border-beige text-xs text-charcoal-400 flex items-center justify-between">
        <span>Berdasarkan total pengeluaran aktual</span>
        <span className="font-bold text-charcoal">{formatRupiahNumber(totalSpent)}</span>
      </div>

    </div>
  );
};
