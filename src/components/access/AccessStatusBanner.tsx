/**
 * WedFlow Customer Access Component — AccessStatusBanner
 *
 * Displays the couple's current access tier (Trial, Expired, Paid, Complimentary)
 * in a calm, supportive manner aligned with WedFlow's core value:
 * "Tahu posisi persiapanmu. Tahu langkah berikutnya."
 *
 * Rules:
 * - Read-only display of actual CustomerEntitlement state.
 * - For Active Paid access: NO upgrade CTA.
 * - For Trial / Expired: helpful CTA leading to checkout.
 * - For Complimentary: distinct from purchased access, NO upgrade CTA.
 * - Mobile-first with min 44px touch targets.
 */

import React from 'react';
import { CustomerEntitlement } from '../../types/admin';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Sparkles, Clock, AlertCircle, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { formatIndonesianDate } from '../../domain/workspaceSelectors';

export interface AccessStatusBannerProps {
  entitlement: CustomerEntitlement | null;
  isLoading?: boolean;
  onUpgradeClick?: () => void;
  className?: string;
}

export const AccessStatusBanner: React.FC<AccessStatusBannerProps> = ({
  entitlement,
  isLoading = false,
  onUpgradeClick,
  className = '',
}) => {
  if (isLoading) {
    return (
      <div
        className={`w-full bg-white/70 border border-beige rounded-2xl p-4 animate-pulse flex items-center justify-between ${className}`}
        aria-label="Memuat status akses"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-beige-200/70" />
          <div className="space-y-1.5">
            <div className="w-32 h-3.5 bg-beige-200/70 rounded" />
            <div className="w-48 h-3 bg-beige-200/50 rounded" />
          </div>
        </div>
        <div className="w-28 h-8 bg-beige-200/70 rounded-xl" />
      </div>
    );
  }

  if (!entitlement) {
    return null;
  }

  const { tier, source, remainingDays, isExpired, expiresAt } = entitlement;
  const isPaid = tier === 'Paid';
  const isComplimentary = source === 'complimentary';
  const formattedExpiry = expiresAt ? formatIndonesianDate(expiresAt.split('T')[0]) : '';

  // 1. STATE: PAID (Purchased Wedding Pass)
  if (isPaid && !isComplimentary) {
    return (
      <section
        className={`w-full bg-gradient-to-r from-emerald-50/70 via-ivory-50 to-white border border-emerald-200/70 rounded-2xl p-4 sm:p-5 shadow-2xs ${className}`}
        aria-label="Status Akses Wedding Pass"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5 sm:mt-0">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-serif text-sm sm:text-base font-bold text-charcoal">
                  Wedding Pass
                </h3>
                <Badge variant="success" size="sm" dot>
                  Akses tanpa batas waktu
                </Badge>
              </div>
              <p className="text-xs text-charcoal-400 mt-0.5 truncate">
                Sekali bayar. Akses tanpa batas waktu.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/80 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Akses tanpa batas waktu</span>
            </span>
          </div>
        </div>
      </section>
    );
  }

  // 2. STATE: COMPLIMENTARY (Admin-granted complimentary pass)
  if (isPaid && isComplimentary) {
    return (
      <section
        className={`w-full bg-gradient-to-r from-gold-50/70 via-ivory-50 to-white border border-gold-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs ${className}`}
        aria-label="Status Akses Khusus"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gold-100 border border-gold-200 flex items-center justify-center text-gold-700 shrink-0 mt-0.5 sm:mt-0">
              <Sparkles className="w-5 h-5 text-gold-700" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-serif text-sm sm:text-base font-bold text-charcoal">
                  Akses Spesial Aktif
                </h3>
                <Badge variant="gold" size="sm">
                  Complimentary
                </Badge>
              </div>
              <p className="text-xs text-charcoal-400 mt-0.5 truncate">
                {expiresAt
                  ? `Akses penuh berlaku hingga ${formattedExpiry}`
                  : 'Akses spesial tanpa batas waktu aktif.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <span className="text-[11px] font-medium text-gold-800 bg-gold-50 px-3 py-1.5 rounded-xl border border-gold-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Akses tanpa batas waktu</span>
            </span>
          </div>
        </div>
      </section>
    );
  }

  // 3. STATE: EXPIRED (Trial has ended)
  if (isExpired || tier === 'Expired') {
    return (
      <section
        className={`w-full bg-gradient-to-r from-rose-50/80 via-ivory-50 to-white border border-rose-200 rounded-2xl p-4 sm:p-5 shadow-soft ${className}`}
        aria-label="Masa Uji Coba Berakhir"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0 mt-0.5 sm:mt-0">
              <AlertCircle className="w-5 h-5 text-rose-700" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-serif text-sm sm:text-base font-bold text-charcoal">
                  Masa Uji Coba Telah Berakhir
                </h3>
                <Badge variant="warning" size="sm">
                  Perlu Aktivasi
                </Badge>
              </div>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Buka akses tanpa batas waktu untuk melanjutkan checklist, budget, dan persiapan pernikahanmu.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onUpgradeClick}
            className="shrink-0 w-full sm:w-auto"
            icon={<ArrowRight className="w-4 h-4" />}
            iconPosition="right"
          >
            Aktifkan Wedding Pass
          </Button>
        </div>
      </section>
    );
  }

  // 4. STATE: TRIAL (Active free trial)
  const remainingLabel =
    (remainingDays ?? 0) > 0
      ? `Sisa ${remainingDays} hari masa uji coba`
      : 'Masa uji coba berakhir hari ini';

  return (
    <section
      className={`w-full bg-gradient-to-r from-ivory-100 via-white to-ivory-50 border border-beige-300 rounded-2xl p-4 sm:p-5 shadow-2xs ${className}`}
      aria-label="Informasi Masa Uji Coba"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-600 shrink-0 mt-0.5 sm:mt-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif text-sm sm:text-base font-bold text-charcoal">
                Trial Gratis
              </h3>
              <Badge variant="gold" size="sm">
                {remainingLabel}
              </Badge>
            </div>
            <p className="text-xs text-charcoal-400 mt-0.5">
              Gunakan seluruh fitur selama masa trial. Upgrade ke Wedding Pass untuk akses penuh tanpa batas waktu.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onUpgradeClick}
          className="shrink-0 w-full sm:w-auto border-burgundy/40 text-burgundy hover:bg-burgundy-50"
          icon={<Sparkles className="w-4 h-4 text-gold-600" />}
          iconPosition="left"
        >
          Beli Wedding Pass
        </Button>
      </div>
    </section>
  );
};
