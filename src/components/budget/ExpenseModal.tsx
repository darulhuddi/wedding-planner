import React, { useState } from 'react';
import { X } from 'lucide-react';
import { BudgetCategory, BudgetExpense } from '../../types/budget';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../../domain/categories';

interface ExpenseModalProps {
  isOpen: boolean;
  initialExpense?: BudgetExpense | null;
  onClose: () => void;
  onSave: (expense: Omit<BudgetExpense, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  initialExpense,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<BudgetCategory | ''>('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');

  React.useEffect(() => {
    if (isOpen && initialExpense) {
      setTitle(initialExpense.title);
      setAmount(initialExpense.amount.toString());
      setCategory(initialExpense.category);
      setDate(initialExpense.date);
      setNote(initialExpense.note || '');
    } else if (isOpen) {
      setTitle('');
      setAmount('');
      setCategory('');
      setDate('');
      setNote('');
    }
  }, [isOpen, initialExpense]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseInt(amount, 10);
    
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0 || !category || !date) {
      return;
    }

    onSave({
      title: title.trim(),
      amount: parsedAmount,
      category,
      date,
      note: note.trim() || null,
    });

    // Reset
    setTitle('');
    setAmount('');
    setCategory('');
    setDate('');
    setNote('');
  };

  const orderedCategories: BudgetCategory[] = [...CATEGORY_ORDER, 'general'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/40 backdrop-blur-sm">
      <div 
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-beige">
          <h2 className="font-serif text-xl font-bold text-charcoal">
            {initialExpense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-charcoal-400 hover:text-charcoal-700 bg-ivory-100 hover:bg-beige-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div>
            <label htmlFor="expense-title" className="block text-sm font-semibold text-charcoal mb-1.5">
              Nama Pengeluaran <span className="text-burgundy">*</span>
            </label>
            <input
              id="expense-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: DP Catering 50%"
              className="w-full px-4 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy-200 focus:border-burgundy-400 transition-shadow"
              required
            />
          </div>

          <div>
            <label htmlFor="expense-amount" className="block text-sm font-semibold text-charcoal mb-1.5">
              Nominal <span className="text-burgundy">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400 font-medium">Rp</span>
              <input
                id="expense-amount"
                type="number"
                min="0"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000000"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy-200 focus:border-burgundy-400 transition-shadow"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="expense-category" className="block text-sm font-semibold text-charcoal mb-1.5">
                Kategori <span className="text-burgundy">*</span>
              </label>
              <select
                id="expense-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as BudgetCategory)}
                className="w-full px-4 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy-200 focus:border-burgundy-400 transition-shadow appearance-none"
                required
              >
                <option value="" disabled>Pilih Kategori...</option>
                {orderedCategories.map((key) => (
                  <option key={key} value={key}>
                    {key === 'general' ? 'Lainnya' : CATEGORY_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="expense-date" className="block text-sm font-semibold text-charcoal mb-1.5">
                Tanggal <span className="text-burgundy">*</span>
              </label>
              <input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy-200 focus:border-burgundy-400 transition-shadow"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="expense-note" className="block text-sm font-semibold text-charcoal mb-1.5">
              Catatan <span className="text-charcoal-400 font-normal">(Opsional)</span>
            </label>
            <textarea
              id="expense-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tambahkan detail jika perlu..."
              rows={2}
              className="w-full px-4 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy-200 focus:border-burgundy-400 transition-shadow resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-charcoal-600 bg-ivory-100 hover:bg-beige-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!title || !amount || !category || !date}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-burgundy hover:bg-burgundy-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm"
            >
              {initialExpense ? 'Simpan Perubahan' : 'Simpan Pengeluaran'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
