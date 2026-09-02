import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { BUDGET_CATEGORIES, formatRupiah } from '../../data/mockData';

export const BudgetShowcase: React.FC = () => {
  const [categories] = useState(BUDGET_CATEGORIES);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const totalBudget = 100000000;
  const usedBudget = 72450000;
  const remainingBudget = 27550000;

  return (
    <section className="py-14 sm:py-20 lg:py-22 bg-white overflow-hidden">
      <div className="w-full max-w-container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* Left Side: Copy & Description (lg: 5 cols) */}
          <div className="lg:col-span-5 space-y-5 sm:space-y-6">
            <div className="inline-flex items-center gap-2">
              <span className="h-px w-5 bg-gold"></span>
              <span className="text-xs uppercase font-bold tracking-widest text-gold-600">
                BUDGET
              </span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-charcoal leading-[1.15] tracking-tight">
              Tahu ke mana <br />
              <span className="text-burgundy italic">uangmu pergi.</span>
            </h2>

            <p className="text-sm sm:text-base text-charcoal-400 leading-relaxed font-normal">
              Buat anggaran, catat pengeluaran, dan pantau pembayaran vendor tanpa harus membuka spreadsheet yang berbeda.
            </p>

            <div className="space-y-3.5 sm:space-y-4 pt-1">
              <div className="flex items-start gap-3.5">
                <div className="w-6 h-6 rounded-full bg-burgundy-50 border border-burgundy-200 flex items-center justify-center text-burgundy shrink-0 mt-0.5 shadow-2xs">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-charcoal">Pantau DP & Pelunasan Bertahap</h4>
                  <p className="text-xs text-charcoal-400 mt-0.5 leading-relaxed">
                    Catat termin pembayaran dengan pengingat sebelum jatuh tempo.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-6 h-6 rounded-full bg-burgundy-50 border border-burgundy-200 flex items-center justify-center text-burgundy shrink-0 mt-0.5 shadow-2xs">
                  <CheckCircle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-charcoal">Deteksi Pembengkakan Sejak Dini</h4>
                  <p className="text-xs text-charcoal-400 mt-0.5 leading-relaxed">
                    Notifikasi visual bila salah satu kategori mendekati batas alokasi.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Responsive Mobile-First Budget UI Showcase (lg: 7 cols) */}
          <div className="lg:col-span-7 w-full">
            <div className="relative bg-ivory-50/50 rounded-2xl sm:rounded-3xl p-4 sm:p-7 lg:p-8 border border-beige-300 shadow-card">
              
              {/* Card Header with Totals */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-beige gap-3">
                <div>
                  <span className="text-[11px] sm:text-xs uppercase font-semibold tracking-wider text-charcoal-400 block">
                    Alokasi Anggaran Pernikahan
                  </span>
                  <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                    <span className="font-serif text-2xl sm:text-3xl font-bold text-charcoal">
                      {formatRupiah(usedBudget)}
                    </span>
                    <span className="text-xs sm:text-sm text-charcoal-400 font-medium">
                      / {formatRupiah(totalBudget)}
                    </span>
                  </div>
                </div>

                <div className="bg-white px-3.5 py-2 rounded-xl border border-beige shadow-2xs flex items-center justify-between sm:justify-start gap-3">
                  <div>
                    <span className="text-[10px] sm:text-[11px] text-charcoal-400 font-medium block">Sisa Anggaran Aman</span>
                    <span className="font-semibold text-emerald-700 text-xs sm:text-sm">{formatRupiah(remainingBudget)}</span>
                  </div>
                </div>
              </div>

              {/* Budget Progress Bar */}
              <div className="py-3.5 sm:py-4">
                <div className="flex justify-between text-xs text-charcoal-400 mb-1.5 font-medium">
                  <span>Alokasi Terpakai (72.45%)</span>
                  <span className="font-semibold text-burgundy">27.55% Tersisa</span>
                </div>
                <div className="h-3 w-full bg-ivory-200 rounded-full overflow-hidden flex">
                  <div className="bg-burgundy h-full" style={{ width: '40%' }} title="Venue (40%)" />
                  <div className="bg-burgundy-400 h-full border-l border-white" style={{ width: '12.5%' }} title="Catering (12.5%)" />
                  <div className="bg-gold-500 h-full border-l border-white" style={{ width: '7.5%' }} title="Dekorasi (7.5%)" />
                  <div className="bg-gold-400 h-full border-l border-white" style={{ width: '6%' }} title="Foto (6%)" />
                  <div className="bg-charcoal-400 h-full border-l border-white" style={{ width: '6.45%' }} title="MUA (6.45%)" />
                </div>
              </div>

              {/* Categories Breakdown List: Mobile Vertical Cards, Desktop Row */}
              <div className="space-y-2 pt-1">
                <div className="hidden sm:flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-charcoal-400 px-1">
                  <span>Kategori Utama</span>
                  <span>Alokasi & Status</span>
                </div>

                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCat(selectedCat === cat.id ? null : cat.id)}
                    className={`p-3 sm:p-3.5 rounded-xl border transition-all duration-200 cursor-pointer min-h-touch ${
                      selectedCat === cat.id
                        ? 'bg-white border-burgundy-300 shadow-sm'
                        : 'bg-white/85 border-beige hover:border-beige-300 hover:bg-white'
                    }`}
                  >
                    {/* Mobile & Desktop Adaptive Layout */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3">
                      {/* Left: Category + Vendor */}
                      <div className="flex items-center justify-between sm:justify-start gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full bg-burgundy shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-semibold text-charcoal block truncate">
                              {cat.name}
                            </span>
                            <span className="text-[11px] text-charcoal-400 block truncate">
                              {cat.vendorName}
                            </span>
                          </div>
                        </div>

                        {/* Mobile-only badge placement */}
                        <div className="sm:hidden shrink-0">
                          <Badge
                            variant={cat.status === 'Lunas' ? 'success' : 'burgundy'}
                            size="sm"
                          >
                            {cat.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Right: Currency & Status */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 pt-1 sm:pt-0 border-t sm:border-t-0 border-beige/40">
                        <div className="text-xs sm:text-sm font-bold text-charcoal">
                          {formatRupiah(cat.spent)}
                        </div>
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-[10px] sm:text-[11px] text-charcoal-400">
                            Pagu: {formatRupiah(cat.allocated)}
                          </span>
                          <div className="hidden sm:block">
                            <Badge
                              variant={cat.status === 'Lunas' ? 'success' : 'burgundy'}
                              size="sm"
                            >
                              {cat.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Clean footer note */}
              <div className="mt-3.5 sm:mt-4 pt-3 border-t border-beige flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-charcoal-400 gap-1">
                <span>✓ Otomatis sinkron saat bukti transfer dicatat</span>
                <span className="text-burgundy font-medium">Bebas Rumus Excel</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
