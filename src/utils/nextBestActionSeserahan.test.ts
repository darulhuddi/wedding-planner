import { describe, it, expect } from 'vitest';
import { getNextBestAction } from './nextBestActionEngine';
import { StoredWorkspace } from '../types/workspace';
import { TaskItem } from '../types/checklist';
import { SeserahanNbaSignals } from '../domain/seserahan/types';

function createMockWorkspace(overrides: Partial<StoredWorkspace> = {}): StoredWorkspace {
  return {
    id: 'ws-seserahan-nba',
    userId: 'user-seserahan-nba',
    coupleName: 'Ayu & Budi',
    weddingDate: '2026-10-31',
    estimatedBudget: 100000000,
    estimatedGuestCount: 300,
    completedCategories: [],
    primaryPlanningPriority: 'vendor',
    religiousContexts: [{ tradition: 'christian', label: 'Kristen' }],
    culturalContext: { hasTradition: false, description: null },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('Next Best Action V3: Seserahan Planning Integration', () => {
  const referenceDate = '2026-10-15';
  const ws = createMockWorkspace();

  it('generates high priority action when seserahan items are overdue', () => {
    const signals: SeserahanNbaSignals = {
      completionRate: 50,
      pendingItems: 3,
      overdueItems: 2,
      dueSoonItems: 1,
      budgetUsage: 0.5,
      estimatedRemainingCost: 2000000,
      budgetVariance: 0,
      packagingCompleted: false,
      finalCheckCompleted: false,
      readinessStatus: 'in_progress',
      responsibilityDistribution: {
        groom: 2,
        bride: 1,
        together: 0,
        bride_family: 0,
        groom_family: 0,
        custom: 0,
      },
    };

    const nba = getNextBestAction(ws, [], {
      today: referenceDate,
      seserahanSignals: signals,
    });

    expect(nba.priorityLevel).toBe('P1');
    expect(nba.title).toBe('Selesaikan 2 Barang Seserahan yang Terlambat');
    expect(nba.ctaLabel).toBe('Buka Seserahan');
    expect(nba.source).toBe('seserahan');
  });

  it('generates final check action when all items are ready and wedding is near (H-3)', () => {
    const wsNear = createMockWorkspace({ weddingDate: '2026-10-18' }); // 3 days away from 2026-10-15
    const signals: SeserahanNbaSignals = {
      completionRate: 100,
      pendingItems: 0,
      overdueItems: 0,
      dueSoonItems: 0,
      budgetUsage: 0.9,
      estimatedRemainingCost: 0,
      budgetVariance: 100000,
      packagingCompleted: true,
      finalCheckCompleted: false,
      readinessStatus: 'almost_ready',
      responsibilityDistribution: {
        groom: 2,
        bride: 0,
        together: 0,
        bride_family: 0,
        groom_family: 0,
        custom: 0,
      },
    };

    const nba = getNextBestAction(wsNear, [], {
      today: referenceDate,
      seserahanSignals: signals,
    });

    expect(nba.priorityLevel).toBe('P1');
    expect(nba.title).toBe('Lakukan Pengecekan Akhir Seserahan');
    expect(nba.ctaLabel).toBe('Cek Seserahan');
    expect(nba.source).toBe('seserahan');
  });

  it('generates packaging action when all items are completed and wedding is within 14 days', () => {
    const ws10Days = createMockWorkspace({ weddingDate: '2026-10-25' }); // 10 days away
    const signals: SeserahanNbaSignals = {
      completionRate: 100,
      pendingItems: 0,
      overdueItems: 0,
      dueSoonItems: 0,
      budgetUsage: 0.8,
      estimatedRemainingCost: 0,
      budgetVariance: 200000,
      packagingCompleted: false,
      finalCheckCompleted: false,
      readinessStatus: 'in_progress',
      responsibilityDistribution: {
        groom: 2,
        bride: 0,
        together: 0,
        bride_family: 0,
        groom_family: 0,
        custom: 0,
      },
    };

    const nba = getNextBestAction(ws10Days, [], {
      today: referenceDate,
      seserahanSignals: signals,
    });

    expect(nba.priorityLevel).toBe('P2');
    expect(nba.title).toBe('Mulai Kemas dan Hias Kotak Seserahan');
    expect(nba.ctaLabel).toBe('Atur Pengemasan');
    expect(nba.source).toBe('seserahan');
  });

  it('is completely deterministic', () => {
    const signals: SeserahanNbaSignals = {
      completionRate: 40,
      pendingItems: 5,
      overdueItems: 1,
      dueSoonItems: 2,
      budgetUsage: 0.4,
      estimatedRemainingCost: 3000000,
      budgetVariance: 0,
      packagingCompleted: false,
      finalCheckCompleted: false,
      readinessStatus: 'in_progress',
      responsibilityDistribution: {
        groom: 3,
        bride: 2,
        together: 0,
        bride_family: 0,
        groom_family: 0,
        custom: 0,
      },
    };

    const first = getNextBestAction(ws, [], { today: referenceDate, seserahanSignals: signals });
    for (let i = 0; i < 5; i++) {
      const current = getNextBestAction(ws, [], { today: referenceDate, seserahanSignals: signals });
      expect(current.title).toBe(first.title);
      expect(current.priorityScore).toBe(first.priorityScore);
      expect(current.priorityLevel).toBe(first.priorityLevel);
    }
  });
});
