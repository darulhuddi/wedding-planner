import React, { useState } from 'react';
import { BudgetCategory, StoredBudget } from '../../types/budget';
import { CategoryBudgetSummary } from '../../domain/budgetSelectors';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../../domain/categories';
import { formatRupiahNumber } from '../../domain/workspaceSelectors';
import { Edit2, Check, X, AlertCircle, Sparkles } from 'lucide-react';

interface BudgetAllocationListProps {
  categorySummaries: Record<BudgetCategory, CategoryBudgetSummary>;
  totalAllocated: number;
  totalBudget: number;
  onUpdateAllocation: (category: BudgetCategory, amount: number) => void;
  onOpenStarterTemplate?: () => void;
}

export const BudgetAllocationList: React.FC<BudgetAllocationListProps> = ({
  categorySummaries,
  totalAllocated,
  totalBudget,
  onUpdateAllocation,
  onOpenStarterTemplate,
}) => {
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleEditClick = (category: BudgetCategory, currentAmount: number) => {
    setEditingCategory(category);
    setEditValue(currentAmount.toString());
  };

  const handleSave = (category: BudgetCategory) => {
    const amount = parseInt(editValue, 10);
    if (!isNaN(amount) && amount >= 0) {
      onUpdateAllocation(category, amount);
    }
    setEditingCategory(null);
  };

  const handleCancel = () => {
    setEditingCategory(null);
  };

  const categories: BudgetCategory[] = [...CATEGORY_ORDER, 'general'];

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-8 border border-beige-300 shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h3 className="font-serif text-xl font-bold text-charcoal">Alokasi Budget</h3>
          {totalAllocated > totalBudget && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Melebihi budget</span>
            </div>
          )}
        </div>

        {onOpenStarterTemplate && (
          <button
            type="button"
            onClick={onOpenStarterTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-burgundy hover:text-burgundy-800 bg-burgundy-50/70 hover:bg-burgundy-100/60 border border-burgundy-200/80 rounded-xl transition-colors cursor-pointer self-start sm:self-auto min-h-touch"
          >
            <Sparkles className="w-3.5 h-3.5 text-burgundy" />
            <span>Gunakan Contoh Pembagian</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const summary = categorySummaries[cat];
          const isEditing = editingCategory === cat;

          return (
            <div
              key={cat}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-beige bg-ivory-50 gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-charcoal truncate">
                    {cat === 'general' ? 'Lainnya' : CATEGORY_LABELS[cat] || cat}
                  </span>
                  {summary.status === 'melebihi_budget' && (
                    <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 font-medium whitespace-nowrap">
                      Melebihi Alokasi
                    </span>
                  )}
                  {summary.status === 'mendekati_batas' && (
                    <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100 font-medium whitespace-nowrap">
                      Mendekati Batas
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-xs text-charcoal-400">
                  <span className="truncate">Terpakai: {formatRupiahNumber(summary.spent)}</span>
                  <span className="truncate">Sisa: {formatRupiahNumber(summary.remaining)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 min-w-[200px]">
                {isEditing ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400 text-sm font-medium">Rp</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-burgundy-300 rounded text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy-200"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave(cat);
                          if (e.key === 'Escape') handleCancel();
                        }}
                      />
                    </div>
                    <button
                      onClick={() => handleSave(cat)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                      aria-label="Simpan"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="p-1.5 text-charcoal-400 hover:bg-beige-200 rounded-md transition-colors"
                      aria-label="Batal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <span className={`font-semibold ${summary.allocated > 0 ? 'text-charcoal' : 'text-charcoal-300'}`}>
                      {summary.allocated > 0 ? formatRupiahNumber(summary.allocated) : 'Belum diatur'}
                    </span>
                    <button
                      onClick={() => handleEditClick(cat, summary.allocated)}
                      className="p-1.5 text-charcoal-400 hover:text-burgundy hover:bg-burgundy-50 rounded-md transition-colors min-h-touch"
                      aria-label="Edit alokasi"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
