import React from 'react';
import { Layers, CheckCircle2 } from 'lucide-react';
import { AdminCoupleDetail } from '../../types/admin';

interface AdminCoupleModuleProgressProps {
  couple: AdminCoupleDetail;
}

export function AdminCoupleModuleProgress({
  couple,
}: AdminCoupleModuleProgressProps) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-lg border border-beige-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-beige-100">
        <div>
          <h2 className="text-base font-serif font-bold text-charcoal-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-burgundy-700" />
            <span>Module Progress Breakdown</span>
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Progress pengerjaan tugas per modul kategori pernikahan.
          </p>
        </div>

        <span className="text-xs font-mono font-semibold text-charcoal-700 bg-ivory-100 px-2 py-0.5 rounded border border-beige-200">
          6 Modul
        </span>
      </div>

      <div className="space-y-3">
        {couple.modules.map((mod) => {
          const isCompleted = mod.status === 'completed';

          return (
            <div
              key={mod.category}
              className="p-3.5 rounded-lg border border-beige-200/70 bg-ivory-50/40 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-charcoal-900">
                    {mod.label}
                  </span>
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      Selesai
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-charcoal-500">
                    {mod.completedTasks} / {mod.totalTasks} tugas
                  </span>
                  <span className="font-semibold text-charcoal-800 w-8 text-right">
                    {mod.progressPercentage}%
                  </span>
                </div>
              </div>

              {/* Module Progress Bar */}
              <div className="h-1.5 bg-beige-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isCompleted ? 'bg-emerald-600' : 'bg-burgundy-600'
                  }`}
                  style={{ width: `${mod.progressPercentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
