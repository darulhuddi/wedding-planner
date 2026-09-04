import React from 'react';
import { ArrowRight, Sparkles, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { AdminAccessConfig } from '../../types/admin';

interface AdminAccessLifecycleProps {
  config: AdminAccessConfig;
}

export function AdminAccessLifecycle({ config }: AdminAccessLifecycleProps) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-lg border border-beige-200/80 shadow-xs space-y-5">
      <div>
        <h2 className="text-base font-serif font-bold text-charcoal-900 flex items-center gap-2">
          <Zap className="w-4 h-4 text-burgundy-700" />
          <span>Access Lifecycle Model</span>
        </h2>
        <p className="text-xs text-charcoal-500 mt-0.5">
          Alur status akses komersial customer dari pendaftaran hingga pernikahan selesai.
        </p>
      </div>

      <div className="space-y-4">
        {/* Flow 1: Standard Full Free Trial Model */}
        <div className="p-4 rounded-lg bg-ivory-50/80 border border-beige-200/70 space-y-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-charcoal-500 font-semibold">
            Alur Utama (Full Free Trial → Paywall)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            {/* Step 1: Trial */}
            <div className="p-3 bg-white rounded-md border border-amber-200/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-900 uppercase">
                  1. Free Trial
                </span>
                <span className="text-[10px] font-mono bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                  {config.trialDurationDays} hari
                </span>
              </div>
              <p className="text-[11px] text-charcoal-600">
                Akses semua modul & fitur secara penuh tanpa batasan fitur parsial.
              </p>
            </div>

            {/* Step 2: Expired */}
            <div className="p-3 bg-white rounded-md border border-rose-200/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-rose-900 uppercase">
                  2. Expired
                </span>
                <span className="text-[10px] font-mono bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-semibold">
                  Paywall
                </span>
              </div>
              <p className="text-[11px] text-charcoal-600">
                Masa trial habis. Mode hanya-baca (view only) atau terkunci hingga membeli pass.
              </p>
            </div>

            {/* Step 3: Wedding Pass */}
            <div className="p-3 bg-white rounded-md border border-emerald-200/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-900 uppercase">
                  3. Wedding Pass
                </span>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">
                  Paid
                </span>
              </div>
              <p className="text-[11px] text-charcoal-600">
                Sekali bayar. Akses penuh tanpa batas waktu.
              </p>
            </div>
          </div>
        </div>

        {/* Flow 2: Direct Upgrade */}
        <div className="p-3 rounded-lg bg-beige-50/60 border border-beige-200/60 flex items-center justify-between gap-3 text-xs text-charcoal-600">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold-600 flex-shrink-0" />
            <span>
              <strong>Direct Conversion:</strong> Pasangan juga dapat membeli Wedding Pass sewaktu-waktu saat masa Free Trial masih berlangsung.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
