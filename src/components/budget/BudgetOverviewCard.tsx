import React from 'react';
import { BudgetOverview } from '../../domain/budgetSelectors';
import { formatRupiahNumber } from '../../domain/workspaceSelectors';
import { Edit2, Wallet, TrendingUp, Coins, CheckCircle2, AlertCircle } from 'lucide-react';

interface BudgetOverviewCardProps {
  overview: BudgetOverview;
  onEditBudget: () => void;
}

export const BudgetOverviewCard: React.FC<BudgetOverviewCardProps> = ({
  overview,
  onEditBudget,
}) => {
  const hasBudget = overview.totalBudget > 0;
  const spentPercentage = hasBudget
    ? Math.round((overview.totalSpent / overview.totalBudget) * 100)
    : 0;
  const allocatedPercentage = hasBudget
    ? Math.round((overview.totalAllocated / overview.totalBudget) * 100)
    : 0;
  const remainingPercentage = hasBudget
    ? Math.max(0, Math.round((overview.totalRemaining / overview.totalBudget) * 100))
    : 0;

  const healthPercentage = Math.min(spentPercentage, 100);

  // SVG Gauge Calculations
  const radius = 38;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthPercentage / 100) * circumference;

  const isOverBudget = overview.totalSpent > overview.totalBudget;
  const isOverAllocated = overview.totalAllocated > overview.totalBudget;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-9 border border-beige-300 shadow-card space-y-7">
      
      {/* Top Header Row: Total Budget + Edit Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-beige">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-wider text-charcoal-400 block mb-1">
            Total Budget
          </span>
          <div className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-burgundy tracking-tight">
            {formatRupiahNumber(overview.totalBudget)}
          </div>
        </div>

        <button
          type="button"
          onClick={onEditBudget}
          className="inline-flex items-center gap-2 px-4 py-2 sm:px-4.5 sm:py-2.5 bg-white hover:bg-ivory-100 text-charcoal-700 text-xs sm:text-sm font-semibold rounded-xl border border-beige hover:border-beige-300 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto min-h-touch"
        >
          <Edit2 className="w-3.5 h-3.5 text-burgundy" />
          <span>{hasBudget ? 'Edit Budget' : 'Atur Budget'}</span>
        </button>
      </div>

      {hasBudget ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-center">
          
          {/* 3 Metric Cards (Left / Middle Columns) */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
            
            {/* Metric 1: Dialokasikan */}
            <div className="p-3 sm:p-4 rounded-2xl bg-ivory-50/80 border border-beige flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <span className="text-[10px] sm:text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Dialokasikan</span>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0">
                  <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
              <div>
                <div className="font-serif text-sm sm:text-lg font-bold text-charcoal truncate">
                  {formatRupiahNumber(overview.totalAllocated)}
                </div>
                <span className="text-[10px] sm:text-[11px] text-charcoal-400 mt-0.5 block">
                  {allocatedPercentage}% dari total
                </span>
              </div>
            </div>

            {/* Metric 2: Terpakai */}
            <div className="p-3 sm:p-4 rounded-2xl bg-ivory-50/80 border border-beige flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <span className="text-[10px] sm:text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Terpakai</span>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0">
                  <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
              <div>
                <div className="font-serif text-sm sm:text-lg font-bold text-charcoal truncate">
                  {formatRupiahNumber(overview.totalSpent)}
                </div>
                <span className="text-[10px] sm:text-[11px] text-charcoal-400 mt-0.5 block">
                  {spentPercentage}% dari total
                </span>
              </div>
            </div>

            {/* Metric 3: Sisa */}
            <div className="col-span-2 sm:col-span-1 p-3 sm:p-4 rounded-2xl bg-ivory-50/80 border border-beige flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <span className="text-[10px] sm:text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Sisa Budget</span>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gold-100 flex items-center justify-center text-gold-700 shrink-0">
                  <Coins className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
              <div>
                <div className={`font-serif text-sm sm:text-lg font-bold truncate ${
                  overview.totalRemaining < 0 ? 'text-rose-600' : 'text-charcoal'
                }`}>
                  {formatRupiahNumber(overview.totalRemaining)}
                </div>
                <span className="text-[10px] sm:text-[11px] text-charcoal-400 mt-0.5 block">
                  {remainingPercentage}% dari total
                </span>
              </div>
            </div>

          </div>

          {/* Right Side: Circular Gauge + Integrated Budget Health Banner */}
          <div className="lg:col-span-5 flex flex-row items-center gap-3.5 sm:gap-4.5 bg-ivory-50/50 p-3.5 sm:p-4 rounded-2xl border border-beige">
            
            {/* Donut Progress Ring */}
            <div className="relative flex items-center justify-center shrink-0" aria-label={`Budget terpakai ${spentPercentage}%`}>
              <svg className="w-16 h-16 sm:w-20 sm:h-20 transform -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  className="text-beige-300"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ease-out ${
                    isOverBudget
                      ? 'text-rose-600'
                      : spentPercentage > 80
                      ? 'text-amber-500'
                      : 'text-burgundy'
                  }`}
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: strokeDashoffset,
                  }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="font-sans text-xs sm:text-sm font-bold text-charcoal leading-none">
                  {spentPercentage}%
                </span>
                <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-charcoal-400 font-semibold mt-0.5">
                  Terpakai
                </span>
              </div>
            </div>

            {/* Integrated Health Status Message */}
            <div className="flex-1 min-w-0">
              {isOverBudget ? (
                <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50 border border-rose-200/80 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Anggaran terlampaui</span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-rose-700 leading-relaxed">
                    Pengeluaran melebihi budget sebesar {formatRupiahNumber(overview.totalSpent - overview.totalBudget)}.
                  </p>
                </div>
              ) : isOverAllocated ? (
                <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50 border border-amber-200/80 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Alokasi melebihi budget</span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-amber-700 leading-relaxed">
                    Alokasi melebihi budget sebesar {formatRupiahNumber(overview.totalAllocated - overview.totalBudget)}.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Budget kondisi aman</span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-emerald-700 leading-relaxed">
                    Sisa budget {formatRupiahNumber(overview.totalRemaining)} ({remainingPercentage}%).
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-ivory-50 border border-beige">
          <p className="text-xs sm:text-sm text-charcoal-400">
            Tentukan total perkiraan budget pernikahanmu untuk mulai membuat pembagian alokasi dan memantau pengeluaran.
          </p>
        </div>
      )}

    </div>
  );
};
