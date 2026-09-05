import React, { useState } from 'react';
import { Button } from '../ui/Button';
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  X,
  Trash2,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

export interface DataPrivacySettingsProps {
  onResetPlanning: () => Promise<void>;
}

export const DataPrivacySettings: React.FC<DataPrivacySettingsProps> = ({
  onResetPlanning,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isConfirmed = confirmText.trim().toUpperCase() === 'RESET';

  const handleOpenModal = () => {
    setConfirmText('');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isResetting) return;
    setIsModalOpen(false);
    setConfirmText('');
    setErrorMessage(null);
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed || isResetting) return;

    setIsResetting(true);
    setErrorMessage(null);

    try {
      await onResetPlanning();
      setIsModalOpen(false);
    } catch (err: unknown) {
      console.error('[WedFlow Settings] Reset planning error:', err);
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as any).message)
          : 'Gagal mereset data perencanaan. Silakan coba lagi.';
      setErrorMessage(msg);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-beige p-5 sm:p-6 shadow-soft space-y-6">
      <div className="border-b border-beige pb-4">
        <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
          Data & Privasi
        </h2>
        <p className="text-xs sm:text-sm text-charcoal-400 mt-0.5">
          Kelola penyimpanan data perencanaan dan preferensi privasi akun Anda
        </p>
      </div>

      <div className="space-y-4">
        {/* Reset Planning Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-rose-50/40 border border-rose-100">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0 mt-0.5 sm:mt-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-charcoal block">
                Reset Perencanaan
              </span>
              <p className="text-xs text-charcoal-400 mt-0.5 max-w-xl leading-relaxed">
                Mulai kembali dari awal dengan menghapus seluruh data perencanaan pernikahanmu.
                Akun dan akses yang sudah kamu miliki tetap aman.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-rose-300 text-rose-700 hover:bg-rose-100 hover:text-rose-800 font-semibold"
            onClick={handleOpenModal}
          >
            Reset Perencanaan
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs">
          <div
            className="bg-white rounded-2xl border border-beige shadow-modal max-w-lg w-full p-6 space-y-5 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-planning-title"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-beige pb-3">
              <div className="flex items-center gap-2.5 text-rose-700">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3
                  id="reset-planning-title"
                  className="font-serif text-lg font-bold text-charcoal"
                >
                  Konfirmasi Reset Perencanaan
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isResetting}
                className="text-charcoal-400 hover:text-charcoal p-1 rounded-lg cursor-pointer disabled:opacity-50"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message if any */}
            {errorMessage && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs sm:text-sm flex items-start gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Explanation Body */}
            <div className="space-y-3.5 text-xs sm:text-sm text-charcoal leading-relaxed">
              <p className="font-semibold text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200">
                ⚠️ Tindakan ini tidak dapat dibatalkan. Seluruh data persiapan yang sudah Anda masukkan akan dihapus permanen.
              </p>

              {/* Data yang dihapus */}
              <div className="bg-ivory-50 p-3.5 rounded-xl border border-beige space-y-1.5">
                <span className="font-semibold text-charcoal text-xs uppercase tracking-wider block flex items-center gap-1.5 text-rose-700">
                  <Trash2 className="w-3.5 h-3.5" /> Data yang akan dihapus:
                </span>
                <ul className="list-disc list-inside space-y-1 text-charcoal-500 pl-1 text-xs">
                  <li>Checklist & seluruh tugas pernikahan</li>
                  <li>Alokasi budget & catatan pengeluaran</li>
                  <li>Daftar vendor yang tersimpan</li>
                  <li>Buku tamu & status konfirmasi RSVP</li>
                  <li>Rangkaian acara & jadwal timeline</li>
                  <li>Catatan & preferensi pernikahan</li>
                </ul>
              </div>

              {/* Data yang dipertahankan */}
              <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200/80 space-y-1.5">
                <span className="font-semibold text-emerald-800 text-xs uppercase tracking-wider block flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Data yang tetap aman & dipertahankan:
                </span>
                <ul className="list-disc list-inside space-y-1 text-emerald-900/80 pl-1 text-xs">
                  <li>Akun login & email Anda tetap aktif</li>
                  <li>Akses Wedding Pass / langganan berbayar tetap aktif</li>
                  <li>Riwayat pesanan & bukti pembayaran tetap tersimpan</li>
                </ul>
              </div>
            </div>

            {/* Confirmation Prompt */}
            <form onSubmit={handleExecuteReset} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-charcoal uppercase tracking-wider mb-1.5">
                  Ketik <span className="text-rose-700 font-mono select-all">RESET</span> untuk mengonfirmasi:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Ketik RESET"
                  disabled={isResetting}
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-beige-300 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-600 uppercase"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-beige">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseModal}
                  disabled={isResetting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!isConfirmed || isResetting}
                  className="bg-rose-700 hover:bg-rose-800 text-white border-rose-700 disabled:opacity-40"
                >
                  {isResetting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mereset Perencanaan...
                    </span>
                  ) : (
                    'Reset Perencanaan'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
