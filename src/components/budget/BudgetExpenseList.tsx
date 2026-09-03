import React from 'react';
import { BudgetExpense, BudgetCategory } from '../../types/budget';
import { CATEGORY_LABELS } from '../../domain/categories';
import { formatRupiahNumber, formatIndonesianDate } from '../../domain/workspaceSelectors';
import {
  Plus,
  Trash2,
  Calendar,
  Receipt,
  Edit2,
  Building2,
  Utensils,
  Camera,
  Palette,
  Sparkles,
  Mail,
  Tag,
} from 'lucide-react';

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
  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getCategoryIcon = (cat: BudgetCategory) => {
    switch (cat) {
      case 'venue':
        return <Building2 className="w-4 h-4 text-burgundy" />;
      case 'catering':
        return <Utensils className="w-4 h-4 text-burgundy" />;
      case 'photography':
        return <Camera className="w-4 h-4 text-burgundy" />;
      case 'decoration':
        return <Sparkles className="w-4 h-4 text-burgundy" />;
      case 'makeup_attire':
        return <Palette className="w-4 h-4 text-burgundy" />;
      case 'invitation':
        return <Mail className="w-4 h-4 text-burgundy" />;
      default:
        return <Tag className="w-4 h-4 text-burgundy" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 border border-beige-300 shadow-card space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-beige">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0">
            <Receipt className="w-5 h-5 text-burgundy" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-gold-600 block">
              Catatan Transaksi
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal">
              Pengeluaran
            </h2>
            <p className="text-xs text-charcoal-400 mt-0.5">
              Catat dan pantau semua pengeluaran pernikahanmu.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onAddExpense}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-burgundy hover:bg-burgundy-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors shadow-xs cursor-pointer self-start sm:self-auto min-h-touch"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengeluaran</span>
        </button>
      </div>

      {/* Empty State */}
      {sortedExpenses.length === 0 ? (
        <div className="py-12 px-4 text-center border border-dashed border-beige rounded-2xl bg-ivory-50/60 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-beige flex items-center justify-center text-burgundy mx-auto shadow-2xs">
            <Receipt className="w-6 h-6 text-burgundy" />
          </div>
          <h3 className="font-serif text-base sm:text-lg font-bold text-charcoal">
            Belum ada pengeluaran yang dicatat.
          </h3>
          <p className="text-xs sm:text-sm text-charcoal-400 max-w-md mx-auto leading-relaxed">
            Catat setiap pembayaran uang muka (DP), cicilan, atau pelunasan vendor di sini agar sisa budget terpantau akurat.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onAddExpense}
              className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy hover:bg-burgundy-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs cursor-pointer min-h-touch"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Pengeluaran Pertama</span>
            </button>
          </div>
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
              className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-beige hover:border-beige-300 bg-ivory-50/40 hover:bg-ivory-50/80 transition-all gap-3.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-burgundy-200"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-white border border-beige flex items-center justify-center shrink-0 shadow-2xs">
                  {getCategoryIcon(expense.category)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm text-charcoal truncate group-hover:text-burgundy transition-colors">
                      {expense.title}
                    </span>
                    <span className="text-[10px] bg-white text-charcoal-500 px-2 py-0.5 rounded-md border border-beige font-medium whitespace-nowrap">
                      {CATEGORY_LABELS[expense.category] || expense.category}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-charcoal-400 flex-wrap">
                    <span className="flex items-center gap-1 truncate">
                      <Calendar className="w-3 h-3 text-charcoal-400" />
                      {formatIndonesianDate(expense.date)}
                    </span>
                    {expense.note && (
                      <span className="truncate italic text-charcoal-400 max-w-xs">
                        "{expense.note}"
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 min-w-[180px]">
                <span className="font-serif text-base sm:text-lg font-bold text-charcoal">
                  {formatRupiahNumber(expense.amount)}
                </span>
                
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditExpense(expense);
                    }}
                    className="p-1.5 text-charcoal-400 hover:text-burgundy hover:bg-burgundy-50 rounded-lg transition-colors min-h-touch cursor-pointer"
                    aria-label={`Edit ${expense.title}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteExpense(expense.id);
                    }}
                    className="p-1.5 text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors min-h-touch cursor-pointer"
                    aria-label={`Hapus ${expense.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
