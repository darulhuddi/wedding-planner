import React from 'react';
import { CalendarRange, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { TIMELINE_PIPELINE } from '../../data/mockData';

export interface TimelinePreviewProps {
  onViewTimeline: () => void;
}

export const TimelinePreview: React.FC<TimelinePreviewProps> = ({
  onViewTimeline,
}) => {
  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-beige-300 shadow-card space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-beige">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-burgundy shrink-0" />
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-gold-600 block">
              Alur Waktu
            </span>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal">
              Timeline Mendatang
            </h3>
          </div>
        </div>

        <button
          onClick={onViewTimeline}
          className="text-xs font-semibold text-burgundy hover:text-burgundy-700 flex items-center gap-1 transition-colors min-h-touch cursor-pointer"
        >
          <span>Lihat Timeline</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Timeline Steps Preview (Compact Vertical / Horizontal pipeline) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {TIMELINE_PIPELINE.slice(0, 4).map((phase) => (
          <div
            key={phase.id}
            onClick={onViewTimeline}
            className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
              phase.isCurrent
                ? 'bg-burgundy-50/60 border-burgundy-200 shadow-2xs'
                : phase.isCompleted
                ? 'bg-ivory-50/70 border-beige opacity-75'
                : 'bg-white border-beige hover:border-beige-300'
            }`}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] uppercase font-bold text-gold-600 tracking-wider">
                {phase.period}
              </span>
              {phase.isCompleted ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : phase.isCurrent ? (
                <span className="text-[9px] font-bold bg-burgundy text-white px-1.5 py-0.2 rounded">
                  Saat Ini
                </span>
              ) : (
                <Clock className="w-3 h-3 text-charcoal-300" />
              )}
            </div>

            <h4 className="font-serif text-sm font-bold text-charcoal truncate">
              {phase.title}
            </h4>
            <p className="text-[11px] text-charcoal-400 mt-0.5 line-clamp-2 leading-relaxed">
              {phase.description}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
};
