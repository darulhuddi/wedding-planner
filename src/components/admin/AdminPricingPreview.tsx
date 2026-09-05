import React from 'react';
import { Eye, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { AdminAccessConfig } from '../../types/admin';
import {
  formatAdminPrice,
  getWeddingPassDurationDescription,
} from '../../domain/adminSelectors';

interface AdminPricingPreviewProps {
  config: AdminAccessConfig;
  isUnsaved?: boolean;
}

export function AdminPricingPreview({ config, isUnsaved = false }: AdminPricingPreviewProps) {
  const durationDesc = getWeddingPassDurationDescription(config);
  const formattedPrice = formatAdminPrice(config.price, config.currency);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-lg border border-beige-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-beige-100">
        <div>
          <h2 className="text-base font-serif font-bold text-charcoal-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-burgundy-700" />
            <span>Pricing & Paywall Preview</span>
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Tampilan kartu penawaran komersial yang dilihat pasangan saat checkout/paywall.
          </p>
        </div>

        <span
          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border font-semibold ${
            isUnsaved
              ? 'bg-amber-50 text-amber-800 border-amber-300'
              : 'bg-ivory-100 text-charcoal-600 border-beige-200'
          }`}
        >
          {isUnsaved ? 'Draft (Belum Disimpan)' : 'Tersinkronisasi'}
        </span>
      </div>

      {/* Customer-Facing Card Preview Box */}
      <div className="p-5 sm:p-6 rounded-xl bg-ivory-50 border border-beige-200 shadow-sm max-w-md mx-auto space-y-5 text-center relative overflow-hidden">
        {/* Subtle accent ribbon */}
        <div className="absolute -top-6 -right-6 w-16 h-16 bg-burgundy-600/10 rounded-full blur-md pointer-events-none" />

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-burgundy-50 border border-burgundy-200 text-burgundy-800 text-[11px] font-semibold">
            <Sparkles className="w-3 h-3 text-gold-600" />
            <span>WedSiap Pass</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-charcoal-900 tracking-tight">
            Wedding Pass
          </h3>
          <p className="text-xs text-charcoal-500">
            Akses tak terbatas untuk persiapan pernikahan impianmu.
          </p>
        </div>

        {/* Dynamic Price */}
        <div className="py-2 border-y border-beige-200/70 space-y-1">
          <div className="text-3xl sm:text-4xl font-serif font-bold text-burgundy-900">
            {formattedPrice}
          </div>
          <div className="text-xs font-medium text-charcoal-600 flex items-center justify-center gap-1">
            <span>Sekali bayar</span>
            <span>•</span>
            <span className="text-charcoal-800 font-semibold">{durationDesc}</span>
          </div>
        </div>

        {/* Feature List Preview */}
        <div className="text-left space-y-2 text-xs text-charcoal-700 pt-1">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Checklist interaktif & panduan rekomendasi pintar</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Kalkulator & pelacak budget real-time</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Kolaborasi tak terbatas bersama pasangan</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Penyimpanan vendor, tamu, dan catatan penting</span>
          </div>
        </div>

        {/* Mock Customer CTA */}
        <div className="pt-2">
          <div className="w-full py-2.5 px-4 bg-burgundy-700 text-white font-medium text-xs rounded-lg shadow-sm text-center select-none cursor-default opacity-90">
            Beli Wedding Pass Sekarang
          </div>
          <p className="text-[10px] text-charcoal-400 mt-1.5 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Pembayaran aman • Akses langsung aktif</span>
          </p>
        </div>
      </div>
    </div>
  );
}
