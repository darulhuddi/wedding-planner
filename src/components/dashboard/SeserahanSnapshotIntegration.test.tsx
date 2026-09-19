import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SeserahanSnapshot, SeserahanSummaryData } from './SeserahanSnapshot';

describe('SeserahanSnapshot Integration Tests', () => {
  it('renders elegant empty state when data is null or has 0 items', () => {
    const html = renderToStaticMarkup(
      <SeserahanSnapshot
        data={null}
        onViewDetails={vi.fn()}
      />
    );

    expect(html).toContain('Belum menyusun seserahan');
    expect(html).toContain('Mulai susun daftar hantaran dan atur budgetnya');
    expect(html).toContain('Mulai Seserahan');
    // Must NOT contain fake numbers or fake progress
    expect(html).not.toContain('NaN');
  });

  it('renders populated state with live completion and budget summary', () => {
    const sampleData: SeserahanSummaryData = {
      totalItems: 12,
      completedItems: 7,
      totalBudget: 5000000,
      spentBudget: 3250000,
    };

    const html = renderToStaticMarkup(
      <SeserahanSnapshot
        data={sampleData}
        onViewDetails={vi.fn()}
      />
    );

    // 7 / 12 = 58%
    expect(html).toContain('58%');
    expect(html).toContain('7 dari 12 item selesai');
    expect(html).toContain('Lihat Detail');
    expect(html).toContain('Rp3,25 juta');
    expect(html).toContain('Setiap hantaran punya makna');
  });
});
