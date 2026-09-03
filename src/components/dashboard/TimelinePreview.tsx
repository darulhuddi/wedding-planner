import React from 'react';
import {
  CalendarRange,
  ArrowRight,
  Clock,
  Sparkles,
  Settings,
  Heart,
} from 'lucide-react';
import { WorkspaceViewModel } from '../../types/workspace';
import { TaskItem } from '../../types/checklist';
import { derivePreparationJourney } from '../../domain/journeySelectors';

export interface TimelinePreviewProps {
  workspace: WorkspaceViewModel;
  tasks: TaskItem[];
  onViewTimeline: () => void;
  onNavigateSettings?: () => void;
  onNavigateChecklist?: () => void;
}

export const TimelinePreview: React.FC<TimelinePreviewProps> = ({
  workspace,
  tasks,
  onViewTimeline,
  onNavigateSettings,
  onNavigateChecklist,
}) => {
  const journey = derivePreparationJourney(workspace.weddingDate, tasks);

  // Find current phase and future milestone phases
  const currentPhaseIndex = journey.phases.findIndex((p) => p.isCurrent);
  const activeIndex = currentPhaseIndex >= 0 ? currentPhaseIndex : 0;
  const currentPhase = journey.phases[activeIndex];
  const futurePhases = journey.phases.filter((_, idx) => idx !== activeIndex);

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-7 border border-beige-300 shadow-card flex flex-col justify-between space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-beige">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="w-8 h-8 rounded-xl bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0">
            <CalendarRange className="w-4 h-4 text-burgundy" />
          </div>
          <div className="min-w-0">
            <h2 className="font-serif text-lg sm:text-xl font-bold text-charcoal leading-tight whitespace-nowrap">
              Perjalanan Menuju Hari-H
            </h2>
            <span className="text-[11px] text-charcoal-400 block mt-0.5">
              Alur persiapan bertahap menuju pernikahan
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewTimeline}
          className="text-xs font-semibold text-burgundy hover:text-burgundy-700 flex items-center gap-1 transition-colors min-h-touch cursor-pointer group shrink-0 whitespace-nowrap"
        >
          <span>Lihat Timeline</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* STATE 1: Empty / Low-Data Workspace */}
      {journey.status === 'empty' && (
        <div className="p-4 rounded-xl bg-ivory-50 border border-beige flex items-center justify-between gap-3 min-h-[160px]">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-gold-600 shrink-0" />
            <div>
              <h3 className="font-serif text-sm font-bold text-charcoal">
                Mulai Alur Persiapan
              </h3>
              <p className="text-xs text-charcoal-400 mt-0.5">
                Jadwalkan tugas awal untuk melihat alur fase persiapan pernikahanmu.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateChecklist || onViewTimeline}
            className="text-xs font-semibold text-burgundy hover:underline shrink-0"
          >
            Buka Checklist →
          </button>
        </div>
      )}

      {/* STATE 2: Passed Date */}
      {journey.status === 'passed' && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 min-h-[160px]">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <h3 className="font-serif text-sm font-bold text-charcoal">
                Tanggal Pernikahan Telah Terlewati
              </h3>
              <p className="text-xs text-charcoal-400 mt-0.5">
                Perbarui tanggal pernikahan di menu Pengaturan.
              </p>
            </div>
          </div>
          {onNavigateSettings && (
            <button
              type="button"
              onClick={onNavigateSettings}
              className="text-xs font-semibold text-burgundy hover:underline shrink-0 flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              <span>Pengaturan</span>
            </button>
          )}
        </div>
      )}

      {/* STATE 3: Wedding is Today */}
      {journey.status === 'today' && (
        <div className="p-4 rounded-xl bg-burgundy-50 border border-burgundy-200 flex items-center justify-between gap-3 min-h-[160px]">
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-burgundy fill-burgundy shrink-0" />
            <div>
              <h3 className="font-serif text-sm font-bold text-burgundy">
                Hari-H Pernikahan Hari Ini!
              </h3>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Selamat berbahagia dan nikmati hari bahagiamu.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onViewTimeline}
            className="text-xs font-semibold text-burgundy hover:underline shrink-0"
          >
            Buka Rundown →
          </button>
        </div>
      )}

      {/* STATE 4: Current Phase (Primary Feature) + Future Milestones (Secondary Strip) */}
      {journey.status === 'active' && currentPhase && (
        <div className="space-y-3">
          
          {/* 1. CURRENT PHASE: Primary Featured Card */}
          <div
            onClick={onViewTimeline}
            className="p-4 sm:p-4.5 rounded-2xl bg-burgundy-50/40 border border-burgundy-200/90 hover:border-burgundy-300 transition-all cursor-pointer shadow-2xs space-y-2 group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-burgundy block">
                {currentPhase.period}
              </span>
              <span className="text-[10px] font-bold bg-burgundy text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                Saat Ini
              </span>
            </div>

            <h3 className="font-serif text-base sm:text-lg font-bold text-charcoal group-hover:text-burgundy transition-colors leading-snug">
              {currentPhase.title}
            </h3>

            <div className="text-xs text-charcoal-600 flex items-center gap-1.5 flex-wrap pt-0.5">
              {currentPhase.activeTasks > 0 ? (
                <>
                  <span className="font-semibold text-burgundy">
                    {currentPhase.activeTasks} tugas aktif
                  </span>
                  <span className="text-charcoal-300">•</span>
                  <span className="text-charcoal-500 line-clamp-1">
                    {currentPhase.description.replace(/^\d+ tugas aktif:?\s*/i, '')}
                  </span>
                </>
              ) : (
                <span className="text-emerald-700 font-medium">
                  Seluruh tugas pada fase ini telah selesai ✓
                </span>
              )}
            </div>
          </div>

          {/* 2. FUTURE PHASES: Secondary Compact Milestones Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {futurePhases.map((phase) => (
              <div
                key={phase.id}
                onClick={onViewTimeline}
                className="p-2.5 sm:p-3 rounded-xl bg-ivory-50/60 border border-beige hover:border-beige-300 hover:bg-ivory-100/70 transition-all cursor-pointer flex flex-col justify-between min-h-[72px] sm:min-h-[80px] gap-1 group"
              >
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-charcoal-400 block">
                    {phase.period}
                  </span>
                  <h4 className="font-serif text-xs font-bold text-charcoal-700 group-hover:text-charcoal transition-colors leading-snug line-clamp-2 mt-0.5">
                    {phase.title}
                  </h4>
                </div>

                <div className="text-[10px] text-charcoal-400 mt-1">
                  {phase.isCompleted ? (
                    <span className="text-emerald-700 font-medium">Selesai ✓</span>
                  ) : phase.activeTasks > 0 ? (
                    <span>{phase.activeTasks} tugas aktif</span>
                  ) : (
                    <span>Mendatang</span>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};
