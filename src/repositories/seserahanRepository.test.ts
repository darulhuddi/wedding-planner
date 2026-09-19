import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as seserahanRepo from './seserahanRepository';
import * as adapter from './supabaseSeserahanAdapter';
import { SeserahanPlan, SeserahanItem } from '../domain/seserahan/types';

vi.mock('./supabaseSeserahanAdapter');

describe('seserahanRepository Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleWorkspaceId = 'ws-test-123';
  const samplePlanId = 'plan-test-123';

  describe('Plan Operations', () => {
    it('creates plan after passing validation', async () => {
      const mockPlan: SeserahanPlan = {
        id: samplePlanId,
        workspaceId: sampleWorkspaceId,
        name: 'Seserahan',
        budget: 5000000,
        createdAt: '2026-09-08T00:00:00Z',
        updatedAt: '2026-09-08T00:00:00Z',
      };
      vi.mocked(adapter.insertPlan).mockResolvedValueOnce(mockPlan);

      const result = await seserahanRepo.createSeserahanPlan(sampleWorkspaceId, {
        name: 'Seserahan',
        budget: 5000000,
      });

      expect(adapter.insertPlan).toHaveBeenCalledWith(sampleWorkspaceId, {
        name: 'Seserahan',
        budget: 5000000,
      });
      expect(result).toEqual(mockPlan);
    });

    it('rejects plan creation with negative budget without calling adapter', async () => {
      await expect(
        seserahanRepo.createSeserahanPlan(sampleWorkspaceId, {
          name: 'Seserahan',
          budget: -1000,
        })
      ).rejects.toThrow('Validasi gagal');

      expect(adapter.insertPlan).not.toHaveBeenCalled();
    });

    it('rejects plan update with negative budget', async () => {
      await expect(
        seserahanRepo.updateSeserahanPlan(sampleWorkspaceId, samplePlanId, {
          budget: -500,
        })
      ).rejects.toThrow('Validasi gagal');

      expect(adapter.updatePlanInDb).not.toHaveBeenCalled();
    });
  });

  describe('Category Operations', () => {
    it('rejects category creation with empty name', async () => {
      await expect(
        seserahanRepo.createSeserahanCategory(samplePlanId, {
          name: '   ',
        })
      ).rejects.toThrow('Validasi gagal');

      expect(adapter.insertCategory).not.toHaveBeenCalled();
    });
  });

  describe('Item Operations', () => {
    it('rejects item creation with negative estimated cost', async () => {
      await expect(
        seserahanRepo.createSeserahanItem(samplePlanId, {
          name: 'Perhiasan',
          estimatedCost: -200000,
        })
      ).rejects.toThrow('Validasi gagal');

      expect(adapter.insertItem).not.toHaveBeenCalled();
    });

    it('rejects item creation with invalid status', async () => {
      await expect(
        seserahanRepo.createSeserahanItem(samplePlanId, {
          name: 'Perhiasan',
          status: 'invalid' as any,
        })
      ).rejects.toThrow('Validasi gagal');

      expect(adapter.insertItem).not.toHaveBeenCalled();
    });
  });

  describe('getSeserahanMetrics', () => {
    it('returns empty metrics when plan is not found', async () => {
      vi.mocked(adapter.fetchPlanByWorkspaceId).mockResolvedValueOnce(null);

      const metrics = await seserahanRepo.getSeserahanMetrics(sampleWorkspaceId);

      expect(metrics.totalItems).toBe(0);
      expect(metrics.completionRate).toBe(0);
      expect(metrics.budget).toBe(0);
    });

    it('computes metrics from plan and items', async () => {
      const mockPlan: SeserahanPlan = {
        id: samplePlanId,
        workspaceId: sampleWorkspaceId,
        name: 'Seserahan',
        budget: 5000000,
        createdAt: '2026-09-08T00:00:00Z',
        updatedAt: '2026-09-08T00:00:00Z',
      };
      const mockItems: SeserahanItem[] = [
        {
          id: 'item-1',
          planId: samplePlanId,
          categoryId: null,
          name: 'Item 1',
          status: 'completed',
          estimatedCost: 1000000,
          actualCost: 1000000,
          notes: null,
          sortOrder: 0,
          createdAt: '2026-09-08T00:00:00Z',
          updatedAt: '2026-09-08T00:00:00Z',
        },
        {
          id: 'item-2',
          planId: samplePlanId,
          categoryId: null,
          name: 'Item 2',
          status: 'planned',
          estimatedCost: 1500000,
          actualCost: 0,
          notes: null,
          sortOrder: 1,
          createdAt: '2026-09-08T00:00:00Z',
          updatedAt: '2026-09-08T00:00:00Z',
        },
      ];

      vi.mocked(adapter.fetchPlanByWorkspaceId).mockResolvedValueOnce(mockPlan);
      vi.mocked(adapter.fetchItemsByPlanId).mockResolvedValueOnce(mockItems);

      const metrics = await seserahanRepo.getSeserahanMetrics(sampleWorkspaceId);

      expect(metrics.totalItems).toBe(2);
      expect(metrics.completedItems).toBe(1);
      expect(metrics.pendingItems).toBe(1);
      expect(metrics.completionRate).toBe(50);
      expect(metrics.estimatedTotal).toBe(2500000);
      expect(metrics.actualTotal).toBe(1000000);
      expect(metrics.remainingBudget).toBe(4000000); // 5M - 1M
      expect(metrics.budgetVariance).toBe(2500000); // 5M - 2.5M
    });
  });
});
