import React from 'react';
import { Check, ArrowRight, Building2, Utensils, Camera, Sparkles, Palette, Mail } from 'lucide-react';
import { CategoryId } from '../../types/onboarding';
import { CATEGORY_ORDER, CATEGORY_TAXONOMY } from '../../domain/categories';

export interface PreparationCategoriesProps {
  completedCategories: CategoryId[];
  onCategoryClick: (categoryId: CategoryId) => void;
}

export const PreparationCategories: React.FC<PreparationCategoriesProps> = ({
  completedCategories = [],
  onCategoryClick,
}) => {
  const completedSet = new Set(completedCategories);

  const getCategoryIcon = (id: CategoryId) => {
    switch (id) {
      case 'venue': return <Building2 className="w-4 h-4 text-burgundy" />;
      case 'catering': return <Utensils className="w-4 h-4 text-burgundy" />;
      case 'photography': return <Camera className="w-4 h-4 text-burgundy" />;
      case 'decoration': return <Sparkles className="w-4 h-4 text-burgundy" />;
      case 'makeup_attire': return <Palette className="w-4 h-4 text-burgundy" />;
      case 'invitation': return <Mail className="w-4 h-4 text-burgundy" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-beige-300 shadow-card space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-beige">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-gold-600 block">
            Kategori Modul
          </span>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
            Status Persiapan Modul
          </h3>
        </div>

        <span className="text-xs font-semibold text-burgundy bg-burgundy-50 px-3 py-1 rounded-full border border-burgundy-100">
          {completedSet.size}/6 Selesai
        </span>
      </div>

      {/* 6 Category Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {CATEGORY_ORDER.map((catId) => {
          const isDone = completedSet.has(catId);
          const label = CATEGORY_TAXONOMY[catId]?.label || catId;

          return (
            <div
              key={catId}
              onClick={() => onCategoryClick(catId)}
              className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between min-h-touch ${
                isDone
                  ? 'bg-emerald-50/60 border-emerald-200/90 hover:bg-emerald-50'
                  : 'bg-ivory-50/70 border-beige hover:border-beige-300 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                  isDone ? 'bg-white border-emerald-200 shadow-2xs' : 'bg-white border-beige'
                }`}>
                  {getCategoryIcon(catId)}
                </div>
                <span className={`text-xs sm:text-sm font-semibold truncate ${
                  isDone ? 'line-through text-charcoal-400' : 'text-charcoal'
                }`}>
                  {label}
                </span>
              </div>

              <div className="shrink-0">
                {isDone ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200">
                    <span>Selesai</span>
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-charcoal-400 bg-white px-2 py-0.5 rounded-md border border-beige hover:text-burgundy">
                    <span>Belum mulai</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
