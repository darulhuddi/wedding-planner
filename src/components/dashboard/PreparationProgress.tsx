import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface PreparationProgressProps {
  completedCount: number;
  totalCount?: number;
  completionPercentage: number;
}

export const PreparationProgress: React.FC<PreparationProgressProps> = ({
  completedCount,
  totalCount = 6,
  completionPercentage,
}) => {
  const isZero = completedCount === 0;
  const isComplete = completedCount >= totalCount;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 border border-beige-300 shadow-card space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-charcoal-400 block">
            Progress Persiapan Utama
          </span>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-charcoal tracking-tight mt-0.5">
            Persiapan Pernikahan
          </h3>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-serif text-3xl sm:text-4xl font-bold text-charcoal">
            {completionPercentage}%
          </span>
          <span className="text-xs text-charcoal-400 font-medium">
            ({completedCount} dari {totalCount} selesai)
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-ivory-200 h-2.5 rounded-full overflow-hidden p-0.5 border border-beige">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isComplete ? 'bg-emerald-600' : 'bg-burgundy'
          }`}
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      {/* Status Copy */}
      <div className="flex items-center justify-between text-xs text-charcoal-400 pt-1">
        {isZero ? (
          <p className="text-charcoal-500 italic">
            Kita baru mulai. Belum ada persiapan yang ditandai selesai. Mulai dari langkah yang kami rekomendasikan di atas.
          </p>
        ) : isComplete ? (
          <p className="text-emerald-700 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Semua persiapan utama sudah tercatat di workspace.</span>
          </p>
        ) : (
          <p className="text-charcoal-400">
            {completedCount} tahapan awal telah diselesaikan. Lanjutkan persiapan berikutnya sesuai alur.
          </p>
        )}
      </div>
    </div>
  );
};
