import React from 'react';
import { KeyRound, ArrowRight, ShieldCheck, Clock, Calendar } from 'lucide-react';
import { AdminCoupleDetail } from '../../types/admin';
import { formatAdminDate } from '../../domain/adminSelectors';

interface AdminCoupleAccessCardProps {
  couple: AdminCoupleDetail;
  onNavigateToAccess?: () => void;
}

export function AdminCoupleAccessCard({
  couple,
  onNavigateToAccess,
}: AdminCoupleAccessCardProps) {
  const isPaid = couple.access.tier === 'Paid';
  const isExpired = couple.access.tier === 'Expired';
  const isTrial = couple.access.tier === 'Trial';

  return (
    <div className="bg-white p-5 sm:p-6 rounded-lg border border-beige-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-beige-100">
        <div>
          <h2 className="text-base font-serif font-bold text-charcoal-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-burgundy-700" />
            <span>Customer Access Status</span>
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Status hak akses komersial dan masa berlaku akun.
          </p>
        </div>

        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold tracking-wider uppercase border ${
            isPaid
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : isExpired
              ? 'bg-rose-50 text-rose-800 border-rose-300'
              : 'bg-amber-50 text-amber-800 border-amber-300'
          }`}
        >
          {couple.access.tier}
        </span>
      </div>

      {/* Access Details Table / Card */}
      <div className="p-4 rounded-lg bg-ivory-50/70 border border-beige-200/60 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-charcoal-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-charcoal-400" />
            <span>Mulai Berlaku</span>
          </span>
          <span className="font-mono font-medium text-charcoal-800">
            {formatAdminDate(couple.access.startDate)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-charcoal-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-charcoal-400" />
            <span>Masa Berakhir</span>
          </span>
          <span className="font-mono font-medium text-charcoal-800">
            {isPaid ? 'Tanpa batas waktu' : formatAdminDate(couple.access.endDate)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-beige-200/50">
          <span className="text-charcoal-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-charcoal-400" />
            <span>Sisa Waktu</span>
          </span>
          <span className="font-mono font-semibold text-charcoal-900">
            {isPaid
              ? 'Tanpa batas waktu'
              : isExpired
              ? 'Akses Telah Berakhir'
              : `${couple.access.remainingDays} hari`}
          </span>
        </div>
      </div>

      {/* CTA Button */}
      <div className="pt-1">
        <button
          onClick={onNavigateToAccess}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-ivory-100 hover:bg-ivory-200 text-burgundy-800 border border-beige-200 rounded-md text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
        >
          <span>Kelola Akses</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
