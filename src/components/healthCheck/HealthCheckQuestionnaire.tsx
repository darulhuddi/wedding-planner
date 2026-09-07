import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Calendar, Users, MapPin, DollarSign, Heart, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { HealthCheckInput, HealthCheckVendorStatus, HealthCheckAdministrationStatus } from '../../domain/healthCheck/types';
import { CategoryId, PlanningPriority } from '../../types/onboarding';
import { ReligiousTradition } from '../../domain/context';

export interface HealthCheckQuestionnaireProps {
  initialValues?: Partial<HealthCheckInput>;
  onComplete: (data: HealthCheckInput) => void;
  onBackToEntry: () => void;
}

const VENDOR_ITEMS: Array<{ id: CategoryId; label: string; description: string }> = [
  { id: 'venue', label: 'Venue / Gedung', description: 'Lokasi akad/pemberkatan & resepsi' },
  { id: 'catering', label: 'Catering', description: 'Paket makanan tamu & gubukan' },
  { id: 'photography', label: 'Foto & Video', description: 'Dokumentasi momen penting' },
  { id: 'decoration', label: 'Dekorasi', description: 'Pelaminan, lorong masuk, & meja' },
  { id: 'makeup_attire', label: 'MUA & Busana', description: 'Riasan pengantin & baju adat/modern' },
  { id: 'invitation', label: 'Undangan & Tamu', description: 'Cetak/digital invitation & daftar tamu' },
];

const CONCERN_OPTIONS = [
  { id: 'budget', label: 'Budget', desc: 'Takut over-budget atau biaya tak terduga membengkak' },
  { id: 'vendor', label: 'Vendor', desc: 'Bingung memilih, negosiasi, atau mengunci vendor yang tepat' },
  { id: 'time', label: 'Waktu yang makin dekat', desc: 'Merasa waktu berjalan cepat sementara banyak yang belum siap' },
  { id: 'guests', label: 'Daftar tamu', desc: 'Kesulitan menyaring undangan keluarga dan teman' },
  { id: 'overwhelmed', label: 'Terlalu banyak yang harus diurus', desc: 'Kewalahan dengan banyaknya detail dan koordinasi' },
  { id: 'confused', label: 'Aku nggak tahu harus mulai dari mana', desc: 'Butuh panduan langkah demi langkah yang jelas dan tenang' },
];

const TRADITION_OPTIONS: Array<{ id: ReligiousTradition; label: string }> = [
  { id: 'islam', label: 'Islam (KUA)' },
  { id: 'christian', label: 'Kristen (Gereja & Disdukcapil)' },
  { id: 'catholic', label: 'Katolik (Gereja & Disdukcapil)' },
  { id: 'hindu', label: 'Hindu' },
  { id: 'buddhist', label: 'Buddha' },
  { id: 'confucian', label: 'Khonghucu' },
  { id: 'other', label: 'Sipil / Lainnya' },
];

const ADMIN_STATUS_OPTIONS: Array<{ id: HealthCheckAdministrationStatus; label: string }> = [
  { id: 'not_started', label: 'Belum mulai' },
  { id: 'in_progress', label: 'Sedang kumpul berkas' },
  { id: 'registered', label: 'Sudah daftar KUA / Catatan Sipil' },
  { id: 'completed', label: 'Sudah beres / selesai' },
];

const PRIORITY_OPTIONS: Array<{ id: PlanningPriority; label: string; desc: string }> = [
  { id: 'timeline', label: 'Timeline & Deadline', desc: 'Fokus pada waktu dan urutan pengerjaan' },
  { id: 'budget', label: 'Kontrol Budget', desc: 'Fokus pada alokasi dan keamanan pengeluaran' },
  { id: 'checklist', label: 'Checklist Terstruktur', desc: 'Fokus pada penyelesaian to-do per modul' },
  { id: 'vendor', label: 'Pengamanan Vendor', desc: 'Fokus pada komunikasi dan penguncian vendor' },
];

