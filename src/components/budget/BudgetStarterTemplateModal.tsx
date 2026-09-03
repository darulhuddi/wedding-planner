import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BudgetCategory, BudgetAllocation } from '../../types/budget';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../../domain/categories';
import { formatRupiahNumber } from '../../domain/workspaceSelectors';

export interface BudgetTemplateItem {
  category: BudgetCategory;
  name: string;
  percentage: number;
  amount: number;
}

export const DEFAULT_TEMPLATE_PERCENTAGES: Record<BudgetCategory, number> = {
  venue: 40,
  catering: 25,
  photography: 10,
  decoration: 10,
  makeup_attire: 10,
  invitation: 3,
  general: 2,
};

export const BUDGET_TEMPLATE_DISTRIBUTION: { category: BudgetCategory; percentage: number }[] = [
  { category: 'venue', percentage: 40 },
  { category: 'catering', percentage: 25 },
  { category: 'photography', percentage: 10 },
  { category: 'decoration', percentage: 10 },
  { category: 'makeup_attire', percentage: 10 },
  { category: 'invitation', percentage: 3 },
  { category: 'general', percentage: 2 },
];

export const TEMPLATE_CATEGORIES: BudgetCategory[] = [...CATEGORY_ORDER, 'general'];

/**
 * Calculates exact Rupiah amounts for each category from estimatedBudget and percentages,
 * guaranteeing the sum of all allocations equals exactly the estimated budget when total === 100%.
 */
export function calculateBudgetTemplateAllocations(
  estimatedBudget: number,
  customPercentages?: Record<BudgetCategory, number>
): BudgetTemplateItem[] {
  const percentages = customPercentages || DEFAULT_TEMPLATE_PERCENTAGES;

  if (estimatedBudget <= 0) {
    return TEMPLATE_CATEGORIES.map((category) => ({
      category,
      name: category === 'general' ? 'Lainnya' : CATEGORY_LABELS[category] || category,
      percentage: percentages[category] ?? 0,
      amount: 0,
    }));
  }

  const items: BudgetTemplateItem[] = TEMPLATE_CATEGORIES.map((category) => {
    const pct = percentages[category] ?? 0;
    const calculatedAmount = Math.round((estimatedBudget * pct) / 100);
    return {
      category,
      name: category === 'general' ? 'Lainnya' : CATEGORY_LABELS[category] || category,
      percentage: pct,
      amount: calculatedAmount,
    };
  });

  const totalPercentage = items.reduce((acc, curr) => acc + curr.percentage, 0);

  // If total percentage is exactly 100%, reconcile any integer rounding difference
  if (totalPercentage === 100) {
    const sum = items.reduce((acc, curr) => acc + curr.amount, 0);
    const diff = estimatedBudget - sum;
    if (diff !== 0 && items.length > 0) {
      // Find the first category with positive percentage (or largest allocation) to absorb rounding delta
      const targetItem = items.find((i) => i.percentage > 0) || items[0];
      targetItem.amount += diff;
    }
  }

  return items;
}

/**
 * Generates 7 real canonical BudgetAllocation domain objects from estimatedBudget and percentages.
 */
export function generateStarterBudgetAllocations(
  estimatedBudget: number,
  customPercentages?: Record<BudgetCategory, number>
): BudgetAllocation[] {
  const items = calculateBudgetTemplateAllocations(estimatedBudget, customPercentages);
  const now = new Date().toISOString();

  return items.map((item) => ({
    id: crypto.randomUUID(),
    category: item.category,
    amount: item.amount,
    createdAt: now,
    updatedAt: now,
  }));
}

interface BudgetStarterTemplateModalProps {
  isOpen: boolean;
  estimatedBudget: number;
  onClose: () => void;
  onApplyTemplate: (allocations: BudgetAllocation[]) => void;
  onOpenEditBudget: () => void;
}

