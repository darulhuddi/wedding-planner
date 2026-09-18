import React from 'react';
import { BudgetOverview } from '../../domain/budgetSelectors';
import { formatRupiahNumber } from '../../domain/workspaceSelectors';
import { Edit2, Wallet, TrendingUp, Coins, AlertCircle, Sparkles } from 'lucide-react';

interface BudgetOverviewCardProps {
  overview: BudgetOverview;
  onEditBudget: () => void;
}

export const BudgetOverviewCard: React.FC<BudgetOverviewCardProps> = ({
  overview,
  onEditBudget,
}) => {
  const hasBudget = overview.totalBudget > 0;
  
  // Safe math calculations
  const spentPercentage = hasBudget
    ? Math.round((overview.totalSpent / overview.totalBudget) * 100)
    : 0;
  const allocatedPercentage = hasBudget
    ? Math.round((overview.totalAllocated / overview.totalBudget) * 100)
    : 0;
  const remainingPercentage = hasBudget
    ? Math.max(0, Math.round((overview.totalRemaining / overview.totalBudget) * 100))
    : 0;

  const isOverBudget = overview.totalSpent > overview.totalBudget && hasBudget;
  const isOverAllocated = overview.totalAllocated > overview.totalBudget && hasBudget;
  
  // Progress bar visual percentage (capped at 100% for bar width)
  const visualBarWidth = Math.min(Math.max(0, spentPercentage), 100);

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-9 border border-beige-300 shadow-card space-y-6 sm:space-y-7">
      
      {/* Top Header Row: Total Budget + Edit Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-beige">
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
        <div className="space-y-6">
          {/* FEATURE 1: Visual Horizontal Progress Bar */}
          <div className="space-y-2.5 bg-ivory-50/60 p-4 sm:p-5 rounded-2xl border border-beige/80">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-semibold">
              <div className="flex items-center gap-2">
                <span className="text-charcoal-700">Progress Pengeluaran</span>
                {isOverBudget ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[11px] font-bold">
                    <AlertCircle className="w-3 h-3 text-rose-600" />
                    Over Budget ({spentPercentage}%)
                  </span>
                ) : (
                  <span className="text-charcoal-400 font-normal text-xs">
                    {spentPercentage}% terpakai
                  </span>
                )}
              </div>
              <div className="text-right text-xs font-medium text-charcoal-500">
                <span className="font-bold text-charcoal">{formatRupiahNumber(overview.totalSpent)}</span>
                {' / '}
                <span>{formatRupiahNumber(overview.totalBudget)}</span>
              </div>
            </div>

            {/* Progress Bar Track */}
            <div
              className="h-3.5 sm:h-4 w-full bg-beige-200/80 rounded-full overflow-hidden relative shadow-inner"
              role="progressbar"
              aria-valuenow={spentPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Budget terpakai ${spentPercentage}%`}
            >
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isOverBudget
                    ? 'bg-gradient-to-r from-rose-500 to-rose-600'
                    : spentPercentage > 80
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                    : 'bg-gradient-to-r from-burgundy-600 to-burgundy'
                }`}
                style={{ width: `${visualBarWidth}%` }}
              />
            </div>

            {/* Bottom summary text below bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-charcoal-500">
              <span>Terpakai: <strong className="text-charcoal">{formatRupiahNumber(overview.totalSpent)}</strong></span>
              <span>
                Sisa Budget:{' '}
                <strong className={overview.totalRemaining < 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'}>
                  {formatRupiahNumber(overview.totalRemaining)}
                </strong>
                {overview.totalRemaining >= 0 && ` (${remainingPercentage}%)`}
              </span>
            </div>
          </div>

          {/* 3 Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            
            {/* Metric 1: Dialokasikan */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-ivory-50/80 border border-beige flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span className="text-[10px] sm:text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Dialokasikan</span>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <div className="font-serif text-base sm:text-lg lg:text-xl font-bold text-charcoal truncate">
                  {formatRupiahNumber(overview.totalAllocated)}
                </div>
                <span className="text-[10px] sm:text-[11px] text-charcoal-400 mt-0.5 block">
                  {allocatedPercentage}% dari total budget
                </span>
              </div>
            </div>

            {/* Metric 2: Terpakai */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-ivory-50/80 border border-beige flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span className="text-[10px] sm:text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Terpakai</span>
                <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isOverBudget ? 'bg-rose-100 text-rose-700' : 'bg-burgundy/10 text-burgundy'
                }`}>
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <div className={`font-serif text-base sm:text-lg lg:text-xl font-bold truncate ${
                  isOverBudget ? 'text-rose-700' : 'text-charcoal'
                }`}>
                  {formatRupiahNumber(overview.totalSpent)}
                </div>
                <span className="text-[10px] sm:text-[11px] text-charcoal-400 mt-0.5 block">
                  {spentPercentage}% dari total budget
                </span>
              </div>
            </div>

            {/* Metric 3: Sisa Budget */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-ivory-50/80 border border-beige flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <span className="text-[10px] sm:text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Sisa Budget</span>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gold-100 flex items-center justify-center text-gold-700 shrink-0">
                  <Coins className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <div className={`font-serif text-base sm:text-lg lg:text-xl font-bold truncate ${
                  overview.totalRemaining < 0 ? 'text-rose-600' : 'text-emerald-800'
                }`}>
                  {formatRupiahNumber(overview.totalRemaining)}
                </div>
                <span className="text-[10px] sm:text-[11px] text-charcoal-400 mt-0.5 block">
                  {overview.totalRemaining >= 0 ? `${remainingPercentage}% tersisa` : 'Defisit anggaran'}
                </span>
              </div>
            </div>

          </div>

          {/* Over-allocation warning callout if applicable */}
          {isOverAllocated && !isOverBudget && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Total pembagian alokasi ({formatRupiahNumber(overview.totalAllocated)}) melebihi total budget sebesar{' '}
                <strong>{formatRupiahNumber(overview.totalAllocated - overview.totalBudget)}</strong>.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-5 sm:p-6 rounded-2xl bg-ivory-50 border border-beige flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-burgundy shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-charcoal">Belum Ada Target Budget</h4>
            <p className="text-xs sm:text-sm text-charcoal-500 leading-relaxed">
              Tentukan total perkiraan budget pernikahanmu untuk mulai membuat pembagian alokasi kebutuhan dan memantau pengeluaran dengan tenang.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
