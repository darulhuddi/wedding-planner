import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Compass, AlertTriangle, ArrowUpRight, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';
import { BrandMark } from '../brand';

export interface HealthCheckEntryProps {
  onStart: () => void;
  hasExistingAssessment?: boolean;
  onViewExisting?: () => void;
  onResetExisting?: () => void;
}

export const HealthCheckEntry: React.FC<HealthCheckEntryProps> = ({
  onStart,
  hasExistingAssessment,
  onViewExisting,
  onResetExisting,
}) => {
  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col selection:bg-burgundy-100 selection:text-burgundy-900">
      {/* Subtle background decoration */}
      <div className="absolute top-0 left-0 right-0 h-[480px] bg-gradient-to-b from-beige-100/40 via-ivory-100/20 to-transparent -z-10 pointer-events-none" />

      {/* Header / Brand */}
      <header className="w-full max-w-container mx-auto px-4 sm:px-6 md:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <BrandMark size="md" className="shadow-xs" />
          <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-charcoal">
            Wed<span className="text-burgundy">Siap</span>
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ivory-200 border border-beige-300 text-charcoal-500 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-gold-500" />
          <span>Wedding Health Check</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center px-4 sm:px-6 md:px-8 py-8 sm:py-12">
        <div className="w-full max-w-2xl mx-auto text-center space-y-6 sm:space-y-8">
          
          {/* Reassurance Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-burgundy-50 border border-burgundy-100 text-burgundy-700 text-xs sm:text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-burgundy animate-pulse" />
            <span>Gratis • 3 Menit • Tanpa Perlu Daftar</span>
          </div>

          {/* Primary Headline */}
          <div className="space-y-3">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold text-charcoal leading-[1.2] tracking-tight">
              Seberapa siap <br />
              <span className="text-burgundy italic">wedding kamu?</span>
            </h1>
            <p className="text-sm sm:text-base text-charcoal-500 max-w-lg mx-auto leading-relaxed">
              Ceritakan kondisi persiapanmu. WedSiap akan menganalisis posisi, risiko utama, dan langkah yang paling penting kamu lakukan berikutnya.
            </p>
          </div>

          {/* Existing Assessment Banner (if any) */}
          {hasExistingAssessment && (
            <div className="p-4 bg-white rounded-2xl border border-gold-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-600 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-charcoal">
                    Kamu memiliki laporan analisis sebelumnya
                  </p>
                  <p className="text-xs text-charcoal-400">
                    Kamu bisa langsung melihat laporan atau mulai analisis baru.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                {onViewExisting && (
                  <button
                    type="button"
                    onClick={onViewExisting}
                    className="px-3.5 py-2 bg-burgundy text-white rounded-xl text-xs font-medium hover:bg-burgundy-700 transition-colors cursor-pointer"
                  >
                    Buka Laporan
                  </button>
                )}
                {onResetExisting && (
                  <button
                    type="button"
                    onClick={onResetExisting}
                    className="px-3 py-2 text-charcoal-400 hover:text-charcoal text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    title="Mulai ulang dari awal"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Mulai Baru</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Primary CTA */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={onStart}
              icon={<ArrowRight className="w-4 h-4" />}
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold shadow-md"
            >
              Cek Persiapan Wedding
            </Button>
          </div>

          {/* Three Key Outcomes */}
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-left">
            <div className="p-4 bg-white rounded-2xl border border-beige-200/80 shadow-2xs space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy-600">
                <Compass className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-charcoal">Tahu Posisi Nyata</h3>
              <p className="text-xs text-charcoal-400 leading-relaxed">
                Skor kesiapan komposit dan evaluasi 3 dimensi: Progres, Budget, & Timeline.
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-beige-200/80 shadow-2xs space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-charcoal">Deteksi Risiko Dini</h3>
              <p className="text-xs text-charcoal-400 leading-relaxed">
                Peringatan dini pada fondasi kritis seperti Venue, KUA, atau pacing anggaran.
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-beige-200/80 shadow-2xs space-y-1.5">
              <div className="w-8 h-8 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-600">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-charcoal">Langkah Berikutnya</h3>
              <p className="text-xs text-charcoal-400 leading-relaxed">
                3 Next Best Actions terpenting berdasarkan kondisi spesifik persiapanmu.
              </p>
            </div>
          </div>

          {/* Calm Reassurances */}
          <div className="pt-2 flex items-center justify-center gap-2 text-xs text-charcoal-400">
            <ShieldCheck className="w-4 h-4 text-gold-500 shrink-0" />
            <span>Hasil dianalisis otomatis secara objektif berdasarkan kondisi yang kamu masukkan.</span>
          </div>

        </div>
      </main>
    </div>
  );
};
