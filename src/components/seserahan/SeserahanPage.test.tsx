import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SeserahanPage, formatShortCost } from './SeserahanPage';
import { SeserahanStarterTemplateModal } from './SeserahanStarterTemplateModal';
import { SeserahanItemModal } from './SeserahanItemModal';
import { SeserahanCategoryModal } from './SeserahanCategoryModal';
import { SeserahanBudgetModal } from './SeserahanBudgetModal';
import * as seserahanRepo from '../../repositories/seserahanRepository';
import { StoredWorkspace, WorkspaceViewModel } from '../../types/workspace';
import { deriveWorkspaceViewModel } from '../../domain/workspaceSelectors';
import { SeserahanPlan, SeserahanCategory, SeserahanItem } from '../../domain/seserahan/types';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    signOut: vi.fn(),
  }),
}));

vi.mock('../../hooks/useCustomerEntitlement', () => ({
  useCustomerEntitlement: () => ({
    isPaid: true,
    isExpired: false,
    entitlement: null,
    isLoading: false,
  }),
}));

vi.mock('../dashboard/DesktopSidebar', () => ({
  DesktopSidebar: () => <div data-testid="mock-desktop-sidebar" />,
}));

vi.mock('../dashboard/MobileBottomNav', () => ({
  MobileBottomNav: () => <div data-testid="mock-mobile-bottom-nav" />,
}));

