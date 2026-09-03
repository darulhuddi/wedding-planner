import React, { useState } from 'react';
import { StoredWorkspace } from '../../types/workspace';
import { PlanningPriority } from '../../types/onboarding';
import { Button } from '../ui/Button';
import { Heart, Calendar, DollarSign, Users, Target, CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface WeddingSettingsProps {
  storedWorkspace: StoredWorkspace;
  onWorkspaceChange: (updated: StoredWorkspace) => Promise<void> | void;
}

export const WeddingSettings: React.FC<WeddingSettingsProps> = ({
  storedWorkspace,
  onWorkspaceChange,
}) => {
  // Field States
  const [coupleName, setCoupleName] = useState(storedWorkspace.coupleName);
  const [weddingDate, setWeddingDate] = useState(storedWorkspace.weddingDate);
  const [estimatedBudget, setEstimatedBudget] = useState<number>(storedWorkspace.estimatedBudget);
  const [estimatedGuestCount, setEstimatedGuestCount] = useState<number>(storedWorkspace.estimatedGuestCount);
  const [planningPriority, setPlanningPriority] = useState<PlanningPriority>(
    storedWorkspace.primaryPlanningPriority || 'checklist'
  );

  // Per-field Saving States
  const [savingField, setSavingField] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    field: string;
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Wedding Date Confirmation Modal
  const [isDateConfirmOpen, setIsDateConfirmOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState(storedWorkspace.weddingDate);

  // Helper for saving a field
  const handleSaveField = async (
    fieldKey: string,
    updatedFields: Partial<StoredWorkspace>,
    successText = 'Perubahan berhasil disimpan.'
  ) => {
    setSavingField(fieldKey);
    setStatusMessage(null);

    try {
      const updated: StoredWorkspace = {
        ...storedWorkspace,
        ...updatedFields,
        updatedAt: new Date().toISOString(),
      };
      await onWorkspaceChange(updated);
      setStatusMessage({ field: fieldKey, type: 'success', text: successText });
      setTimeout(() => {
        setStatusMessage((current) => (current?.field === fieldKey ? null : current));
      }, 3000);
    } catch (err) {
      console.error(`[WedFlow] Failed to save ${fieldKey}:`, err);
      setStatusMessage({
        field: fieldKey,
        type: 'error',
        text: 'Perubahan belum tersimpan. Coba lagi.',
      });
    } finally {
      setSavingField(null);
    }
  };

  // 1. Couple Name
  const handleSaveCoupleName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleName.trim()) return;
    handleSaveField('coupleName', { coupleName: coupleName.trim() });
  };

  // 2. Wedding Date
  const handleInitiateDateSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weddingDate) return;
    if (weddingDate === storedWorkspace.weddingDate) return;
    setPendingDate(weddingDate);
    setIsDateConfirmOpen(true);
  };

  const handleConfirmDateChange = async () => {
    setIsDateConfirmOpen(false);
    await handleSaveField('weddingDate', { weddingDate: pendingDate });
  };

  // 3. Estimated Budget
  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(estimatedBudget);
    if (isNaN(val) || val < 0) return;
    handleSaveField('estimatedBudget', { estimatedBudget: val });
  };

  // 4. Estimated Guest Count
  const handleSaveGuests = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(estimatedGuestCount);
    if (isNaN(val) || val < 0) return;
    handleSaveField('estimatedGuestCount', { estimatedGuestCount: Math.floor(val) });
  };

  // 5. Planning Priority
  const handleSavePriority = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveField('primaryPlanningPriority', { primaryPlanningPriority: planningPriority });
  };

  // Helper renderer for inline feedback
  const renderStatus = (fieldKey: string) => {
    if (!statusMessage || statusMessage.field !== fieldKey) return null;
    const isSuccess = statusMessage.type === 'success';
    return (
      <div
        className={`flex items-center gap-2 mt-2 text-xs sm:text-sm font-medium ${
          isSuccess ? 'text-emerald-700' : 'text-rose-700'
        }`}
      >
        {isSuccess ? (
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
        ) : (
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
        )}
        <span>{statusMessage.text}</span>
      </div>
    );
  };

  return (
    <section className="bg-white rounded-2xl border border-beige p-5 sm:p-6 shadow-soft space-y-6">
      <div className="border-b border-beige pb-4">
        <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal">Informasi Pernikahan</h2>
        <p className="text-xs sm:text-sm text-charcoal-400 mt-0.5">
          Konfigurasi dasar pernikahan dan tolak ukur rencana persiapan
        </p>
      </div>

      <div className="space-y-6">
        {/* 1. Nama Pasangan */}
        <form onSubmit={handleSaveCoupleName} className="p-4 rounded-xl bg-ivory-50 border border-beige space-y-3">
          <div className="flex items-center gap-2.5">
            <Heart className="w-4 h-4 text-burgundy shrink-0" />
            <label className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Nama Pasangan
            </label>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={coupleName}
              onChange={(e) => setCoupleName(e.target.value)}
              placeholder="Contoh: Adit & Nisa"
              required
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy bg-white"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={savingField === 'coupleName' || coupleName === storedWorkspace.coupleName}
            >
              {savingField === 'coupleName' ? 'Menyimpan...' : 'Simpan Nama'}
            </Button>
          </div>
          {renderStatus('coupleName')}
        </form>

        {/* 2. Tanggal Pernikahan */}
        <form onSubmit={handleInitiateDateSave} className="p-4 rounded-xl bg-ivory-50 border border-beige space-y-3">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-burgundy shrink-0" />
            <label className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Tanggal Pernikahan
            </label>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="date"
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
              required
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy bg-white"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={savingField === 'weddingDate' || weddingDate === storedWorkspace.weddingDate}
            >
              {savingField === 'weddingDate' ? 'Menyimpan...' : 'Simpan Tanggal'}
            </Button>
          </div>
          {renderStatus('weddingDate')}
        </form>

        {/* 3. Perkiraan Budget */}
        <form onSubmit={handleSaveBudget} className="p-4 rounded-xl bg-ivory-50 border border-beige space-y-3">
          <div className="flex items-center gap-2.5">
            <DollarSign className="w-4 h-4 text-gold-600 shrink-0" />
            <label className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Perkiraan Budget (Rp)
            </label>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="number"
              min={0}
              step={1000000}
              value={estimatedBudget}
              onChange={(e) => setEstimatedBudget(Number(e.target.value))}
              required
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy bg-white"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={savingField === 'estimatedBudget' || estimatedBudget === storedWorkspace.estimatedBudget}
            >
              {savingField === 'estimatedBudget' ? 'Menyimpan...' : 'Simpan Budget'}
            </Button>
          </div>
          <p className="text-[11px] text-charcoal-400">
            Nilai ini adalah tolak ukur perencanaan dan tidak akan mengubah alokasi atau pengeluaran yang telah dicatat.
          </p>
          {renderStatus('estimatedBudget')}
        </form>

        {/* 4. Perkiraan Jumlah Tamu */}
        <form onSubmit={handleSaveGuests} className="p-4 rounded-xl bg-ivory-50 border border-beige space-y-3">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-gold-600 shrink-0" />
            <label className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Perkiraan Jumlah Tamu
            </label>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="number"
              min={0}
              value={estimatedGuestCount}
              onChange={(e) => setEstimatedGuestCount(Number(e.target.value))}
              required
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy bg-white"
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={
                savingField === 'estimatedGuestCount' ||
                estimatedGuestCount === storedWorkspace.estimatedGuestCount
              }
            >
              {savingField === 'estimatedGuestCount' ? 'Menyimpan...' : 'Simpan Jumlah Tamu'}
            </Button>
          </div>
          <p className="text-[11px] text-charcoal-400">
            Perubahan perkiraan tamu tidak akan mengubah daftar data tamu yang telah Anda masukkan.
          </p>
          {renderStatus('estimatedGuestCount')}
        </form>

        {/* 5. Prioritas Perencanaan */}
        <form onSubmit={handleSavePriority} className="p-4 rounded-xl bg-ivory-50 border border-beige space-y-3">
          <div className="flex items-center gap-2.5">
            <Target className="w-4 h-4 text-burgundy shrink-0" />
            <label className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Prioritas Perencanaan
            </label>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <select
              value={planningPriority}
              onChange={(e) => setPlanningPriority(e.target.value as PlanningPriority)}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-beige-300 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy bg-white cursor-pointer"
            >
              <option value="budget">Budget (Fokus ke Anggaran & Efisiensi Biaya)</option>
              <option value="checklist">Checklist (Fokus ke Kelengkapan Daftar Tugas)</option>
              <option value="vendor">Vendor (Fokus ke Pencarian & Pemilihan Vendor)</option>
              <option value="timeline">Timeline (Fokus ke Rangkaian Waktu & Acara)</option>
            </select>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={
                savingField === 'primaryPlanningPriority' ||
                planningPriority === storedWorkspace.primaryPlanningPriority
              }
            >
              {savingField === 'primaryPlanningPriority' ? 'Menyimpan...' : 'Simpan Prioritas'}
            </Button>
          </div>
          <p className="text-[11px] text-charcoal-400">
            Prioritas membantu merekomendasikan langkah terbaik berikutnya tanpa mengubah tugas yang telah dibuat.
          </p>
          {renderStatus('primaryPlanningPriority')}
        </form>
      </div>

      {/* Confirmation Modal for Wedding Date Change */}
      {isDateConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs">
          <div
            className="bg-white rounded-2xl border border-beige shadow-modal max-w-md w-full p-6 space-y-4 animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-date-title"
          >
            <div className="flex items-center justify-between border-b border-beige pb-3">
              <h3 id="confirm-date-title" className="font-serif text-lg font-bold text-charcoal">
                Tanggal pernikahan berubah
              </h3>
              <button
                type="button"
                onClick={() => setIsDateConfirmOpen(false)}
                className="text-charcoal-400 hover:text-charcoal p-1 rounded-lg cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-charcoal-600 leading-relaxed">
              Rekomendasi dan prioritas persiapan akan menyesuaikan dengan tanggal baru. Tugas yang sudah kamu buat tidak akan diubah atau dihapus.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsDateConfirmOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleConfirmDateChange}
              >
                Simpan Tanggal Baru
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
