import React from 'react';
import { ChevronRight, Calendar, Users, Activity, CheckCircle2 } from 'lucide-react';
import { AdminCoupleSummary } from '../../types/admin';
import { formatAdminDate, formatAdminRelativeTime } from '../../domain/adminSelectors';

interface AdminRecentCouplesTableProps {
  couples: AdminCoupleSummary[];
  onSelectCouple?: (couple: AdminCoupleSummary) => void;
  isLoading?: boolean;
}

export function AdminRecentCouplesTable({
  couples,
  onSelectCouple,
  isLoading = false,
}: AdminRecentCouplesTableProps) {
  return (
    <section aria-labelledby="recent-couples-heading" className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2
            id="recent-couples-heading"
            className="text-base sm:text-lg font-serif font-bold text-charcoal-900"
          >
            Recent Couples
          </h2>
          <p className="text-xs text-charcoal-500">
            Aktivitas pasangan terdaftar terbaru
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-beige-200 bg-white p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4 animate-pulse">
              <div className="h-4 bg-beige-100 rounded w-1/4" />
              <div className="h-4 bg-beige-100 rounded w-1/6" />
              <div className="h-4 bg-beige-100 rounded w-1/6" />
              <div className="h-4 bg-beige-100 rounded w-1/6" />
            </div>
          ))}
        </div>
      ) : couples.length === 0 ? (
        <div className="p-8 rounded-lg border border-beige-200 bg-white text-center">
          <Users className="w-8 h-8 text-charcoal-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-charcoal-700">Belum ada pasangan terdaftar</p>
          <p className="text-xs text-charcoal-400 mt-1">
            Data pasangan baru akan muncul secara otomatis di sini setelah registrasi.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-beige-200 bg-white overflow-hidden shadow-xs">
          {/* Desktop & Tablet Table View (>= 640px) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-ivory-100/70 border-b border-beige-200/80 text-[11px] font-mono uppercase tracking-wider text-charcoal-500 font-semibold">
                  <th className="py-3 px-4 sm:px-6">Couple</th>
                  <th className="py-3 px-4">Wedding Date</th>
                  <th className="py-3 px-4">Access</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Last Active</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige-100">
                {couples.map((couple) => {
                  const isPaid = couple.accessTier === 'Paid';
                  return (
                    <tr
                      key={couple.id}
                      onClick={() => onSelectCouple?.(couple)}
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

                      {/* Access Tier */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold tracking-wide border ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {couple.accessTier}
                        </span>
                      </td>

                      {/* Progress */}
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 h-1.5 bg-beige-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-burgundy-600 rounded-full transition-all duration-300"
                              style={{ width: `${couple.progressPercentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-semibold text-charcoal-700 w-8 text-right">
                            {couple.progressPercentage}%
                          </span>
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
              return (
                <div
                  key={couple.id}
                  onClick={() => onSelectCouple?.(couple)}
                  className="p-4 hover:bg-ivory-50 active:bg-ivory-100 transition-colors cursor-pointer space-y-2.5"
                >
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

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wide border flex-shrink-0 ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {couple.accessTier}
                    </span>
                  </div>

                  {/* Progress & Last active in mobile view */}
                  <div className="pt-2 border-t border-beige-100/60 flex items-center justify-between gap-4 text-xs">
                    <div className="flex-1 max-w-[60%]">
                      <div className="flex items-center justify-between text-[11px] text-charcoal-500 mb-1">
                        <span>Progress</span>
                        <span className="font-mono font-semibold">{couple.progressPercentage}%</span>
                      </div>
                      <div className="h-1.5 bg-beige-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-burgundy-600 rounded-full"
                          style={{ width: `${couple.progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-charcoal-400">
                      <span>{formatAdminRelativeTime(couple.lastActive)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
