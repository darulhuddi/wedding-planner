import React from 'react';
import { ArrowLeft, Calendar, Clock, RefreshCw } from 'lucide-react';
import { AdminCoupleDetail } from '../../types/admin';
import {
  formatAdminFullDate,
  formatDaysToWeddingLabel,
} from '../../domain/adminSelectors';

interface AdminCoupleHeaderProps {
  couple: AdminCoupleDetail;
  onBack: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function AdminCoupleHeader({
  couple,
  onBack,
  onRefresh,
  isLoading = false,
}: AdminCoupleHeaderProps) {
  const isPaid = couple.access.tier === 'Paid';
  const isExpired = couple.access.tier === 'Expired';
  const isTrial = couple.access.tier === 'Trial';

  const fullWeddingDate = formatAdminFullDate(couple.weddingDate);
  const countdownLabel = formatDaysToWeddingLabel(couple.daysToWedding);

  return (
    <div className="bg-ivory-50 border-b border-beige-200/80 px-4 sm:px-6 lg:px-8 py-5">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Back navigation button */}
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-600 hover:text-burgundy-900 transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Kembali ke Couples</span>
          </button>
        </div>

        {/* Identity & Access Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal-900 tracking-tight">
                {couple.coupleName}
              </h1>

              {/* Access Tier Badge */}
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono font-bold tracking-wider uppercase border ${
                  isPaid
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : isExpired
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                {couple.access.tier}
              </span>

              {/* Remaining Trial / Grace Badge */}
              {isTrial && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-ivory-100 text-charcoal-700 border border-beige-200">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>{couple.access.remainingDays} hari tersisa</span>
                </span>
              )}
            </div>

            {/* Wedding Date & Countdown Info */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-charcoal-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-charcoal-400" />
                <span>{fullWeddingDate}</span>
              </span>
              <span className="text-charcoal-300 hidden sm:inline">•</span>
              <span className="font-mono text-charcoal-700 font-semibold bg-beige-100/70 px-2 py-0.5 rounded text-[11px]">
                {countdownLabel}
              </span>
            </div>
          </div>

          {onRefresh && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-charcoal-600 hover:text-charcoal-900 bg-white border border-beige-200 hover:border-beige-300 shadow-2xs hover:shadow-xs transition-all disabled:opacity-50"
                title="Muat ulang data pasangan"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-burgundy-600' : ''}`}
                />
                <span className="hidden sm:inline">Perbarui</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
