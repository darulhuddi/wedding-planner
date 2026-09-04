import React from 'react';
import { Clock, Check, AlertCircle } from 'lucide-react';
import { AdminAccessConfig, TrialStartTrigger } from '../../types/admin';

interface AdminTrialSettingsProps {
  config: AdminAccessConfig;
  onChange: (updates: Partial<AdminAccessConfig>) => void;
  errors: Partial<Record<keyof AdminAccessConfig, string>>;
}

export function AdminTrialSettings({
  config,
  onChange,
  errors,
}: AdminTrialSettingsProps) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-lg border border-beige-200/80 shadow-xs space-y-5">
      {/* Header & Toggle */}
      <div className="flex items-center justify-between pb-4 border-b border-beige-100">
        <div>
          <h2 className="text-base font-serif font-bold text-charcoal-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-burgundy-700" />
            <span>Free Trial Configuration</span>
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Aturan akses masa percobaan gratis untuk pengguna baru.
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.trialEnabled}
            onChange={(e) => onChange({ trialEnabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-charcoal-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-charcoal-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-burgundy-700"></div>
          <span className="ml-2 text-xs font-semibold text-charcoal-700">
            {config.trialEnabled ? 'Aktif' : 'Nonaktif'}
          </span>
        </label>
      </div>

      <div className="space-y-4">
        {/* Trial Duration */}
        <div>
          <label className="block text-xs font-semibold text-charcoal-800 mb-1">
            Durasi Trial (Hari)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={365}
              value={config.trialDurationDays || ''}
              onChange={(e) =>
                onChange({ trialDurationDays: parseInt(e.target.value, 10) || 0 })
              }
              className={`w-32 px-3 py-1.5 text-xs sm:text-sm bg-ivory-50 border rounded-md focus:outline-hidden focus:ring-1 focus:ring-burgundy-600 focus:border-burgundy-600 font-mono ${
                errors.trialDurationDays ? 'border-rose-400 bg-rose-50/20' : 'border-beige-200'
              }`}
            />
            <span className="text-xs text-charcoal-500 font-medium">hari penuh</span>
          </div>
          {errors.trialDurationDays && (
            <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              <span>{errors.trialDurationDays}</span>
            </p>
          )}
        </div>

        {/* Trial Start Trigger */}
        <div>
          <label className="block text-xs font-semibold text-charcoal-800 mb-2">
            Pemicu Mulai Trial (Trial Start Trigger)
          </label>
          <div className="space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-charcoal-700 p-2.5 rounded-md border border-beige-200/60 bg-ivory-50/50 hover:bg-ivory-100/50 transition-colors">
              <input
                type="radio"
                name="trialStartTrigger"
                value="account_created"
                checked={config.trialStartTrigger === 'account_created'}
                onChange={() => onChange({ trialStartTrigger: 'account_created' })}
                className="mt-0.5 text-burgundy-700 focus:ring-burgundy-600"
              />
              <div>
                <span className="font-semibold text-charcoal-900">
                  Saat akun dibuat (Account Created)
                </span>
                <p className="text-[11px] text-charcoal-500 mt-0.5">
                  Masa trial langsung dimulai seketika pasangan mendaftar akun.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-charcoal-700 p-2.5 rounded-md border border-beige-200/60 bg-ivory-50/50 hover:bg-ivory-100/50 transition-colors">
              <input
                type="radio"
                name="trialStartTrigger"
                value="wedding_setup_completed"
                checked={config.trialStartTrigger === 'wedding_setup_completed'}
                onChange={() => onChange({ trialStartTrigger: 'wedding_setup_completed' })}
                className="mt-0.5 text-burgundy-700 focus:ring-burgundy-600"
              />
              <div>
                <span className="font-semibold text-charcoal-900">
                  Saat onboarding selesai (Wedding Setup Completed)
                </span>
                <p className="text-[11px] text-charcoal-500 mt-0.5">
                  Masa trial baru dihitung setelah pasangan menyelesaikan wizard setup pernikahan.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Grace Period */}
        <div>
          <label className="block text-xs font-semibold text-charcoal-800 mb-1">
            Grace Period Trial (Hari)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={60}
              value={config.trialGracePeriodDays ?? 0}
              onChange={(e) =>
                onChange({
                  trialGracePeriodDays: parseInt(e.target.value, 10) || 0,
                })
              }
              className={`w-32 px-3 py-1.5 text-xs sm:text-sm bg-ivory-50 border rounded-md focus:outline-hidden focus:ring-1 focus:ring-burgundy-600 focus:border-burgundy-600 font-mono ${
                errors.trialGracePeriodDays
                  ? 'border-rose-400 bg-rose-50/20'
                  : 'border-beige-200'
              }`}
            />
            <span className="text-xs text-charcoal-500 font-medium">
              hari toleransi sebelum paywall aktif
            </span>
          </div>
          {errors.trialGracePeriodDays && (
            <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              <span>{errors.trialGracePeriodDays}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
