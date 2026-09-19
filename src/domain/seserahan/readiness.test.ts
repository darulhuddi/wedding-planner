import { describe, it, expect } from 'vitest';
import { calculateSeserahanReadiness } from './readiness';
import { SeserahanPlan, SeserahanItem } from './types';

describe('Seserahan Readiness Domain Engine', () => {
  const basePlan: SeserahanPlan = {
    id: 'plan-1',
    workspaceId: 'ws-1',
    name: 'Seserahan Utama',
    budget: 5000000,
    packagingStartedAt: null,
    packagingCompletedAt: null,
    finalCheckedAt: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  const createItem = (id: string, status: 'planned' | 'purchased' | 'completed', dueDate: string | null = null): SeserahanItem => ({
    id,
    planId: 'plan-1',
    categoryId: null,
    name: `Item ${id}`,
    status,
    estimatedCost: 100000,
    actualCost: status === 'planned' ? 0 : 100000,
    notes: null,
    sortOrder: 0,
    responsibleParty: 'groom',
    responsiblePartyCustom: null,
    dueDate,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  });

  it('returns not_ready when there are zero items', () => {
    const readiness = calculateSeserahanReadiness(basePlan, []);
    expect(readiness.status).toBe('not_ready');
    expect(readiness.reasons).toContain('Belum ada item seserahan yang ditambahkan.');
    expect(readiness.score).toBe(0);
  });

  it('returns not_ready when items exist but none are completed and no progress', () => {
    const items = [createItem('1', 'planned'), createItem('2', 'planned')];
    const readiness = calculateSeserahanReadiness(basePlan, items);
    expect(readiness.status).toBe('not_ready');
    expect(readiness.reasons).toContain('0 dari 2 item selesai disiapkan.');
  });

  it('identifies overdue items in reasons', () => {
    const items = [
      createItem('1', 'planned', '2026-09-10'),
      createItem('2', 'completed', '2026-09-10'),
    ];
    const readiness = calculateSeserahanReadiness(basePlan, items, '2026-09-15');
    expect(readiness.reasons).toContain('1 item telah melewati batas waktu.');
  });

  it('returns in_progress when items are partially completed', () => {
    const items = [
      createItem('1', 'completed'),
      createItem('2', 'purchased'),
      createItem('3', 'planned'),
    ];
    const readiness = calculateSeserahanReadiness(basePlan, items);
    expect(readiness.status).toBe('in_progress');
    expect(readiness.facts.completedItems).toBe(1);
    expect(readiness.facts.totalItems).toBe(3);
    expect(readiness.facts.packagingCompleted).toBe(false);
  });

  it('returns in_progress if all items are completed but packaging is not completed', () => {
    const items = [createItem('1', 'completed'), createItem('2', 'completed')];
    const readiness = calculateSeserahanReadiness(basePlan, items);
    expect(readiness.status).toBe('in_progress');
    expect(readiness.reasons).toContain('Semua item siap, namun pengemasan/penataan kotak seserahan belum selesai.');
  });

  it('returns almost_ready when all items are completed and packaging is completed, but final check is pending', () => {
    const plan: SeserahanPlan = {
      ...basePlan,
      packagingCompletedAt: '2026-10-20T00:00:00Z',
    };
    const items = [createItem('1', 'completed'), createItem('2', 'completed')];
    const readiness = calculateSeserahanReadiness(plan, items);
    expect(readiness.status).toBe('almost_ready');
    expect(readiness.facts.packagingCompleted).toBe(true);
    expect(readiness.facts.finalCheckCompleted).toBe(false);
    expect(readiness.reasons).toContain('Pengemasan selesai. Perlu final check dan serah terima sebelum hari-H.');
  });

  it('returns ready when all items are completed, packaging is completed, and final check is completed', () => {
    const plan: SeserahanPlan = {
      ...basePlan,
      packagingCompletedAt: '2026-10-20T00:00:00Z',
      finalCheckedAt: '2026-10-28T00:00:00Z',
    };
    const items = [createItem('1', 'completed'), createItem('2', 'completed')];
    const readiness = calculateSeserahanReadiness(plan, items);
    expect(readiness.status).toBe('ready');
    expect(readiness.score).toBe(100);
    expect(readiness.facts.finalCheckCompleted).toBe(true);
    expect(readiness.reasons).toContain('Seluruh item lengkap, terkemas rapi, dan telah lolos final check.');
  });
});
