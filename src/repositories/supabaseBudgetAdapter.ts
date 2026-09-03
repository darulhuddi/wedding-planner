/**
 * WedFlow Supabase Budget Adapter
 *
 * Direct interface to `public.budget_allocations` and `public.budget_expenses`.
 * Translates between frontend StoredBudget (BudgetAllocation[], BudgetExpense[])
 * and PostgreSQL budget tables.
 */

import { supabase } from '../lib/supabaseClient';
import { StoredBudget, BudgetAllocation, BudgetExpense, BudgetCategory } from '../types/budget';

export interface SupabaseBudgetAllocationRow {
  id: string;
  workspace_id: string;
  category: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface SupabaseBudgetExpenseRow {
  id: string;
  workspace_id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export function mapRowToBudgetAllocation(row: SupabaseBudgetAllocationRow): BudgetAllocation {
  return {
    id: row.id,
    category: row.category as BudgetCategory,
    amount: Number(row.amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBudgetAllocationToRow(
  alloc: BudgetAllocation,
  workspaceId: string
): SupabaseBudgetAllocationRow {
  return {
    id: alloc.id,
    workspace_id: workspaceId,
    category: alloc.category,
    amount: alloc.amount,
    created_at: alloc.createdAt,
    updated_at: alloc.updatedAt,
  };
}

export function mapRowToBudgetExpense(row: SupabaseBudgetExpenseRow): BudgetExpense {
  return {
    id: row.id,
    title: row.title,
    category: row.category as BudgetCategory,
    amount: Number(row.amount),
    date: row.date,
    note: row.note ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBudgetExpenseToRow(
  expense: BudgetExpense,
  workspaceId: string
): SupabaseBudgetExpenseRow {
  return {
    id: expense.id,
    workspace_id: workspaceId,
    title: expense.title,
    category: expense.category,
    amount: expense.amount,
    date: expense.date,
    note: expense.note ?? null,
    created_at: expense.createdAt,
    updated_at: expense.updatedAt,
  };
}

/**
 * Fetches the entire budget (allocations and expenses) for a workspace.
 */
export async function fetchBudgetByWorkspaceId(workspaceId: string): Promise<StoredBudget> {
  if (!workspaceId) {
    return { allocations: [], expenses: [] };
  }

  const [allocationsResult, expensesResult] = await Promise.all([
    supabase
      .from('budget_allocations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true }),
    supabase
      .from('budget_expenses')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('date', { ascending: false }),
  ]);

  if (allocationsResult.error) {
    console.error('[WedFlow] Failed to fetch budget allocations:', allocationsResult.error);
    throw new Error(allocationsResult.error.message || 'Gagal mengambil alokasi budget.');
  }

  if (expensesResult.error) {
    console.error('[WedFlow] Failed to fetch budget expenses:', expensesResult.error);
    throw new Error(expensesResult.error.message || 'Gagal mengambil pengeluaran budget.');
  }

  return {
    allocations: (allocationsResult.data || []).map(mapRowToBudgetAllocation),
    expenses: (expensesResult.data || []).map(mapRowToBudgetExpense),
  };
}

/**
 * Upserts a budget allocation, respecting the (workspace_id, category) unique constraint.
 */
export async function upsertBudgetAllocation(
  workspaceId: string,
  allocation: BudgetAllocation
): Promise<BudgetAllocation> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk alokasi budget.');
  }

  // Look up existing allocation ID for this category if already present
  const { data: existing } = await supabase
    .from('budget_allocations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('category', allocation.category)
    .maybeSingle();

  const row = {
    id: existing?.id || allocation.id,
    workspace_id: workspaceId,
    category: allocation.category,
    amount: allocation.amount,
    created_at: allocation.createdAt,
    updated_at: allocation.updatedAt || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('budget_allocations')
    .upsert(row, { onConflict: 'workspace_id,category' })
    .select('*')
    .single();

  if (error) {
    console.error('[WedFlow] Failed to save budget allocation:', error);
    throw new Error(error.message || 'Gagal menyimpan alokasi budget.');
  }

  return mapRowToBudgetAllocation(data);
}

/**
 * Inserts a budget expense.
 */
export async function insertBudgetExpense(
  workspaceId: string,
  expense: BudgetExpense
): Promise<BudgetExpense> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk pengeluaran budget.');
  }

  const row = mapBudgetExpenseToRow(expense, workspaceId);
  const { data, error } = await supabase
    .from('budget_expenses')
    .insert(row)
    .select('*')
    .single();

  if (error) {
    console.error('[WedFlow] Failed to insert budget expense:', error);
    throw new Error(error.message || 'Gagal menyimpan pengeluaran budget.');
  }

  return mapRowToBudgetExpense(data);
}

/**
 * Updates a budget expense.
 */
export async function updateBudgetExpense(
  workspaceId: string,
  expense: BudgetExpense
): Promise<BudgetExpense> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk memperbarui pengeluaran budget.');
  }

  const row = mapBudgetExpenseToRow(expense, workspaceId);
  const { data, error } = await supabase
    .from('budget_expenses')
    .update(row)
    .eq('id', expense.id)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single();

  if (error) {
    console.error('[WedFlow] Failed to update budget expense:', error);
    throw new Error(error.message || 'Gagal memperbarui pengeluaran budget.');
  }

  return mapRowToBudgetExpense(data);
}

/**
 * Deletes a budget expense.
 */
export async function deleteBudgetExpense(
  workspaceId: string,
  expenseId: string
): Promise<void> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk menghapus pengeluaran.');
  }

  const { error } = await supabase
    .from('budget_expenses')
    .delete()
    .eq('id', expenseId)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[WedFlow] Failed to delete budget expense:', error);
    throw new Error(error.message || 'Gagal menghapus pengeluaran budget.');
  }
}

/**
 * Persists the entire budget state (allocations & expenses) for a workspace.
 * Uses atomic upsert by (workspace_id, category) and cleans up stale categories,
 * strictly guaranteeing that no duplicate key constraint violation can occur.
 * Never modifies or deletes BudgetExpense records.
 */
export async function saveBudgetToDb(
  workspaceId: string,
  budget: StoredBudget
): Promise<StoredBudget> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk menyimpan budget.');
  }

  // Fetch current existing allocations in DB to know which categories and IDs exist
  const { data: existingAllocations, error: fetchError } = await supabase
    .from('budget_allocations')
    .select('id, category')
    .eq('workspace_id', workspaceId);

  if (fetchError) {
    console.error('[WedFlow] Failed to fetch existing allocations for replacement:', fetchError);
    throw new Error(fetchError.message || 'Gagal memeriksa alokasi budget existing.');
  }

  // Categories in the incoming budget
  const newCategories = new Set(budget.allocations.map((a) => a.category));

  // Find any existing allocation categories that are no longer present in the new budget
  const staleAllocationIds = (existingAllocations || [])
    .filter((row) => !newCategories.has(row.category as BudgetCategory))
    .map((row) => row.id);

  if (staleAllocationIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('budget_allocations')
      .delete()
      .in('id', staleAllocationIds)
      .eq('workspace_id', workspaceId);

    if (deleteError) {
      console.error('[WedFlow] Failed to remove stale budget allocations:', deleteError);
      throw new Error(deleteError.message || 'Gagal menghapus alokasi lama.');
    }
  }

  // Upsert all new allocations with onConflict on (workspace_id, category)
  if (budget.allocations.length > 0) {
    const existingMap = new Map((existingAllocations || []).map((row) => [row.category, row.id]));
    const now = new Date().toISOString();

    const allocRows = budget.allocations.map((a) => {
      const existingId = existingMap.get(a.category);
      return {
        id: existingId || a.id,
        workspace_id: workspaceId,
        category: a.category,
        amount: a.amount,
        created_at: a.createdAt || now,
        updated_at: now,
      };
    });

    const { error: allocError } = await supabase
      .from('budget_allocations')
      .upsert(allocRows, { onConflict: 'workspace_id,category' });

    if (allocError) {
      console.error('[WedFlow] Failed to upsert budget allocations:', allocError);
      throw new Error(allocError.message || 'Gagal menyimpan alokasi budget.');
    }
  }

  return fetchBudgetByWorkspaceId(workspaceId);
}
