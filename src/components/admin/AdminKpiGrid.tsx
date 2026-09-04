import React from 'react';
import { AdminOverviewMetrics } from '../../types/admin';

interface AdminKpiGridProps {
  metrics: AdminOverviewMetrics;
  isLoading?: boolean;
}

interface KpiCardItem {
  key: keyof AdminOverviewMetrics;
  label: string;
  sublabel: string;
  value: number;
  highlight?: boolean;
}

export function AdminKpiGrid({ metrics, isLoading = false }: AdminKpiGridProps) {
  const cards: KpiCardItem[] = [
    {
      key: 'totalCouples',
      label: 'Total Couples',
      sublabel: 'Total pasangan terdaftar',
      value: metrics.totalCouples,
    },
    {
      key: 'activeWeddings',
      label: 'Active Weddings',
      sublabel: 'Pernikahan masih aktif',
      value: metrics.activeWeddings,
    },
    {
      key: 'activeTrial',
      label: 'Active Trial',
      sublabel: 'Pasangan masa trial',
      value: metrics.activeTrial,
    },
    {
      key: 'paid',
      label: 'Paid',
      sublabel: 'Akses berbayar aktif',
      value: metrics.paid,
      highlight: metrics.paid > 0,
    },
    {
      key: 'expiringSoon',
      label: 'Expiring Soon',
      sublabel: 'Trial berakhir dlm 3 hari',
      value: metrics.expiringSoon,
      highlight: metrics.expiringSoon > 0,
    },
  ];

  return (
    <section aria-label="Business Overview">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {cards.map((card) => {
          return (
            <div
              key={card.key}
              className={`p-4 sm:p-5 rounded-lg border bg-white transition-shadow shadow-xs hover:shadow-sm flex flex-col justify-between ${
                card.highlight && card.key === 'expiringSoon'
                  ? 'border-amber-300/80 bg-amber-50/20'
                  : card.highlight && card.key === 'paid'
                  ? 'border-emerald-300/80 bg-emerald-50/20'
                  : 'border-beige-200/80'
              }`}
            >
              <div>
                <p className="text-[11px] sm:text-xs font-mono font-medium uppercase tracking-wider text-charcoal-500">
                  {card.label}
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  {isLoading ? (
                    <div className="h-8 w-12 bg-beige-100 animate-pulse rounded" />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-serif font-bold text-charcoal-900">
                      {card.value.toLocaleString('id-ID')}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-charcoal-400 mt-3 truncate">
                {card.sublabel}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
