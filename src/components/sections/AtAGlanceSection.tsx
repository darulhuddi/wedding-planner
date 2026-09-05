import React from 'react';
import { Calendar, CheckCircle2, DollarSign, Clock, Heart } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';
import { Badge } from '../ui/Badge';
import { WEDDING_DATA, TIMELINE_PIPELINE, formatRupiah } from '../../data/mockData';

export const AtAGlanceSection: React.FC = () => {
  return (
    <section className="py-14 sm:py-20 lg:py-22 relative bg-white border-t border-beige">
      <div className="w-full max-w-container mx-auto px-4 sm:px-6 md:px-8 lg:px-12">
        <SectionHeader
          eyebrow="Wedding Overview"
          title="Lihat seluruh perjalanan menuju hari-H, sekilas."
          subtitle="Dari budget hingga checklist, WedSiap membantu kamu melihat posisi persiapan pernikahan tanpa harus membuka banyak halaman."
          align="center"
          className="mb-8 sm:mb-12"
        />

        {/* Signature Editorial Dashboard Poster Layout */}
        <div className="relative max-w-5xl mx-auto">
          <div className="bg-ivory-50/50 rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 border border-beige-300 shadow-card relative overflow-hidden">
            
            {/* Top Poster Meta Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 sm:pb-6 border-b border-beige gap-4">
              <div className="flex items-center gap-3 sm:gap-3.5">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-burgundy flex items-center justify-center text-ivory shadow-sm shrink-0">
                  <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-ivory" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] sm:text-xs uppercase font-bold tracking-widest text-gold-600">
                      Rencana Pernikahan
                    </span>
                    <Badge variant="gold" size="sm">Workspace Aktif</Badge>
                  </div>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight mt-0.5">
                    {WEDDING_DATA.coupleName}
                  </h3>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-5 bg-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-beige shadow-2xs w-full sm:w-auto">
                <div>
                  <span className="text-[10px] sm:text-[11px] uppercase font-semibold text-charcoal-400 tracking-wider block">
                    Tanggal Resepsi
                  </span>
                  <span className="font-medium text-charcoal text-xs sm:text-sm flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-burgundy shrink-0" />
                    {WEDDING_DATA.formattedDate}
                  </span>
                </div>
                <div className="h-7 w-px bg-beige-300" />
                <div>
                  <span className="text-[10px] sm:text-[11px] uppercase font-semibold text-charcoal-400 tracking-wider block">
                    Hitung Mundur
                  </span>
                  <span className="font-serif text-lg sm:text-2xl font-bold text-burgundy mt-0.5 block leading-tight">
                    {WEDDING_DATA.daysRemaining} <span className="text-xs font-sans font-medium text-charcoal-400">hari lagi</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Poster 3 Key Pillars: Progress, Budget, Upcoming */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 py-5 sm:py-6 border-b border-beige">
              {/* Pillar 1: Progress */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-beige shadow-soft">
                <div className="flex justify-between items-center text-xs text-charcoal-400 mb-1.5">
                  <span className="font-semibold text-charcoal">Planning Progress</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="font-serif text-2xl sm:text-3xl font-bold text-charcoal">
                  {WEDDING_DATA.progressPercent}%
                </div>
                <div className="w-full bg-ivory-200 h-2 rounded-full mt-2.5 sm:mt-3 overflow-hidden">
                  <div className="bg-burgundy h-full rounded-full" style={{ width: `${WEDDING_DATA.progressPercent}%` }} />
                </div>
                <p className="text-xs text-charcoal-400 mt-2 sm:mt-2.5">
                  34 dari 50 tahapan telah diselesaikan.
                </p>
              </div>

              {/* Pillar 2: Budget */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-beige shadow-soft">
                <div className="flex justify-between items-center text-xs text-charcoal-400 mb-1.5">
                  <span className="font-semibold text-charcoal">Budget Alokasi</span>
                  <DollarSign className="w-4 h-4 text-burgundy" />
                </div>
                <div className="font-serif text-2xl sm:text-3xl font-bold text-charcoal truncate">
                  {formatRupiah(WEDDING_DATA.usedBudget)}
                </div>
                <div className="text-xs text-charcoal-400 mt-0.5 truncate">
                  dari total {formatRupiah(WEDDING_DATA.totalBudget)}
                </div>
                <div className="w-full bg-ivory-200 h-2 rounded-full mt-2.5 sm:mt-3 overflow-hidden">
                  <div className="bg-burgundy h-full rounded-full" style={{ width: '72%' }} />
                </div>
              </div>

              {/* Pillar 3: Upcoming */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-beige shadow-soft">
                <div className="flex justify-between items-center text-xs text-charcoal-400 mb-1.5">
                  <span className="font-semibold text-charcoal">Upcoming Tasks</span>
                  <Clock className="w-4 h-4 text-gold-600" />
                </div>
                <div className="font-serif text-2xl sm:text-3xl font-bold text-charcoal">
                  5 <span className="text-sm font-sans font-normal text-charcoal-400">tasks</span>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5">
                  <span className="text-xs font-semibold px-2.5 py-0.5 bg-burgundy-50 text-burgundy rounded-md">
                    1 Prioritas Utama
                  </span>
                  <span className="text-xs text-charcoal-400">4 Terjadwal</span>
                </div>
              </div>
            </div>

            {/* Bottom: Milestone Timeline Pipeline - Vertical on Mobile, 5-col Grid on Desktop */}
            <div className="pt-5 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                <div>
                  <span className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-gold-600">
                    Alur Perjalanan Menuju Hari-H
                  </span>
                  <h4 className="font-serif text-lg sm:text-xl font-semibold text-charcoal mt-0.5">
                    Timeline Pipeline
                  </h4>
                </div>
                <span className="self-start sm:self-auto text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Fase Aktif: Vendor Utama
                </span>
              </div>

              {/* Responsive Timeline Pipeline: Stacks vertically with clean indicator on mobile */}
              <div className="flex flex-col sm:grid sm:grid-cols-5 gap-2.5 sm:gap-3">
                {TIMELINE_PIPELINE.map((phase, idx) => (
                  <div
                    key={phase.id}
                    className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
                      phase.isCurrent
                        ? 'bg-burgundy-50 border-burgundy-300 shadow-2xs'
                        : phase.isCompleted
                        ? 'bg-white border-beige text-charcoal-400'
                        : 'bg-white/70 border-beige-200 text-charcoal-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={`font-semibold ${phase.isCurrent ? 'text-burgundy' : 'text-charcoal-400'}`}>
                        0{idx + 1}
                      </span>
                      {phase.isCompleted && (
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                          Selesai
                        </span>
                      )}
                      {phase.isCurrent && (
                        <span className="text-[10px] font-semibold text-burgundy bg-burgundy-100 px-2 py-0.5 rounded">
                          Sekarang
                        </span>
                      )}
                    </div>
                    <div className={`font-serif font-semibold text-sm truncate ${phase.isCurrent ? 'text-charcoal' : 'text-charcoal-500'}`}>
                      {phase.title}
                    </div>
                    <div className="text-[11px] text-charcoal-400 mt-0.5">
                      {phase.period}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
