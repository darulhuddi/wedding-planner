import { describe, it, expect } from 'vitest';
import { extractSeserahanTimelineEvents } from './timelineAdapter';
import { SeserahanPlan, SeserahanItem } from './types';

describe('Seserahan Timeline Adapter', () => {
  const weddingDate = '2026-10-31';
  const today = '2026-10-01';

  const basePlan: SeserahanPlan = {
    id: 'plan-1',
    workspaceId: 'ws-1',
    name: 'Seserahan',
    budget: 5000000,
    packagingStartedAt: null,
    packagingCompletedAt: null,
    finalCheckedAt: null,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  it('returns empty array when plan is null', () => {
    const events = extractSeserahanTimelineEvents(null, [], weddingDate, today);
    expect(events).toEqual([]);
  });

  it('extracts milestone events when weddingDate is set', () => {
    const events = extractSeserahanTimelineEvents(basePlan, [], weddingDate, today);
    // 5 milestones
    expect(events.length).toBe(5);
    const types = events.map((e) => e.eventType);
    expect(types).toContain('milestone');
    expect(events.some((e) => e.title.includes('Finalisasi Daftar Seserahan'))).toBe(true);
    expect(events.some((e) => e.title.includes('Batas Waktu Pembelian'))).toBe(true);
    expect(events.some((e) => e.title.includes('Target Semua Item Siap'))).toBe(true);
    expect(events.some((e) => e.title.includes('Target Selesai Hias & Kemas'))).toBe(true);
    expect(events.some((e) => e.title.includes('Pengecekan Akhir'))).toBe(true);
  });

  it('includes item due dates as timeline events', () => {
    const items: SeserahanItem[] = [
      {
        id: 'item-1',
        planId: 'plan-1',
        categoryId: null,
        name: 'Perhiasan Emas',
        status: 'planned',
        estimatedCost: 2000000,
        actualCost: 0,
        notes: null,
        sortOrder: 0,
        responsibleParty: 'groom',
        responsiblePartyCustom: null,
        dueDate: '2026-10-10',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'item-2',
        planId: 'plan-1',
        categoryId: null,
        name: 'Sepatu Pengantin',
        status: 'completed',
        estimatedCost: 500000,
        actualCost: 500000,
        notes: null,
        sortOrder: 1,
        responsibleParty: 'bride',
        responsiblePartyCustom: null,
        dueDate: '2026-10-05',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    const events = extractSeserahanTimelineEvents(basePlan, items, weddingDate, today);
    const itemEvents = events.filter((e) => e.eventType === 'item_deadline');
    expect(itemEvents.length).toBe(2);

    const jewelry = itemEvents.find((e) => e.title.includes('Perhiasan Emas'));
    expect(jewelry?.status).toBe('pending');
    expect(jewelry?.responsibleParty).toBe('groom');

    const shoes = itemEvents.find((e) => e.title.includes('Sepatu Pengantin'));
    expect(shoes?.status).toBe('completed');
  });

  it('sorts timeline events chronologically', () => {
    const items: SeserahanItem[] = [
      {
        id: 'item-1',
        planId: 'plan-1',
        categoryId: null,
        name: 'Early Item',
        status: 'planned',
        estimatedCost: 100000,
        actualCost: 0,
        notes: null,
        sortOrder: 0,
        responsibleParty: 'groom',
        responsiblePartyCustom: null,
        dueDate: '2026-09-05',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    const events = extractSeserahanTimelineEvents(basePlan, items, weddingDate, today);
    for (let i = 0; i < events.length - 1; i++) {
      expect(events[i].targetDate! <= events[i + 1].targetDate!).toBe(true);
    }
  });
});
