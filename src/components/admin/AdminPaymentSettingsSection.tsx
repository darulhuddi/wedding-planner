import React, { useState, useEffect, useCallback } from 'react';
import { getPaymentSettings, updatePaymentSettings } from '../../repositories/adminRepository';
import { PaymentSettingsConfig, DEFAULT_PAYMENT_SETTINGS_CONFIG } from '../../types/admin';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  CreditCard,
  MessageSquare,
  Smartphone,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

interface AdminPaymentSettingsSectionProps {
  onSettingsSaved?: (newSettings: PaymentSettingsConfig) => void;
}

export function AdminPaymentSettingsSection({ onSettingsSaved }: AdminPaymentSettingsSectionProps) {
  const { user, isAdmin } = useAuth();
  const [settings, setSettings] = useState<PaymentSettingsConfig>(DEFAULT_PAYMENT_SETTINGS_CONFIG);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPaymentSettings();
      setSettings(data);
    } catch (err: any) {
      console.error('[AdminPaymentSettings] Error loading settings:', err);
      setError(err.message || 'Gagal memuat pengaturan pembayaran.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleToggleMidtrans = () => {
    setSettings((prev) => ({
      ...prev,
      midtrans_enabled: !prev.midtrans_enabled,
    }));
  };

  const handleToggleManual = () => {
    setSettings((prev) => ({
      ...prev,
      manual_payment_enabled: !prev.manual_payment_enabled,
    }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setSettings((prev) => ({
      ...prev,
      manual_payment_whatsapp_number: raw,
    }));
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSettings((prev) => ({
      ...prev,
      manual_payment_message_template: e.target.value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    if (settings.manual_payment_enabled && !settings.manual_payment_whatsapp_number.trim()) {
      setError('Nomor WhatsApp Admin wajib diisi ketika pembayaran manual diaktifkan.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessToast(null);

    try {
      const actorId = user?.email || user?.id || 'admin';
      const updated = await updatePaymentSettings(settings, actorId);
      setSettings(updated);
      setSuccessToast('Konfigurasi metode pembayaran berhasil disimpan.');
      onSettingsSaved?.(updated);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('[AdminPaymentSettings] Error saving settings:', err);
      setError(err.message || 'Gagal menyimpan konfigurasi pembayaran.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-beige-300 rounded-2xl p-8 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-burgundy animate-spin mx-auto" />
        <p className="text-sm text-charcoal-500">Memuat konfigurasi pembayaran...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Payment Methods Toggles */}
      <div className="bg-white border border-beige-300 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-beige-200 pb-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-charcoal flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-burgundy" />
              <span>Metode Pembayaran</span>
            </h3>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Atur aktivasi metode pembayaran otomatis dan manual untuk checkout pelanggan.
            </p>
          </div>
          <Badge variant="gold" size="sm">
            Server Authoritative
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Midtrans Toggle Card */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              settings.midtrans_enabled
                ? 'bg-emerald-50/40 border-emerald-200 shadow-xs'
                : 'bg-charcoal-50/40 border-beige-300 opacity-90'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-charcoal text-sm">Midtrans</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      settings.midtrans_enabled
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-charcoal-200 text-charcoal-600'
                    }`}
                  >
                    {settings.midtrans_enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-xs text-charcoal-500 leading-relaxed">
                  Pembayaran otomatis melalui QRIS, Virtual Account, dan kartu via Midtrans Snap.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleMidtrans}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  settings.midtrans_enabled ? 'bg-emerald-600' : 'bg-charcoal-300'
                }`}
                role="switch"
                aria-checked={settings.midtrans_enabled}
                aria-label="Toggle Midtrans"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.midtrans_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Manual Payment WhatsApp Toggle Card */}
          <div
            className={`p-5 rounded-2xl border transition-all ${
              settings.manual_payment_enabled
                ? 'bg-emerald-50/40 border-emerald-200 shadow-xs'
                : 'bg-charcoal-50/40 border-beige-300 opacity-90'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-charcoal text-sm">Manual WhatsApp</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      settings.manual_payment_enabled
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-charcoal-200 text-charcoal-600'
                    }`}
                  >
                    {settings.manual_payment_enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-xs text-charcoal-500 leading-relaxed">
                  Pembayaran transfer langsung diverifikasi oleh admin via chat WhatsApp.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleManual}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  settings.manual_payment_enabled ? 'bg-emerald-600' : 'bg-charcoal-300'
                }`}
                role="switch"
                aria-checked={settings.manual_payment_enabled}
                aria-label="Toggle Manual WhatsApp"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.manual_payment_enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Manual WhatsApp Payment Configurations */}
      <div className="bg-white border border-beige-300 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
        <div className="border-b border-beige-200 pb-4">
          <h3 className="font-serif text-lg font-bold text-charcoal flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-burgundy" />
            <span>Konfigurasi WhatsApp Admin</span>
          </h3>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Tentukan nomor kontak dan pesan prefilled otomatis saat pelanggan mengklik konfirmasi transfer manual.
          </p>
        </div>

        <div className="space-y-5">
          {/* WhatsApp Admin Number Input */}
          <div className="space-y-1.5 max-w-md">
            <label className="block text-xs font-semibold text-charcoal-700">
              Nomor WhatsApp Admin (dengan kode negara)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-charcoal-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                value={settings.manual_payment_whatsapp_number}
                onChange={handlePhoneChange}
                placeholder="Contoh: 6281234567890"
                className="w-full pl-10 pr-4 py-2.5 bg-ivory-50 border border-beige-300 rounded-xl text-sm font-mono text-charcoal focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy transition-colors"
                required={settings.manual_payment_enabled}
              />
            </div>
            <p className="text-[11px] text-charcoal-400">
              Format: awalan <code>628...</code> tanpa tanda plus (+) atau spasi.
            </p>
          </div>

          {/* WhatsApp Message Template Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-charcoal-700">
                Template Pesan WhatsApp Prefilled
              </label>
              <span className="text-[11px] text-charcoal-400">
                Variabel: <code>{'{order_number}'}</code>, <code>{'{package_name}'}</code>, <code>{'{total_amount}'}</code>
              </span>
            </div>
            <div className="relative">
              <textarea
                value={settings.manual_payment_message_template || ''}
                onChange={handleTemplateChange}
                rows={7}
                placeholder="Template pesan WhatsApp..."
                className="w-full p-3.5 bg-ivory-50 border border-beige-300 rounded-xl text-xs sm:text-sm font-sans text-charcoal leading-relaxed focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-charcoal-400 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>Hanya administrator terotorisasi yang dapat mengubah konfigurasi ini.</span>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isSaving}
          className="min-w-[160px] flex items-center justify-center gap-2 shadow-sm"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Menyimpan...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
