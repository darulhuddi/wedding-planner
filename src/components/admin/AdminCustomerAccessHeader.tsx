import React from 'react';
import { ArrowLeft, KeyRound, Calendar, ShieldCheck, Clock } from 'lucide-react';
import { CustomerEntitlement } from '../../types/admin';
import { formatAdminDate } from '../../domain/adminSelectors';

interface AdminCustomerAccessHeaderProps {
  entitlement: CustomerEntitlement;
  onBack: () => void;
}

export function AdminCustomerAccessHeader({
  entitlement,
  onBack,
}: AdminCustomerAccessHeaderProps) {
  const isPaid = entitlement.tier === 'Paid';
  const isExpired = entitlement.tier === 'Expired';
  const isTrial = entitlement.tier === 'Trial';

  return (
    <div className="space-y-3 pb-6 border-b border-beige-200/80">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-charcoal-600 hover:text-burgundy-800 transition-colors cursor-pointer group"
      >
        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
        <span>Kembali ke Detail Pasangan ({entitlement.coupleName || 'Pasangan'})</span>
      </button>

      {/* Main Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-charcoal-900">
              Kelola Akses: {entitlement.coupleName || 'Pasangan Baru'}
            </h1>
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
          <p className="text-xs sm:text-sm text-charcoal-500 mt-1">
            Atur perpanjangan trial manual atau berikan Wedding Pass untuk pasangan ini.
          </p>
        </div>

        {/* Wedding Date Context */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ivory-100 border border-beige-200/80 text-xs font-medium text-charcoal-700 self-start sm:self-auto">
          <Calendar className="w-3.5 h-3.5 text-charcoal-500" />
          <span>Hari-H: {formatAdminDate(entitlement.weddingDate || null)}</span>
        </div>
      </div>
    </div>
  );
}
