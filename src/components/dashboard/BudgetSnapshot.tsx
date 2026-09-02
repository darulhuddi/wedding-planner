import React from 'react';
import { DollarSign, ArrowRight } from 'lucide-react';
import { formatRupiahNumber } from '../../domain/workspaceSelectors';

export interface BudgetSnapshotProps {
  formattedBudget: string;
  totalSpent?: number;
  totalRemaining?: number;
  hasExpenses?: boolean;
  onViewBudget: () => void;
}

export const BudgetSnapshot: React.FC<BudgetSnapshotProps> = ({
  formattedBudget,
  totalSpent = 0,
  totalRemaining = 0,
  hasExpenses = false,
  onViewBudget,
}) => {
  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-beige-300 shadow-card h-full flex flex-col justify-between space-y-4">
      <div>
        <div className="flex justify-between items-center text-xs text-charcoal-400 mb-2">
          <span className="font-semibold text-charcoal flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-burgundy shrink-0" />
            {hasExpenses ? 'Sisa Budget' : 'Perkiraan Budget'}
          </span>
          <span className="text-[10px] bg-ivory-100 text-charcoal-400 px-2 py-0.5 rounded border border-beige font-medium">
            {hasExpenses ? 'Real-time' : 'Estimasi Awal'}
          </span>
        </div>

        {/* Large Readable Financial Number */}
        <div className="font-serif text-2xl sm:text-3xl xl:text-3xl font-bold text-charcoal tracking-tight truncate mt-1">
          {hasExpenses ? formatRupiahNumber(totalRemaining) : formattedBudget}
        </div>

        <p className="text-xs text-charcoal-400 mt-2 leading-relaxed">
          {hasExpenses 
            ? `Sisa budget. Terpakai: ${formatRupiahNumber(totalSpent)}.` 
            : 'Belum dialokasikan ke vendor. Siap untuk mulai disusun.'}
        </p>
      </div>

      <div className="pt-3 border-t border-beige">
        <button
          onClick={onViewBudget}
          className="text-xs font-semibold text-burgundy hover:text-burgundy-700 flex items-center gap-1 transition-colors min-h-touch cursor-pointer"
        >
          <span>Lihat Budget</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
