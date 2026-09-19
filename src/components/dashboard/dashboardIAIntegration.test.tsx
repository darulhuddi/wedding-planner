import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Dashboard } from './Dashboard';
import { DashboardEventsOverview } from './DashboardEventsOverview';
import { WeddingHeader } from './WeddingHeader';
import { SeserahanSnapshot } from './SeserahanSnapshot';
import { AiInsightModal } from './AiInsightModal';
import { StoredWorkspace } from '../../types/workspace';
import { deriveWorkspaceViewModel } from '../../domain/workspaceSelectors';
import { WeddingEvent } from '../../domain/events';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-1', email: 'test@example.com' },
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock('./DesktopSidebar', () => ({
  DesktopSidebar: () => <div data-testid="mock-desktop-sidebar" />,
}));

vi.mock('../../hooks/useCustomerEntitlement', () => ({
  useCustomerEntitlement: () => ({
    entitlement: {
      hasWeddingPass: true,
      hasTrialAccess: true,
      isTrialActive: false,
      trialDaysRemaining: 0,
      tier: 'paid',
      badgeText: 'Wedding Pass Aktif',
      canAccessAllFeatures: true,
    },
    isLoading: false,
  }),
}));

const mockStoredWorkspace: StoredWorkspace = {
  id: 'ws-test-1',
  userId: 'usr-1',
  coupleName: 'Adit & Nisa',
  weddingDate: '2026-10-24',
  estimatedBudget: 150000000,
  estimatedGuestCount: 350,
  completedCategories: [],
  primaryPlanningPriority: 'checklist',
  religiousContexts: [{ tradition: 'islam', label: 'Islam' }],
  culturalContext: { hasTradition: true, description: 'Jawa' },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockWorkspace = deriveWorkspaceViewModel(mockStoredWorkspace, []);

const mockEvents: WeddingEvent[] = [
  {
    id: 'evt-1',
    workspaceId: 'ws-test-1',
    type: 'ceremony',
    name: 'Akad Nikah',
    location: 'Masjid Agung Al-Azhar',
    date: '2026-10-24',
    startTime: '08:00',
    endTime: '10:00',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'evt-2',
    workspaceId: 'ws-test-1',
    type: 'reception',
    name: 'Resepsi Pernikahan',
    location: 'Grand Ballroom Hotel Mulia',
    date: '2026-10-24',
    startTime: '11:00',
    endTime: '14:00',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

describe('Dashboard Information Architecture Integration', () => {
  it('WeddingHeader renders couple identity and edit affordance', () => {
    const html = renderToStaticMarkup(
      <WeddingHeader
        workspace={mockWorkspace}
        onEditIdentity={vi.fn()}
      />
    );

    expect(html).toContain('Adit &amp; Nisa');
    expect(html).toContain('Ubah Data');
    expect(html).toContain('Hari-H');
  });

  it('DashboardEventsOverview renders summary of events and Kelola Acara CTA', () => {
    const html = renderToStaticMarkup(
      <DashboardEventsOverview
        events={mockEvents}
        onOpenEventsModal={vi.fn()}
      />
    );

    expect(html).toContain('Rangkaian Acara');
    expect(html).toContain('Akad Nikah');
    expect(html).toContain('Resepsi Pernikahan');
    expect(html).toContain('Masjid Agung Al-Azhar');
    expect(html).toContain('Grand Ballroom Hotel Mulia');
    expect(html).toContain('Kelola Acara');
  });

  it('SeserahanSnapshot renders empty state gracefully when no data exists', () => {
    const html = renderToStaticMarkup(
      <SeserahanSnapshot onViewDetails={vi.fn()} />
    );

    expect(html).toContain('Seserahan');
    expect(html).toContain('Belum menyusun seserahan');
    expect(html).toContain('Mulai susun daftar hantaran dan atur budgetnya.');
    expect(html).toContain('Mulai Seserahan');
  });

  it('SeserahanSnapshot renders progress, donut, and budget summary when data is populated', () => {
    const html = renderToStaticMarkup(
      <SeserahanSnapshot
        data={{
          totalItems: 12,
          completedItems: 7,
          totalBudget: 5000000,
          spentBudget: 3250000,
        }}
        onViewDetails={vi.fn()}
      />
    );

    expect(html).toContain('Seserahan');
    expect(html).toContain('58%');
    expect(html).toContain('7 dari 12 item selesai');
    expect(html).toContain('Rp3,25 juta');
    expect(html).toContain('terpakai dari Rp5 juta');
    expect(html).toContain('Rp1,75 juta');
    expect(html).toContain('sisa budget');
    expect(html).toContain('Setiap hantaran punya makna.');
    expect(html).toContain('Lihat Detail');
  });

  it('Dashboard integrates Sections 1 through 5 in target visual hierarchy', () => {
    const html = renderToStaticMarkup(
      <Dashboard
        workspace={mockWorkspace}
        storedWorkspace={mockStoredWorkspace}
        tasks={[]}
        budget={{ allocations: [], expenses: [] }}
        events={mockEvents}
        onWorkspaceChange={vi.fn()}
        onTaskChange={vi.fn()}
        onEventCreate={vi.fn()}
        onEventUpdate={vi.fn()}
        onEventDelete={vi.fn()}
        currentModule="dashboard"
        onNavigateModule={vi.fn()}
        onRestartOnboarding={vi.fn()}
      />
    );

    // Section 1: Wedding Header & Countdown
    expect(html).toContain('Selamat datang, Adit &amp; Nisa');
    expect(html).toContain('Ubah Data');
    expect(html).toContain('Kesiapan Pernikahan');
    expect(html).toContain('hari lagi');

    // Section 2: Tugas Berikutnya + Snapshot Budget
    expect(html).toContain('Tugas Berikutnya');
    expect(html).toContain('✦ AI Insight');
    expect(html).toContain('Snapshot Budget');
    expect(html).toContain('tersisa');

    // Section 3: Seserahan + Rangkaian Acara
    expect(html).toContain('Seserahan');
    expect(html).toContain('Rangkaian Acara');
    expect(html).toContain('Akad Nikah');
    expect(html).toContain('Resepsi Pernikahan');

    // Section 4: Status Persiapan Modul + Perjalanan Menuju Hari-H
    expect(html).toContain('Status Persiapan Modul');
    expect(html).toContain('Perjalanan Menuju Hari-H');
    expect(html).toContain('Persiapan Awal');
    expect(html).toContain('Pemilihan Vendor');
    expect(html).toContain('Detail Persiapan');
    expect(html).toContain('Finalisasi');
    expect(html).toContain('Hari-H');

    // Section 5: Single Contextual Insight Bar
    expect(html).toContain('PERHATIKAN INI');
    expect(html).toContain('✦ AI Insight');
    expect(html).toContain('Lihat tugas');
  });

  it('AiInsightModal renders transparency points explaining deterministic engine vs AI insight layer', () => {
    const html = renderToStaticMarkup(
      <AiInsightModal isOpen={true} onClose={vi.fn()} />
    );

    expect(html).toContain('Tentang AI Insight');
    expect(html).toContain('Prioritas Berbasis Engine WedSiap');
    expect(html).toContain('Peran AI sebagai Insight Layer');
    expect(html).toContain('Mengerti');
  });
});
