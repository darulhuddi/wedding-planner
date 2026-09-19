import React from 'react';
import { Gift, ArrowRight, Sparkles, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { formatCompactRupiah } from '../../domain/workspaceSelectors';
import { SeserahanReadinessStatus } from '../../domain/seserahan/types';

export interface SeserahanSummaryData {
  totalItems: number;
  completedItems: number;
  totalBudget?: number;
  spentBudget?: number;
  readinessStatus?: SeserahanReadinessStatus;
  readinessLabel?: string;
  overdueItems?: number;
  dueSoonItems?: number;
  packagingCompleted?: boolean;
  finalCheckCompleted?: boolean;
}

export interface SeserahanSnapshotProps {
  data?: SeserahanSummaryData | null;
  onViewDetails: () => void;
}

export const SeserahanSnapshot: React.FC<SeserahanSnapshotProps> = ({
  data,
  onViewDetails,
}) => {
  const hasData = Boolean(data && data.totalItems > 0);

  const totalItems = data?.totalItems || 0;
  const completedItems = data?.completedItems || 0;
  const totalBudget = data?.totalBudget || 0;
  const spentBudget = data?.spentBudget || 0;
  const remainingBudget = Math.max(0, totalBudget - spentBudget);

  const overdueItems = data?.overdueItems || 0;
  const dueSoonItems = data?.dueSoonItems || 0;
  const readinessLabel = data?.readinessLabel || (completedItems === totalItems ? 'Sudah Siap' : completedItems > 0 ? 'Sedang Berjalan' : 'Belum Siap');

  const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Donut geometry
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      onClick={onViewDetails}
      className="w-full max-w-full box-border bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-7 border border-beige-300 shadow-card flex flex-col justify-between space-y-4 cursor-pointer group hover:border-beige-400 transition-colors"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-beige">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="w-8 h-8 rounded-xl bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0">
            <Gift className="w-4 h-4 text-burgundy" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal leading-tight">
                Seserahan
              </h2>
              {hasData && readinessLabel && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-gold-800 border border-gold/30 font-medium">
                  {readinessLabel}
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-charcoal-400 truncate mt-0.5">
              Atur hantaran tanpa lupa satu pun detail.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-burgundy hover:bg-burgundy-700 text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer shrink-0"
        >
          <span>{hasData ? 'Lihat Detail' : 'Mulai Seserahan'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content: Active Data State vs Elegant Empty State */}
      {hasData ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Left / Middle: Donut + Progress & Budget Stats */}
          <div className="md:col-span-7 flex flex-col sm:flex-row items-center gap-4">
            {/* SVG Donut Chart */}
            <div className="relative w-22 h-22 sm:w-24 sm:h-24 shrink-0 flex items-center justify-center">
              <svg className="w-22 h-22 sm:w-24 sm:h-24 transform -rotate-90" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="transparent"
                  stroke="#E9E1D6"
                  strokeWidth="8"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="transparent"
                  stroke="#71343B"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="font-serif text-base sm:text-lg font-bold text-charcoal leading-none">
                  {percentage}%
                </span>
                <span className="text-[9px] text-charcoal-400 font-medium mt-0.5 leading-none">
                  Selesai
                </span>
              </div>
            </div>

            {/* Metrics Info */}
            <div className="flex-1 min-w-0 space-y-2.5 w-full">
              <div>
                <span className="text-xs font-semibold text-charcoal block">
                  {completedItems} dari {totalItems} item selesai
                </span>
                <div className="w-full bg-ivory-200 h-2 rounded-full overflow-hidden mt-1.5 border border-beige">
                  <div
                    className="bg-burgundy h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {/* Urgency callout if any */}
              {overdueItems > 0 ? (
                <div className="flex items-center gap-1.5 text-[11px] text-rose-700 font-medium">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  <span>{overdueItems} barang melewati tenggat</span>
                </div>
              ) : dueSoonItems > 0 ? (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-medium">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>{dueSoonItems} barang perlu diselesaikan minggu ini</span>
                </div>
              ) : null}

              {/* Spent and Remaining Budget */}
              {totalBudget > 0 && (
                <div className="flex items-center justify-between pt-1 border-t border-beige/60 text-[11px] sm:text-xs">
                  <div>
                    <span className="font-bold text-charcoal block">
                      {formatCompactRupiah(spentBudget)}
                    </span>
                    <span className="text-[10px] text-charcoal-400 block">
                      terpakai dari {formatCompactRupiah(totalBudget)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-800 block">
                      {formatCompactRupiah(remainingBudget)}
                    </span>
                    <span className="text-[10px] text-charcoal-400 block">
                      sisa budget
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Editorial Quote / Decorative Card */}
          <div className="md:col-span-5 hidden sm:flex flex-col justify-center p-3.5 rounded-2xl bg-gradient-to-br from-ivory-50 to-ivory-100/60 border border-beige relative overflow-hidden min-h-[96px]">
            <p className="font-serif italic text-sm text-charcoal-700 leading-snug">
              &ldquo;Setiap hantaran punya makna.&rdquo;
            </p>
            <span className="text-[10px] text-charcoal-400 mt-1 font-sans">
              Persiapkan dengan penuh kehangatan
            </span>
            <div className="absolute -bottom-2 -right-2 opacity-15 pointer-events-none text-burgundy">
              <Gift className="w-14 h-14 stroke-1" />
            </div>
          </div>
        </div>
      ) : (
        /* Elegant Empty State */
        <div className="p-4 sm:p-5 rounded-2xl bg-ivory-50/70 border border-dashed border-beige-300 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white border border-beige flex items-center justify-center text-gold-600 shrink-0 shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif text-sm sm:text-base font-bold text-charcoal truncate">
                Belum menyusun seserahan
              </h3>
              <p className="text-xs text-charcoal-400 mt-0.5 leading-relaxed truncate">
                Mulai susun daftar hantaran dan atur budgetnya.
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold text-burgundy group-hover:underline flex items-center gap-1 shrink-0 whitespace-nowrap">
            <span>Mulai</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      )}
    </div>
  );
};
