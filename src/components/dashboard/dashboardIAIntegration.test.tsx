import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Dashboard } from './Dashboard';
import { DashboardEventsOverview } from './DashboardEventsOverview';
import { WeddingHeader } from './WeddingHeader';
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

  it('Dashboard integrates WeddingHeader, NextBestAction, EventsOverview, and Snapshots seamlessly', () => {
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

    // Identity
    expect(html).toContain('Adit &amp; Nisa');
    expect(html).toContain('Ubah Data');

    // Events Overview
    expect(html).toContain('Rangkaian Acara');
    expect(html).toContain('Akad Nikah');
    expect(html).toContain('Resepsi Pernikahan');

    // Planning Context Snapshot
    expect(html).toContain('Snapshot');
    expect(html).toContain('Sisa Budget');
  });
});
