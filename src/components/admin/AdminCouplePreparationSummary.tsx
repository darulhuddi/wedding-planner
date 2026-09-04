import React from 'react';
import { CheckCircle2, ListChecks } from 'lucide-react';
import { AdminCoupleDetail } from '../../types/admin';

interface AdminCouplePreparationSummaryProps {
  couple: AdminCoupleDetail;
}

export function AdminCouplePreparationSummary({
  couple,
}: AdminCouplePreparationSummaryProps) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-lg border border-beige-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-beige-100">
        <div>
          <h2 className="text-base font-serif font-bold text-charcoal-900 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-burgundy-700" />
            <span>Preparation Overview</span>
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Tingkat penyelesaian seluruh tugas persiapan pernikahan (Task Progress).
          </p>
        </div>

        <span className="text-xs font-mono font-semibold text-charcoal-600 bg-ivory-100 px-2 py-0.5 rounded border border-beige-200">
          {couple.completedTasks} dari {couple.totalTasks} tugas
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-serif font-bold text-burgundy-900">
              {couple.progressPercentage}%
            </span>
            <span className="text-xs sm:text-sm font-semibold text-charcoal-700">
              task selesai
            </span>
          </div>

          <span className="text-xs text-charcoal-400 font-mono">
            {couple.completedTasks} / {couple.totalTasks} selesai
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2.5 bg-beige-100 rounded-full overflow-hidden p-0.5 border border-beige-200/60">
          <div
            className="h-full bg-burgundy-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${couple.progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
