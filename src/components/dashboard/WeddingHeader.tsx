import React from 'react';
import { Heart, Calendar } from 'lucide-react';
import { WorkspaceViewModel } from '../../types/workspace';

export interface WeddingHeaderProps {
  workspace: WorkspaceViewModel;
  onRestartOnboarding?: () => void;
}

export const WeddingHeader: React.FC<WeddingHeaderProps> = ({
  workspace,
}) => {
  const days = workspace.daysUntilWedding;
  const isToday = days === 0;
  const isPassed = days < 0;
  const completed = workspace.completedCategoriesCount;
  const total = workspace.totalCategoriesCount || 6;
  const pct = workspace.completionPercentage;

  // Dynamic concise status calculation
  let statusTitle = 'Persiapanmu berjalan baik';
  let statusSubtitle = `Kamu telah menyelesaikan ${completed} dari ${total} modul utama.`;

  if (isPassed) {
    statusTitle = 'Tanggal pernikahan telah lewat';
    statusSubtitle = 'Perbarui tanggal pernikahan untuk menyesuaikan alur persiapan.';
  } else if (isToday) {
    statusTitle = 'Hari-H Pernikahan Hari Ini!';
    statusSubtitle = 'Selamat berbahagia! Seluruh persiapan siap dieksekusi.';
  } else if (completed === total) {
    statusTitle = 'Semua persiapan utama telah lengkap';
    statusSubtitle = `Seluruh ${total} modul persiapan berhasil diselesaikan.`;
  } else if (completed >= 4) {
    statusTitle = 'Persiapanmu hampir lengkap';
    statusSubtitle = `Kamu telah menyelesaikan ${completed} dari ${total} modul utama.`;
  } else if (completed === 0) {
    statusTitle = 'Mulai langkah persiapanmu';
    statusSubtitle = `Belum ada modul yang selesai dari ${total} modul utama.`;
  }

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 lg:p-8 border border-beige-300 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      
      {/* Left Column: Couple Identity, Date & Progress Status */}
      <div className="flex-1 min-w-0 space-y-4">
        
        {/* Top: Heart Icon & Names */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-burgundy/10 text-burgundy flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-burgundy" />
          </div>
          
          <div className="min-w-0">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight truncate">
              {workspace.coupleName}
            </h1>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-charcoal-400 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-burgundy shrink-0" />
              <span>{workspace.formattedDate || 'Belum diatur'}</span>
              <span className="text-beige-400">•</span>
              <span className="font-medium text-charcoal-500">Hari-H</span>
            </div>
          </div>
        </div>

        {/* Bottom: Inline Overall Preparation Progress Banner */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-ivory-50/70 border border-beige flex items-center gap-4 max-w-2xl">
          {/* Progress Circular / Pill Badge */}
          <div className="relative w-12 h-12 shrink-0 flex items-center justify-center rounded-full bg-white border border-beige-300 shadow-2xs">
            <span className="font-serif text-xs sm:text-sm font-bold text-charcoal">
              {pct}%
            </span>
          </div>

          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gold-600 block mb-0.5">
              Kesiapan Pernikahan
            </span>
            <h2 className="text-xs sm:text-sm font-bold text-charcoal">
              {statusTitle}
            </h2>
            <p className="text-xs text-charcoal-400 mt-0.5 leading-relaxed">
              {statusSubtitle}
            </p>
          </div>
        </div>

      </div>

      {/* Right Column: Prominent, Elegant Countdown Card */}
      <div className="w-full md:w-auto shrink-0">
        <div className="p-4 sm:p-5 rounded-2xl bg-ivory-50 border border-beige shadow-2xs flex md:flex-col items-center justify-between md:justify-center text-center gap-2 md:min-w-[140px]">
          <div className="flex items-center gap-2 md:justify-center">
            <Calendar className="w-4 h-4 text-burgundy shrink-0" />
            <span className="font-serif text-3xl sm:text-4xl font-bold text-charcoal leading-none">
              {isToday ? 0 : Math.max(0, days)}
            </span>
          </div>
          <div className="text-left md:text-center">
            <span className="text-xs font-semibold text-charcoal block leading-tight">
              {isToday ? 'Hari Ini' : isPassed ? 'Hari Lewat' : 'hari lagi'}
            </span>
            <span className="text-[11px] text-charcoal-400 block mt-0.5">
              menuju Hari-H
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
