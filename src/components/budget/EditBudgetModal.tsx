import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface EditBudgetModalProps {
  isOpen: boolean;
  currentBudget: number;
  onClose: () => void;
  onSave: (newBudget: number) => void;
}

export const EditBudgetModal: React.FC<EditBudgetModalProps> = ({
  isOpen,
  currentBudget,
  onClose,
  onSave,
}) => {
  const [amount, setAmount] = useState(currentBudget.toString());

  useEffect(() => {
    if (isOpen) {
      setAmount(currentBudget.toString());
    }
  }, [isOpen, currentBudget]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseInt(amount, 10);
    
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return;
    }

    onSave(parsedAmount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/40 backdrop-blur-sm">
      <div 
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-beige">
          <h2 className="font-serif text-xl font-bold text-charcoal">Edit Total Budget</h2>
          <button
            onClick={onClose}
            className="p-2 text-charcoal-400 hover:text-charcoal-700 bg-ivory-100 hover:bg-beige-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          <div>
            <label htmlFor="total-budget" className="block text-sm font-medium text-charcoal mb-2 leading-relaxed">
              Tentukan perkiraan total budget pernikahanmu.
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400 font-medium">Rp</span>
              <input
                id="total-budget"
                type="number"
                min="0"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-beige-300 rounded-xl text-base text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy-200 focus:border-burgundy-400 transition-shadow font-semibold"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-charcoal-600 bg-ivory-100 hover:bg-beige-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!amount || parseInt(amount, 10) < 0}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-burgundy hover:bg-burgundy-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
