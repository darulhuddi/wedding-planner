import React, { useState } from 'react';
import { Clock, Plus, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { CustomerEntitlement, ExtendTrialPayload } from '../../types/admin';
import { calculateExtendedExpiryDate, formatAdminDate } from '../../domain/adminSelectors';

interface AdminCustomerTrialManagementProps {
  entitlement: CustomerEntitlement;
  isSaving: boolean;
  onExtendTrial: (payload: ExtendTrialPayload) => Promise<void>;
}

export function AdminCustomerTrialManagement({
  entitlement,
  isSaving,
  onExtendTrial,
}: AdminCustomerTrialManagementProps) {
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [customDays, setCustomDays] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const effectiveDaysToAdd = isCustom
    ? Math.max(1, parseInt(customDays, 10) || 1)
    : selectedDays;

  const now = new Date();
  const projectedExpiry = calculateExtendedExpiryDate(
    entitlement.expiresAt,
    effectiveDaysToAdd,
    now
  );

  const handleSelectPreset = (days: number) => {
    setIsCustom(false);
    setSelectedDays(days);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCustomDays(val);
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      await onExtendTrial({
        daysToAdd: effectiveDaysToAdd,
        reason: reason.trim() || undefined,
        actorId: 'admin@wedflow.id',
      });
      setShowConfirmModal(false);
      setReason('');
      if (isCustom) setCustomDays('');
    } catch (err) {
      // Handled by parent
    }
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-lg border border-beige-200/80 shadow-xs space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-beige-100">
        <div>
          <h2 className="text-base font-serif font-bold text-charcoal-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-burgundy-700" />
            <span>Perpanjang Masa Trial</span>
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Tambahkan hari masa uji coba gratis secara manual untuk pasangan ini.
          </p>
        </div>
      </div>

      <form onSubmit={handleOpenConfirm} className="space-y-4">
        {/* Preset Buttons & Custom Input */}
        <div>
          <label className="block text-xs font-semibold text-charcoal-800 mb-2">
            Pilih Durasi Tambahan
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[3, 7, 14, 30].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => handleSelectPreset(days)}
                className={`px-3 py-2 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                  !isCustom && selectedDays === days
                    ? 'bg-burgundy-800 text-white border-burgundy-900 shadow-2xs'
                    : 'bg-ivory-50 hover:bg-ivory-100 text-charcoal-800 border-beige-200'
                }`}
              >
                +{days} Hari
              </button>
            ))}

            <button
              type="button"
              onClick={() => setIsCustom(true)}
              className={`px-3 py-2 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                isCustom
                  ? 'bg-burgundy-800 text-white border-burgundy-900 shadow-2xs'
                  : 'bg-ivory-50 hover:bg-ivory-100 text-charcoal-800 border-beige-200'
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom Input Field */}
          {isCustom && (
            <div className="mt-3 flex items-center gap-2 max-w-xs">
              <input
                type="number"
                min="1"
                max="365"
                value={customDays}
                onChange={handleCustomChange}
                placeholder="Jumlah hari..."
                className="w-full px-3 py-1.5 bg-ivory-50/50 border border-beige-300 rounded-md text-xs font-mono text-charcoal-900 focus:outline-hidden focus:ring-1 focus:ring-burgundy-700 focus:border-burgundy-700"
                autoFocus
                required
              />
              <span className="text-xs font-medium text-charcoal-600 shrink-0">Hari</span>
            </div>
          )}
        </div>

        {/* Date Projection Preview */}
        <div className="p-3.5 rounded-lg bg-burgundy-50/40 border border-burgundy-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="space-y-0.5">
            <span className="font-semibold text-burgundy-900">
              Proyeksi Tanggal Berakhir Baru:
            </span>
            <p className="text-charcoal-600">
              Menambahkan <strong className="text-burgundy-800 font-mono">+{effectiveDaysToAdd} hari</strong> ke masa berlaku saat ini.
            </p>
          </div>
          <div className="px-3 py-1 bg-white rounded border border-burgundy-200 font-mono font-bold text-burgundy-900 text-sm shadow-2xs self-start sm:self-auto">
            {formatAdminDate(projectedExpiry)}
          </div>
        </div>

        {/* Reason / Notes */}
        <div>
          <label className="block text-xs font-semibold text-charcoal-800 mb-1">
            Alasan / Catatan Internal (Opsional)
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Pasangan membutuhkan perpanjangan waktu untuk presentasi keluarga..."
            className="w-full px-3 py-2 bg-ivory-50/50 border border-beige-300 rounded-md text-xs text-charcoal-900 focus:outline-hidden focus:ring-1 focus:ring-burgundy-700 focus:border-burgundy-700 resize-none"
          />
        </div>

        {/* Submit CTA */}
        <div className="pt-1 flex justify-end">
          <button
            type="submit"
            disabled={isSaving || (isCustom && !customDays)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy-800 hover:bg-burgundy-900 disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Perpanjang Trial</span>
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl border border-beige-200 shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-charcoal-900">
                  Konfirmasi Perpanjangan Trial
                </h3>
                <p className="text-xs text-charcoal-500">
                  Pastikan data perpanjangan sudah sesuai sebelum menerapkan perubahan.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-ivory-50 border border-beige-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-charcoal-500">Pasangan:</span>
                <span className="font-semibold text-charcoal-900">{entitlement.coupleName || 'Pasangan'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-500">Durasi Ditambahkan:</span>
                <span className="font-mono font-bold text-burgundy-800">+{effectiveDaysToAdd} Hari</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-500">Berakhir Pada:</span>
                <span className="font-mono font-bold text-charcoal-900">{formatAdminDate(projectedExpiry)}</span>
              </div>
              {reason && (
                <div className="pt-2 border-t border-beige-200 text-charcoal-600">
                  <span className="font-semibold text-charcoal-700">Catatan:</span> {reason}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSaving}
                className="px-3 py-2 text-xs font-semibold text-charcoal-700 bg-ivory-100 hover:bg-ivory-200 rounded-md border border-beige-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-white bg-burgundy-800 hover:bg-burgundy-900 disabled:opacity-50 rounded-md shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? 'Menyimpan...' : 'Ya, Perpanjang Trial'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