export const BudgetStarterTemplateModal: React.FC<BudgetStarterTemplateModalProps> = ({
  isOpen,
  estimatedBudget,
  onClose,
  onApplyTemplate,
  onOpenEditBudget,
}) => {
  const [percentages, setPercentages] = useState<Record<BudgetCategory, number>>(
    DEFAULT_TEMPLATE_PERCENTAGES
  );
  const [rawInputs, setRawInputs] = useState<Record<BudgetCategory, string>>({
    venue: '40',
    catering: '25',
    photography: '10',
    decoration: '10',
    makeup_attire: '10',
    invitation: '3',
    general: '2',
  });

  // Reset to default starting template every time modal is opened
  useEffect(() => {
    if (isOpen) {
      setPercentages(DEFAULT_TEMPLATE_PERCENTAGES);
      setRawInputs({
        venue: String(DEFAULT_TEMPLATE_PERCENTAGES.venue),
        catering: String(DEFAULT_TEMPLATE_PERCENTAGES.catering),
        photography: String(DEFAULT_TEMPLATE_PERCENTAGES.photography),
        decoration: String(DEFAULT_TEMPLATE_PERCENTAGES.decoration),
        makeup_attire: String(DEFAULT_TEMPLATE_PERCENTAGES.makeup_attire),
        invitation: String(DEFAULT_TEMPLATE_PERCENTAGES.invitation),
        general: String(DEFAULT_TEMPLATE_PERCENTAGES.general),
      });
    }
  }, [isOpen]);

  const hasValidBudget = estimatedBudget > 0;

  const totalPercentage = useMemo(() => {
    return Object.values(percentages).reduce((acc, curr) => acc + (isNaN(curr) ? 0 : curr), 0);
  }, [percentages]);

  const isExact100 = totalPercentage === 100;
  const isUnder100 = totalPercentage < 100;
  const isOver100 = totalPercentage > 100;

  const templateItems = useMemo(() => {
    return calculateBudgetTemplateAllocations(estimatedBudget, percentages);
  }, [estimatedBudget, percentages]);

  const totalCalculatedAmount = useMemo(() => {
    return templateItems.reduce((acc, i) => acc + i.amount, 0);
  }, [templateItems]);

  const handlePercentageInputChange = (category: BudgetCategory, valueStr: string) => {
    setRawInputs((prev) => ({
      ...prev,
      [category]: valueStr,
    }));

    if (valueStr.trim() === '') {
      setPercentages((prev) => ({
        ...prev,
        [category]: 0,
      }));
      return;
    }

    const parsed = parseInt(valueStr, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(0, Math.min(100, parsed));
      setPercentages((prev) => ({
        ...prev,
        [category]: clamped,
      }));
    }
  };

  const handleConfirm = () => {
    if (!hasValidBudget || !isExact100) return;
    const allocations = generateStarterBudgetAllocations(estimatedBudget, percentages);
    onApplyTemplate(allocations);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-900/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-modal-title"
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-beige-300 shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-beige flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 id="template-modal-title" className="font-serif text-lg sm:text-xl font-bold text-charcoal">
                Atur Pembagian Budget
              </h3>
              <p className="text-xs text-charcoal-400 mt-0.5">
                Sesuaikan pembagian sesuai kebutuhan dan prioritas pernikahanmu.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-charcoal-400 hover:text-charcoal rounded-lg hover:bg-ivory-100 transition-colors cursor-pointer shrink-0 min-h-touch min-w-[36px] flex items-center justify-center"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div className="bg-ivory-50 rounded-xl p-3 border border-beige/70 text-xs text-charcoal-500">
            <span className="font-medium text-charcoal">Catatan:</span> Angka berikut hanya contoh pembagian budget. Kamu bebas mengubah persentase di bawah sesuai rencanamu.
          </div>

          {!hasValidBudget ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Total Budget Belum Diatur</span>
              </div>
              <p>
                Tentukan perkiraan total budget pernikahanmu terlebih dahulu agar pembagian dapat dihitung secara otomatis.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditBudget();
                }}
                className="mt-1 px-3.5 py-2 bg-amber-700 text-white rounded-lg text-xs font-semibold hover:bg-amber-800 transition-colors cursor-pointer"
              >
                Atur Total Budget
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-beige-300 p-3.5 sm:p-4 space-y-3">
              {/* Category List */}
              <div className="space-y-2.5">
                {TEMPLATE_CATEGORIES.map((cat) => {
                  const label = cat === 'general' ? 'Lainnya' : CATEGORY_LABELS[cat] || cat;
                  const item = templateItems.find((i) => i.category === cat);
                  const currentAmount = item?.amount ?? 0;
                  const rawVal = rawInputs[cat] ?? '';

                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between gap-2 sm:gap-4 p-2 sm:p-2.5 rounded-xl bg-ivory-50/70 border border-beige-200/80 hover:bg-ivory-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0 pr-1">
                        <label htmlFor={`percentage-input-${cat}`} className="block text-xs font-semibold text-charcoal truncate cursor-pointer">
                          {label}
                        </label>
                        <span className="text-[11px] font-mono text-charcoal-400 block mt-0.5">
                          {formatRupiahNumber(currentAmount)}
                        </span>
                      </div>

                      {/* Percentage Input */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="relative flex items-center">
                          <input
                            id={`percentage-input-${cat}`}
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={rawVal}
                            onChange={(e) => handlePercentageInputChange(cat, e.target.value)}
                            className="w-14 sm:w-16 px-2 py-1.5 bg-white border border-beige-300 rounded-xl text-xs font-bold text-charcoal text-right focus:outline-none focus:ring-1 focus:ring-burgundy focus:border-burgundy [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-mono"
                          />
                        </div>
                        <span className="text-xs font-semibold text-charcoal-400 select-none">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Realtime Summary & Validation Feedback */}
              <div className="pt-3 border-t border-beige space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-charcoal">Total Pembagian</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span
                      className={`text-sm ${
                        isExact100
                          ? 'text-emerald-700'
                          : isOver100
                          ? 'text-rose-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {totalPercentage}%
                    </span>
                    {isExact100 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500 inline" />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-charcoal-400 font-mono">
                  <span>Total Alokasi Nominal</span>
                  <span className="font-semibold text-charcoal">
                    {formatRupiahNumber(totalCalculatedAmount)} / {formatRupiahNumber(estimatedBudget)}
                  </span>
                </div>

                {/* Validation helper text */}
                <div className="pt-1">
                  {isExact100 && (
                    <p className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                      Total pembagian sudah pas 100%. Siap diterapkan.
                    </p>
                  )}
                  {isUnder100 && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                      Masih ada {100 - totalPercentage}% yang perlu dialokasikan agar mencapai 100%.
                    </p>
                  )}
                  {isOver100 && (
                    <p className="text-[11px] text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200">
                      Kurangi {totalPercentage - 100}% agar total pembagian menjadi 100%.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-beige bg-ivory-50/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-charcoal-500 hover:text-charcoal hover:bg-ivory-100 transition-colors cursor-pointer min-h-touch"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!hasValidBudget || !isExact100}
            onClick={handleConfirm}
            className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-burgundy text-white hover:bg-burgundy-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-xs cursor-pointer min-h-touch"
          >
            Terapkan Pembagian
          </button>
        </div>
      </div>
    </div>
  );
};
