import React from 'react';
import { CreditCard, AlertCircle } from 'lucide-react';
import { AdminAccessConfig, AccessDurationRule } from '../../types/admin';

interface AdminWeddingPassSettingsProps {
  config: AdminAccessConfig;
  onChange: (updates: Partial<AdminAccessConfig>) => void;
  errors: Partial<Record<keyof AdminAccessConfig, string>>;
}

export function AdminWeddingPassSettings({
  config,
  onChange,
  errors,
}: AdminWeddingPassSettingsProps) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-lg border border-beige-200/80 shadow-xs space-y-5">
      {/* Header & Toggle */}
      <div className="flex items-center justify-between pb-4 border-b border-beige-100">
        <div>
          <h2 className="text-base font-serif font-bold text-charcoal-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-burgundy-700" />
            <span>Wedding Pass Configuration</span>
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Aturan harga komersial dan durasi akses penuh berbayar (one-time pass).
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.weddingPassEnabled}
            onChange={(e) => onChange({ weddingPassEnabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-charcoal-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-charcoal-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-burgundy-700"></div>
          <span className="ml-2 text-xs font-semibold text-charcoal-700">
            {config.weddingPassEnabled ? 'Aktif' : 'Nonaktif'}
          </span>
        </label>
      </div>

      <div className="space-y-4">
        {/* Price & Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-charcoal-800 mb-1">
              Harga Wedding Pass
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-charcoal-500">
                Rp
              </span>
              <input
                type="number"
                min={0}
                step={1000}
                value={config.price || ''}
                onChange={(e) =>
                  onChange({ price: parseInt(e.target.value, 10) || 0 })
                }
                placeholder="199000"
                className={`w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-ivory-50 border rounded-md focus:outline-hidden focus:ring-1 focus:ring-burgundy-600 focus:border-burgundy-600 font-mono font-semibold text-charcoal-900 ${
                  errors.price ? 'border-rose-400 bg-rose-50/20' : 'border-beige-200'
                }`}
              />
            </div>
            {errors.price && (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{errors.price}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-800 mb-1">
              Mata Uang (Currency)
            </label>
            <input
              type="text"
              value={config.currency}
              onChange={(e) => onChange({ currency: e.target.value.toUpperCase() })}
              placeholder="IDR"
              className={`w-full px-3 py-1.5 text-xs sm:text-sm bg-ivory-50 border rounded-md focus:outline-hidden focus:ring-1 focus:ring-burgundy-600 focus:border-burgundy-600 font-mono ${
                errors.currency ? 'border-rose-400 bg-rose-50/20' : 'border-beige-200'
              }`}
            />
            {errors.currency && (
              <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{errors.currency}</span>
              </p>
            )}
          </div>
        </div>

        {/* Non-Editable Product Rule: Unlimited Access */}
        <div className="p-3.5 rounded-lg bg-ivory-50/80 border border-beige-200/70 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-charcoal-800">
              Model Akses
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Unlimited</span>
            </span>
          </div>
          <p className="text-xs font-medium text-charcoal-900">
            Sekali bayar · Akses tanpa batas waktu
          </p>
          <p className="text-[11px] text-charcoal-500 leading-relaxed">
            Sesuai model bisnis platform: Wedding Pass berlaku penuh tanpa batas waktu, tanpa tanggal kedaluwarsa, dan tanpa perpanjangan berkala.
          </p>
        </div>
      </div>
    </div>
  );
}
