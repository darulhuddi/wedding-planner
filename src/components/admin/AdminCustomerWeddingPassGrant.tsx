import React, { useState } from 'react';
import { ShieldCheck, Gift, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CustomerEntitlement, GrantWeddingPassPayload } from '../../types/admin';

interface AdminCustomerWeddingPassGrantProps {
  entitlement: CustomerEntitlement;
  isSaving: boolean;
  onGrantWeddingPass: (payload: GrantWeddingPassPayload) => Promise<void>;
}

export function AdminCustomerWeddingPassGrant({
  entitlement,
  isSaving,
  onGrantWeddingPass,
}: AdminCustomerWeddingPassGrantProps) {
  const isAlreadyPaid = entitlement.tier === 'Paid';
  const [reason, setReason] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      await onGrantWeddingPass({
        accessDurationRule: 'unlimited',
        reason: reason.trim() || 'Complimentary Wedding Pass by Admin',
        actorId: 'admin@wedflow.id',
      });
      setShowConfirmModal(false);
      setReason('');
    } catch (err) {
      // Handled by parent
    }
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-lg border border-beige-200/80 shadow-xs space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-beige-100">
        <div>
          <h2 className="text-base font-serif font-bold text-charcoal-900 flex items-center gap-2">
            <Gift className="w-4 h-4 text-emerald-700" />
            <span>Berikan Wedding Pass (Complimentary)</span>
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Berikan akses komersial penuh kepada pasangan secara cuma-cuma (VIP, sponsorship, support).
          </p>
        </div>

        {isAlreadyPaid && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Wedding Pass Aktif</span>
          </span>
        )}
      </div>

      {isAlreadyPaid ? (
        <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-200/60 text-xs text-emerald-900 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-950">
              Pasangan ini sudah memiliki hak akses Wedding Pass aktif ({entitlement.source}).
            </p>
            <p className="text-emerald-800 mt-0.5">
              Anda tetap dapat memperbarui catatan atau status hak akses jika diperlukan melalui aksi di bawah.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-ivory-50/80 border border-beige-200 text-xs text-charcoal-600 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-burgundy-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-charcoal-900">
              Pemberian hak akses manual ini tidak membuat transaksi pembayaran.
            </p>
            <p className="text-charcoal-500 mt-0.5">
              Sumber akses akan dicatat sebagai <strong>Complimentary</strong> dalam audit log dan tidak dicatat sebagai revenue invoice berbayar.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleOpenConfirm} className="space-y-4">
        {/* Product Rule Display: Unlimited Access */}
        <div className="p-3.5 rounded-lg bg-ivory-50/80 border border-beige-200/70 space-y-1">
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
            Akses penuh tanpa batas waktu (expires_at = null)
          </p>
          <p className="text-[11px] text-charcoal-500 leading-relaxed">
            Pemberian Wedding Pass memberikan akses penuh tanpa batas waktu dan tanpa tanggal kedaluwarsa.
          </p>
        </div>

        {/* Reason / Notes */}
        <div>
          <label className="block text-xs font-semibold text-charcoal-800 mb-1">
            Alasan Pemberian Complimentary (Wajib)
          </label>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Sponsor Pernikahan VIP / Kerjasama Vendor / Kompensasi Support"
            className="w-full px-3 py-2 bg-ivory-50/50 border border-beige-300 rounded-md text-xs text-charcoal-900 focus:outline-hidden focus:ring-1 focus:ring-burgundy-700 focus:border-burgundy-700"
          />
        </div>

        {/* Submit CTA */}
        <div className="pt-1 flex justify-end">
          <button
            type="submit"
            disabled={isSaving || !reason.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isAlreadyPaid ? 'Perbarui Wedding Pass' : 'Berikan Wedding Pass'}</span>
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-xl border border-beige-200 shadow-xl max-w-md w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif font-bold text-charcoal-900">
                  Konfirmasi Pemberian Wedding Pass
                </h3>
                <p className="text-xs text-charcoal-500">
                  Akses Wedding Pass akan langsung diaktifkan tanpa pembuatan invoice pembayaran.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-ivory-50 border border-beige-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-charcoal-500">Pasangan:</span>
                <span className="font-semibold text-charcoal-900">{entitlement.coupleName || 'Pasangan'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-500">Tipe Akses:</span>
                <span className="font-semibold text-emerald-800">Wedding Pass (Complimentary)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-500">Aturan Durasi:</span>
                <span className="font-mono text-charcoal-800">
                  Unlimited (Akses Tanpa Batas Waktu)
                </span>
              </div>
              <div className="pt-2 border-t border-beige-200 text-charcoal-600">
                <span className="font-semibold text-charcoal-700">Alasan:</span> {reason}
              </div>
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
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 rounded-md shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? 'Memproses...' : 'Ya, Berikan Akses'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
