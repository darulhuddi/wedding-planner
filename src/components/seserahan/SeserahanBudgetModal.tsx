import React, { useState, useEffect } from 'react';
import { X, DollarSign } from 'lucide-react';

export interface SeserahanBudgetModalProps {
  isOpen: boolean;
  currentBudget: number;
  onClose: () => void;
  onSave: (newBudget: number) => Promise<void> | void;
}

export const SeserahanBudgetModal: React.FC<SeserahanBudgetModalProps> = ({
  isOpen,
  currentBudget,
  onClose,
  onSave,
}) => {
  const [budgetStr, setBudgetStr] = useState<string>(String(currentBudget || 0));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBudgetStr(String(currentBudget || 0));
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, currentBudget]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(budgetStr.replace(/\D/g, ''));
    if (Number.isNaN(num) || num < 0) {
      setError('Budget seserahan harus berupa angka non-negatif.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(num);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui budget.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setBudgetStr(raw);
    setError(null);
  };

  const formattedDisplay = budgetStr ? Number(budgetStr).toLocaleString('id-ID') : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl border border-beige-300 shadow-2xl p-6 relative animate-scaleUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal p-1.5 rounded-full hover:bg-beige-100 transition-colors cursor-pointer"
          aria-label="Tutup modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h3 id="budget-modal-title" className="font-serif text-lg font-bold text-charcoal">
              Atur Total Budget Seserahan
            </h3>
            <p className="text-xs text-charcoal-400">
              Tentukan target alokasi dana khusus untuk belanja seserahan.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="budget-input" className="block text-xs font-semibold text-charcoal mb-1.5">
              Total Budget (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 text-sm font-medium pointer-events-none">
                Rp
              </span>
              <input
                id="budget-input"
                type="text"
                inputMode="numeric"
                value={formattedDisplay}
                onChange={handleInputChange}
                className="w-full pl-11 pr-4 py-2.5 bg-ivory-50 border border-beige-300 focus:border-burgundy focus:ring-1 focus:ring-burgundy rounded-xl text-charcoal font-medium text-sm transition-all outline-none"
                placeholder="0"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-rose-600 mt-1.5">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-charcoal-500 hover:text-charcoal hover:bg-beige-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-burgundy hover:bg-burgundy-700 text-white text-sm font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
