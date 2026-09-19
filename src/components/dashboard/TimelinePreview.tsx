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

  const currentPhaseIndex = journey.currentPhaseIndex ?? journey.phases.findIndex((p) => p.isCurrent);
  const currentPhase = currentPhaseIndex >= 0 ? journey.phases[currentPhaseIndex] : undefined;

  // 5 Canonical Journey Stages
  const stages = [
    { id: 'foundation', label: 'Persiapan Awal' },
    { id: 'vendors', label: 'Pemilihan Vendor' },
    { id: 'details', label: 'Detail Persiapan' },
    { id: 'final', label: 'Finalisasi' },
    { id: 'dday', label: 'Hari-H' },
  ];

  // Map dynamic journey to 5 stages
  let activeStageIndex = 0;
  if (workspace.daysUntilWedding <= 0) {
    activeStageIndex = 4; // Hari-H
  } else if (currentPhaseIndex >= 0) {
    activeStageIndex = Math.min(3, currentPhaseIndex);
  } else if (workspace.daysUntilWedding <= 14) {
    activeStageIndex = 3;
  } else if (workspace.daysUntilWedding <= 60) {
    activeStageIndex = 2;
  } else if (workspace.daysUntilWedding <= 150) {
    activeStageIndex = 1;
  } else {
    activeStageIndex = 0;
  }

  const activeStageName = stages[activeStageIndex]?.label || 'Persiapan Awal';

  // Contextual focus details
  const focusPeriod = currentPhase?.period || (workspace.daysUntilWedding > 0 ? `${workspace.daysUntilWedding} hari lagi` : 'Saat ini');
  const focusTitle = currentPhase?.title || 'Fokus Utama Persiapan';
  const focusDescription = currentPhase?.description
    ? (currentPhase.description.startsWith('Fokus saat ini:')
        ? currentPhase.description
        : `Fokus saat ini: ${currentPhase.description.replace(/^\d+ tugas aktif:?\s*/i, '')}`)
    : 'Fokus saat ini: Cari vendor, bandingkan paket, dan amankan tanggal.';

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
            <span className="text-[11px] text-charcoal-400 block mt-0.5 truncate">
              Kamu berada di fase <strong className="text-charcoal-600 font-semibold">{activeStageName}</strong>
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

      {/* 5-Stage Visual Horizontal Journey Progression */}
      <div className="py-2 px-1">
        <div className="relative flex items-center justify-between">
          {/* Connecting Line Track */}
          <div className="absolute top-2 left-3 right-3 h-0.5 bg-beige-300 -z-0" />

          {/* Active Fill Track */}
          <div
            className="absolute top-2 left-3 h-0.5 bg-burgundy transition-all duration-500 -z-0"
            style={{ width: `${(activeStageIndex / (stages.length - 1)) * 94}%` }}
          />

          {/* Steps */}
          {stages.map((stage, idx) => {
            const isCompleted = idx < activeStageIndex;
            const isCurrent = idx === activeStageIndex;

            return (
              <div
                key={stage.id}
                onClick={onViewTimeline}
                className="relative z-10 flex flex-col items-center cursor-pointer group"
              >
                {/* Node Dot / Circle */}
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'border-3 border-burgundy bg-white scale-110 shadow-xs ring-4 ring-burgundy/10'
                      : isCompleted
                      ? 'bg-burgundy text-white'
                      : 'border-2 border-beige-300 bg-white group-hover:border-charcoal-400'
                  }`}
                >
                  {isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-burgundy block" />}
                </div>

                {/* Stage Label */}
                <span
                  className={`text-[10px] sm:text-[11px] mt-1.5 text-center transition-colors max-w-[58px] sm:max-w-[76px] leading-tight ${
                    isCurrent
                      ? 'font-bold text-burgundy'
                      : isCompleted
                      ? 'font-medium text-charcoal-600'
                      : 'text-charcoal-400'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contextual Focus Card */}
      <div
        onClick={onViewTimeline}
        className="p-3.5 sm:p-4 rounded-2xl bg-ivory-50/80 border border-beige hover:border-beige-300 hover:bg-ivory-50 transition-all cursor-pointer flex items-center justify-between gap-3 group"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-burgundy/10 text-burgundy flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-burgundy" />
          </div>

          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gold-600 block">
              {focusPeriod}
            </span>
            <h3 className="font-serif text-xs sm:text-sm font-bold text-charcoal group-hover:text-burgundy transition-colors truncate mt-0.5">
              {focusTitle}
            </h3>
            <p className="text-[11px] sm:text-xs text-charcoal-500 line-clamp-1 mt-0.5">
              {focusDescription}
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-charcoal-400 group-hover:text-burgundy group-hover:translate-x-0.5 transition-all shrink-0 pl-1">
          →
        </span>
      </div>

    </div>
  );
};
