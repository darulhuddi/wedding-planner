import React from 'react';
import {
  BudgetHealthAssessment,
  BudgetInsightMessage,
} from '../../domain/budgetSelectors';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  ChevronRight,
} from 'lucide-react';

interface BudgetHealthInsightCardProps {
  assessment: BudgetHealthAssessment;
  detailedInsights: BudgetInsightMessage[];
  onScrollToAllocations?: () => void;
  onAddExpense?: () => void;
}

export const BudgetHealthInsightCard: React.FC<BudgetHealthInsightCardProps> = ({
  assessment,
  detailedInsights,
  onScrollToAllocations,
  onAddExpense,
}) => {
  const { status, badgeLabel, title, description, variant } = assessment;

  // Visual status stylings
  const badgeColors = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    rose: 'bg-rose-50 text-rose-800 border-rose-200',
    charcoal: 'bg-ivory-100 text-charcoal-700 border-beige-300',
  }[variant];

  const iconComponent = {
    emerald: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
    amber: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
    rose: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
    charcoal: <HelpCircle className="w-4 h-4 text-charcoal-500 shrink-0" />,
  }[variant];

  const cardBorderClass = {
    emerald: 'border-emerald-100 bg-gradient-to-br from-white to-emerald-50/20',
    amber: 'border-amber-100 bg-gradient-to-br from-white to-amber-50/20',
    rose: 'border-rose-100 bg-gradient-to-br from-white to-rose-50/20',
    charcoal: 'border-beige-300 bg-white',
  }[variant];

  return (
    <div className={`rounded-2xl sm:rounded-3xl p-6 sm:p-7 lg:p-8 border shadow-card space-y-5 ${cardBorderClass}`}>
      
      {/* Top Header Row with Status Badge */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-beige">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-burgundy" />
          <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
            Insight & Rekomendasi
          </h3>
        </div>

        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeColors}`}>
          {iconComponent}
          <span>{badgeLabel}</span>
        </span>
      </div>

      {/* Primary Insight Editorial Box */}
      <div className="space-y-2">
        <h4 className="text-base sm:text-lg font-bold text-charcoal">
          {title}
        </h4>
        <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Detailed Deterministic Observations */}
      {detailedInsights.length > 0 && (
        <div className="pt-3 border-t border-beige space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-400 block">
            Catatan Penting
          </span>
          <ul className="space-y-2">
            {detailedInsights.map((insight, idx) => (
              <li
                key={idx}
                className={`text-xs p-2.5 rounded-xl border flex items-start gap-2 ${
                  insight.isCritical
                    ? 'bg-rose-50/60 border-rose-200/70 text-rose-900'
                    : 'bg-ivory-50/70 border-beige text-charcoal-700'
                }`}
              >
                <span className="shrink-0 mt-0.5">•</span>
                <div className="space-y-0.5 flex-1">
                  <span className="font-semibold block">{insight.title}</span>
                  {insight.subtitle && (
                    <span className="text-[11px] opacity-80 block">{insight.subtitle}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Footer if helpful */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        {status === 'low_data' && onAddExpense && (
          <button
            type="button"
            onClick={onAddExpense}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-burgundy hover:text-burgundy-700 cursor-pointer min-h-touch py-1"
          >
            <span>Catat Pengeluaran Pertama</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
        {(status === 'over_allocated' || status === 'over_budget') && onScrollToAllocations && (
          <button
            type="button"
            onClick={onScrollToAllocations}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-burgundy hover:text-burgundy-700 cursor-pointer min-h-touch py-1"
          >
            <span>Tinjau Alokasi Kategori</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

    </div>
  );
};
