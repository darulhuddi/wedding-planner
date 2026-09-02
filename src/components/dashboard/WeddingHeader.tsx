import React from 'react';
import { Heart, Calendar, RefreshCw } from 'lucide-react';
import { WorkspaceViewModel } from '../../types/workspace';

export interface WeddingHeaderProps {
  workspace: WorkspaceViewModel;
  onRestartOnboarding?: () => void;
}

export const WeddingHeader: React.FC<WeddingHeaderProps> = ({
  workspace,
  onRestartOnboarding,
}) => {
  const days = workspace.daysUntilWedding;
  const isToday = days === 0;
  const isPassed = days < 0;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 lg:p-8 border border-beige-300 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
      
      {/* Left: Couple Identity */}
      <div className="flex items-center gap-3.5 sm:gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-burgundy flex items-center justify-center text-ivory shadow-sm shrink-0">
          <Heart className="w-6 h-6 sm:w-7 sm:h-7 fill-ivory" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] sm:text-xs uppercase font-bold tracking-widest text-gold-600">
              Rencana Pernikahan
            </span>
            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
              Workspace Aktif
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-charcoal tracking-tight mt-0.5 break-words">
            {workspace.coupleName}
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-400 mt-1 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-burgundy shrink-0" />
            <span>Tanggal Pernikahan: <strong className="text-charcoal font-medium">{workspace.formattedDate}</strong></span>
          </p>
        </div>
      </div>

      {/* Right: Dynamic Countdown Badge & Workspace Actions */}
      <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-3 self-stretch md:self-auto">
        <div className="bg-ivory-50 px-5 py-3 rounded-2xl border border-beige shadow-2xs text-center md:text-right">
          <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider text-charcoal-400 block">
            Hitung Mundur Hari-H
          </span>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-burgundy block leading-tight mt-0.5">
            {isToday ? (
              <span className="text-burgundy font-bold">Hari-H Pernikahan</span>
            ) : isPassed ? (
              <span className="text-red-700 text-xl font-sans">Tanggal Lewat</span>
            ) : (
              <>
                {days} <span className="text-xs font-sans font-normal text-charcoal-400">hari lagi</span>
              </>
            )}
          </span>
        </div>

        {onRestartOnboarding && (
          <button
            onClick={onRestartOnboarding}
            className="text-xs text-charcoal-400 hover:text-burgundy p-2.5 rounded-xl border border-beige hover:border-beige-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-touch"
            title="Ulangi Onboarding"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Ulang Setup</span>
          </button>
        )}
      </div>

    </div>
  );
};
