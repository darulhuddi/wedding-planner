import React, { useState } from 'react';
import { Heart, Calendar, CheckCircle2, DollarSign, Users, ArrowLeft, RefreshCw, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import * as workspaceRepository from '../../repositories/workspaceRepository';
import { deriveWorkspaceViewModel } from '../../domain/workspaceSelectors';
import { CATEGORY_ORDER, CATEGORY_TAXONOMY } from '../../domain/categories';
import { WorkspaceViewModel } from '../../types/workspace';

export interface DashboardPlaceholderProps {
  onNavigateHome: () => void;
  onNavigateOnboarding: () => void;
}

export const DashboardPlaceholder: React.FC<DashboardPlaceholderProps> = ({
  onNavigateHome,
  onNavigateOnboarding,
}) => {
  const [activeWorkspace] = useState<WorkspaceViewModel>(() =>
    deriveWorkspaceViewModel(
      {
        id: 'demo-workspace',
        coupleName: 'Adit & Nisa',
        weddingDate: '2027-02-14',
        estimatedBudget: 100000000,
        estimatedGuestCount: 400,
        completedCategories: ['venue', 'catering'],
        primaryPlanningPriority: 'budget',
        religiousContexts: [],
        culturalContext: {
          hasTradition: null,
          description: null,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      []
    )
  );

  // NBA is pre-computed in WorkspaceViewModel
  const recommendation = activeWorkspace.nextBestAction;
  const isDatePassed = activeWorkspace.daysUntilWedding < 0;

  const getPriorityDisplay = (priority: string) => {
    switch (priority) {
      case 'budget': return 'Budget';
      case 'checklist': return 'Checklist';
      case 'vendor': return 'Vendor';
      case 'timeline': return 'Timeline';
      default: return priority || 'Belum dipilih';
    }
  };

  return (
    <div className="min-h-screen bg-ivory text-charcoal flex flex-col selection:bg-burgundy-100 selection:text-burgundy-900 pb-safe">
      
      {/* Workspace App Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-beige py-3.5 px-4 sm:px-6 md:px-8 shadow-2xs">
        <div className="max-w-container mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-2 group cursor-pointer text-left"
              aria-label="Beranda WedFlow"
            >
              <div className="w-8 h-8 rounded-lg bg-burgundy flex items-center justify-center text-ivory shadow-xs">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="12" r="5" stroke="#FAF8F3" strokeWidth="1.8" />
                  <circle cx="15" cy="12" r="5" stroke="#B89A70" strokeWidth="1.8" />
                </svg>
              </div>
              <span className="font-serif text-xl font-bold tracking-tight text-charcoal">
                Wed<span className="text-burgundy">Flow</span>
              </span>
            </button>
            <span className="h-4 w-px bg-beige-300 hidden sm:inline" />
            <span className="text-xs font-semibold text-burgundy bg-burgundy-50 px-2.5 py-0.5 rounded-full border border-burgundy-100 hidden sm:inline-block">
              Workspace Overview
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onNavigateOnboarding}
              className="text-xs font-medium text-charcoal hover:text-burgundy px-3 py-1.5 rounded-lg border border-beige hover:border-beige-300 transition-colors flex items-center gap-1.5 cursor-pointer min-h-touch"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Ulang Onboarding</span>
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateHome}
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
              iconPosition="left"
              className="hidden sm:inline-flex"
            >
              Beranda
            </Button>
          </div>

        </div>
      </header>

      {/* Main Workspace Dashboard Content */}
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 md:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Header Banner */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-beige-300 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-burgundy flex items-center justify-center text-ivory shadow-sm shrink-0">
                <Heart className="w-7 h-7 fill-ivory" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold tracking-widest text-gold-600">
                    Rencana Pernikahan
                  </span>
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                    Workspace Aktif
                  </span>
                </div>
                <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-charcoal tracking-tight mt-0.5 break-words">
                  {activeWorkspace.coupleName}
                </h1>
                <p className="text-xs sm:text-sm text-charcoal-400 mt-1 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-burgundy shrink-0" />
                  <span>Tanggal Pernikahan: {activeWorkspace.formattedDate}</span>
                </p>
              </div>
            </div>

            {/* Countdown Badge */}
            <div className="bg-ivory-50 px-5 py-3 rounded-2xl border border-beige shadow-2xs self-stretch md:self-auto text-center md:text-right">
              <span className="text-xs uppercase font-bold tracking-wider text-charcoal-400 block">
                Hitung Mundur Hari-H
              </span>
              <span className="font-serif text-2xl sm:text-3xl font-bold text-burgundy block leading-tight mt-0.5">
                {isDatePassed ? (
                  <span className="text-red-700 text-xl font-sans">Tanggal Lewat</span>
                ) : (
                  <>
                    {activeWorkspace.daysUntilWedding} <span className="text-xs font-sans font-normal text-charcoal-400">hari lagi</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* WedFlow Recommendation Banner — Distinct from User Priority */}
          <div className="bg-burgundy-50 border-2 border-burgundy-200/90 rounded-2xl p-5 sm:p-6 shadow-soft relative overflow-hidden space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-burgundy text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0">
                  ★
                </span>
                <span className="text-xs font-medium text-charcoal-500">
                  Fokus pilihanmu: <strong className="text-charcoal uppercase font-bold">{getPriorityDisplay(activeWorkspace.primaryPlanningPriority)}</strong>
                </span>
              </div>
              <span className="text-xs font-semibold bg-white text-burgundy px-3 py-1 rounded-full border border-burgundy-200">
                {recommendation.priorityTag}
              </span>
            </div>

            <div className="pt-1">
              <span className="text-[11px] uppercase font-bold tracking-wider text-burgundy block mb-0.5">
                Langkah pertama yang kami sarankan:
              </span>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-charcoal">
                {recommendation.title}
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-400 mt-1 leading-relaxed max-w-2xl">
                {recommendation.description}
              </p>
              {recommendation.reason && (
                <p className="text-xs text-burgundy font-medium mt-2 pt-2 border-t border-burgundy-100/80">
                  💡 {recommendation.reason}
                </p>
              )}
            </div>
          </div>

          {/* 3 Pillar Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pillar 1: Progress */}
            <div className="bg-white rounded-2xl p-5 border border-beige shadow-soft">
              <div className="flex justify-between items-center text-xs text-charcoal-400 mb-2">
                <span className="font-semibold text-charcoal">Planning Progress</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="font-serif text-3xl font-bold text-charcoal">
                {activeWorkspace.completionPercentage}%
              </div>
              <div className="w-full bg-ivory-200 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-burgundy h-full rounded-full" style={{ width: `${activeWorkspace.completionPercentage}%` }} />
              </div>
              <p className="text-xs text-charcoal-400 mt-2.5">
                {activeWorkspace.completedCategoriesCount} dari {activeWorkspace.totalCategoriesCount} kategori awal selesai.
              </p>
            </div>

            {/* Pillar 2: Budget */}
            <div className="bg-white rounded-2xl p-5 border border-beige shadow-soft">
              <div className="flex justify-between items-center text-xs text-charcoal-400 mb-2">
                <span className="font-semibold text-charcoal">Perkiraan Budget</span>
                <DollarSign className="w-4 h-4 text-burgundy" />
              </div>
              <div className="font-serif text-2xl sm:text-3xl font-bold text-charcoal truncate">
                {activeWorkspace.formattedBudget}
              </div>
              <p className="text-xs text-charcoal-400 mt-1">
                Siap untuk mulai dialokasikan.
              </p>
              <div className="w-full bg-ivory-200 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-gold-500 h-full rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            {/* Pillar 3: Guest Count */}
            <div className="bg-white rounded-2xl p-5 border border-beige shadow-soft">
              <div className="flex justify-between items-center text-xs text-charcoal-400 mb-2">
                <span className="font-semibold text-charcoal">Jumlah Tamu</span>
                <Users className="w-4 h-4 text-gold-600" />
              </div>
              <div className="font-serif text-2xl sm:text-3xl xl:text-3xl font-bold text-charcoal tracking-tight truncate mt-1">
                {activeWorkspace.estimatedGuestCount} <span className="text-sm font-sans font-normal text-charcoal-400">orang</span>
              </div>
              <p className="text-xs text-charcoal-400 mt-1">
                Digunakan sebagai acuan perencanaan catering & venue.
              </p>
              <div className="w-full bg-ivory-200 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-gold-500 h-full rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          {/* Initial Planning Categories Checklist */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 border border-beige-300 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-beige">
              <div>
                <h3 className="font-serif text-xl font-semibold text-charcoal">
                  Status Kategori Persiapan
                </h3>
                <p className="text-xs text-charcoal-400 mt-0.5">
                  Daftar 6 modul awal yang telah disesuaikan dari hasil onboarding.
                </p>
              </div>
              <span className="text-xs font-semibold text-burgundy bg-burgundy-50 px-3 py-1 rounded-full border border-burgundy-100">
                {activeWorkspace.completedCategoriesCount}/6 Selesai
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {CATEGORY_ORDER.map((catId) => {
                const isDone = (activeWorkspace.completedCategories || []).includes(catId);
                const label = CATEGORY_TAXONOMY[catId]?.label || catId;
                return (
                  <div
                    key={catId}
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      isDone
                        ? 'bg-emerald-50/50 border-emerald-200 text-charcoal'
                        : 'bg-ivory-50/60 border-beige text-charcoal-500'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                        isDone ? 'bg-emerald-600 text-white' : 'border border-charcoal-300 bg-white'
                      }`}>
                        {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className={`text-xs sm:text-sm font-medium truncate ${isDone ? 'line-through text-charcoal-400' : 'text-charcoal'}`}>
                        {label}
                      </span>
                    </div>

                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-white border border-beige text-charcoal-400'
                    }`}>
                      {isDone ? 'Sudah' : 'Belum'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </main>

    </div>
  );
};
