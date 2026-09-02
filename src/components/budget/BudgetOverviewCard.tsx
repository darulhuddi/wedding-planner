import React from 'react';
import { BudgetOverview } from '../../domain/budgetSelectors';
import { formatRupiahNumber } from '../../domain/workspaceSelectors';

interface BudgetOverviewCardProps {
  overview: BudgetOverview;
  onEditBudget: () => void;
}

export const BudgetOverviewCard: React.FC<BudgetOverviewCardProps> = ({
  overview,
  onEditBudget,
}) => {
  const hasBudget = overview.totalBudget > 0;
  const healthPercentage = hasBudget 
    ? Math.min(Math.round((overview.totalSpent / overview.totalBudget) * 100), 100) 
    : 0;
    
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthPercentage / 100) * circumference;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 border border-beige-300 shadow-card relative overflow-hidden group">
      {/* Decorative gradient blob */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-ivory-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 pointer-events-none transition-opacity duration-700 group-hover:opacity-70 motion-reduce:transition-none" />

      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-6 relative z-10">
        <div className="flex-1 min-w-0">
          <h2 className="font-serif text-2xl font-bold text-charcoal">Total Budget</h2>
          <div className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-burgundy mt-1 tracking-tight truncate max-w-full">
            {formatRupiahNumber(overview.totalBudget)}
          </div>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6 self-start sm:self-center">
          {hasBudget && (
            <div className="relative flex items-center justify-center shrink-0" aria-label={`Budget terpakai ${healthPercentage}%`}>
              {/* Background Circle */}
              <svg className="w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] transform -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-beige-200"
                />
                {/* Progress Circle */}
                <circle
                  cx="50%"
                  cy="50%"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ease-out motion-reduce:transition-none ${
                    healthPercentage > 100 ? 'text-red-500' : 
                    healthPercentage > 80 ? 'text-amber-500' : 'text-burgundy'
                  }`}
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: strokeDashoffset,
                  }}
                />
              </svg>
              {/* Center Text */}
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-sm sm:text-base font-bold text-charcoal">{healthPercentage}%</span>
              </div>
            </div>
          )}

          <button
            onClick={onEditBudget}
            className="px-4 py-2 sm:px-5 sm:py-2.5 bg-ivory-100 hover:bg-beige-200 text-charcoal-700 text-sm font-medium rounded-xl border border-beige transition-colors whitespace-nowrap shadow-sm min-h-touch"
          >
            {hasBudget ? 'Edit Budget' : 'Atur Budget'}
          </button>
        </div>
      </div>

      {hasBudget && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-beige relative z-10">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-charcoal-400 mb-1">Dialokasikan</span>
            <span className="font-semibold text-lg text-charcoal truncate">
              {formatRupiahNumber(overview.totalAllocated)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-charcoal-400 mb-1">Terpakai</span>
            <span className="font-semibold text-lg text-charcoal truncate">
              {formatRupiahNumber(overview.totalSpent)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-charcoal-400 mb-1">Sisa</span>
            <span className="font-semibold text-lg text-charcoal truncate">
              {formatRupiahNumber(overview.totalRemaining)}
            </span>
          </div>
        </div>
      )}
      
      {!hasBudget && (
        <div className="pt-6 border-t border-beige">
          <p className="text-sm text-charcoal-400">
            Tentukan total budget pernikahanmu untuk mulai membuat alokasi dan memantau pengeluaran.
          </p>
        </div>
      )}
    </div>
  );
};
