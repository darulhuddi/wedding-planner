import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdministrationPage } from './AdministrationPage';
import { WorkspaceViewModel } from '../../types/workspace';
import { TaskItem } from '../../types/checklist';
import { WeddingEvent } from '../../domain/events';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-1', email: 'test@example.com' },
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock('../dashboard/DesktopSidebar', () => ({
  DesktopSidebar: () => <div data-testid="mock-desktop-sidebar" />,
}));

import { StoredWorkspace } from '../../types/workspace';
import { deriveWorkspaceViewModel } from '../../domain/workspaceSelectors';

const mockStoredWorkspace: StoredWorkspace = {
  id: 'ws-test-1',
  userId: 'usr-1',
  coupleName: 'Adit & Nisa',
  weddingDate: '2026-10-24',
  estimatedBudget: 100000000,
  estimatedGuestCount: 300,
  completedCategories: [],
  primaryPlanningPriority: 'checklist',
  religiousContexts: [{ tradition: 'islam', label: 'Islam' }],
  culturalContext: { hasTradition: true, description: 'Jawa' },
  administrationContext: {
    groom: {
      birthDate: '1998-01-01',
      maritalStatus: 'single',
      citizenship: 'wni',
      serviceStatus: 'civilian',
      isSameKuaDistrictAsCeremony: true,
    },
    bride: {
      birthDate: '2000-01-01',
      maritalStatus: 'single',
      citizenship: 'wni',
      serviceStatus: 'civilian',
      isSameKuaDistrictAsCeremony: true,
    },
    hasSpecialWaliCase: false,
    isSetupCompleted: true,
    updatedAt: '2026-01-01T00:00:00Z',
  },
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
    location: 'Balai Nikah Kantor Urusan Agama (KUA)',
    date: '2026-10-24',
    startTime: '09:00',
    endTime: '10:00',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

describe('AdministrationPage — Information Architecture & CTA Hierarchy', () => {
  it('State A: Profil Belum Lengkap (!isSetupCompleted) renders single Setup entrypoint and hides NBA', () => {
    const incompleteWorkspace = deriveWorkspaceViewModel(
      {
        ...mockStoredWorkspace,
        administrationContext: {
          ...mockStoredWorkspace.administrationContext!,
          isSetupCompleted: false,
        },
      },
      []
    );

    const html = renderToStaticMarkup(
      <AdministrationPage
        workspace={incompleteWorkspace}
        tasks={[]}
        events={mockEvents}
        onWorkspaceChange={vi.fn()}
        onUpdateTask={vi.fn()}
        onAddTask={vi.fn()}
      />
    );

    // Hero: Setup Profil KUA only
    expect(html).toContain('Setup Profil KUA');
    expect(html).not.toContain('Ubah Profil KUA');

    // Panduan Berkas Card: Belum Siap -> Lengkapi Profil
    expect(html).toContain('Panduan Berkas Belum Siap');
    expect(html).toContain('Lengkapi profil administrasi terlebih dahulu');
    expect(html).toContain('Lengkapi Profil');

    // Make sure 'Buat Panduan Berkas' is NOT present anywhere on State A
    expect(html).not.toContain('Buat Panduan Berkas');

    // NBA Card must be completely hidden
    expect(html).not.toContain('Langkahmu Berikutnya');
    expect(html).not.toContain('Langkah Berikutnya');
  });

  it('State B: Profil Lengkap, Panduan Belum Tergenerate renders generation CTA and hides NBA', () => {
    const html = renderToStaticMarkup(
      <AdministrationPage
        workspace={mockWorkspace}
        tasks={[]}
        events={mockEvents}
        onWorkspaceChange={vi.fn()}
        onUpdateTask={vi.fn()}
        onAddTask={vi.fn()}
      />
    );

    // Hero: Ubah Profil KUA and Buat Panduan Berkas
    expect(html).toContain('Ubah Profil KUA');
    expect(html).toContain('Buat Panduan Berkas');
    expect(html).not.toContain('Setup Profil KUA');

    // Panduan Berkas Card: Belum Dibuat -> Buat Panduan Berkas
    expect(html).toContain('Panduan Berkas Belum Dibuat');
    expect(html).toContain('Buat panduan personal berdasarkan profil pernikahan');

    // NBA Card must still be hidden until tasks are generated
    expect(html).not.toContain('Langkah Berikutnya');
  });

  it('State C: Panduan Tersedia renders progress, Lihat Panduan, and planning NBA with Buka Tugas', () => {
    const existingTasks: TaskItem[] = [
      {
        id: 'task-adm-1',
        title: 'KTP Asli & Fotokopi Pasangan',
        description: 'Fotokopi KTP calon mempelai',
        category: 'prosesi_administrasi',
        status: 'completed',
        priority: 'high',
        dueDate: null,
        estimatedMinutes: 30,
        source: 'template',
        templateId: 'adm-doc-ktp',
        eventIds: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        completedAt: '2026-01-02T00:00:00Z',
      },
      {
        id: 'task-adm-2',
        title: 'Urus Surat Pengantar Nikah (Model N1) di Kelurahan',
        description: 'Fotokopi KK calon mempelai',
        category: 'prosesi_administrasi',
        status: 'todo',
        priority: 'high',
        dueDate: null,
        estimatedMinutes: 30,
        source: 'template',
        templateId: 'adm-urus-n1',
        eventIds: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        completedAt: null,
      },
    ];

    const html = renderToStaticMarkup(
      <AdministrationPage
        workspace={mockWorkspace}
        tasks={existingTasks}
        events={mockEvents}
        onWorkspaceChange={vi.fn()}
        onUpdateTask={vi.fn()}
        onAddTask={vi.fn()}
      />
    );

    // Hero: Ubah Profil KUA only
    expect(html).toContain('Ubah Profil KUA');
    expect(html).not.toContain('Buat Panduan Berkas');

    // Panduan Berkas Card: Success state
    expect(html).toContain('Panduan Berkas Kamu');
    expect(html).toContain('2 dokumen');
    expect(html).toContain('1 sudah lengkap');
    expect(html).toContain('50% Selesai');
    expect(html).toContain('Lihat Panduan');
    expect(html).toContain('id="task-list-section"');

    // NBA Card: Active planning intelligence
    expect(html).toContain('Langkah Berikutnya');
    expect(html).toContain('Buka Tugas');
  });

  it('Renders non-Muslim context with appropriate institutional mapping and dynamic wording', () => {
    const christianWorkspace = deriveWorkspaceViewModel(
      {
        ...mockStoredWorkspace,
        religiousContexts: [{ tradition: 'christian', label: 'Kristen' }],
        culturalContext: { hasTradition: true, description: 'Adat Batak' },
      },
      []
    );

    const html = renderToStaticMarkup(
      <AdministrationPage
        workspace={christianWorkspace}
        tasks={[]}
        events={mockEvents}
        onWorkspaceChange={vi.fn()}
        onUpdateTask={vi.fn()}
        onAddTask={vi.fn()}
      />
    );

    // Header badge & context mapping for Christian
    expect(html).toContain('Gereja &amp; Disdukcapil RI');
    expect(html).toContain('Pencatatan Sipil RI');
    expect(html).toContain('Ubah Profil Administrasi');
    expect(html).toContain('PANDUAN BERKAS PERNIKAHAN');
  });
});

