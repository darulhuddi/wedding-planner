import React, { useState, useEffect, useCallback } from 'react';
import { AdminHeader } from './AdminHeader';
import { AdminLayout } from './AdminLayout';
import { AdminTrialSettings } from './AdminTrialSettings';
import { AdminWeddingPassSettings } from './AdminWeddingPassSettings';
import { AdminAccessLifecycle } from './AdminAccessLifecycle';
import { AdminPricingPreview } from './AdminPricingPreview';
import { AdminCustomerAccessEntry } from './AdminCustomerAccessEntry';
import { getAccessConfig, updateAccessConfig } from '../../repositories/adminRepository';
import {
  AdminAccessConfig,
  DEFAULT_ADMIN_ACCESS_CONFIG,
} from '../../types/admin';
import { validateAccessConfig } from '../../domain/adminSelectors';
import { Check, AlertCircle, Save, RotateCcw } from 'lucide-react';

interface AdminAccessPageProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export function AdminAccessPage({
  currentRoute,
  onNavigate,
}: AdminAccessPageProps) {
  const [serverConfig, setServerConfig] = useState<AdminAccessConfig>(
    DEFAULT_ADMIN_ACCESS_CONFIG
  );
  const [draftConfig, setDraftConfig] = useState<AdminAccessConfig>(
    DEFAULT_ADMIN_ACCESS_CONFIG
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof AdminAccessConfig, string>>
  >({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setSaveError(null);
    try {
      const config = await getAccessConfig();
      setServerConfig(config);
      setDraftConfig(config);
      setErrors({});
    } catch (err: unknown) {
      console.error('[WedFlow Admin] Error loading access configuration:', err);
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat konfigurasi akses. Silakan coba lagi.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle local state updates
  const handleUpdate = (updates: Partial<AdminAccessConfig>) => {
    setDraftConfig((prev) => ({
      ...prev,
      ...updates,
    }));
    setSaveSuccess(false);
    setSaveError(null);

    // Clear specific errors on edit
    const updatedKeys = Object.keys(updates) as (keyof AdminAccessConfig)[];
    if (updatedKeys.some((k) => errors[k])) {
      setErrors((prev) => {
        const next = { ...prev };
        updatedKeys.forEach((k) => delete next[k]);
        return next;
      });
    }
  };

  const handleResetDraft = () => {
    setDraftConfig(serverConfig);
    setErrors({});
    setSaveSuccess(false);
    setSaveError(null);
  };

  const hasUnsavedChanges =
    JSON.stringify(draftConfig) !== JSON.stringify(serverConfig);

  const handleSave = async () => {
    const validation = validateAccessConfig(draftConfig);
    if (!validation.isValid) {
      setErrors(validation.errors);
      setSaveError('Harap periksa kembali isian konfigurasi sebelum menyimpan.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const saved = await updateAccessConfig(draftConfig);
      setServerConfig(saved);
      setDraftConfig(saved);
      setSaveSuccess(true);
      setErrors({});
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      console.error('[WedFlow Admin] Error persisting access config:', err);
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan konfigurasi akses ke database.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout currentRoute={currentRoute} onNavigate={onNavigate}>
      {(openMobileNav) => (
        <div className="flex-1 flex flex-col pb-16 sm:pb-8">
          {/* Header */}
          <AdminHeader
            title="Access & Monetization"
            subtitle="Atur aturan akses trial dan Wedding Pass yang digunakan seluruh platform."
            onRefresh={loadData}
            isLoading={isLoading}
            onOpenMobileNav={openMobileNav}
          />

          {/* Main Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {/* Status Notifications */}
            {saveSuccess && (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs sm:text-sm animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Perubahan berhasil disimpan.</span>
              </div>
            )}

            {saveError && (
              <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs sm:text-sm animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {/* Top Action Bar for Unsaved Changes (Desktop/Tablet) */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-beige-200/80 shadow-2xs">
              <div className="flex items-center gap-2">
                {hasUnsavedChanges ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Ada perubahan belum disimpan
                  </span>
                ) : (
                  <span className="text-xs text-charcoal-500">
                    Semua konfigurasi tersinkronisasi
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <button
                    onClick={handleResetDraft}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-charcoal-600 hover:text-charcoal-900 bg-ivory-100 hover:bg-ivory-200 border border-beige-200 rounded-md transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Batalkan</span>
                  </button>
                )}

                <button
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isSaving}
                  className={`inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-md shadow-xs transition-all ${
                    hasUnsavedChanges
                      ? 'bg-burgundy-700 hover:bg-burgundy-800 text-white cursor-pointer'
                      : 'bg-charcoal-100 text-charcoal-400 cursor-not-allowed border border-beige-200'
                  }`}
                >
                  <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </div>

            {/* Grid layout for settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Form Settings */}
              <div className="space-y-6">
                {/* Section 1: Free Trial Settings */}
                <AdminTrialSettings
                  config={draftConfig}
                  onChange={handleUpdate}
                  errors={errors}
                />

                {/* Section 2: Wedding Pass Settings */}
                <AdminWeddingPassSettings
                  config={draftConfig}
                  onChange={handleUpdate}
                  errors={errors}
                />
              </div>

              {/* Right Column: Previews & Visuals */}
              <div className="space-y-6">
                {/* Section 4: Live Pricing Preview */}
                <AdminPricingPreview config={draftConfig} isUnsaved={hasUnsavedChanges || Boolean(saveError)} />

                {/* Section 3: Lifecycle Flow */}
                <AdminAccessLifecycle config={draftConfig} />
              </div>
            </div>

            {/* Section 5: Individual Customer Access Entry Point */}
            <AdminCustomerAccessEntry onNavigate={onNavigate} />
          </main>
        </div>
      )}
    </AdminLayout>
  );
}
