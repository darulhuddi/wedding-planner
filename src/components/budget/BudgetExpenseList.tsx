import React from 'react';
import { BudgetExpense } from '../../types/budget';
import { CATEGORY_LABELS } from '../../domain/categories';
import { formatRupiahNumber, formatIndonesianDate } from '../../domain/workspaceSelectors';
import { Plus, Trash2, Calendar } from 'lucide-react';

interface BudgetExpenseListProps {
  expenses: BudgetExpense[];
  onAddExpense: () => void;
  onEditExpense: (expense: BudgetExpense) => void;
  onDeleteExpense: (expenseId: string) => void;
}

export const BudgetExpenseList: React.FC<BudgetExpenseListProps> = ({
  expenses,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}) => {
  // Sort expenses newest first
  const sortedExpenses = [...expenses].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 border border-beige-300 shadow-card">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-serif text-xl font-bold text-charcoal">Pengeluaran</h3>
        <button
          onClick={onAddExpense}
          className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-burgundy hover:bg-burgundy-700 text-white text-sm font-medium rounded-lg transition-colors min-h-touch"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tambah Pengeluaran</span>
          <span className="sm:hidden">Tambah</span>
        </button>
      </div>

      {sortedExpenses.length === 0 ? (
        <div className="py-10 text-center border-2 border-dashed border-beige rounded-xl bg-ivory-50">
          <p className="text-charcoal-400 font-medium mb-1">Belum ada pengeluaran.</p>
          <p className="text-xs text-charcoal-300">
            Catat setiap pembayaran atau DP ke vendor di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedExpenses.map((expense) => (
            <div
              key={expense.id}
              role="button"
              tabIndex={0}
              onClick={() => onEditExpense(expense)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onEditExpense(expense);
                }
              }}
              className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-beige hover:border-beige-300 bg-white transition-colors gap-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-burgundy-200"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-charcoal truncate">
                    {expense.title}
                  </span>
                  <span className="text-[10px] bg-ivory-100 text-charcoal-400 px-1.5 py-0.5 rounded border border-beige font-medium">
                    {CATEGORY_LABELS[expense.category] || expense.category}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-xs text-charcoal-400">
                  <span className="flex items-center gap-1 truncate">
                    <Calendar className="w-3 h-3" />
                    {formatIndonesianDate(expense.date)}
                  </span>
                  {expense.note && (
                    <span className="truncate italic">"{expense.note}"</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 min-w-[150px]">
                <span className="font-semibold text-charcoal">
                  {formatRupiahNumber(expense.amount)}
                </span>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteExpense(expense.id);
                  }}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 min-h-touch focus:opacity-100"
                  aria-label="Hapus pengeluaran"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
