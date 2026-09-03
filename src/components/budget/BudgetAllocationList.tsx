import React, { useState } from 'react';
import { BudgetCategory } from '../../types/budget';
import { CategoryBudgetSummary } from '../../domain/budgetSelectors';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../../domain/categories';
import { formatRupiahNumber } from '../../domain/workspaceSelectors';
import {
  Edit2,
  Check,
  X,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  PieChart,
  Building2,
  Utensils,
  Camera,
  Palette,
  Mail,
  Tag,
  ChevronRight,
} from 'lucide-react';

export interface BudgetAllocationListProps {
  categorySummaries: Record<BudgetCategory, CategoryBudgetSummary>;
  totalAllocated: number;
  totalBudget: number;
  onUpdateAllocation: (category: BudgetCategory, amount: number) => void;
  onOpenStarterTemplate?: () => void;
  defaultExpanded?: boolean;
}

export const BudgetAllocationList: React.FC<BudgetAllocationListProps> = ({
  categorySummaries,
  totalAllocated,
  totalBudget,
  onUpdateAllocation,
  onOpenStarterTemplate,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
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
  const hasAllocations = totalAllocated > 0;

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

  // Top allocated categories for the collapsed preview chips
  const allocatedCategories = categories
    .filter((c) => categorySummaries[c]?.allocated > 0)
    .sort((a, b) => (categorySummaries[b]?.allocated || 0) - (categorySummaries[a]?.allocated || 0));

  const previewCategories = allocatedCategories.slice(0, 3);
  const remainingCount = allocatedCategories.length > 3 ? allocatedCategories.length - 3 : (categories.length - previewCategories.length);

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-beige-300 shadow-card overflow-hidden transition-all duration-200">
      
      {/* Collapsible Section Header */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="w-full p-5 sm:p-6 lg:p-7 flex items-center justify-between text-left hover:bg-ivory-50/60 transition-colors cursor-pointer select-none group"
      >
        <div className="flex items-center gap-3.5 min-w-0 pr-2">
          <div className="w-10 h-10 rounded-xl bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0">
            <PieChart className="w-5 h-5 text-burgundy" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal group-hover:text-burgundy transition-colors">
                Alokasi Budget
              </h3>
              {totalAllocated > totalBudget && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  <span>Melebihi budget</span>
                </span>
              )}
            </div>
            <p className="text-xs text-charcoal-400 mt-0.5 leading-normal">
              Atur pembagian budget berdasarkan kategori
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-full bg-ivory-100 flex items-center justify-center text-charcoal-400 group-hover:text-charcoal group-hover:bg-ivory-200 transition-colors">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 transition-transform" />
            ) : (
              <ChevronDown className="w-4 h-4 transition-transform" />
            )}
          </div>
        </div>
      </button>

      {/* Collapsed Preview Chips (When collapsed and allocations exist) */}
      {!isExpanded && hasAllocations && previewCategories.length > 0 && (
        <div
          onClick={() => setIsExpanded(true)}
          className="px-5 pb-5 sm:px-6 sm:pb-6 lg:px-7 lg:pb-7 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 cursor-pointer"
        >
          {previewCategories.map((cat) => {
            const summary = categorySummaries[cat];
            const pct = totalBudget > 0 ? Math.round((summary.allocated / totalBudget) * 100) : 0;
            return (
              <div
                key={cat}
                className="p-3 rounded-xl bg-ivory-50/80 border border-beige hover:border-beige-300 hover:bg-ivory-100 transition-all flex items-center gap-3 min-w-0"
              >
                <div className="w-8 h-8 rounded-lg bg-white border border-beige flex items-center justify-center shrink-0">
                  {getCategoryIcon(cat)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-charcoal block truncate">
                    {cat === 'general' ? 'Lainnya' : CATEGORY_LABELS[cat] || cat}
                  </span>
                  <span className="text-[11px] text-charcoal-400 truncate block">
                    {pct}% • {formatRupiahNumber(summary.allocated)}
                  </span>
                </div>
              </div>
            );
          })}

          <div className="p-3 rounded-xl bg-ivory-50/80 border border-beige hover:border-beige-300 hover:bg-ivory-100 transition-all flex items-center justify-between text-xs font-semibold text-charcoal-500 hover:text-burgundy">
            <span className="truncate">... {remainingCount} kategori lainnya</span>
            <ChevronRight className="w-4 h-4 text-charcoal-400 shrink-0" />
          </div>
        </div>
      )}

      {/* Expanded Allocation Content */}
      {isExpanded && (
        <div className="px-5 pb-5 sm:px-6 sm:pb-6 lg:px-7 lg:pb-7 pt-2 border-t border-beige space-y-4 animate-fadeIn">
          
          {/* Expanded Toolbar / Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="text-xs text-charcoal-500">
              {hasAllocations ? (
                <span>
                  Total dialokasikan: <strong className="text-charcoal font-semibold">{formatRupiahNumber(totalAllocated)}</strong> dari {formatRupiahNumber(totalBudget)}
                </span>
              ) : (
                <span>Belum ada pembagian budget yang diatur. Kamu bisa mengisi manual atau menggunakan contoh pembagian.</span>
              )}
            </div>

            {onOpenStarterTemplate && (
              <button
                type="button"
                onClick={onOpenStarterTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-burgundy hover:text-burgundy-800 bg-burgundy-50/80 hover:bg-burgundy-100/70 border border-burgundy-200/80 rounded-xl transition-colors cursor-pointer self-start sm:self-auto min-h-touch shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-burgundy" />
                <span>Gunakan Contoh Pembagian</span>
              </button>
            )}
          </div>

          {/* 7 Category Allocation Rows */}
          <div className="space-y-3 pt-1">
            {categories.map((cat) => {
              const summary = categorySummaries[cat];
              const isEditing = editingCategory === cat;

              return (
                <div
                  key={cat}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-beige bg-ivory-50/70 hover:bg-ivory-50 transition-colors gap-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-white border border-beige flex items-center justify-center shrink-0 shadow-2xs">
                      {getCategoryIcon(cat)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm text-charcoal truncate">
                          {cat === 'general' ? 'Lainnya' : CATEGORY_LABELS[cat] || cat}
                        </span>
                        {summary.status === 'melebihi_budget' && (
                          <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-200 font-medium whitespace-nowrap">
                            Melebihi Alokasi
                          </span>
                        )}
                        {summary.status === 'mendekati_batas' && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 font-medium whitespace-nowrap">
                            Mendekati Batas
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-charcoal-400">
                        <span className="truncate">Terpakai: {formatRupiahNumber(summary.spent)}</span>
                        <span className="truncate">Sisa: {formatRupiahNumber(summary.remaining)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 min-w-[200px]">
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-36">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400 text-xs font-semibold">Rp</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-burgundy-300 rounded-lg text-xs font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy-200"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSave(cat);
                              if (e.key === 'Escape') handleCancel();
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSave(cat)}
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          aria-label="Simpan"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="p-1.5 text-charcoal-400 hover:bg-beige rounded-lg transition-colors cursor-pointer"
                          aria-label="Batal"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <span className={`text-sm font-semibold ${summary.allocated > 0 ? 'text-charcoal' : 'text-charcoal-300 font-normal italic'}`}>
                          {summary.allocated > 0 ? formatRupiahNumber(summary.allocated) : 'Belum diatur'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEditClick(cat, summary.allocated)}
                          className="p-1.5 text-charcoal-400 hover:text-burgundy hover:bg-burgundy-50 rounded-lg transition-colors min-h-touch cursor-pointer"
                          aria-label={`Edit alokasi ${cat === 'general' ? 'Lainnya' : CATEGORY_LABELS[cat] || cat}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
};
