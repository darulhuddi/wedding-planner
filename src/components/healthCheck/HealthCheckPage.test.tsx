import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HealthCheckEntry } from './HealthCheckEntry';
import { HealthCheckQuestionnaire } from './HealthCheckQuestionnaire';
import { HealthCheckAnalyzing } from './HealthCheckAnalyzing';
import { HealthCheckReport } from './HealthCheckReport';
import { HealthCheckPage } from './HealthCheckPage';
import { createPersistedAssessment } from '../../domain/healthCheck/conversion';
import { savePendingAssessment, clearPendingAssessment } from '../../domain/healthCheck/storage';
import { HealthCheckInput } from '../../domain/healthCheck/types';

const memoryStore: Record<string, string> = {};

if (typeof localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStore[key] || null,
    setItem: (key: string, value: string) => {
      memoryStore[key] = value;
    },
    removeItem: (key: string) => {
      delete memoryStore[key];
    },
    clear: () => {
      Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
    },
  };
}

describe('Health Check UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
  });

  const sampleInput: HealthCheckInput = {
    coupleName: 'Dimas & Ratna',
    weddingDate: '2027-05-15',
    location: 'Yogyakarta',
    estimatedGuestCount: 400,
    estimatedBudget: 200_000_000,
    budgetCommittedPercentage: 30,
    vendorStatus: {
      venue: 'completed',
      catering: 'in_progress',
      photography: 'not_started',
      decoration: 'not_started',
      makeup_attire: 'not_started',
      invitation: 'not_started',
    },
    administrationStatus: {
      status: 'in_progress',
    },
    religiousTradition: 'islam',
    concern: 'budget',
    primaryPlanningPriority: 'budget',
  };

  describe('1. HealthCheckEntry Component', () => {
    it('renders value proposition, headline, and reassurance badges without fear marketing', () => {
      const html = renderToStaticMarkup(
        <HealthCheckEntry
          onStart={vi.fn()}
          hasExistingAssessment={false}
        />
      );

      expect(html).toContain('Seberapa siap');
      expect(html).toContain('wedding kamu?');
      expect(html).toContain('Ceritakan kondisi persiapanmu');
      expect(html).toContain('Gratis • 3 Menit • Tanpa Perlu Daftar');
      expect(html).toContain('Cek Persiapan Wedding');
      expect(html).toContain('Tahu Posisi Nyata');
      expect(html).toContain('Deteksi Risiko Dini');
      expect(html).toContain('Langkah Berikutnya');
    });

    it('renders existing report restore banner when hasExistingAssessment is true', () => {
      const html = renderToStaticMarkup(
        <HealthCheckEntry
          onStart={vi.fn()}
          hasExistingAssessment={true}
          onViewExisting={vi.fn()}
          onResetExisting={vi.fn()}
        />
      );

      expect(html).toContain('Kamu memiliki laporan analisis sebelumnya');
      expect(html).toContain('Buka Laporan');
      expect(html).toContain('Mulai Baru');
    });
  });

  describe('2. HealthCheckAnalyzing Component', () => {
    it('renders calm rotating analysis state with brand mark', () => {
      const html = renderToStaticMarkup(
        <HealthCheckAnalyzing onComplete={vi.fn()} />
      );

      expect(html).toContain('Menganalisis persiapan wedding kamu…');
      expect(html).toContain('AI Planning Intelligence');
    });
  });

  describe('3. HealthCheckReport Component', () => {
    it('renders readiness score, calm health status, 3 dimensions, risks, and next best actions from domain data', () => {
      const assessment = createPersistedAssessment(sampleInput, '2026-09-07');
      const report = assessment.report!;

      const html = renderToStaticMarkup(
        <HealthCheckReport
          report={report}
          input={sampleInput}
          onStartPlanning={vi.fn()}
          onEditAnswers={vi.fn()}
        />
      );

      // Header & Subtitle
      expect(html).toContain('Wedding Health Report');
      expect(html).toContain('Ini gambaran posisi persiapan wedding kamu');

      // Hero Readiness Score (XX / 100)
      expect(html).toContain(String(report.overall.score));
      expect(html).toContain('/ 100');

      // Calm Indonesian Status
      expect(html).toMatch(/Kamu cukup on track|Persiapanmu sudah berjalan|Ada beberapa hal penting|Ada hal yang perlu segera/);

      // Three Health Dimensions
      expect(html).toContain('3 Dimensi Kesehatan Wedding');
      expect(html).toContain('Progres Area');
      expect(html).toContain('Posisi Budget');
      expect(html).toContain('Pacing Waktu');

      // Next Best Actions
      expect(html).toContain('3 hal yang paling penting kamu lakukan sekarang');
      expect(html).toContain(report.nextBestAction.title);

      // Personalization Context (Budget concern)
      expect(html).toContain('Karena budget adalah hal yang paling kamu khawatirkan');

      // CTAs
      expect(html).toContain('Mulai Wedding Plan Gratis');
      expect(html).toContain('Ubah Jawaban');
    });
  });

  describe('4. HealthCheckPage Container Component', () => {
    it('defaults to Entry state when no assessment exists', () => {
      const html = renderToStaticMarkup(
        <HealthCheckPage
          initialSubRoute="entry"
          onNavigateToSignup={vi.fn()}
          onNavigateHome={vi.fn()}
        />
      );

      expect(html).toContain('Seberapa siap');
      expect(html).toContain('Cek Persiapan Wedding');
    });

    it('renders report directly if initialSubRoute is report and an assessment is present in localStorage', () => {
      const assessment = createPersistedAssessment(sampleInput, '2026-09-07');
      savePendingAssessment(assessment);

      const html = renderToStaticMarkup(
        <HealthCheckPage
          initialSubRoute="report"
          onNavigateToSignup={vi.fn()}
          onNavigateHome={vi.fn()}
        />
      );

      expect(html).toContain('Wedding Health Report');
      expect(html).toContain(String(assessment.report?.overall.score));
    });
  });
});
