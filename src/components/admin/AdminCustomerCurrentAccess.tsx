import React from 'react';
import { KeyRound, Calendar, Clock, ShieldCheck, Info, UserCheck, FileText } from 'lucide-react';
import { CustomerEntitlement } from '../../types/admin';
import { formatAdminDate, formatAccessSourceLabel } from '../../domain/adminSelectors';

interface AdminCustomerCurrentAccessProps {
  entitlement: CustomerEntitlement;
}

export function AdminCustomerCurrentAccess({
  entitlement,
}: AdminCustomerCurrentAccessProps) {
  const isPaid = entitlement.tier === 'Paid';
  const isExpired = entitlement.tier === 'Expired';
  const isTrial = entitlement.tier === 'Trial';

  return (
    <div className="bg-white p-5 sm:p-6 rounded-lg border border-beige-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-beige-100">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-burgundy-700" />
          <h2 className="text-base font-serif font-bold text-charcoal-900">
            Status Akses Saat Ini
          </h2>
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
          {entitlement.tier}
        </span>
      </div>

      {/* Grid of Key Access Properties */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Sumber Akses */}
        <div className="p-3.5 rounded-lg bg-ivory-50/80 border border-beige-200/60 space-y-1">
          <span className="text-charcoal-500 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-charcoal-400" />
            <span>Sumber Akses</span>
          </span>
          <p className="font-semibold text-charcoal-900">
            {formatAccessSourceLabel(entitlement.source)}
          </p>
        </div>

        {/* Tanggal Mulai */}
        <div className="p-3.5 rounded-lg bg-ivory-50/80 border border-beige-200/60 space-y-1">
          <span className="text-charcoal-500 font-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-charcoal-400" />
            <span>Mulai Berlaku</span>
          </span>
          <p className="font-mono font-semibold text-charcoal-900">
            {formatAdminDate(entitlement.startedAt)}
          </p>
        </div>

        {/* Tanggal Berakhir */}
        <div className="p-3.5 rounded-lg bg-ivory-50/80 border border-beige-200/60 space-y-1">
          <span className="text-charcoal-500 font-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-charcoal-400" />
            <span>Masa Berakhir</span>
          </span>
          <p className="font-mono font-semibold text-charcoal-900">
            {isPaid
              ? 'Tanpa batas waktu'
              : entitlement.expiresAt
              ? formatAdminDate(entitlement.expiresAt)
              : 'Belum diatur'}
          </p>
        </div>

        {/* Sisa Waktu */}
        <div className="p-3.5 rounded-lg bg-ivory-50/80 border border-beige-200/60 space-y-1">
          <span className="text-charcoal-500 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-charcoal-400" />
            <span>Sisa Waktu</span>
          </span>
          <p
            className={`font-mono font-bold ${
              isPaid
                ? 'text-emerald-700'
                : isExpired
                ? 'text-rose-700'
                : (entitlement.remainingDays ?? 0) <= 3
                ? 'text-amber-700'
                : 'text-charcoal-900'
            }`}
          >
            {isPaid
              ? 'Tanpa batas waktu'
              : isExpired
              ? 'Akses Telah Berakhir'
              : `${entitlement.remainingDays} hari lagi`}
          </p>
        </div>
      </div>

      {/* Admin Notes / Granted By (If available) */}
      {(entitlement.grantedBy || entitlement.notes) && (
        <div className="pt-2 border-t border-beige-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-charcoal-600 bg-ivory-50/50 p-3 rounded-md">
          {entitlement.grantedBy && (
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-burgundy-700" />
              <span>
                Diatur oleh: <strong className="text-charcoal-800">{entitlement.grantedBy}</strong>
              </span>
            </div>
          )}
          {entitlement.notes && (
            <div className="flex items-center gap-1.5 text-charcoal-500">
              <FileText className="w-3.5 h-3.5 text-charcoal-400" />
              <span>Catatan: {entitlement.notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
