import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import {
  mapRowToPlan,
  mapPlanToRow,
  mapRowToCategory,
  mapCategoryToRow,
  mapRowToItem,
  mapItemToRow,
  fetchPlanByWorkspaceId,
  fetchPlanById,
  insertPlan,
  updatePlanInDb,
  deletePlanFromDb,
  fetchCategoriesByPlanId,
  insertCategory,
  updateCategoryInDb,
  deleteCategoryFromDb,
  fetchItemsByPlanId,
  fetchItemById,
  insertItem,
  updateItemInDb,
  deleteItemFromDb,
  SupabaseSeserahanPlanRow,
  SupabaseSeserahanCategoryRow,
  SupabaseSeserahanItemRow,
} from './supabaseSeserahanAdapter';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('supabaseSeserahanAdapter Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleWorkspaceId = 'ws-1111-2222-3333-4444';
  const samplePlanId = 'plan-1111-2222-3333-4444';
  const sampleCategoryId = 'cat-1111-2222-3333-4444';
  const sampleItemId = 'item-1111-2222-3333-4444';

  const samplePlanRow: SupabaseSeserahanPlanRow = {
    id: samplePlanId,
    workspace_id: sampleWorkspaceId,
    name: 'Seserahan Pernikahan',
    budget: 10000000,
    created_at: '2026-09-08T00:00:00Z',
    updated_at: '2026-09-08T00:00:00Z',
  };

  const sampleCategoryRow: SupabaseSeserahanCategoryRow = {
    id: sampleCategoryId,
    plan_id: samplePlanId,
    name: 'Perlengkapan Ibadah',
    sort_order: 1,
    created_at: '2026-09-08T00:00:00Z',
    updated_at: '2026-09-08T00:00:00Z',
  };

  const sampleItemRow: SupabaseSeserahanItemRow = {
    id: sampleItemId,
    plan_id: samplePlanId,
    category_id: sampleCategoryId,
    name: 'Mukena Sutra',
    status: 'planned',
    estimated_cost: 850000,
    actual_cost: 0,
    notes: 'Warna champagne',
    sort_order: 1,
    created_at: '2026-09-08T00:00:00Z',
    updated_at: '2026-09-08T00:00:00Z',
  };

  describe('Mappers', () => {
    it('maps plan row to domain and vice versa', () => {
      const domain = mapRowToPlan(samplePlanRow);
      expect(domain.id).toBe(samplePlanId);
      expect(domain.workspaceId).toBe(sampleWorkspaceId);
      expect(domain.budget).toBe(10000000);

      const row = mapPlanToRow(domain, sampleWorkspaceId);
      expect(row.workspace_id).toBe(sampleWorkspaceId);
      expect(row.name).toBe('Seserahan Pernikahan');
      expect(row.budget).toBe(10000000);
    });

    it('maps category row to domain and vice versa', () => {
      const domain = mapRowToCategory(sampleCategoryRow);
      expect(domain.id).toBe(sampleCategoryId);
      expect(domain.name).toBe('Perlengkapan Ibadah');

      const row = mapCategoryToRow(domain, samplePlanId);
      expect(row.plan_id).toBe(samplePlanId);
      expect(row.name).toBe('Perlengkapan Ibadah');
      expect(row.sort_order).toBe(1);
    });

    it('maps item row to domain and vice versa', () => {
      const domain = mapRowToItem(sampleItemRow);
      expect(domain.id).toBe(sampleItemId);
      expect(domain.status).toBe('planned');
      expect(domain.estimatedCost).toBe(850000);

      const row = mapItemToRow(domain, samplePlanId);
      expect(row.plan_id).toBe(samplePlanId);
      expect(row.name).toBe('Mukena Sutra');
      expect(row.estimated_cost).toBe(850000);
      expect(row.notes).toBe('Warna champagne');
    });
  });

  describe('Plan Queries & Mutations', () => {
    it('fetchPlanByWorkspaceId returns plan when found', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValueOnce({ data: samplePlanRow, error: null });
      const limitMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const result = await fetchPlanByWorkspaceId(sampleWorkspaceId);
      expect(supabase.from).toHaveBeenCalledWith('seserahan_plans');
      expect(eqMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
      expect(result?.id).toBe(samplePlanId);
    });

    it('fetchPlanByWorkspaceId returns null on missing table or cache error (PGRST205)', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST205', message: 'Table not found' },
      });
      const limitMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const eqMock = vi.fn().mockReturnValue({ order: orderMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const result = await fetchPlanByWorkspaceId(sampleWorkspaceId);
      expect(result).toBeNull();
    });

    it('insertPlan inserts and returns new plan', async () => {
      const singleMock = vi.fn().mockResolvedValueOnce({ data: samplePlanRow, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

      const result = await insertPlan(sampleWorkspaceId, {
        name: 'Seserahan Pernikahan',
        budget: 10000000,
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace_id: sampleWorkspaceId,
          name: 'Seserahan Pernikahan',
          budget: 10000000,
        })
      );
      expect(result.id).toBe(samplePlanId);
    });

    it('updatePlanInDb updates plan scoped by workspace and plan id', async () => {
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: { ...samplePlanRow, budget: 15000000 },
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqWorkspaceMock = vi.fn().mockReturnValue({ select: selectMock });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqWorkspaceMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

      const result = await updatePlanInDb(sampleWorkspaceId, samplePlanId, { budget: 15000000 });
      expect(eqIdMock).toHaveBeenCalledWith('id', samplePlanId);
      expect(eqWorkspaceMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
      expect(result.budget).toBe(15000000);
    });

    it('deletePlanFromDb deletes plan scoped by workspace and plan id', async () => {
      const eqWorkspaceMock = vi.fn().mockResolvedValueOnce({ error: null });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqWorkspaceMock });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      vi.mocked(supabase.from).mockReturnValue({ delete: deleteMock } as any);

      await deletePlanFromDb(sampleWorkspaceId, samplePlanId);
      expect(eqIdMock).toHaveBeenCalledWith('id', samplePlanId);
      expect(eqWorkspaceMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
    });
  });

  describe('Category Queries & Mutations', () => {
    it('fetchCategoriesByPlanId returns ordered categories', async () => {
      const orderCreatedMock = vi.fn().mockResolvedValueOnce({ data: [sampleCategoryRow], error: null });
      const orderSortMock = vi.fn().mockReturnValue({ order: orderCreatedMock });
      const eqMock = vi.fn().mockReturnValue({ order: orderSortMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const result = await fetchCategoriesByPlanId(samplePlanId);
      expect(eqMock).toHaveBeenCalledWith('plan_id', samplePlanId);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Perlengkapan Ibadah');
    });

    it('insertCategory inserts and returns new category', async () => {
      const singleMock = vi.fn().mockResolvedValueOnce({ data: sampleCategoryRow, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

      const result = await insertCategory(samplePlanId, {
        name: 'Perlengkapan Ibadah',
        sortOrder: 1,
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          plan_id: samplePlanId,
          name: 'Perlengkapan Ibadah',
          sort_order: 1,
        })
      );
      expect(result.id).toBe(sampleCategoryId);
    });
  });

  describe('Item Queries & Mutations', () => {
    it('fetchItemsByPlanId returns ordered items', async () => {
      const orderCreatedMock = vi.fn().mockResolvedValueOnce({ data: [sampleItemRow], error: null });
      const orderSortMock = vi.fn().mockReturnValue({ order: orderCreatedMock });
      const eqMock = vi.fn().mockReturnValue({ order: orderSortMock });
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any);

      const result = await fetchItemsByPlanId(samplePlanId);
      expect(eqMock).toHaveBeenCalledWith('plan_id', samplePlanId);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Mukena Sutra');
    });

    it('insertItem inserts and returns new item', async () => {
      const singleMock = vi.fn().mockResolvedValueOnce({ data: sampleItemRow, error: null });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

      const result = await insertItem(samplePlanId, {
        categoryId: sampleCategoryId,
        name: 'Mukena Sutra',
        status: 'planned',
        estimatedCost: 850000,
        actualCost: 0,
        notes: 'Warna champagne',
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          plan_id: samplePlanId,
          category_id: sampleCategoryId,
          name: 'Mukena Sutra',
          status: 'planned',
        })
      );
      expect(result.id).toBe(sampleItemId);
    });

    it('updateItemInDb updates item scoped by plan_id and id', async () => {
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: { ...sampleItemRow, status: 'completed', actual_cost: 850000 },
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqPlanMock = vi.fn().mockReturnValue({ select: selectMock });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqPlanMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

      const result = await updateItemInDb(samplePlanId, sampleItemId, {
        status: 'completed',
        actualCost: 850000,
      });

      expect(eqIdMock).toHaveBeenCalledWith('id', sampleItemId);
      expect(eqPlanMock).toHaveBeenCalledWith('plan_id', samplePlanId);
      expect(result.status).toBe('completed');
      expect(result.actualCost).toBe(850000);
    });

    it('deleteItemFromDb deletes item scoped by plan_id and id', async () => {
      const eqPlanMock = vi.fn().mockResolvedValueOnce({ error: null });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqPlanMock });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      vi.mocked(supabase.from).mockReturnValue({ delete: deleteMock } as any);

      await deleteItemFromDb(samplePlanId, sampleItemId);
      expect(eqIdMock).toHaveBeenCalledWith('id', sampleItemId);
      expect(eqPlanMock).toHaveBeenCalledWith('plan_id', samplePlanId);
    });
  });
});
