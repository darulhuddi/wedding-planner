import React from 'react';
import { AlertTriangle, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { AdminAttentionItem } from '../../types/admin';

interface AdminAttentionSectionProps {
  items: AdminAttentionItem[];
  onActionClick?: (route: string) => void;
  isLoading?: boolean;
}

export function AdminAttentionSection({
  items,
  onActionClick,
  isLoading = false,
}: AdminAttentionSectionProps) {
  return (
    <section aria-labelledby="attention-needed-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2
            id="attention-needed-heading"
            className="text-base sm:text-lg font-serif font-bold text-charcoal-900"
          >
            Attention Needed
          </h2>
          {items.length > 0 && (
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              {items.length}
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 rounded-lg border border-beige-200 bg-white animate-pulse">
          <div className="h-4 bg-beige-100 rounded w-1/3 mb-2" />
          <div className="h-3 bg-beige-100 rounded w-2/3" />
        </div>
      ) : items.length === 0 ? (
        <div className="p-4 sm:p-5 rounded-lg border border-beige-200 bg-white flex items-center gap-3 text-charcoal-600">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-xs sm:text-sm">
            Semua alur operasional normal. Tidak ada item yang membutuhkan perhatian mendesak saat ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((item) => {
            const isWarning = item.severity === 'warning';
            const isUrgent = item.severity === 'urgent';

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-lg border bg-white flex flex-col justify-between transition-all shadow-xs hover:shadow-sm ${
                  isUrgent
                    ? 'border-rose-300 bg-rose-50/20'
                    : isWarning
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-beige-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {isWarning || isUrgent ? (
                        <AlertTriangle
                          className={`w-4 h-4 ${
                            isUrgent ? 'text-rose-600' : 'text-amber-600'
                          }`}
                        />
                      ) : (
                        <Clock className="w-4 h-4 text-burgundy-600" />
                      )}
                      <span className="font-semibold text-xs sm:text-sm text-charcoal-900">
                        {item.title}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border font-semibold ${
                        isUrgent
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : isWarning
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-beige-100 text-charcoal-700 border-beige-200'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-charcoal-600 mb-4">
                    {item.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-beige-100 flex justify-end">
                  <button
                    onClick={() => onActionClick?.(item.ctaRoute)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-burgundy-700 hover:text-burgundy-900 transition-colors group"
                  >
                    <span>{item.ctaLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
