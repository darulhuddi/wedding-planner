import React from 'react';
import { Layers, Wallet, Users } from 'lucide-react';
import { AdminCoupleDetail } from '../../types/admin';
import { formatAdminPrice } from '../../domain/adminSelectors';
import { formatCompactRupiah } from '../../domain/workspaceSelectors';

interface AdminCoupleMetricsProps {
  couple: AdminCoupleDetail;
}

export function AdminCoupleMetrics({ couple }: AdminCoupleMetricsProps) {
  const spentFormatted =
    couple.spentBudget > 0
      ? formatCompactRupiah(couple.spentBudget)
      : 'Rp0';

  const estimatedBudgetFormatted = formatCompactRupiah(couple.estimatedBudget);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* 1. Module Progress Metric */}
      <div className="p-4 rounded-lg bg-white border border-beige-200/80 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-charcoal-500">
          <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
            Modul Persiapan
          </span>
          <Layers className="w-4 h-4 text-burgundy-600" />
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-serif font-bold text-charcoal-900">
            {couple.completedModulesCount} / {couple.totalModulesCount}
          </div>
          <p className="text-[11px] text-charcoal-500 mt-0.5">
            modul berstatus selesai
          </p>
        </div>
      </div>

      {/* 2. Budget Metric */}
      <div className="p-4 rounded-lg bg-white border border-beige-200/80 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-charcoal-500">
          <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
            Pengeluaran Budget
          </span>
          <Wallet className="w-4 h-4 text-gold-600" />
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-serif font-bold text-charcoal-900">
            {spentFormatted}
          </div>
          <p className="text-[11px] text-charcoal-500 mt-0.5 truncate">
            dari {estimatedBudgetFormatted} estimasi
          </p>
        </div>
      </div>

      {/* 3. Guests Metric */}
      <div className="p-4 rounded-lg bg-white border border-beige-200/80 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-charcoal-500">
          <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
            Estimasi Tamu
          </span>
          <Users className="w-4 h-4 text-charcoal-600" />
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-serif font-bold text-charcoal-900">
            {couple.estimatedGuestCount} orang
          </div>
          <p className="text-[11px] text-charcoal-500 mt-0.5">
            {couple.actualGuestCount > 0
              ? `${couple.actualGuestCount} tamu terdata di daftar`
              : 'Daftar tamu belum diisi'}
          </p>
        </div>
      </div>
    </div>
  );
}
