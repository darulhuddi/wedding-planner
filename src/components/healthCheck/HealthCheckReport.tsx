import React from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Compass,
  Edit3,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { BrandMark } from '../brand';
import { WeddingHealthReport, HealthStatusLevel, HealthCheckInput } from '../../domain/healthCheck/types';
import { NextBestAction } from '../../types/onboarding';

export interface HealthCheckReportProps {
  report: WeddingHealthReport;
  input: HealthCheckInput;
  onStartPlanning: () => void;
  onEditAnswers: () => void;
}

function getCalmStatusCopy(status: HealthStatusLevel): { title: string; badgeColor: string } {
  switch (status) {
    case 'on_track':
      return {
        title: 'Kamu cukup on track.',
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    case 'quite_on_track':
      return {
        title: 'Persiapanmu sudah berjalan, tapi ada beberapa hal yang perlu dipercepat.',
        badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
      };
    case 'needs_attention':
      return {
        title: 'Ada beberapa hal penting yang perlu kamu prioritaskan.',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    case 'critical_urgency':
      return {
        title: 'Ada hal yang perlu segera dibereskan.',
        badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
      };
    default:
      return {
        title: 'Analisis persiapan selesai.',
        badgeColor: 'bg-charcoal-50 text-charcoal-800 border-charcoal-200',
      };
  }
}

function getPersonalizedConcernCopy(concern?: string): string | null {
  if (!concern) return null;
  switch (concern) {
    case 'budget':
      return 'Karena budget adalah hal yang paling kamu khawatirkan, perhatikan area pengeluaran yang paling cepat bertambah dan selalu sisihkan dana tak terduga minimal 10%.';
    case 'vendor':
      return 'Karena vendor menjadi perhatian utamamu, fokus pertama adalah mengamankan vendor yang paling memengaruhi timeline (terutama Venue & Catering).';
    case 'time':
      return 'Karena waktu yang makin dekat menjadi kekhawatiranmu, dahulukan tugas berprioritas tinggi dan hindari menunda keputusan fondasi.';
    case 'guests':
      return 'Karena daftar tamu menjadi perhatianmu, kunci estimasi jumlah undangan lebih awal agar porsi catering dan kapasitas venue tetap presisi.';
    case 'overwhelmed':
      return 'Karena merasa terlalu banyak yang harus diurus, selesaikan satu per satu rekomendasi aksi di bawah tanpa perlu memikirkan semuanya sekaligus.';
    case 'confused':
      return 'Karena belum tahu harus mulai dari mana, mulai tepat dari Next Best Action nomor 1. Sistem WedSiap akan otomatis memandu langkah berikutnya.';
    default:
      return null;
  }
}

export const HealthCheckReport: React.FC<HealthCheckReportProps> = ({
  report,
  input,
  onStartPlanning,
  onEditAnswers,
}) => {
  const statusInfo = getCalmStatusCopy(report.overall.status);
  const concernCopy = getPersonalizedConcernCopy(input.concern);

  // Combine primary NBA and complementary recommended actions (up to 3 items total)
  const actionsList: NextBestAction[] = [
    report.nextBestAction,
    ...(report.recommendedActions || []).filter((a) => a.id !== report.nextBestAction?.id),
  ].slice(0, 3);

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col selection:bg-burgundy-100 selection:text-burgundy-900 pb-16">
      {/* Background tint */}
      <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-beige-100/40 via-ivory-100/20 to-transparent -z-10 pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BrandMark size="md" className="shadow-xs" />
          <span className="font-serif text-xl font-bold tracking-tight text-charcoal">
            Wed<span className="text-burgundy">Siap</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onEditAnswers}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-beige-300 bg-white/80 hover:bg-white text-charcoal-500 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
        >
          <Edit3 className="w-3.5 h-3.5 text-charcoal-400" />
          <span>Ubah Jawaban</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-grow w-full max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Title & Introduction */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-50 border border-gold-200/60 text-gold-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hasil Analisis Objektif</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-charcoal tracking-tight">
            Wedding Health Report
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-500 max-w-md mx-auto">
            Ini gambaran posisi persiapan wedding kamu berdasarkan data yang kamu masukkan.
          </p>
          <p className="text-xs text-charcoal-400">
            {report.formattedWeddingDate} • H-{report.daysUntilWedding} hari tersisa
          </p>
        </div>

        {/* HERO CARD: READINESS SCORE */}
        <div className="bg-white rounded-3xl border border-beige-200 p-6 sm:p-8 shadow-card text-center space-y-5">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider">
              Tingkat Kesiapan Keseluruhan
            </p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="font-serif text-5xl sm:text-6xl font-bold text-burgundy tracking-tight">
                {report.overall.score}
              </span>
              <span className="text-xl sm:text-2xl font-medium text-charcoal-300">/ 100</span>
            </div>
          </div>

          {/* Calm Status Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs sm:text-sm font-semibold max-w-md mx-auto leading-relaxed shadow-2xs">
            <span className={`w-2 h-2 rounded-full shrink-0 ${statusInfo.badgeColor}`} />
            <span>{statusInfo.title}</span>
          </div>

          <p className="text-xs sm:text-sm text-charcoal-500 max-w-lg mx-auto leading-relaxed">
            {report.overall.summary}
          </p>

          {/* Hero Quick CTA */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={onStartPlanning}
              icon={<ArrowRight className="w-4 h-4" />}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold shadow-md"
            >
              Mulai Wedding Plan Gratis
            </Button>
          </div>
        </div>

        {/* PERSONALIZATION CONTEXT (if available) */}
        {concernCopy && (
          <div className="p-4 sm:p-5 bg-gold-50/60 rounded-2xl border border-gold-200/80 flex items-start gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-gold-100 border border-gold-300 flex items-center justify-center text-gold-700 shrink-0 mt-0.5">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gold-900">Catatan Khusus Sesuai Prioritasmu:</p>
              <p className="text-xs sm:text-sm text-gold-800 leading-relaxed mt-0.5">{concernCopy}</p>
            </div>
          </div>
        )}

        {/* THREE HEALTH DIMENSIONS */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider px-1">
            3 Dimensi Kesehatan Wedding
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            
            {/* Dimension 1: Preparation */}
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-beige-200/80 shadow-2xs space-y-2 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-burgundy" />
                    <span className="text-xs font-semibold text-charcoal">Progres Area</span>
                  </div>
                  <span className="px-2 py-0.5 bg-ivory-200 rounded-full text-[10px] font-medium text-charcoal-600">
                    {report.readiness.status}
                  </span>
                </div>
                <p className="text-base sm:text-lg font-bold text-charcoal">
                  {report.readiness.completedModulesCount} dari {report.readiness.totalModulesCount} area
                </p>
                <p className="text-xs text-charcoal-400 leading-relaxed">
                  {report.readiness.summary}
                </p>
              </div>
              <div className="w-full bg-beige-200 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-burgundy h-full rounded-full"
                  style={{
                    width: `${Math.round(
                      (report.readiness.completedModulesCount / (report.readiness.totalModulesCount || 1)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Dimension 2: Budget */}
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-beige-200/80 shadow-2xs space-y-2 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-charcoal">Posisi Budget</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-medium">
                    {report.budget.statusLabel}
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold text-charcoal">
                  Rp {(report.budget.overview.totalSpent / 1_000_000).toLocaleString('id-ID')} jt{' '}
                  <span className="text-xs font-normal text-charcoal-400">
                    / {(report.budget.overview.totalBudget / 1_000_000).toLocaleString('id-ID')} jt
                  </span>
                </p>
                <p className="text-xs text-charcoal-400 leading-relaxed">
                  {report.budget.summary}
                </p>
              </div>
              <div className="w-full bg-beige-200 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full ${
                    report.budget.status === 'melebihi_budget'
                      ? 'bg-rose-500'
                      : report.budget.status === 'mendekati_batas'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (report.budget.overview.totalSpent / (report.budget.overview.totalBudget || 1)) * 100
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Dimension 3: Timeline */}
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-beige-200/80 shadow-2xs space-y-2 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-charcoal">Pacing Waktu</span>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-[10px] font-medium">
                    H-{report.daysUntilWedding} Hari
                  </span>
                </div>
                <p className="text-base sm:text-lg font-bold text-charcoal">
                  {report.timeline.timelineSummary.overdueTasks > 0
                    ? `${report.timeline.timelineSummary.overdueTasks} Tugas Terlewat`
                    : 'Timeline Terkendali'}
                </p>
                <p className="text-xs text-charcoal-400 leading-relaxed">
                  {report.timeline.summary}
                </p>
              </div>
              <div className="w-full bg-beige-200 h-1.5 rounded-full overflow-hidden mt-2">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

          </div>
        </div>

        {/* BIGGEST RISKS */}
        {report.risks && report.risks.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider">
                Risiko yang Perlu Kamu Waspadai
              </h2>
              <span className="text-xs text-charcoal-400">{report.risks.length} terdeteksi</span>
            </div>

            <div className="space-y-2.5">
              {report.risks.map((risk) => (
                <div
                  key={risk.id}
                  className="p-4 bg-white rounded-2xl border border-beige-200/80 shadow-2xs flex items-start gap-3.5"
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      risk.severity === 'high'
                        ? 'bg-rose-50 border border-rose-200 text-rose-600'
                        : 'bg-amber-50 border border-amber-200 text-amber-600'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs sm:text-sm font-semibold text-charcoal">{risk.title}</p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          risk.severity === 'high'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {risk.severity === 'high' ? 'Prioritas Utama' : 'Perhatian'}
                      </span>
                    </div>
                    <p className="text-xs text-charcoal-500 leading-relaxed">{risk.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NEXT BEST ACTIONS */}
        <div className="space-y-3 pt-2">
          <div className="px-1">
            <h2 className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider">
              Rekomendasi Tindakan
            </h2>
            <p className="font-serif text-xl sm:text-2xl font-semibold text-charcoal mt-1">
              3 hal yang paling penting kamu lakukan sekarang
            </p>
          </div>

          <div className="space-y-3">
            {actionsList.map((action, idx) => (
              <div
                key={action.id || idx}
                className="p-4 sm:p-5 bg-white rounded-2xl border border-beige-200/80 shadow-2xs flex items-start gap-4 transition-all hover:border-beige-300"
              >
                <div className="w-8 h-8 rounded-xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy font-semibold text-sm shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-charcoal">{action.title}</h3>
                    {action.priorityTag ? (
                      <span className="text-[10px] px-2 py-0.5 bg-ivory-200 text-charcoal-600 rounded-full font-medium shrink-0">
                        {action.priorityTag}
                      </span>
                    ) : action.priority === 'high' ? (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-medium shrink-0">
                        Prioritas Utama
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 bg-ivory-200 text-charcoal-600 rounded-full font-medium shrink-0">
                        Rekomendasi
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-charcoal-500 leading-relaxed">
                    {action.reason || action.description || 'Langkah penting untuk mengamankan timeline persiapan pernikahanmu.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FINAL CONVERSION CTA BANNER */}
        <div className="p-6 sm:p-8 bg-gradient-to-br from-burgundy-900 via-charcoal-900 to-charcoal-900 rounded-3xl text-ivory text-center space-y-4 shadow-xl border border-charcoal-700 mt-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ivory-200/10 border border-ivory-200/20 text-gold-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simpan Hasil & Lanjutkan</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-ivory">
            Mulai Wedding Plan Gratis
          </h2>

          <p className="text-xs sm:text-sm text-charcoal-200 max-w-md mx-auto leading-relaxed">
            Jangan biarkan hasil ini berhenti sebagai laporan. Simpan persiapanmu di WedSiap dan dapatkan langkah berikutnya yang terus menyesuaikan dengan progresmu.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={onStartPlanning}
              icon={<ArrowRight className="w-4 h-4" />}
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold shadow-md bg-burgundy hover:bg-burgundy-700"
            >
              Mulai Wedding Plan Gratis
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-charcoal-300 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-gold-400 shrink-0" />
            <span>Gratis • Tanpa kartu kredit • Data Health Check otomatis masuk ke akunmu</span>
          </div>
        </div>

      </main>
    </div>
  );
};
