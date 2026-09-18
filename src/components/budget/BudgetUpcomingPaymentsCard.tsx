import React from 'react';
import { UpcomingPaymentItem } from '../../domain/budgetSelectors';
import { formatRupiahNumber } from '../../domain/workspaceSelectors';
import { Calendar, Clock, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';

interface BudgetUpcomingPaymentsCardProps {
  upcomingPayments: UpcomingPaymentItem[];
  onNavigateToVendors?: () => void;
  onNavigateToChecklist?: () => void;
}

export const BudgetUpcomingPaymentsCard: React.FC<BudgetUpcomingPaymentsCardProps> = ({
  upcomingPayments,
  onNavigateToVendors,
  onNavigateToChecklist,
}) => {
  if (upcomingPayments.length === 0) {
    return (
      <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 lg:p-8 border border-beige-300 shadow-card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal">Pembayaran Mendatang</h3>
            <p className="text-xs text-charcoal-400">Kewajiban pelunasan atau tagihan vendor terdekat</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-ivory-100 flex items-center justify-center text-charcoal-400">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="py-10 text-center bg-ivory-50/60 rounded-2xl border border-beige border-dashed p-6 space-y-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
          <p className="text-xs sm:text-sm text-charcoal-600 font-medium">
            Belum ada pembayaran mendatang.
          </p>
          <p className="text-xs text-charcoal-400 max-w-sm mx-auto">
            Semua kewajiban vendor terpilih telah tercatat lunas atau belum ada tanggal jatuh tempo terdekat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 lg:p-8 border border-beige-300 shadow-card space-y-5">
      
      {/* Header Row */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-beige">
        <div>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal">Pembayaran Mendatang</h3>
          <p className="text-xs text-charcoal-400">Kewajiban pembayaran terdekat yang perlu disiapkan</p>
        </div>
        <span className="text-xs font-bold text-burgundy bg-burgundy-50 px-2.5 py-1 rounded-lg border border-burgundy-100">
          {upcomingPayments.length} Tagihan
        </span>
      </div>

      {/* List of Upcoming Payments */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {upcomingPayments.map((item) => (
          <div
            key={item.id}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
              item.isOverdue
                ? 'bg-rose-50/50 border-rose-200 shadow-2xs'
                : 'bg-ivory-50/60 border-beige/80 hover:bg-ivory-100/70'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              
              {/* Left Side: Title and Due Date */}
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-charcoal truncate">
                    {item.vendorName || item.title}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-charcoal-400 px-2 py-0.5 rounded-md bg-white border border-beige shrink-0">
                    {item.categoryLabel}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-charcoal-500">
                  <Clock className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                  {item.isOverdue ? (
                    <span className="text-rose-700 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Lewat jatuh tempo ({item.dueDateFormatted})
                    </span>
                  ) : item.dueDate ? (
                    <span>Jatuh tempo {item.dueDateFormatted}</span>
                  ) : (
                    <span>Estimasi pelunasan</span>
                  )}
                </div>
              </div>

              {/* Right Side: Amount and Status */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-beige/60">
                <span className="font-serif text-sm sm:text-base font-bold text-charcoal">
                  {formatRupiahNumber(item.amount)}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  item.status === 'partial'
                    ? 'bg-amber-100 text-amber-800'
                    : item.isOverdue
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {item.status === 'partial' ? 'Sisa Pelunasan' : item.isOverdue ? 'Terlambat' : 'Belum Dibayar'}
                </span>
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* Navigation Footer */}
      {(onNavigateToVendors || onNavigateToChecklist) && (
        <div className="pt-3 border-t border-beige flex items-center justify-end gap-3 text-xs">
          {onNavigateToVendors && (
            <button
              type="button"
              onClick={onNavigateToVendors}
              className="font-semibold text-burgundy hover:text-burgundy-700 cursor-pointer min-h-touch py-1 inline-flex items-center gap-1"
            >
              <span>Lihat Detail Vendor</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

    </div>
  );
};
