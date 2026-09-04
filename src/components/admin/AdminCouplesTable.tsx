import React from 'react';
import { ChevronRight, Calendar, Users, Activity, CheckCircle2, RotateCcw } from 'lucide-react';
import { AdminCoupleSummary } from '../../types/admin';
import { formatAdminDate, formatAdminRelativeTime } from '../../domain/adminSelectors';

interface AdminCouplesTableProps {
  couples: AdminCoupleSummary[];
  onSelectCouple: (workspaceId: string) => void;
  isLoading?: boolean;
  onResetFilters?: () => void;
  isFiltered?: boolean;
}

export function AdminCouplesTable({
  couples,
  onSelectCouple,
  isLoading = false,
  onResetFilters,
  isFiltered = false,
}: AdminCouplesTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-beige-200 bg-white p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4 animate-pulse">
            <div className="h-4 bg-beige-100 rounded w-1/4" />
            <div className="h-4 bg-beige-100 rounded w-1/6" />
            <div className="h-4 bg-beige-100 rounded w-1/8" />
            <div className="h-4 bg-beige-100 rounded w-1/5" />
            <div className="h-4 bg-beige-100 rounded w-1/6" />
          </div>
        ))}
      </div>
    );
  }

  if (couples.length === 0) {
    return (
      <div className="p-8 sm:p-12 rounded-lg border border-beige-200 bg-white text-center space-y-3 shadow-xs">
        <Users className="w-10 h-10 text-charcoal-300 mx-auto" />
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-charcoal-800">
            Tidak ada pasangan ditemukan
          </h3>
          <p className="text-xs text-charcoal-400 mt-1 max-w-sm mx-auto">
            {isFiltered
              ? 'Coba ubah kata pencarian atau filter untuk menemukan data pasangan.'
              : 'Belum ada data pasangan yang terdaftar di sistem.'}
          </p>
        </div>
        {isFiltered && onResetFilters && (
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-burgundy-700 hover:text-burgundy-900 bg-ivory-100 hover:bg-ivory-200 border border-beige-200 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Semua Filter</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-beige-200 bg-white overflow-hidden shadow-xs">
      {/* Desktop & Tablet Table View (>= 640px) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-ivory-100/70 border-b border-beige-200/80 text-[11px] font-mono uppercase tracking-wider text-charcoal-500 font-semibold">
              <th className="py-3 px-4 sm:px-6">Couple</th>
              <th className="py-3 px-4">Wedding Date</th>
              <th className="py-3 px-4">Access</th>
              <th className="py-3 px-4">Task Progress</th>
              <th className="py-3 px-4">Last Active</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-beige-100">
            {couples.map((couple) => {
              const isPaid = couple.accessTier === 'Paid';
              const isExpired = couple.accessTier === 'Expired';

              return (
                <tr
                  key={couple.id}
                  onClick={() => onSelectCouple(couple.id)}
                  className="hover:bg-ivory-50/80 transition-colors cursor-pointer group"
                >
                  {/* Couple Name */}
                  <td className="py-3.5 px-4 sm:px-6">
                    <div className="font-semibold text-charcoal-900 group-hover:text-burgundy-900 transition-colors">
                      {couple.coupleName}
                    </div>
                  </td>

                  {/* Wedding Date */}
                  <td className="py-3.5 px-4 text-charcoal-600 whitespace-nowrap">
                    {formatAdminDate(couple.weddingDate)}
                  </td>

                  {/* Access Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold tracking-wide border ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : isExpired
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {couple.accessTier}
                    </span>
                  </td>

                  {/* Task Progress */}
                  <td className="py-3.5 px-4 min-w-[160px]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold text-charcoal-800">
                          {couple.progressPercentage}%
                        </span>
                        <span className="text-[11px] text-charcoal-500 font-mono">
                          {couple.completedTasks}/{couple.totalTasks} tugas
                        </span>
                      </div>
                      <div className="h-1.5 bg-beige-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-burgundy-600 rounded-full transition-all duration-300"
                          style={{ width: `${couple.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Last Active */}
                  <td className="py-3.5 px-4 text-charcoal-500 whitespace-nowrap">
                    {formatAdminRelativeTime(couple.lastActive)}
                  </td>

                  {/* Action Chevron */}
                  <td className="py-3.5 px-4 text-right text-charcoal-400 group-hover:text-burgundy-700 transition-colors">
                    <ChevronRight className="w-4 h-4 ml-auto group-hover:translate-x-0.5 transition-transform" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View (< 640px) */}
      <div className="block sm:hidden divide-y divide-beige-100">
        {couples.map((couple) => {
          const isPaid = couple.accessTier === 'Paid';
          const isExpired = couple.accessTier === 'Expired';

          return (
            <div
              key={couple.id}
              onClick={() => onSelectCouple(couple.id)}
              className="p-4 hover:bg-ivory-50 active:bg-ivory-100 transition-colors cursor-pointer space-y-3"
            >
              {/* Header: Name + Chevron */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-sm text-charcoal-900">
                    {couple.coupleName}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-charcoal-500 mt-0.5">
                    <Calendar className="w-3 h-3 text-charcoal-400" />
                    <span>{formatAdminDate(couple.weddingDate)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wide border flex-shrink-0 ${
                      isPaid
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : isExpired
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {couple.accessTier}
                  </span>
                  <ChevronRight className="w-4 h-4 text-charcoal-400" />
                </div>
              </div>

              {/* Progress & Details */}
              <div className="pt-2 border-t border-beige-100/60 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-charcoal-600 font-medium">
                    {couple.progressPercentage}% task selesai
                  </span>
                  <span className="text-[11px] font-mono text-charcoal-500">
                    {couple.completedTasks}/{couple.totalTasks} tugas
                  </span>
                </div>
                <div className="h-1.5 bg-beige-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-burgundy-600 rounded-full"
                    style={{ width: `${couple.progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Footer: Last active */}
              <div className="flex items-center justify-between text-[11px] text-charcoal-400">
                <span>Aktivitas</span>
                <span className="font-medium text-charcoal-600">
                  {formatAdminRelativeTime(couple.lastActive)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
