import React from 'react';
import { CalendarRange, ArrowRight, CheckCircle2, Clock, Sparkles, Settings, Heart } from 'lucide-react';
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

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-beige-300 shadow-card space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-beige">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0">
            <CalendarRange className="w-4 h-4 text-burgundy" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-gold-600 block">
              Alur Waktu
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal">
              Perjalanan Persiapan
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewTimeline}
          className="text-xs font-semibold text-burgundy hover:text-burgundy-700 flex items-center gap-1.5 transition-colors min-h-touch cursor-pointer group"
        >
          <span>Lihat Timeline</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* STATE 1: Empty / Low-Data Workspace */}
      {journey.status === 'empty' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-ivory-50/80 border border-beige flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-700 shrink-0 mt-0.5 sm:mt-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-charcoal">
                Mulai dari langkah yang paling penting
              </h3>
              <p className="text-xs text-charcoal-400 mt-1 max-w-2xl leading-relaxed">
                Belum ada tugas yang dijadwalkan dalam perjalanan persiapanmu. Buat checklist awal atau manfaatkan rekomendasi WedFlow untuk menyusun langkah pertama.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateChecklist || onViewTimeline}
            className="text-xs font-semibold text-white bg-burgundy hover:bg-burgundy-700 px-4 py-2.5 rounded-xl transition-colors shrink-0 flex items-center gap-2 cursor-pointer shadow-2xs min-h-touch"
          >
            <span>Buka Checklist</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* STATE 2: Wedding Date Already Passed */}
      {journey.status === 'passed' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-rose-50/50 border border-rose-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white border border-rose-200 flex items-center justify-center text-rose-700 shrink-0 mt-0.5 sm:mt-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-charcoal">
                Tanggal Pernikahan Telah Terlewati
              </h3>
              <p className="text-xs text-charcoal-400 mt-1 max-w-2xl leading-relaxed">
                Tanggal terdaftar ({journey.formattedWeddingDate}) sudah terlewati. Kamu dapat memperbarui tanggal pernikahan di menu Pengaturan untuk menyesuaikan alur timeline.
              </p>
            </div>
          </div>

          {onNavigateSettings && (
            <button
              type="button"
              onClick={onNavigateSettings}
              className="text-xs font-semibold text-charcoal-700 bg-white hover:bg-ivory-100 border border-beige px-4 py-2.5 rounded-xl transition-colors shrink-0 flex items-center gap-2 cursor-pointer shadow-2xs min-h-touch"
            >
              <Settings className="w-3.5 h-3.5 text-burgundy" />
              <span>Perbarui di Pengaturan</span>
            </button>
          )}
        </div>
      )}

      {/* STATE 3: Wedding Is Today */}
      {journey.status === 'today' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-burgundy-50/60 border border-burgundy-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-burgundy text-white flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 shadow-2xs">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-charcoal">
                Hari-H Pernikahan Hari Ini!
              </h3>
              <p className="text-xs text-charcoal-400 mt-1 max-w-2xl leading-relaxed">
                Hari bahagia yang dinantikan telah tiba. Selamat berbahagia, seluruh susunan acara dan persiapan siap dieksekusi bersama keluarga dan vendor.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onViewTimeline}
            className="text-xs font-semibold text-white bg-burgundy hover:bg-burgundy-700 px-4 py-2.5 rounded-xl transition-colors shrink-0 flex items-center gap-2 cursor-pointer shadow-2xs min-h-touch"
          >
            <span>Buka Rundown Acara</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* STATE 4: Active Dynamic Preparation Phases */}
      {journey.status === 'active' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {journey.phases.map((phase) => (
            <div
              key={phase.id}
              onClick={onViewTimeline}
              className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer group flex flex-col justify-between min-h-[140px] ${
                phase.isCurrent
                  ? 'bg-burgundy-50/60 border-burgundy-200 shadow-2xs'
                  : phase.isCompleted
                  ? 'bg-ivory-50/70 border-beige opacity-85 hover:opacity-100 hover:border-beige-300'
                  : 'bg-white border-beige hover:border-beige-300 hover:shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] uppercase font-bold text-gold-600 tracking-wider">
                    {phase.period}
                  </span>
                  {phase.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : phase.isCurrent ? (
                    <span className="text-[10px] font-bold bg-burgundy text-white px-2 py-0.5 rounded-full">
                      Saat Ini
                    </span>
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-charcoal-300" />
                  )}
                </div>

                <h3 className="font-serif text-sm font-bold text-charcoal truncate group-hover:text-burgundy transition-colors">
                  {phase.title}
                </h3>
                <p className="text-xs text-charcoal-400 mt-1 line-clamp-2 leading-relaxed">
                  {phase.description}
                </p>
              </div>

              {/* Subtle Phase Progress Micro-Indicator */}
              {phase.totalTasks > 0 && (
                <div className="pt-2 mt-2 border-t border-beige/60 flex items-center justify-between text-[11px] text-charcoal-400">
                  <span>{phase.completedTasks}/{phase.totalTasks} tugas selesai</span>
                  {phase.isCompleted && (
                    <span className="text-emerald-700 font-medium">Lengkap ✓</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
