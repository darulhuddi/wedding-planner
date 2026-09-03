import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../lib/supabaseClient';
import {
  mapRowToBudgetAllocation,
  mapBudgetAllocationToRow,
  mapRowToBudgetExpense,
  mapBudgetExpenseToRow,
  fetchBudgetByWorkspaceId,
  upsertBudgetAllocation,
  insertBudgetExpense,
  updateBudgetExpense,
  deleteBudgetExpense,
  saveBudgetToDb,
  SupabaseBudgetAllocationRow,
  SupabaseBudgetExpenseRow,
} from './supabaseBudgetAdapter';
import { BudgetAllocation, BudgetExpense, StoredBudget } from '../types/budget';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('supabaseBudgetAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleWorkspaceId = 'w1111111-1111-4111-8111-111111111111';

  const sampleAllocRow: SupabaseBudgetAllocationRow = {
    id: 'a1111111-1111-4111-8111-111111111111',
    workspace_id: sampleWorkspaceId,
    category: 'venue',
    amount: 50000000,
    created_at: '2026-09-03T00:00:00.000Z',
    updated_at: '2026-09-03T00:00:00.000Z',
  };

  const sampleAllocation: BudgetAllocation = {
    id: 'a1111111-1111-4111-8111-111111111111',
    category: 'venue',
    amount: 50000000,
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-03T00:00:00.000Z',
  };

  const sampleExpenseRow: SupabaseBudgetExpenseRow = {
    id: 'e1111111-1111-4111-8111-111111111111',
    workspace_id: sampleWorkspaceId,
    title: 'DP Gedung',
    category: 'venue',
    amount: 15000000,
    date: '2026-09-10',
    note: 'Kwitansi #001',
    created_at: '2026-09-03T00:00:00.000Z',
    updated_at: '2026-09-03T00:00:00.000Z',
  };

  const sampleExpense: BudgetExpense = {
    id: 'e1111111-1111-4111-8111-111111111111',
    title: 'DP Gedung',
    category: 'venue',
    amount: 15000000,
    date: '2026-09-10',
    note: 'Kwitansi #001',
    createdAt: '2026-09-03T00:00:00.000Z',
    updatedAt: '2026-09-03T00:00:00.000Z',
  };

  describe('Mapping Functions', () => {
    it('maps budget allocation row to domain model and vice-versa', () => {
      expect(mapRowToBudgetAllocation(sampleAllocRow)).toEqual(sampleAllocation);
      expect(mapBudgetAllocationToRow(sampleAllocation, sampleWorkspaceId)).toEqual(sampleAllocRow);
    });

    it('maps budget expense row to domain model and vice-versa', () => {
      expect(mapRowToBudgetExpense(sampleExpenseRow)).toEqual(sampleExpense);
      expect(mapBudgetExpenseToRow(sampleExpense, sampleWorkspaceId)).toEqual(sampleExpenseRow);
    });
  });

  describe('fetchBudgetByWorkspaceId', () => {
    it('fetches both allocations and expenses in parallel scoped by workspace_id', async () => {
      const allocOrderMock = vi.fn().mockResolvedValueOnce({
        data: [sampleAllocRow],
        error: null,
      });
      const allocEqMock = vi.fn().mockReturnValue({ order: allocOrderMock });
      const allocSelectMock = vi.fn().mockReturnValue({ eq: allocEqMock });

      const expenseOrderMock = vi.fn().mockResolvedValueOnce({
        data: [sampleExpenseRow],
        error: null,
      });
      const expenseEqMock = vi.fn().mockReturnValue({ order: expenseOrderMock });
      const expenseSelectMock = vi.fn().mockReturnValue({ eq: expenseEqMock });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'budget_allocations') return { select: allocSelectMock } as any;
        if (table === 'budget_expenses') return { select: expenseSelectMock } as any;
        return {} as any;
      });

      const result = await fetchBudgetByWorkspaceId(sampleWorkspaceId);

      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].amount).toBe(50000000);
      expect(result.expenses).toHaveLength(1);
      expect(result.expenses[0].title).toBe('DP Gedung');
    });
  });

  describe('Budget Mutations', () => {
    it('upsertBudgetAllocation checks existing allocation and upserts with onConflict', async () => {
      const maybeSingleMock = vi.fn().mockResolvedValueOnce({
        data: { id: sampleAllocRow.id },
        error: null,
      });
      const eqCategoryMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
      const eqWorkspaceMock = vi.fn().mockReturnValue({ eq: eqCategoryMock });
      const selectCheckMock = vi.fn().mockReturnValue({ eq: eqWorkspaceMock });

      const singleMock = vi.fn().mockResolvedValueOnce({
        data: sampleAllocRow,
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const upsertMock = vi.fn().mockReturnValue({ select: selectMock });

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'budget_allocations') {
          return {
            select: selectCheckMock,
            upsert: upsertMock,
          } as any;
        }
        return {} as any;
      });

      const result = await upsertBudgetAllocation(sampleWorkspaceId, sampleAllocation);
      expect(result.amount).toBe(50000000);
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: sampleAllocRow.id,
          category: 'venue',
          amount: 50000000,
        }),
        { onConflict: 'workspace_id,category' }
      );
    });

    it('insertBudgetExpense inserts expense', async () => {
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: sampleExpenseRow,
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const insertMock = vi.fn().mockReturnValue({ select: selectMock });
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);

      const result = await insertBudgetExpense(sampleWorkspaceId, sampleExpense);
      expect(result.title).toBe('DP Gedung');
    });

    it('updateBudgetExpense updates expense scoped by id and workspace_id', async () => {
      const updatedRow = { ...sampleExpenseRow, amount: 20000000 };
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: updatedRow,
        error: null,
      });
      const selectMock = vi.fn().mockReturnValue({ single: singleMock });
      const eqWorkspaceMock = vi.fn().mockReturnValue({ select: selectMock });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqWorkspaceMock });
      const updateMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any);

      const result = await updateBudgetExpense(sampleWorkspaceId, {
        ...sampleExpense,
        amount: 20000000,
      });

      expect(eqIdMock).toHaveBeenCalledWith('id', sampleExpense.id);
      expect(eqWorkspaceMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
      expect(result.amount).toBe(20000000);
    });

    it('deleteBudgetExpense deletes expense scoped by id and workspace_id', async () => {
      const eqWorkspaceMock = vi.fn().mockResolvedValueOnce({ error: null });
      const eqIdMock = vi.fn().mockReturnValue({ eq: eqWorkspaceMock });
      const deleteMock = vi.fn().mockReturnValue({ eq: eqIdMock });
      vi.mocked(supabase.from).mockReturnValue({ delete: deleteMock } as any);

      await deleteBudgetExpense(sampleWorkspaceId, sampleExpense.id);

      expect(eqIdMock).toHaveBeenCalledWith('id', sampleExpense.id);
      expect(eqWorkspaceMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
    });

    describe('saveBudgetToDb (Template Overwrite Regression Tests)', () => {
      it('replaces existing allocations using onConflict: workspace_id,category without duplicate key violation', async () => {
        // Mock existing rows in DB (Venue, Catering, Photo)
        const existingRows = [
          { id: 'old-venue-id', category: 'venue' },
          { id: 'old-catering-id', category: 'catering' },
          { id: 'old-photo-id', category: 'photography' },
        ];

        const selectEqMock = vi.fn().mockResolvedValueOnce({
          data: existingRows,
          error: null,
        });
        const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock });

        const upsertMock = vi.fn().mockResolvedValueOnce({
          error: null,
        });

        // Mock subsequent fetchBudgetByWorkspaceId
        const fetchedAllocRows = [
          { id: 'old-venue-id', workspace_id: sampleWorkspaceId, category: 'venue', amount: 40000000, created_at: '', updated_at: '' },
          { id: 'old-catering-id', workspace_id: sampleWorkspaceId, category: 'catering', amount: 25000000, created_at: '', updated_at: '' },
          { id: 'old-photo-id', workspace_id: sampleWorkspaceId, category: 'photography', amount: 10000000, created_at: '', updated_at: '' },
          { id: 'new-decor-id', workspace_id: sampleWorkspaceId, category: 'decoration', amount: 10000000, created_at: '', updated_at: '' },
          { id: 'new-mua-id', workspace_id: sampleWorkspaceId, category: 'makeup_attire', amount: 10000000, created_at: '', updated_at: '' },
          { id: 'new-inv-id', workspace_id: sampleWorkspaceId, category: 'invitation', amount: 3000000, created_at: '', updated_at: '' },
          { id: 'new-gen-id', workspace_id: sampleWorkspaceId, category: 'general', amount: 2000000, created_at: '', updated_at: '' },
        ];

        const allocOrderMock = vi.fn().mockResolvedValueOnce({ data: fetchedAllocRows, error: null });
        const allocFetchEqMock = vi.fn().mockReturnValue({ order: allocOrderMock });
        const allocFetchSelectMock = vi.fn().mockReturnValue({ eq: allocFetchEqMock });

        const expenseOrderMock = vi.fn().mockResolvedValueOnce({ data: [sampleExpenseRow], error: null });
        const expenseFetchEqMock = vi.fn().mockReturnValue({ order: expenseOrderMock });
        const expenseFetchSelectMock = vi.fn().mockReturnValue({ eq: expenseFetchEqMock });

        vi.mocked(supabase.from).mockImplementation((table: string) => {
          if (table === 'budget_allocations') {
            return {
              select: (cols?: string) => {
                if (cols === 'id, category') return selectMock();
                return allocFetchSelectMock();
              },
              upsert: upsertMock,
            } as any;
          }
          if (table === 'budget_expenses') {
            return {
              select: expenseFetchSelectMock,
            } as any;
          }
          return {} as any;
        });

        // 7 categories new template allocations with freshly generated random UUIDs
        const newTemplateBudget: StoredBudget = {
          allocations: [
            { id: 'uuid-1', category: 'venue', amount: 40000000, createdAt: '', updatedAt: '' },
            { id: 'uuid-2', category: 'catering', amount: 25000000, createdAt: '', updatedAt: '' },
            { id: 'uuid-3', category: 'photography', amount: 10000000, createdAt: '', updatedAt: '' },
            { id: 'uuid-4', category: 'decoration', amount: 10000000, createdAt: '', updatedAt: '' },
            { id: 'uuid-5', category: 'makeup_attire', amount: 10000000, createdAt: '', updatedAt: '' },
            { id: 'uuid-6', category: 'invitation', amount: 3000000, createdAt: '', updatedAt: '' },
            { id: 'uuid-7', category: 'general', amount: 2000000, createdAt: '', updatedAt: '' },
          ],
          expenses: [sampleExpense],
        };

        const result = await saveBudgetToDb(sampleWorkspaceId, newTemplateBudget);

        // Verify upsert was called with onConflict on (workspace_id, category)
        expect(upsertMock).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ id: 'old-venue-id', category: 'venue', amount: 40000000 }),
            expect.objectContaining({ id: 'old-catering-id', category: 'catering', amount: 25000000 }),
            expect.objectContaining({ id: 'old-photo-id', category: 'photography', amount: 10000000 }),
            expect.objectContaining({ id: 'uuid-4', category: 'decoration', amount: 10000000 }),
          ]),
          { onConflict: 'workspace_id,category' }
        );

        // Verify result has 7 allocations and expenses remain intact
        expect(result.allocations).toHaveLength(7);
        expect(result.expenses).toHaveLength(1);
        expect(result.expenses[0].id).toBe(sampleExpense.id);
      });

      it('removes stale allocation categories if not in new budget', async () => {
        // Mock existing rows in DB having 'general' which is NOT in new budget
        const existingRows = [
          { id: 'old-venue-id', category: 'venue' },
          { id: 'old-general-id', category: 'general' },
        ];

        const selectEqMock = vi.fn().mockResolvedValueOnce({
          data: existingRows,
          error: null,
        });
        const selectMock = vi.fn().mockReturnValue({ eq: selectEqMock });

        const deleteEqMock = vi.fn().mockResolvedValueOnce({ error: null });
        const inMock = vi.fn().mockReturnValue({ eq: deleteEqMock });
        const deleteMock = vi.fn().mockReturnValue({ in: inMock });

        const upsertMock = vi.fn().mockResolvedValueOnce({ error: null });

        // Mock fetch after save
        const allocOrderMock = vi.fn().mockResolvedValueOnce({ data: [], error: null });
        const allocFetchEqMock = vi.fn().mockReturnValue({ order: allocOrderMock });
        const allocFetchSelectMock = vi.fn().mockReturnValue({ eq: allocFetchEqMock });

        const expenseOrderMock = vi.fn().mockResolvedValueOnce({ data: [], error: null });
        const expenseFetchEqMock = vi.fn().mockReturnValue({ order: expenseOrderMock });
        const expenseFetchSelectMock = vi.fn().mockReturnValue({ eq: expenseFetchEqMock });

        vi.mocked(supabase.from).mockImplementation((table: string) => {
          if (table === 'budget_allocations') {
            return {
              select: (cols?: string) => {
                if (cols === 'id, category') return selectMock();
                return allocFetchSelectMock();
              },
              delete: deleteMock,
              upsert: upsertMock,
            } as any;
          }
          if (table === 'budget_expenses') {
            return { select: expenseFetchSelectMock } as any;
          }
          return {} as any;
        });

        const newBudget: StoredBudget = {
          allocations: [
            { id: 'uuid-1', category: 'venue', amount: 50000000, createdAt: '', updatedAt: '' },
          ],
          expenses: [],
        };

        await saveBudgetToDb(sampleWorkspaceId, newBudget);

        // Stale 'general' category was deleted
        expect(deleteMock).toHaveBeenCalled();
        expect(inMock).toHaveBeenCalledWith('id', ['old-general-id']);
        expect(deleteEqMock).toHaveBeenCalledWith('workspace_id', sampleWorkspaceId);
      });
    });
  });
});
