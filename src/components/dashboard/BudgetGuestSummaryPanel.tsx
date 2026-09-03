import React from 'react';
import { ArrowRight, DollarSign, Users } from 'lucide-react';
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
  const displayBudgetValue = hasExpenses
    ? formatCompactRupiah(totalRemaining)
    : formatCompactRupiah(estimatedBudget);

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 border border-beige-300 shadow-card h-full flex flex-col justify-between space-y-6">
      
      {/* Top Section: Perkiraan Budget */}
      <div className="space-y-3 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center text-xs text-charcoal-400 mb-1.5">
            <span className="font-semibold text-charcoal flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-burgundy shrink-0" />
              {hasExpenses ? 'Sisa Budget' : 'Perkiraan Budget'}
            </span>
            <span className="text-[10px] bg-ivory-100 text-charcoal-400 px-2 py-0.5 rounded border border-beige font-medium">
              {hasExpenses ? 'Real-time' : 'Estimasi Awal'}
            </span>
          </div>

          {/* Compact Human-Readable Rupiah Representation */}
          <div className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight mt-1">
            {displayBudgetValue}
          </div>

          <p className="text-xs text-charcoal-400 mt-2 leading-relaxed">
            {hasExpenses ? (
              <>Sisa budget. Terpakai: <strong className="text-charcoal-500 font-medium">{formatCompactRupiah(totalSpent)}</strong>.</>
            ) : (
              <>
                Belum dialokasikan.
                <br />
                Siap untuk mulai disusun.
              </>
            )}
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onViewBudget}
            className="text-xs font-semibold text-burgundy hover:text-burgundy-700 flex items-center gap-1.5 transition-colors cursor-pointer group min-h-touch"
          >
            <span>Lihat Budget</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Subtle Horizontal Divider */}
      <hr className="border-t border-beige my-0" />

      {/* Bottom Section: Jumlah Tamu */}
      <div className="space-y-3 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center text-xs text-charcoal-400 mb-1.5">
            <span className="font-semibold text-charcoal flex items-center gap-1.5">
              <Users className="w-4 h-4 text-gold-600 shrink-0" />
              Jumlah Tamu
            </span>
            <span className="text-[10px] bg-ivory-100 text-charcoal-400 px-2 py-0.5 rounded border border-beige font-medium">
              Perkiraan
            </span>
          </div>

          {/* Large Readable Guest Count */}
          <div className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight mt-1">
            {guestCount} <span className="text-base font-sans font-normal text-charcoal-400">orang</span>
          </div>

          <p className="text-xs text-charcoal-400 mt-2 leading-relaxed">
            Acuan awal untuk venue & catering.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onViewGuests}
            className="text-xs font-semibold text-burgundy hover:text-burgundy-700 flex items-center gap-1.5 transition-colors cursor-pointer group min-h-touch"
          >
            <span>Lihat Tamu</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

    </div>
  );
};
