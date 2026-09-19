import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BudgetSnapshot } from './BudgetSnapshot';
import { StoredBudget } from '../../types/budget';

describe('BudgetSnapshot Component Test Suite', () => {
  const mockBudget: StoredBudget = {
    allocations: [
      {
        id: 'alloc-1',
        category: 'catering',
        amount: 30000000,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'alloc-2',
        category: 'venue',
        amount: 18000000,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'alloc-3',
        category: 'decoration',
        amount: 12000000,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    expenses: [
      {
        id: 'exp-1',
        category: 'catering',
        title: 'DP Catering',
        amount: 15000000,
        date: '2026-02-15',
        note: null,
        createdAt: '2026-02-15T00:00:00Z',
        updatedAt: '2026-02-15T00:00:00Z',
      },
      {
        id: 'exp-2',
        category: 'venue',
        title: 'Booking Fee Venue',
        amount: 10000000,
        date: '2026-03-10',
        note: null,
        createdAt: '2026-03-10T00:00:00Z',
        updatedAt: '2026-03-10T00:00:00Z',
      },
    ],
  };

  it('renders headline, remaining budget, total budget, and progress percentage', () => {
    const html = renderToStaticMarkup(
      <BudgetSnapshot
        totalBudget={100000000}
        budget={mockBudget}
        weddingDate="2028-05-06"
        onViewBudget={vi.fn()}
      />
    );

    expect(html).toContain('Snapshot Budget');
    expect(html).toContain('Real-time');
    expect(html).toContain('Rp75 juta');
    expect(html).toContain('tersisa');
    expect(html).toContain('dari Rp100 juta');
    expect(html).toContain('75% tersisa');
    expect(html).toContain('Rp25 juta terpakai (25%)');
  });

  it('renders Donut Chart with spent percentage and legend items', () => {
    const html = renderToStaticMarkup(
      <BudgetSnapshot
        totalBudget={100000000}
        budget={mockBudget}
        weddingDate="2028-05-06"
        onViewBudget={vi.fn()}
      />
    );

    expect(html).toContain('25%');
    expect(html).toContain('Terpakai');
    expect(html).toContain('Rp25 juta');
    expect(html).toContain('Sisa');
    expect(html).toContain('Rp75 juta');
  });

  it('renders Top 3 Allocations based on allocated budget', () => {
    const html = renderToStaticMarkup(
      <BudgetSnapshot
        totalBudget={100000000}
        budget={mockBudget}
        weddingDate="2028-05-06"
        onViewBudget={vi.fn()}
      />
    );

    expect(html).toContain('Alokasi Terbesar');
    expect(html).toContain('Catering');
    expect(html).toContain('Rp30 juta');
    expect(html).toContain('Venue &amp; Gedung');
    expect(html).toContain('Rp18 juta');
    expect(html).toContain('Dekorasi');
    expect(html).toContain('Rp12 juta');
    expect(html).toContain('Lihat semua');
  });

  it('renders compact mode by default without spending trend graph', () => {
    const html = renderToStaticMarkup(
      <BudgetSnapshot
        totalBudget={100000000}
        budget={mockBudget}
        weddingDate="2028-05-06"
        onViewBudget={vi.fn()}
      />
    );

    expect(html).toContain('Snapshot Budget');
    expect(html).toContain('Alokasi Terbesar');
    expect(html).not.toContain('Tren Pengeluaran');
  });

  it('renders Spending Trend and CTA button when showTrend is true', () => {
    const html = renderToStaticMarkup(
      <BudgetSnapshot
        totalBudget={100000000}
        budget={mockBudget}
        weddingDate="2028-05-06"
        onViewBudget={vi.fn()}
        showTrend={true}
      />
    );

    expect(html).toContain('Tren Pengeluaran');
    expect(html).toContain('6 bulan terakhir');
    expect(html).toContain('Lihat Detail Budget');
  });

  it('handles over-budget state cleanly without visual distortion', () => {
    const overBudget: StoredBudget = {
      allocations: [],
      expenses: [
        {
          id: 'exp-over',
          category: 'general',
          title: 'Big Expense',
          amount: 125000000,
          date: '2026-03-01',
          note: null,
          createdAt: '2026-03-01T00:00:00Z',
          updatedAt: '2026-03-01T00:00:00Z',
        },
      ],
    };

    const html = renderToStaticMarkup(
      <BudgetSnapshot
        totalBudget={100000000}
        budget={overBudget}
        weddingDate="2028-05-06"
        onViewBudget={vi.fn()}
      />
    );

    expect(html).toContain('terlampaui');
    expect(html).toContain('Rp25 juta');
  });

  it('handles empty budget and expenses with graceful fallbacks', () => {
    const emptyBudget: StoredBudget = { allocations: [], expenses: [] };

    const html = renderToStaticMarkup(
      <BudgetSnapshot
        totalBudget={0}
        budget={emptyBudget}
        onViewBudget={vi.fn()}
        showTrend={true}
      />
    );

    expect(html).toContain('Snapshot Budget');
    expect(html).toContain('Belum ada alokasi kategori');
    expect(html).toContain('Belum ada data pengeluaran');
  });
});