describe('SeserahanPage Component Tests', () => {
  const mockStoredWorkspace: StoredWorkspace = {
    id: 'ws-123',
    coupleName: 'Budi & Citra',
    weddingDate: '2026-12-25',
    estimatedBudget: 100000000,
    estimatedGuestCount: 300,
    completedCategories: [],
    primaryPlanningPriority: 'checklist',
    religiousContexts: [],
    culturalContext: { hasTradition: null, description: null },
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const mockWorkspace: WorkspaceViewModel = deriveWorkspaceViewModel(mockStoredWorkspace, []);

  const samplePlan: SeserahanPlan = {
    id: 'plan-1',
    workspaceId: 'ws-123',
    name: 'Seserahan',
    budget: 5000000,
    createdAt: '2026-09-18T00:00:00Z',
    updatedAt: '2026-09-18T00:00:00Z',
  };

  const sampleCategories: SeserahanCategory[] = [
    {
      id: 'cat-1',
      planId: 'plan-1',
      name: 'Ibadah',
      sortOrder: 0,
      createdAt: '2026-09-18T00:00:00Z',
      updatedAt: '2026-09-18T00:00:00Z',
    },
    {
      id: 'cat-2',
      planId: 'plan-1',
      name: 'Beauty & Care',
      sortOrder: 1,
      createdAt: '2026-09-18T00:00:00Z',
      updatedAt: '2026-09-18T00:00:00Z',
    },
  ];

  const sampleItems: SeserahanItem[] = [
    {
      id: 'item-1',
      planId: 'plan-1',
      categoryId: 'cat-1',
      name: 'Mukena Sutra',
      status: 'completed',
      estimatedCost: 750000,
      actualCost: 750000,
      notes: 'Warna putih tulang',
      sortOrder: 0,
      createdAt: '2026-09-18T00:00:00Z',
      updatedAt: '2026-09-18T00:00:00Z',
    },
    {
      id: 'item-2',
      planId: 'plan-1',
      categoryId: 'cat-2',
      name: 'Parfum EDP',
      status: 'purchased',
      estimatedCost: 500000,
      actualCost: 450000,
      notes: null,
      sortOrder: 1,
      createdAt: '2026-09-18T00:00:00Z',
      updatedAt: '2026-09-18T00:00:00Z',
    },
    {
      id: 'item-3',
      planId: 'plan-1',
      categoryId: 'cat-2',
      name: 'Skincare Set',
      status: 'planned',
      estimatedCost: 600000,
      actualCost: 0,
      notes: null,
      sortOrder: 2,
      createdAt: '2026-09-18T00:00:00Z',
      updatedAt: '2026-09-18T00:00:00Z',
    },
  ];

  describe('SeserahanPage Rendering', () => {
    it('renders initial skeleton or empty structure cleanly', () => {
      const html = renderToStaticMarkup(
        <SeserahanPage
          workspace={mockWorkspace}
          storedWorkspace={mockStoredWorkspace}
          onNavigateModule={vi.fn()}
        />
      );

      expect(html).toContain('Seserahan');
      expect(html).toContain('Dashboard');
    });
  });

  describe('SeserahanStarterTemplateModal', () => {
    it('renders template options and starter budget input', () => {
      const html = renderToStaticMarkup(
        <SeserahanStarterTemplateModal
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );

      expect(html).toContain('Bagaimana kamu ingin memulai?');
      expect(html).toContain('Basic');
      expect(html).toContain('Standard');
      expect(html).toContain('Complete');
      expect(html).toContain('Custom');
      expect(html).toContain('Target Budget Seserahan');
      expect(html).toContain('Mulai Susun Seserahan');
    });

    it('returns null when closed', () => {
      const html = renderToStaticMarkup(
        <SeserahanStarterTemplateModal
          isOpen={false}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );
      expect(html).toBe('');
    });
  });

  describe('SeserahanItemModal', () => {
    it('renders add item form with fields and friendly Indonesian statuses', () => {
      const html = renderToStaticMarkup(
        <SeserahanItemModal
          isOpen={true}
          categories={sampleCategories}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(html).toContain('Tambah Barang Seserahan');
      expect(html).toContain('Nama Barang');
      expect(html).toContain('Belum disiapkan');
      expect(html).toContain('Sudah dibeli');
      expect(html).toContain('Selesai');
      expect(html).toContain('Estimasi Biaya');
      expect(html).toContain('Biaya Aktual');
      expect(html).toContain('Catatan');
      expect(html).toContain('Ibadah');
      expect(html).toContain('Beauty &amp; Care');
    });

    it('renders edit mode with delete button for existing item', () => {
      const html = renderToStaticMarkup(
        <SeserahanItemModal
          isOpen={true}
          itemToEdit={sampleItems[0]}
          categories={sampleCategories}
          onClose={vi.fn()}
          onSave={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect(html).toContain('Detail &amp; Edit Barang');
      expect(html).toContain('Mukena Sutra');
      expect(html).toContain('Hapus Barang');
      expect(html).toContain('Simpan Perubahan');
    });
  });

  describe('SeserahanCategoryModal', () => {
    it('renders create category form', () => {
      const html = renderToStaticMarkup(
        <SeserahanCategoryModal
          isOpen={true}
          isEditing={false}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(html).toContain('Tambah Kategori Seserahan');
      expect(html).toContain('Nama Kategori');
      expect(html).toContain('Tambah Kategori');
    });

    it('renders rename category form when editing', () => {
      const html = renderToStaticMarkup(
        <SeserahanCategoryModal
          isOpen={true}
          isEditing={true}
          initialName="Perhiasan"
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(html).toContain('Ubah Nama Kategori');
      expect(html).toContain('Perhiasan');
      expect(html).toContain('Simpan Perubahan');
    });
  });

  describe('SeserahanBudgetModal', () => {
    it('renders budget edit modal with formatted current budget', () => {
      const html = renderToStaticMarkup(
        <SeserahanBudgetModal
          isOpen={true}
          currentBudget={5000000}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(html).toContain('Atur Total Budget Seserahan');
      expect(html).toContain('5.000.000');
      expect(html).toContain('Simpan Budget');
    });
  });

  describe('Seserahan V1 Polish Pass Tests', () => {
    describe('formatShortCost utility', () => {
      it('formats IDR numbers into calm, compact Indonesian strings', () => {
        expect(formatShortCost(500000)).toBe('Rp500 rb');
        expect(formatShortCost(575000)).toBe('Rp575 rb');
        expect(formatShortCost(1500000)).toBe('Rp1,5 jt');
        expect(formatShortCost(2000000)).toBe('Rp2 jt');
        expect(formatShortCost(0)).toBe('Rp0');
        expect(formatShortCost(-5000)).toBe('Rp0');
      });
    });

    describe('Item row ergonomics & mobile name wrapping', () => {
      it('renders line-clamp-2 on item names for up to 2-line mobile wrapping without breaking row layout', () => {
        const longNamedItem: SeserahanItem = {
          id: 'item-long',
          planId: 'plan-1',
          categoryId: 'cat-1',
          name: 'Set Perawatan Kulit Wajah & Tubuh Organik Tradisional',
          status: 'planned',
          estimatedCost: 850000,
          actualCost: 0,
          notes: null,
          sortOrder: 0,
          createdAt: '2026-09-18T00:00:00Z',
          updatedAt: '2026-09-18T00:00:00Z',
        };

        const html = renderToStaticMarkup(
          <SeserahanPage
            workspace={mockWorkspace}
            storedWorkspace={mockStoredWorkspace}
            initialPlan={samplePlan}
            initialCategories={sampleCategories}
            initialItems={[longNamedItem]}
            initialLoading={false}
          />
        );

        expect(html).toContain('Set Perawatan Kulit Wajah &amp; Tubuh Organik Tradisional');
        expect(html).toContain('line-clamp-2');
      });

      it('renders 40x40px hit area (w-10 h-10) for item status toggle button and category action buttons', () => {
        const html = renderToStaticMarkup(
          <SeserahanPage
            workspace={mockWorkspace}
            storedWorkspace={mockStoredWorkspace}
            initialPlan={samplePlan}
            initialCategories={sampleCategories}
            initialItems={sampleItems}
            initialLoading={false}
          />
        );

        // Verify status toggle buttons have w-10 h-10
        expect(html).toContain('title="Klik untuk ubah status"');
        expect(html).toContain('w-10 h-10');

        // Verify category rename and delete buttons have w-10 h-10
        expect(html).toContain('aria-label="Ubah nama kategori Ibadah"');
        expect(html).toContain('aria-label="Hapus kategori Ibadah"');
      });
    });

    describe('Estimated vs Actual cost clarity', () => {
      it('displays primary actual cost with secondary estimated cost when both exist', () => {
        const html = renderToStaticMarkup(
          <SeserahanPage
            workspace={mockWorkspace}
            storedWorkspace={mockStoredWorkspace}
            initialPlan={samplePlan}
            initialCategories={sampleCategories}
            initialItems={sampleItems}
            initialLoading={false}
          />
        );

        // For item-2 (actualCost: 450000, estimatedCost: 500000)
        expect(html).toContain('Rp450 rb');
        expect(html).toContain('Est. Rp500 rb');

        // For item-3 (actualCost: 0, estimatedCost: 600000)
        expect(html).toContain('Est. Rp600 rb');
      });
    });

    describe('Quick Category Filter Bar', () => {
      it('renders horizontal filter bar with "Semua" and category completion chips', () => {
        const html = renderToStaticMarkup(
          <SeserahanPage
            workspace={mockWorkspace}
            storedWorkspace={mockStoredWorkspace}
            initialPlan={samplePlan}
            initialCategories={sampleCategories}
            initialItems={sampleItems}
            initialLoading={false}
          />
        );

        expect(html).toContain('id="category-filter-bar"');
        expect(html).toContain('Semua');
        expect(html).toContain('Ibadah');
        expect(html).toContain('Beauty &amp; Care');
        // Ibadah has 1 completed item out of 1
        expect(html).toContain('1/1');
        // Beauty & Care has 0 completed items out of 2
        expect(html).toContain('0/2');
      });
    });

    describe('Category Deletion Feedback Toast', () => {
      it('renders clear, non-alarming toast with safe preservation microcopy', () => {
        const html = renderToStaticMarkup(
          <SeserahanPage
            workspace={mockWorkspace}
            storedWorkspace={mockStoredWorkspace}
            initialPlan={samplePlan}
            initialCategories={sampleCategories}
            initialItems={sampleItems}
            initialLoading={false}
            initialToast={{
              title: 'Kategori dihapus',
              message: 'Barang di dalamnya tetap aman dan dipindahkan ke Tanpa Kategori.',
            }}
          />
        );

        expect(html).toContain('data-testid="category-deletion-toast"');
        expect(html).toContain('Kategori dihapus');
        expect(html).toContain('Barang di dalamnya tetap aman dan dipindahkan ke Tanpa Kategori.');
      });
    });

    describe('Loading skeleton proportions', () => {
      it('renders skeleton resembling summary cards, filter chips, and category/item rows', () => {
        const html = renderToStaticMarkup(
          <SeserahanPage
            workspace={mockWorkspace}
            storedWorkspace={mockStoredWorkspace}
            initialLoading={true}
          />
        );

        expect(html).toContain('data-testid="seserahan-skeleton"');
      });
    });

    describe('Minor Polish: Contrast and Warning microcopy', () => {
      it('renders higher contrast for "Belum disiapkan" badge', () => {
        const html = renderToStaticMarkup(
          <SeserahanPage
            workspace={mockWorkspace}
            storedWorkspace={mockStoredWorkspace}
            initialPlan={samplePlan}
            initialCategories={sampleCategories}
            initialItems={sampleItems}
            initialLoading={false}
          />
        );

        expect(html).toContain('Belum disiapkan');
        expect(html).toContain('text-charcoal-700');
        expect(html).toContain('border-beige-400');
      });

      it('renders warm WedSiap microcopy when budget warning is triggered', () => {
        // Plan with budget (1,500,000), spent (1,200,000), remaining (300,000), estimated remaining (600,000)
        const tightPlan: SeserahanPlan = {
          ...samplePlan,
          budget: 1500000,
        };

        const html = renderToStaticMarkup(
          <SeserahanPage
            workspace={mockWorkspace}
            storedWorkspace={mockStoredWorkspace}
            initialPlan={tightPlan}
            initialCategories={sampleCategories}
            initialItems={sampleItems}
            initialLoading={false}
          />
        );

        expect(html).toContain('Catatan:');
        expect(html).toContain('Total estimasi belanja tersisa mendekati batas budget yang direncanakan');
      });
    });
  });
});
