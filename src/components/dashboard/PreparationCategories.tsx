import React from 'react';
import { Check, ArrowRight, Building2, Utensils, Camera, Sparkles, Palette, Mail } from 'lucide-react';
import { CategoryId } from '../../types/onboarding';
import { TaskItem } from '../../types/checklist';
import { getAllModulesProgress, getCompletedModuleCount } from '../../domain/moduleSelectors';

export interface PreparationCategoriesProps {
  tasks: TaskItem[];
  onCategoryClick: (categoryId: CategoryId) => void;
}

export const PreparationCategories: React.FC<PreparationCategoriesProps> = ({
  tasks = [],
  onCategoryClick,
}) => {
  const modulesProgress = getAllModulesProgress(tasks);
  const completedCount = getCompletedModuleCount(tasks);

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
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-beige-300 shadow-card space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-beige">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-gold-600 block">
            Kategori Modul
          </span>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal">
            Status Persiapan Modul
          </h2>
        </div>

        <span className="text-xs font-semibold text-burgundy bg-burgundy-50 px-3.5 py-1.5 rounded-full border border-burgundy-200 shadow-2xs">
          {completedCount}/6 Selesai
        </span>
      </div>

      {/* 6 Category Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {modulesProgress.map((mod) => {
          const isDone = mod.status === 'completed';
          const isInProgress = mod.status === 'in_progress';

          return (
            <div
              key={mod.category}
              onClick={() => onCategoryClick(mod.category)}
              className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-touch gap-3 group ${
                isDone
                  ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300 hover:shadow-2xs'
                  : isInProgress
                  ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300 hover:shadow-2xs'
                  : 'bg-ivory-50/70 border-beige hover:border-beige-300 hover:bg-white hover:shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 pr-1">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                    isDone
                      ? 'bg-white border-emerald-200 shadow-2xs text-emerald-700'
                      : isInProgress
                      ? 'bg-white border-amber-200 shadow-2xs text-amber-700'
                      : 'bg-white border-beige text-burgundy'
                  }`}>
                    {getCategoryIcon(mod.category)}
                  </div>
                  <span className={`text-sm font-semibold truncate ${
                    isDone ? 'line-through text-charcoal-400' : 'text-charcoal'
                  }`}>
                    {mod.label}
                  </span>
                </div>

                <div className="shrink-0">
                  {isDone ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-md border border-emerald-200 whitespace-nowrap">
                      <span>Selesai</span>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </span>
                  ) : isInProgress ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100/90 px-2.5 py-1 rounded-md border border-amber-200 whitespace-nowrap">
                      <span>{mod.completedTasks}/{mod.totalTasks} Selesai</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-charcoal-400 bg-white px-2.5 py-1 rounded-md border border-beige group-hover:text-burgundy group-hover:border-burgundy-200 transition-colors whitespace-nowrap">
                      <span>Belum mulai</span>
                      <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  )}
                </div>
              </div>

              {/* Progress track if in progress */}
              {isInProgress && (
                <div className="w-full bg-amber-200/50 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${mod.progressPercentage}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
