import React from 'react';
import { ArrowRight, DollarSign, Users, Sliders } from 'lucide-react';
import { formatCompactRupiah } from '../../domain/workspaceSelectors';

export interface BudgetGuestSummaryPanelProps {
  estimatedBudget: number;
  totalSpent?: number;
  totalRemaining?: number;
  hasExpenses?: boolean;
  guestCount: number;
  onViewBudget: () => void;
  onViewGuests: () => void;
}

export const BudgetGuestSummaryPanel: React.FC<BudgetGuestSummaryPanelProps> = ({
  estimatedBudget,
  totalSpent = 0,
  totalRemaining = 0,
  hasExpenses = false,
  guestCount,
  onViewBudget,
  onViewGuests,
}) => {
  const displayRemaining = hasExpenses
    ? formatCompactRupiah(totalRemaining)
    : formatCompactRupiah(estimatedBudget);

  const displayTotal = formatCompactRupiah(estimatedBudget);
  const displaySpent = formatCompactRupiah(totalSpent);

  // Utilization calculation
  const utilizationPct = estimatedBudget > 0 
    ? Math.min(100, Math.round((totalSpent / estimatedBudget) * 100))
    : 0;

  const remainingPct = Math.max(0, 100 - utilizationPct);

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 lg:p-8 border border-beige-300 shadow-card flex flex-col justify-between h-full space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-beige">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0">
            <Sliders className="w-4 h-4 text-burgundy" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal">
            Snapshot
          </h2>
        </div>

        <span className="text-[10px] bg-ivory-100 text-charcoal-500 px-2.5 py-1 rounded-md border border-beige font-medium">
          Real-time
        </span>
      </div>

      {/* Top: Sisa Budget */}
      <div className="space-y-3 cursor-pointer" onClick={onViewBudget}>
        <div className="flex items-center gap-1.5 text-xs text-charcoal-400">
          <DollarSign className="w-3.5 h-3.5 text-burgundy shrink-0" />
          <span className="font-semibold text-charcoal">Sisa Budget</span>
        </div>

        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <div className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
            {displayRemaining}
          </div>
          <span className="text-xs text-charcoal-400">
            dari {displayTotal}
          </span>
        </div>

        {/* Progress Bar showing Budget Utilization */}
        <div className="space-y-1.5">
          <div className="w-full bg-beige-200/80 h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, remainingPct)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-charcoal-400">
            <span>Terpakai: {displaySpent}</span>
            <span className="font-medium text-charcoal-500">{remainingPct}% tersisa</span>
          </div>
        </div>
      </div>

      {/* Subtle Divider */}
      <hr className="border-t border-beige my-0" />

      {/* Bottom: Jumlah Tamu */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-charcoal-400">
          <Users className="w-3.5 h-3.5 text-gold-600 shrink-0" />
          <span className="font-semibold text-charcoal">Jumlah Tamu</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
              {guestCount} <span className="text-sm font-sans font-normal text-charcoal-400">orang</span>
            </div>
            <span className="text-xs text-charcoal-400 mt-0.5 block">
              Perkiraan saat ini
            </span>
          </div>

          <button
            type="button"
            onClick={onViewGuests}
            className="text-xs font-semibold text-charcoal-700 hover:text-burgundy bg-ivory-50 hover:bg-ivory-100 border border-beige px-3.5 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 min-h-touch"
          >
            <span>Lihat Tamu</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
};

export const DashboardSnapshot = BudgetGuestSummaryPanel;
