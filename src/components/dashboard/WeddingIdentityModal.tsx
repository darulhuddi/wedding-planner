import React, { useState, useEffect } from 'react';
import { StoredWorkspace } from '../../types/workspace';
import { PlanningPriority } from '../../types/onboarding';
import { Button } from '../ui/Button';
import {
  Heart,
  Calendar,
  DollarSign,
  Users,
  Target,
  CheckCircle2,
  AlertCircle,
  X,
  Edit3,
} from 'lucide-react';

export interface WeddingIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  storedWorkspace: StoredWorkspace;
  onWorkspaceChange: (updated: StoredWorkspace) => Promise<void> | void;
}

export const WeddingIdentityModal: React.FC<WeddingIdentityModalProps> = ({
  isOpen,
  onClose,
  storedWorkspace,
  onWorkspaceChange,
}) => {
  const [coupleName, setCoupleName] = useState(storedWorkspace.coupleName);
  const [weddingDate, setWeddingDate] = useState(storedWorkspace.weddingDate);
  const [estimatedBudget, setEstimatedBudget] = useState<number>(storedWorkspace.estimatedBudget);
  const [estimatedGuestCount, setEstimatedGuestCount] = useState<number>(
    storedWorkspace.estimatedGuestCount
  );
  const [planningPriority, setPlanningPriority] = useState<PlanningPriority>(
    storedWorkspace.primaryPlanningPriority || 'checklist'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Wedding Date Confirmation sub-modal
  const [isDateConfirmOpen, setIsDateConfirmOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState(storedWorkspace.weddingDate);

  useEffect(() => {
    if (isOpen) {
      setCoupleName(storedWorkspace.coupleName);
      setWeddingDate(storedWorkspace.weddingDate);
      setEstimatedBudget(storedWorkspace.estimatedBudget);
      setEstimatedGuestCount(storedWorkspace.estimatedGuestCount);
      setPlanningPriority(storedWorkspace.primaryPlanningPriority || 'checklist');
      setStatusMessage(null);
      setIsDateConfirmOpen(false);
    }
  }, [isOpen, storedWorkspace]);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleName.trim()) return;

    // If date changed, prompt confirmation
    if (weddingDate !== storedWorkspace.weddingDate) {
      setPendingDate(weddingDate);
      setIsDateConfirmOpen(true);
      return;
    }

    await performSave(weddingDate);
  };

  const performSave = async (finalWeddingDate: string) => {
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const updated: StoredWorkspace = {
        ...storedWorkspace,
        coupleName: coupleName.trim(),
        weddingDate: finalWeddingDate,
        estimatedBudget: Number(estimatedBudget) || 0,
        estimatedGuestCount: Number(estimatedGuestCount) || 0,
        primaryPlanningPriority: planningPriority,
        updatedAt: new Date().toISOString(),
      };

      await onWorkspaceChange(updated);
      setStatusMessage({ type: 'success', text: 'Informasi pernikahan berhasil diperbarui.' });
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('[WedFlow] Failed to update wedding identity:', err);
      setStatusMessage({
        type: 'error',
        text: 'Perubahan belum tersimpan. Silakan coba lagi.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDateChange = async () => {
    setIsDateConfirmOpen(false);
    await performSave(pendingDate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl border border-beige-200 shadow-modal max-w-xl w-full flex flex-col my-auto overflow-hidden max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-identity-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-beige-200 flex items-center justify-between bg-ivory-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-burgundy/10 text-burgundy flex items-center justify-center shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-identity-title" className="font-serif text-lg sm:text-xl font-bold text-charcoal">
                Ubah Informasi Pernikahan
              </h2>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Pusat identitas pernikahan dan tolak ukur perencanaanmu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-charcoal-400 hover:text-charcoal p-2 rounded-xl hover:bg-ivory-200 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* 1. Nama Pasangan */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-bold text-charcoal uppercase tracking-wider">
              <Heart className="w-3.5 h-3.5 text-burgundy" />
              <span>Nama Pasangan *</span>
            </label>
            <input
              type="text"
              value={coupleName}
              onChange={(e) => setCoupleName(e.target.value)}
              placeholder="Contoh: Adit & Nisa"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy bg-white"
            />
          </div>

          {/* 2. Tanggal Pernikahan */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-bold text-charcoal uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-burgundy" />
              <span>Tanggal Hari-H Pernikahan *</span>
            </label>
            <input
              type="date"
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy bg-white"
            />
            <p className="text-[11px] text-charcoal-400">
              Perubahan tanggal akan menyesuaikan countdown dan timeline secara otomatis.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 3. Perkiraan Budget */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-charcoal uppercase tracking-wider">
                <DollarSign className="w-3.5 h-3.5 text-gold-600" />
                <span>Target Budget (Rp)</span>
              </label>
              <input
                type="number"
                min={0}
                step={1000000}
                value={estimatedBudget}
                onChange={(e) => setEstimatedBudget(Number(e.target.value))}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy bg-white"
              />
            </div>

            {/* 4. Perkiraan Jumlah Tamu */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-charcoal uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-gold-600" />
                <span>Target Jumlah Tamu</span>
              </label>
              <input
                type="number"
                min={0}
                value={estimatedGuestCount}
                onChange={(e) => setEstimatedGuestCount(Number(e.target.value))}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy bg-white"
              />
            </div>
          </div>

          {/* 5. Prioritas Perencanaan */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-bold text-charcoal uppercase tracking-wider">
              <Target className="w-3.5 h-3.5 text-burgundy" />
              <span>Fokus Utama Perencanaan</span>
            </label>
            <select
              value={planningPriority}
              onChange={(e) => setPlanningPriority(e.target.value as PlanningPriority)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy bg-white cursor-pointer"
            >
              <option value="checklist">Checklist (Kelengkapan Daftar Tugas)</option>
              <option value="budget">Budget (Anggaran & Efisiensi Biaya)</option>
              <option value="vendor">Vendor (Pencarian & Kurasi Vendor)</option>
              <option value="timeline">Timeline (Rangkaian Waktu & Acara)</option>
            </select>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-beige-200">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
              {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>

        {/* Date Change Warning Confirmation */}
        {isDateConfirmOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/70 backdrop-blur-xs">
            <div
              className="bg-white rounded-2xl border border-beige shadow-modal max-w-md w-full p-6 space-y-4 animate-in fade-in duration-200"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between border-b border-beige pb-3">
                <h3 className="font-serif text-lg font-bold text-charcoal">
                  Tanggal Pernikahan Berubah
                </h3>
                <button
                  type="button"
                  onClick={() => setIsDateConfirmOpen(false)}
                  className="text-charcoal-400 hover:text-charcoal p-1 rounded-lg cursor-pointer"
                  aria-label="Tutup konfirmasi"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-charcoal-600 leading-relaxed">
                Rekomendasi dan prioritas persiapan akan menyesuaikan dengan tanggal baru. Tugas dan anggaran yang sudah kamu buat tidak akan hilang atau terhapus.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDateConfirmOpen(false)}
                  disabled={isSaving}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmDateChange}
                  disabled={isSaving}
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Tanggal Baru'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
