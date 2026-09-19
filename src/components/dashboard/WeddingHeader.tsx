import React from 'react';
import { Heart, Calendar, Edit3 } from 'lucide-react';
import { WorkspaceViewModel } from '../../types/workspace';

export interface WeddingHeaderProps {
  workspace: WorkspaceViewModel;
  onRestartOnboarding?: () => void;
  onEditIdentity?: () => void;
}

export const WeddingHeader: React.FC<WeddingHeaderProps> = ({
  workspace,
  onEditIdentity,
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
      {/* Left Card: Welcome Greeting, Identity, Edit Button & Compact Readiness Banner */}
      <div className="lg:col-span-9 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-7 border border-beige-300 shadow-card flex flex-col justify-between space-y-4">
        {/* Top: Heart Icon & Greeting & Edit Button */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-burgundy/10 text-burgundy flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Heart className="w-5 h-5 fill-burgundy" />
            </div>
            
            <div className="min-w-0">
              <h1 className="font-serif text-xl sm:text-2xl lg:text-[26px] font-bold text-charcoal tracking-tight">
                Selamat datang, {workspace.coupleName}
              </h1>
              <p className="text-xs sm:text-sm text-charcoal-500 mt-1 leading-relaxed">
                Semoga setiap langkah hari ini membawa kalian lebih dekat ke hari bahagia.
              </p>
            </div>
          </div>

          {onEditIdentity && (
            <button
              type="button"
              onClick={onEditIdentity}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-600 hover:text-burgundy bg-ivory-50 hover:bg-burgundy-50 border border-beige hover:border-burgundy-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs"
              title="Ubah data pernikahan"
              aria-label="Ubah informasi pernikahan"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Ubah Data</span>
            </button>
          )}
        </div>

        {/* Bottom: Inline Compact Preparation Readiness Banner */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-ivory-50/70 border border-beige flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Progress Circular Badge */}
            <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-white border border-beige-300 shadow-2xs">
              <span className="font-serif text-xs sm:text-sm font-bold text-charcoal">
                {pct}%
              </span>
            </div>

            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gold-600 block leading-tight">
                Kesiapan Pernikahan
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs sm:text-sm font-bold text-charcoal truncate">
                  {statusTitle}
                </span>
                <span className="text-xs text-charcoal-400 font-bold">→</span>
              </div>
              <p className="text-[11px] sm:text-xs text-charcoal-400 mt-0.5 leading-tight truncate">
                {statusSubtitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Card: Elegant Countdown Card */}
      <div className="lg:col-span-3 bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-beige-300 shadow-card flex flex-col items-center justify-center text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <Calendar className="w-4 h-4 text-burgundy shrink-0" />
          <span className="font-serif text-3xl sm:text-4xl font-bold text-charcoal leading-none">
            {isToday ? 0 : Math.max(0, days)}
          </span>
        </div>
        <div>
          <span className="text-xs font-semibold text-charcoal block leading-tight">
            {isToday ? 'Hari Ini' : isPassed ? 'Hari Lewat' : 'hari lagi'}
          </span>
          <span className="text-[11px] text-charcoal-400 block mt-0.5">
            menuju Hari-H
          </span>
          {workspace.formattedDate && (
            <span className="text-xs font-medium text-charcoal-500 block mt-1 pt-1 border-t border-beige/60">
              {workspace.formattedDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
