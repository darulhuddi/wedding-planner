import React, { useState } from 'react';
import { BudgetProjectionResult } from '../../domain/budgetSelectors';
import { formatRupiahNumber } from '../../domain/workspaceSelectors';
import { Target, CheckCircle2, AlertTriangle, HelpCircle, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

interface BudgetProjectionCardProps {
  projection: BudgetProjectionResult;
  onOpenStarterTemplate?: () => void;
  onNavigateToVendors?: () => void;
}

export const BudgetProjectionCard: React.FC<BudgetProjectionCardProps> = ({
  projection,
  onOpenStarterTemplate,
  onNavigateToVendors,
}) => {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  const {
    totalBudget,
    actualSpent,
    remainingBudget,
    estimatedRemainingNeeds,
    projectedBalance,
    isWithinBudget,
    hasSufficientData,
    categoryBreakdowns,
  } = projection;

  if (!hasSufficientData) {
    return (
      <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 lg:p-8 border border-beige-300 shadow-card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal">Proyeksi Budget</h3>
            <p className="text-xs text-charcoal-400">Estimasi kecukupan sisa anggaran terhadap kebutuhan yang belum dibayar</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-ivory-100 flex items-center justify-center text-charcoal-400">
            <Target className="w-4 h-4" />
          </div>
        </div>

        <div className="py-10 text-center bg-ivory-50/60 rounded-2xl border border-beige border-dashed p-6 space-y-3">
          <HelpCircle className="w-6 h-6 text-charcoal-400 mx-auto" />
          <p className="text-xs sm:text-sm text-charcoal-600 font-medium">
            Proyeksi belum tersedia
          </p>
          <p className="text-xs text-charcoal-400 max-w-sm mx-auto">
            Lengkapi data alokasi kategori atau pilih vendor dengan harga penawaran untuk melihat proyeksi kecukupan anggaran hingga Hari-H.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 lg:p-8 border border-beige-300 shadow-card space-y-6">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-beige">
        <div>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-charcoal">Proyeksi Budget</h3>
          <p className="text-xs text-charcoal-400">
            Perbandingan sisa budget saat ini vs estimasi kebutuhan yang masih akan datang
          </p>
        </div>

        {/* Projection Verdict Badge */}
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto border ${
          isWithinBudget
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {isWithinBudget ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Proyeksi Dalam Budget</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Potensi Kekurangan Budget</span>
            </>
          )}
        </span>
      </div>

      {/* 3 Metric Projection Comparison Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        
        {/* Metric 1: Sisa Budget Saat Ini */}
        <div className="p-4 sm:p-5 rounded-2xl bg-ivory-50/80 border border-beige flex flex-col justify-between space-y-2">
          <span className="text-[11px] uppercase tracking-wider font-bold text-charcoal-400">
            Sisa Budget Saat Ini
          </span>
          <div>
            <div className={`font-serif text-lg sm:text-xl font-bold truncate ${
              remainingBudget < 0 ? 'text-rose-600' : 'text-charcoal'
            }`}>
              {formatRupiahNumber(remainingBudget)}
            </div>
            <p className="text-[11px] text-charcoal-400 mt-0.5">
              Total Budget: {formatRupiahNumber(totalBudget)}
            </p>
          </div>
        </div>

        {/* Metric 2: Estimasi Kebutuhan Mendatang */}
        <div className="p-4 sm:p-5 rounded-2xl bg-ivory-50/80 border border-beige flex flex-col justify-between space-y-2">
          <span className="text-[11px] uppercase tracking-wider font-bold text-charcoal-400">
            Estimasi Kebutuhan Mendatang
          </span>
          <div>
            <div className="font-serif text-lg sm:text-xl font-bold text-charcoal truncate">
              {formatRupiahNumber(estimatedRemainingNeeds)}
            </div>
            <p className="text-[11px] text-charcoal-400 mt-0.5">
              Dari komitmen vendor & alokasi tersisa
            </p>
          </div>
        </div>

        {/* Metric 3: Proyeksi Sisa / Defisit Akhir */}
        <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between space-y-2 ${
          isWithinBudget
            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
            : 'bg-rose-50/60 border-rose-200 text-rose-950'
        }`}>
          <span className="text-[11px] uppercase tracking-wider font-bold text-charcoal-500">
            {isWithinBudget ? 'Proyeksi Sisa Akhir' : 'Potensi Kekurangan'}
          </span>
          <div>
            <div className={`font-serif text-lg sm:text-xl font-bold truncate ${
              isWithinBudget ? 'text-emerald-800' : 'text-rose-700'
            }`}>
              {formatRupiahNumber(Math.abs(projectedBalance))}
            </div>
            <p className={`text-[11px] mt-0.5 ${isWithinBudget ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isWithinBudget
                ? 'Anggaran diproyeksikan cukup hingga selesai'
                : 'Perlu penyesuaian alokasi atau negosiasi vendor'}
            </p>
          </div>
        </div>

      </div>

      {/* Toggle Category Breakdown Table */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
          className="flex items-center justify-between w-full p-3 rounded-xl bg-ivory-50 hover:bg-ivory-100 border border-beige text-xs font-semibold text-charcoal-700 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span>Rincian Estimasi Kebutuhan Per Kategori</span>
            <span className="text-charcoal-400 font-normal">({categoryBreakdowns.length} Kategori)</span>
          </div>
          {isBreakdownOpen ? (
            <ChevronUp className="w-4 h-4 text-charcoal-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-charcoal-500" />
          )}
        </button>

        {isBreakdownOpen && (
          <div className="mt-3 border border-beige rounded-2xl overflow-hidden animate-fadeIn">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-ivory-100/80 text-charcoal-500 uppercase text-[10px] tracking-wider border-b border-beige">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Kategori</th>
                    <th className="py-2.5 px-3 font-semibold">Sumber Acuan</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Sudah Dibayar</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Sisa Kebutuhan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-beige/60">
                  {categoryBreakdowns.map((item) => (
                    <tr key={item.category} className="hover:bg-ivory-50/50">
                      <td className="py-2.5 px-3 font-semibold text-charcoal">
                        {item.categoryName}
                      </td>
                      <td className="py-2.5 px-3 text-charcoal-500">
                        {item.source === 'selected_vendor' ? (
                          <span className="inline-flex items-center gap-1 text-burgundy font-medium">
                            Vendor: {item.selectedVendorName || 'Terpilih'} ({formatRupiahNumber(item.vendorQuotedPrice || 0)})
                          </span>
                        ) : item.source === 'allocation' ? (
                          <span>Alokasi Target ({formatRupiahNumber(item.allocated)})</span>
                        ) : (
                          <span className="text-charcoal-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-charcoal-600">
                        {formatRupiahNumber(item.spent)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-charcoal">
                        {formatRupiahNumber(item.remainingNeed)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
