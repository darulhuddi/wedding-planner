import React from 'react';
import { Activity, CheckCircle2, FileEdit, Clock } from 'lucide-react';
import { AdminCoupleDetail } from '../../types/admin';
import { formatAdminRelativeTime } from '../../domain/adminSelectors';

interface AdminCoupleActivityProps {
  couple: AdminCoupleDetail;
}

export function AdminCoupleActivity({ couple }: AdminCoupleActivityProps) {
  const activities = couple.recentActivities || [];

  return (
    <div className="bg-white p-5 sm:p-6 rounded-lg border border-beige-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-beige-100">
        <div>
          <h2 className="text-base font-serif font-bold text-charcoal-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-burgundy-700" />
            <span>Recent Activity</span>
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Log aktivitas dan progres checklist pasangan terbaru.
          </p>
        </div>

        {activities.length > 0 && (
          <span className="text-xs font-mono font-semibold text-charcoal-600 bg-ivory-100 px-2 py-0.5 rounded border border-beige-200">
            {activities.length} aktivitas
          </span>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="p-6 rounded-lg border border-beige-200/60 bg-ivory-50/50 text-center space-y-1.5">
          <Clock className="w-6 h-6 text-charcoal-300 mx-auto" />
          <p className="text-xs font-medium text-charcoal-600">
            Belum ada aktivitas yang dapat ditampilkan.
          </p>
          <p className="text-[11px] text-charcoal-400">
            Aktivitas akan muncul otomatis ketika pasangan menyelesaikan atau mengubah tugas checklist.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {activities.map((act) => {
            const isCompleted = act.type === 'task_completed';

            return (
              <div
                key={act.id}
                className="flex items-start gap-3 p-3 rounded-md border border-beige-100 bg-ivory-50/40"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isCompleted
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-burgundy-50 text-burgundy-700 border border-burgundy-200'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <FileEdit className="w-3.5 h-3.5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-charcoal-900 truncate">
                      {act.title}
                    </p>
                    <span className="text-[11px] font-mono text-charcoal-400 whitespace-nowrap">
                      {formatAdminRelativeTime(act.timestamp)}
                    </span>
                  </div>
                  <p className="text-[11px] text-charcoal-600 mt-0.5">
                    {act.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