export const HealthCheckQuestionnaire: React.FC<HealthCheckQuestionnaireProps> = ({
  initialValues,
  onComplete,
  onBackToEntry,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form States
  const [coupleName, setCoupleName] = useState<string>(initialValues?.coupleName || '');
  const [weddingDate, setWeddingDate] = useState<string>(initialValues?.weddingDate || '');
  const [location, setLocation] = useState<string>(initialValues?.location || '');
  const [guestCount, setGuestCount] = useState<number>(initialValues?.estimatedGuestCount || 300);

  const [vendorStatus, setVendorStatus] = useState<Record<CategoryId, HealthCheckVendorStatus>>(() => {
    const defaults: Record<CategoryId, HealthCheckVendorStatus> = {
      venue: 'not_started',
      catering: 'not_started',
      photography: 'not_started',
      decoration: 'not_started',
      makeup_attire: 'not_started',
      invitation: 'not_started',
    };
    return { ...defaults, ...(initialValues?.vendorStatus || {}) };
  });

  const [religiousTradition, setReligiousTradition] = useState<ReligiousTradition>(
    initialValues?.religiousTradition || 'islam'
  );
  const [adminStatus, setAdminStatus] = useState<HealthCheckAdministrationStatus>(
    initialValues?.administrationStatus?.status || 'not_started'
  );

  const [estimatedBudget, setEstimatedBudget] = useState<number>(
    initialValues?.estimatedBudget || 100_000_000
  );
  const [budgetCommittedPct, setBudgetCommittedPct] = useState<number>(
    initialValues?.budgetCommittedPercentage ?? 20
  );

  const [concern, setConcern] = useState<string>(initialValues?.concern || 'vendor');
  const [primaryPlanningPriority, setPrimaryPlanningPriority] = useState<PlanningPriority>(
    initialValues?.primaryPlanningPriority || 'timeline'
  );

  const handleVendorStatusChange = (cat: CategoryId, status: HealthCheckVendorStatus) => {
    setVendorStatus((prev) => ({ ...prev, [cat]: status }));
  };

  const handleNext = () => {
    setErrorMsg(null);

    // Validation per step
    if (currentStep === 1) {
      if (!weddingDate) {
        setErrorMsg('Silakan pilih estimasi tanggal pernikahan kamu.');
        return;
      }
      if (guestCount <= 0) {
        setErrorMsg('Estimasi jumlah tamu harus lebih dari 0.');
        return;
      }
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (currentStep === 2) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (currentStep === 3) {
      if (estimatedBudget <= 0) {
        setErrorMsg('Estimasi budget pernikahan harus lebih dari 0.');
        return;
      }
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (currentStep === 4) {
      // Complete Questionnaire
      const finalInput: HealthCheckInput = {
        coupleName: coupleName.trim() || 'Kamu & Pasangan',
        weddingDate,
        location: location.trim() || undefined,
        estimatedGuestCount: Number(guestCount),
        estimatedBudget: Number(estimatedBudget),
        budgetCommittedPercentage: Number(budgetCommittedPct),
        vendorStatus,
        administrationStatus: {
          status: adminStatus,
        },
        religiousTradition,
        concern,
        primaryPlanningPriority,
      };

      onComplete(finalInput);
    }
  };

  const handlePrev = () => {
    setErrorMsg(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onBackToEntry();
    }
  };

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col">
      {/* Top Progress Bar */}
      <div className="sticky top-0 z-30 bg-ivory/95 backdrop-blur-md border-b border-beige-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-charcoal-500 hover:text-charcoal cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-charcoal-400 font-medium">Langkah {currentStep} dari 4</span>
            <div className="w-24 sm:w-32 h-1.5 bg-beige-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-burgundy transition-all duration-300 rounded-full"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-grow flex items-start justify-center px-4 sm:px-6 py-6 sm:py-10">
        <div className="w-full max-w-2xl bg-white rounded-3xl border border-beige-200 p-6 sm:p-8 shadow-card space-y-6">
          
          {/* Error Alert */}
          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 bg-burgundy-50 border border-burgundy-200 rounded-xl flex items-center gap-2 text-xs sm:text-sm text-burgundy-700 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-burgundy-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: WEDDING BASICS */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <span className="text-xs font-semibold text-gold-600 uppercase tracking-wider">Langkah 1</span>
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal mt-1">
                  Ceritakan sedikit tentang wedding kamu
                </h2>
                <p className="text-xs sm:text-sm text-charcoal-400 mt-1">
                  Data ini membantu WedSiap mengukur pacing waktu dan skala persiapanmu.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {/* Couple Name (Optional) */}
                <div>
                  <label htmlFor="couple-name" className="block text-xs font-medium text-charcoal-600 mb-1.5">
                    Nama Kamu & Pasangan (Opsional)
                  </label>
                  <div className="relative">
                    <input
                      id="couple-name"
                      type="text"
                      placeholder="Contoh: Rian & Nisa"
                      value={coupleName}
                      onChange={(e) => setCoupleName(e.target.value)}
                      className="w-full px-3.5 py-3 bg-ivory-50 border border-beige rounded-xl text-sm text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy"
                    />
                    <Heart className="w-4 h-4 text-charcoal-300 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Wedding Date */}
                <div>
                  <label htmlFor="wedding-date" className="block text-xs font-medium text-charcoal-600 mb-1.5">
                    Estimasi Tanggal Pernikahan <span className="text-burgundy">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="wedding-date"
                      type="date"
                      required
                      value={weddingDate}
                      onChange={(e) => setWeddingDate(e.target.value)}
                      className="w-full px-3.5 py-3 bg-ivory-50 border border-beige rounded-xl text-sm text-charcoal focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy"
                    />
                    <Calendar className="w-4 h-4 text-charcoal-300 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-charcoal-400 mt-1">
                    Bisa diubah kapan saja jika tanggal belum 100% final.
                  </p>
                </div>

                {/* Location */}
                <div>
                  <label htmlFor="wedding-location" className="block text-xs font-medium text-charcoal-600 mb-1.5">
                    Kota / Wilayah Acara (Opsional)
                  </label>
                  <div className="relative">
                    <input
                      id="wedding-location"
                      type="text"
                      placeholder="Contoh: Jakarta Selatan, Bandung, Surabaya"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3.5 py-3 bg-ivory-50 border border-beige rounded-xl text-sm text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy"
                    />
                    <MapPin className="w-4 h-4 text-charcoal-300 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                {/* Guest Count */}
                <div>
                  <label htmlFor="guest-count" className="block text-xs font-medium text-charcoal-600 mb-1.5">
                    Perkiraan Jumlah Tamu Undangan
                  </label>
                  <div className="relative">
                    <input
                      id="guest-count"
                      type="number"
                      min={10}
                      max={5000}
                      step={50}
                      value={guestCount}
                      onChange={(e) => setGuestCount(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3.5 py-3 bg-ivory-50 border border-beige rounded-xl text-sm text-charcoal focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy"
                    />
                    <Users className="w-4 h-4 text-charcoal-300 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                  <div className="flex gap-2 pt-1.5">
                    {[100, 300, 500, 800].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setGuestCount(count)}
                        className={`px-2.5 py-1 text-xs rounded-lg border cursor-pointer transition-colors ${
                          guestCount === count
                            ? 'bg-burgundy-50 border-burgundy text-burgundy font-medium'
                            : 'bg-white border-beige-200 text-charcoal-500 hover:border-beige-300'
                        }`}
                      >
                        {count} Tamu
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREPARATION & ADMINISTRATION STATUS */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <span className="text-xs font-semibold text-gold-600 uppercase tracking-wider">Langkah 2</span>
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal mt-1">
                  Seberapa jauh persiapanmu?
                </h2>
                <p className="text-xs sm:text-sm text-charcoal-400 mt-1">
                  Tandai status area vendor utama dan administrasi pernikahan kamu saat ini.
                </p>
              </div>

              {/* Vendor Checklist Items */}
              <div className="space-y-3 pt-1">
                {VENDOR_ITEMS.map((item) => {
                  const currentVal = vendorStatus[item.id];
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 bg-ivory-50 rounded-2xl border border-beige-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-charcoal">{item.label}</p>
                        <p className="text-[11px] text-charcoal-400">{item.description}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 shrink-0">
                        {(
                          [
                            { id: 'completed', label: 'Sudah Beres' },
                            { id: 'in_progress', label: 'Sedang Proses' },
                            { id: 'not_started', label: 'Belum Mulai' },
                          ] as const
                        ).map((statusChoice) => {
                          const isSelected = currentVal === statusChoice.id;
                          return (
                            <button
                              key={statusChoice.id}
                              type="button"
                              onClick={() => handleVendorStatusChange(item.id, statusChoice.id)}
                              className={`px-2.5 py-1.5 text-xs rounded-xl font-medium border transition-all cursor-pointer text-center ${
                                isSelected
                                  ? statusChoice.id === 'completed'
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                                    : statusChoice.id === 'in_progress'
                                    ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-2xs'
                                    : 'bg-white border-burgundy text-burgundy shadow-2xs'
                                  : 'bg-white border-beige text-charcoal-400 hover:border-beige-300'
                              }`}
                            >
                              {statusChoice.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Administration Mini Section */}
              <div className="pt-2 border-t border-beige-200/80 space-y-3">
                <p className="text-xs sm:text-sm font-semibold text-charcoal">
                  Administrasi & Legalitas Pernikahan
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-charcoal-500 mb-1">
                      Konteks Agama / Prosesi
                    </label>
                    <select
                      value={religiousTradition}
                      onChange={(e) => setReligiousTradition(e.target.value as ReligiousTradition)}
                      className="w-full px-3 py-2.5 bg-ivory-50 border border-beige rounded-xl text-xs sm:text-sm text-charcoal focus:outline-none focus:border-burgundy"
                    >
                      {TRADITION_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-charcoal-500 mb-1">
                      Status Dokumen / Pendaftaran
                    </label>
                    <select
                      value={adminStatus}
                      onChange={(e) => setAdminStatus(e.target.value as HealthCheckAdministrationStatus)}
                      className="w-full px-3 py-2.5 bg-ivory-50 border border-beige rounded-xl text-xs sm:text-sm text-charcoal focus:outline-none focus:border-burgundy"
                    >
                      {ADMIN_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: BUDGET CONDITION */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <span className="text-xs font-semibold text-gold-600 uppercase tracking-wider">Langkah 3</span>
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal mt-1">
                  Bagaimana kondisi budget-nya?
                </h2>
                <p className="text-xs sm:text-sm text-charcoal-400 mt-1">
                  Ketahui kesehatan alokasi dan risiko komitmen anggaran secara realistis.
                </p>
              </div>

              <div className="space-y-5 pt-2">
                {/* Total Budget */}
                <div>
                  <label htmlFor="estimated-budget" className="block text-xs font-medium text-charcoal-600 mb-1.5">
                    Total Estimasi Anggaran Pernikahan (Rp)
                  </label>
                  <div className="relative">
                    <input
                      id="estimated-budget"
                      type="number"
                      min={5_000_000}
                      step={5_000_000}
                      value={estimatedBudget}
                      onChange={(e) => setEstimatedBudget(Math.max(0, Number(e.target.value)))}
                      className="w-full pl-10 pr-3.5 py-3 bg-ivory-50 border border-beige rounded-xl text-sm font-semibold text-charcoal focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy"
                    />
                    <DollarSign className="w-4 h-4 text-charcoal-300 absolute left-3.5 top-3.5 pointer-events-none" />
                  </div>
                  <p className="text-xs text-charcoal-400 mt-1">
                    Rp {estimatedBudget.toLocaleString('id-ID')}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1.5">
                    {[50_000_000, 100_000_000, 150_000_000, 250_000_000, 400_000_000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setEstimatedBudget(val)}
                        className={`px-2.5 py-1 text-xs rounded-lg border cursor-pointer transition-colors ${
                          estimatedBudget === val
                            ? 'bg-burgundy-50 border-burgundy text-burgundy font-medium'
                            : 'bg-white border-beige-200 text-charcoal-500 hover:border-beige-300'
                        }`}
                      >
                        Rp {val / 1_000_000} Juta
                      </button>
                    ))}
                  </div>
                </div>

                {/* Committed Budget Percentage */}
                <div className="p-4 bg-ivory-50 rounded-2xl border border-beige-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-charcoal">
                        Kira-kira berapa persen dana yang sudah terikat / dibayar DP?
                      </p>
                      <p className="text-[11px] text-charcoal-400">
                        Perkiraan: Rp {Math.round((estimatedBudget * budgetCommittedPct) / 100).toLocaleString('id-ID')} ({budgetCommittedPct}%)
                      </p>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={budgetCommittedPct}
                    onChange={(e) => setBudgetCommittedPct(Number(e.target.value))}
                    className="w-full accent-burgundy cursor-pointer"
                  />

                  <div className="flex justify-between text-[11px] text-charcoal-400">
                    <span>0% (Belum ada DP)</span>
                    <span>50% (Sebagian DP)</span>
                    <span>100% (Sudah lunas/terikat)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: MAIN CONCERN & PRIORITY */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <span className="text-xs font-semibold text-gold-600 uppercase tracking-wider">Langkah 4</span>
                <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal mt-1">
                  Apa yang paling ingin kamu bereskan?
                </h2>
                <p className="text-xs sm:text-sm text-charcoal-400 mt-1">
                  Pilih kekhawatiran utamamu. Ini membantu WedSiap memberikan konteks panduan yang tepat sasaran.
                </p>
              </div>

              {/* Concern Options */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-semibold text-charcoal-600">
                  Apa yang paling bikin kamu khawatir soal persiapan wedding?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CONCERN_OPTIONS.map((item) => {
                    const isSelected = concern === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setConcern(item.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-burgundy-50 border-burgundy text-burgundy shadow-2xs'
                            : 'bg-white border-beige-200/80 text-charcoal hover:border-beige-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                            isSelected ? 'border-burgundy bg-burgundy text-white' : 'border-charcoal-300'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{item.label}</p>
                          <p className="text-[11px] text-charcoal-400 leading-tight mt-0.5">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority Options */}
              <div className="space-y-2 pt-2 border-t border-beige-200/80">
                <label className="block text-xs font-semibold text-charcoal-600">
                  Prioritas Utama Pendampingan:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRIORITY_OPTIONS.map((item) => {
                    const isSelected = primaryPlanningPriority === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPrimaryPlanningPriority(item.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-gold-50 border-gold-500 text-gold-900 shadow-2xs'
                            : 'bg-white border-beige-200/80 text-charcoal hover:border-beige-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                            isSelected ? 'border-gold-600 bg-gold text-white' : 'border-charcoal-300'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{item.label}</p>
                          <p className="text-[11px] text-charcoal-400 leading-tight mt-0.5">{item.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Action Buttons */}
          <div className="pt-4 border-t border-beige-200/80 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-charcoal-500 hover:text-charcoal cursor-pointer"
            >
              {currentStep === 1 ? 'Batalkan' : 'Sebelumnya'}
            </button>

            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {currentStep === 4 ? 'Analisis Sekarang' : 'Lanjutkan'}
            </Button>
          </div>

        </div>
      </main>
    </div>
  );
};
