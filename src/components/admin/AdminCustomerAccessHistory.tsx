import React from 'react';
import { History, Shield, Clock, Gift, User, ArrowUpRight } from 'lucide-react';
import { CustomerAccessHistoryItem } from '../../types/admin';
import {
  formatAdminDate,
  formatAdminRelativeTime,
  formatAccessEventDescription,
} from '../../domain/adminSelectors';

interface AdminCustomerAccessHistoryProps {
  history: CustomerAccessHistoryItem[];
}

export function AdminCustomerAccessHistory({
  history,
}: AdminCustomerAccessHistoryProps) {
  const hasHistory = history && history.length > 0;

  return (
    <div className="bg-white p-5 sm:p-6 rounded-lg border border-beige-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-beige-100">
        <div>
          <h2 className="text-base font-serif font-bold text-charcoal-900 flex items-center gap-2">
            <History className="w-4 h-4 text-burgundy-700" />
            <span>Riwayat & Audit Log Akses</span>
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Catatan historis seluruh perubahan masa aktif dan hak akses akun ini.
          </p>
        </div>

        {hasHistory && (
          <span className="text-xs font-mono font-medium text-charcoal-500 bg-ivory-100 px-2 py-0.5 rounded">
            {history.length} Catatan
          </span>
        )}
      </div>

      {!hasHistory ? (
        <div className="py-8 text-center bg-ivory-50/50 rounded-lg border border-dashed border-beige-200">
          <History className="w-8 h-8 text-charcoal-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-charcoal-700">
            Belum ada riwayat perubahan akses
          </p>
          <p className="text-[11px] text-charcoal-400 mt-0.5">
            Semua perubahan perpanjangan trial dan pemberian Wedding Pass akan tercatat di sini.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-beige-100">
          {history.map((item) => {
            const { title, description } = formatAccessEventDescription(
              item.eventType,
              item.metadata
            );

            const isGrant = item.eventType === 'wedding_pass_granted';
            const isExtend = item.eventType === 'trial_extended';

            return (
              <div
                key={item.id}
                className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3 text-xs"
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                    isGrant
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isExtend
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-ivory-100 text-charcoal-700 border-beige-200'
                  }`}
                >
                  {isGrant ? (
                    <Gift className="w-3.5 h-3.5" />
                  ) : isExtend ? (
                    <Clock className="w-3.5 h-3.5" />
                  ) : (
                    <Shield className="w-3.5 h-3.5" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-semibold text-charcoal-900">{title}</span>
                    <div className="flex items-center gap-2 text-[11px] text-charcoal-500 font-mono">
                      <span>{formatAdminDate(item.createdAt)}</span>
                      <span>•</span>
                      <span>{formatAdminRelativeTime(item.createdAt)}</span>
                    </div>
                  </div>

                  <p className="text-charcoal-600 text-xs leading-relaxed">
                    {description}
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-[11px] text-charcoal-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>Pelaku: {item.actorId || item.source || 'Admin'}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
