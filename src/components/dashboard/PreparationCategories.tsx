import React from 'react';
import {
  Check,
  ArrowRight,
  Building2,
  Utensils,
  Camera,
  Sparkles,
  Palette,
  Mail,
  Grid,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { CategoryId } from '../../types/onboarding';
import { TaskItem } from '../../types/checklist';
import { getAllModulesProgress, getCompletedModuleCount } from '../../domain/moduleSelectors';

export interface PreparationCategoriesProps {
  tasks: TaskItem[];
  nextBestActionCategory?: CategoryId | null;
  onCategoryClick: (categoryId: CategoryId) => void;
  onViewAllChecklist?: () => void;
}

export const PreparationCategories: React.FC<PreparationCategoriesProps> = ({
  tasks = [],
  nextBestActionCategory = null,
  onCategoryClick,
  onViewAllChecklist,
}) => {
  const modulesProgress = getAllModulesProgress(tasks, nextBestActionCategory);
  const completedCount = getCompletedModuleCount(tasks);

  const getCategoryIcon = (id: CategoryId) => {
    switch (id) {
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
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-7 border border-beige-300 shadow-card flex flex-col justify-between space-y-4">
      
      {/* Header: Seberapa siap aku? */}
      <div className="flex items-center justify-between pb-3.5 border-b border-beige">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="w-8 h-8 rounded-xl bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0">
            <Grid className="w-4 h-4 text-burgundy" />
          </div>
          <div className="min-w-0">
            <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal leading-tight whitespace-nowrap">
              Status Persiapan Modul
            </h2>
            <span className="text-[11px] text-charcoal-400 block mt-0.5">
              {completedCount} dari 6 modul selesai
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewAllChecklist || (() => onCategoryClick('venue'))}
          className="text-xs font-semibold text-burgundy hover:text-burgundy-700 flex items-center gap-1 transition-colors min-h-touch cursor-pointer group shrink-0 whitespace-nowrap"
        >
          <span>Lihat semua</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* 2-Column Grid: 3-Row Internal Structure per Card (Height ~95–110px) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {modulesProgress.map((mod) => {
          const isDone = mod.semanticStatus === 'selesai';
          const isPriority = mod.semanticStatus === 'prioritas';
          const isNeedsAttention = mod.semanticStatus === 'perlu_perhatian';

          return (
            <div
              key={mod.category}
              onClick={() => onCategoryClick(mod.category)}
              className={`p-3.5 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[98px] sm:min-h-[105px] gap-2.5 group ${
                isDone
                  ? 'bg-ivory-50/40 border-beige hover:border-emerald-300 hover:bg-white hover:shadow-2xs'
                  : isPriority
                  ? 'bg-burgundy-50/20 border-burgundy-200 hover:border-burgundy-300 hover:shadow-2xs'
                  : isNeedsAttention
                  ? 'bg-amber-50/20 border-amber-200/90 hover:border-amber-300 hover:shadow-2xs'
                  : 'bg-white border-beige hover:border-beige-300 hover:shadow-2xs'
              }`}
            >
              {/* ROW 1: Icon + Full Module Name (Never truncated) */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                  isPriority 
                    ? 'bg-burgundy/10 border-burgundy/20 text-burgundy'
                    : 'bg-ivory-100 border-beige text-charcoal-700'
                }`}>
                  {getCategoryIcon(mod.category)}
                </div>
                <span className={`text-sm font-semibold tracking-tight whitespace-nowrap ${
                  isDone ? 'text-charcoal-500' : 'text-charcoal'
                }`}>
                  {mod.label}
                </span>
              </div>

              {/* ROW 2: Progress Count (Left) + Status Badge (Right) */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-charcoal-400">
                  {mod.totalTasks > 0 ? `${mod.completedTasks}/${mod.totalTasks} selesai` : '0 tugas'}
                </span>

                {isDone ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 whitespace-nowrap">
                    <span>Selesai</span>
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </span>
                ) : isPriority ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-burgundy px-2 py-0.5 rounded-md border border-burgundy shadow-2xs whitespace-nowrap">
                    <span>Prioritas</span>
                    <AlertCircle className="w-3 h-3 text-white" />
                  </span>
                ) : isNeedsAttention ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 whitespace-nowrap">
                    <span>Perlu perhatian</span>
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-charcoal-500 bg-ivory-100 px-2 py-0.5 rounded-md border border-beige whitespace-nowrap">
                    <span>{mod.semanticStatusLabel}</span>
                    <Clock className="w-3 h-3 text-charcoal-400" />
                  </span>
                )}
              </div>

              {/* ROW 3: Progress Bar */}
              <div className="w-full bg-beige-200/70 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isDone
                      ? 'bg-emerald-600'
                      : isPriority
                      ? 'bg-burgundy'
                      : isNeedsAttention
                      ? 'bg-amber-500'
                      : 'bg-gold-500'
                  }`}
                  style={{ width: isDone ? '100%' : `${Math.max(4, mod.progressPercentage)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
