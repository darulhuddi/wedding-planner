/**
 * WedSiap Supabase Seserahan Adapter (V1 Phase 1)
 *
 * Direct interface to `public.seserahan_plans`, `public.seserahan_categories`,
 * and `public.seserahan_items`.
 * Translates between TypeScript domain models (camelCase) and PostgreSQL tables (snake_case).
 *
 * Responsibilities:
 * - Querying, inserting, updating, and deleting plans, categories, and items.
 * - Mapping persistence rows to domain models.
 * - Consistent error handling and schema cache safety (PGRST205 / 42P01).
 * - Zero business logic or UI logic.
 */

import { supabase } from '../lib/supabaseClient';
import {
  SeserahanPlan,
  SeserahanCategory,
  SeserahanItem,
  SeserahanItemStatus,
  ResponsibleParty,
} from '../domain/seserahan/types';

export interface SupabaseSeserahanPlanRow {
  id: string;
  workspace_id: string;
  name: string;
  budget: number | string;
  packaging_started_at?: string | null;
  packaging_completed_at?: string | null;
  final_checked_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseSeserahanCategoryRow {
  id: string;
  plan_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SupabaseSeserahanItemRow {
  id: string;
  plan_id: string;
  category_id: string | null;
  name: string;
  status: string;
  estimated_cost: number | string;
  actual_cost: number | string;
  notes: string | null;
  sort_order: number;
  responsible_party?: string | null;
  responsible_party_custom?: string | null;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

export function mapRowToPlan(row: SupabaseSeserahanPlanRow): SeserahanPlan {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    budget: Number(row.budget) || 0,
    packagingStartedAt: row.packaging_started_at ?? null,
    packagingCompletedAt: row.packaging_completed_at ?? null,
    finalCheckedAt: row.final_checked_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPlanToRow(
  plan: Partial<SeserahanPlan>,
  workspaceId: string
): Partial<SupabaseSeserahanPlanRow> {
  const row: Partial<SupabaseSeserahanPlanRow> = {
    workspace_id: workspaceId,
  };
  if (plan.name !== undefined) row.name = plan.name.trim();
  if (plan.budget !== undefined) row.budget = plan.budget;
  if (plan.packagingStartedAt !== undefined) row.packaging_started_at = plan.packagingStartedAt;
  if (plan.packagingCompletedAt !== undefined) row.packaging_completed_at = plan.packagingCompletedAt;
  if (plan.finalCheckedAt !== undefined) row.final_checked_at = plan.finalCheckedAt;
  if (plan.updatedAt !== undefined) row.updated_at = plan.updatedAt;
  return row;
}

export function mapRowToCategory(row: SupabaseSeserahanCategoryRow): SeserahanCategory {
  return {
    id: row.id,
    planId: row.plan_id,
    name: row.name,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCategoryToRow(
  cat: Partial<SeserahanCategory>,
  planId: string
): Partial<SupabaseSeserahanCategoryRow> {
  const row: Partial<SupabaseSeserahanCategoryRow> = {
    plan_id: planId,
  };
  if (cat.name !== undefined) row.name = cat.name.trim();
  if (cat.sortOrder !== undefined) row.sort_order = cat.sortOrder;
  if (cat.updatedAt !== undefined) row.updated_at = cat.updatedAt;
  return row;
}

export function mapRowToItem(row: SupabaseSeserahanItemRow): SeserahanItem {
  return {
    id: row.id,
    planId: row.plan_id,
    categoryId: row.category_id ?? null,
    name: row.name,
    status: (row.status as SeserahanItemStatus) || 'planned',
    estimatedCost: Number(row.estimated_cost) || 0,
    actualCost: Number(row.actual_cost) || 0,
    notes: row.notes ?? null,
    sortOrder: Number(row.sort_order) || 0,
    responsibleParty: (row.responsible_party as ResponsibleParty) ?? null,
    responsiblePartyCustom: row.responsible_party_custom ?? null,
    dueDate: row.due_date ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapItemToRow(
  item: Partial<SeserahanItem>,
  planId: string
): Partial<SupabaseSeserahanItemRow> {
  const row: Partial<SupabaseSeserahanItemRow> = {
    plan_id: planId,
  };
  if (item.categoryId !== undefined) row.category_id = item.categoryId;
  if (item.name !== undefined) row.name = item.name.trim();
  if (item.status !== undefined) row.status = item.status;
  if (item.estimatedCost !== undefined) row.estimated_cost = item.estimatedCost;
  if (item.actualCost !== undefined) row.actual_cost = item.actualCost;
  if (item.notes !== undefined) row.notes = item.notes ? item.notes.trim() : null;
  if (item.sortOrder !== undefined) row.sort_order = item.sortOrder;
  if (item.responsibleParty !== undefined) row.responsible_party = item.responsibleParty;
  if (item.responsiblePartyCustom !== undefined) row.responsible_party_custom = item.responsiblePartyCustom;
  if (item.dueDate !== undefined) row.due_date = item.dueDate;
  if (item.updatedAt !== undefined) row.updated_at = item.updatedAt;
  return row;
}

// ─── Plan Operations ─────────────────────────────────────────────────────────

export async function fetchPlanByWorkspaceId(workspaceId: string): Promise<SeserahanPlan | null> {
  if (!workspaceId) return null;

  const { data, error } = await supabase
    .from('seserahan_plans')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') {
      return null;
    }
    console.error('[WedSiap] Failed to fetch seserahan plan by workspace ID:', error);
    throw new Error(error.message || 'Gagal mengambil rencana seserahan dari database.');
  }

  if (!data) return null;
  return mapRowToPlan(data as SupabaseSeserahanPlanRow);
}

export async function fetchPlanById(workspaceId: string, planId: string): Promise<SeserahanPlan | null> {
  if (!workspaceId || !planId) return null;

  const { data, error } = await supabase
    .from('seserahan_plans')
    .select('*')
    .eq('id', planId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') {
      return null;
    }
    console.error('[WedSiap] Failed to fetch seserahan plan by ID:', error);
    throw new Error(error.message || 'Gagal mengambil rencana seserahan dari database.');
  }

  if (!data) return null;
  return mapRowToPlan(data as SupabaseSeserahanPlanRow);
}

export async function insertPlan(
  workspaceId: string,
  planData: { name?: string; budget?: number }
): Promise<SeserahanPlan> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk membuat rencana seserahan.');
  }

  const now = new Date().toISOString();
  const payload = {
    workspace_id: workspaceId,
    name: planData.name?.trim() || 'Seserahan',
    budget: typeof planData.budget === 'number' && planData.budget >= 0 ? planData.budget : 0,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('seserahan_plans')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('[WedSiap] Failed to insert seserahan plan into Supabase:', error);
    throw new Error(error.message || 'Gagal membuat rencana seserahan di database.');
  }

  return mapRowToPlan(data as SupabaseSeserahanPlanRow);
}

export async function updatePlanInDb(
  workspaceId: string,
  planId: string,
  changes: Partial<{
    name: string;
    budget: number;
    packagingStartedAt: string | null;
    packagingCompletedAt: string | null;
    finalCheckedAt: string | null;
  }>
): Promise<SeserahanPlan> {
  if (!workspaceId || !planId) {
    throw new Error('Workspace ID dan Plan ID diperlukan untuk memperbarui rencana seserahan.');
  }

  const payload: Partial<SupabaseSeserahanPlanRow> = {
    updated_at: new Date().toISOString(),
  };

  if (changes.name !== undefined) payload.name = changes.name.trim();
  if (changes.budget !== undefined) payload.budget = changes.budget;
  if (changes.packagingStartedAt !== undefined) payload.packaging_started_at = changes.packagingStartedAt;
  if (changes.packagingCompletedAt !== undefined) payload.packaging_completed_at = changes.packagingCompletedAt;
  if (changes.finalCheckedAt !== undefined) payload.final_checked_at = changes.finalCheckedAt;

  const { data, error } = await supabase
    .from('seserahan_plans')
    .update(payload)
    .eq('id', planId)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single();

  if (error) {
    console.error('[WedSiap] Failed to update seserahan plan in Supabase:', error);
    throw new Error(error.message || 'Gagal memperbarui rencana seserahan di database.');
  }

  return mapRowToPlan(data as SupabaseSeserahanPlanRow);
}

export async function updatePackagingStatusInDb(
  workspaceId: string,
  planId: string,
  startedAt: string | null,
  completedAt: string | null
): Promise<SeserahanPlan> {
  return updatePlanInDb(workspaceId, planId, {
    packagingStartedAt: startedAt,
    packagingCompletedAt: completedAt,
  });
}

export async function updateFinalCheckStatusInDb(
  workspaceId: string,
  planId: string,
  checkedAt: string | null
): Promise<SeserahanPlan> {
  return updatePlanInDb(workspaceId, planId, {
    finalCheckedAt: checkedAt,
  });
}

export async function deletePlanFromDb(workspaceId: string, planId: string): Promise<void> {
  if (!workspaceId || !planId) {
    throw new Error('Workspace ID dan Plan ID diperlukan untuk menghapus rencana seserahan.');
  }

  const { error } = await supabase
    .from('seserahan_plans')
    .delete()
    .eq('id', planId)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[WedSiap] Failed to delete seserahan plan from Supabase:', error);
    throw new Error(error.message || 'Gagal menghapus rencana seserahan dari database.');
  }
}

// ─── Category Operations ─────────────────────────────────────────────────────

export async function fetchCategoriesByPlanId(planId: string): Promise<SeserahanCategory[]> {
  if (!planId) return [];

  const { data, error } = await supabase
    .from('seserahan_categories')
    .select('*')
    .eq('plan_id', planId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') {
      return [];
    }
    console.error('[WedSiap] Failed to fetch seserahan categories from Supabase:', error);
    throw new Error(error.message || 'Gagal mengambil kategori seserahan dari database.');
  }

  return (data || []).map((row) => mapRowToCategory(row as SupabaseSeserahanCategoryRow));
}

export async function insertCategory(
  planId: string,
  categoryData: { name: string; sortOrder?: number }
): Promise<SeserahanCategory> {
  if (!planId) {
    throw new Error('Plan ID diperlukan untuk membuat kategori seserahan.');
  }

  const now = new Date().toISOString();
  const payload = {
    plan_id: planId,
    name: categoryData.name.trim(),
    sort_order: categoryData.sortOrder ?? 0,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('seserahan_categories')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('[WedSiap] Failed to insert seserahan category into Supabase:', error);
    throw new Error(error.message || 'Gagal membuat kategori seserahan di database.');
  }

  return mapRowToCategory(data as SupabaseSeserahanCategoryRow);
}

export async function updateCategoryInDb(
  planId: string,
  categoryId: string,
  changes: Partial<{ name: string; sortOrder: number }>
): Promise<SeserahanCategory> {
  if (!planId || !categoryId) {
    throw new Error('Plan ID dan Category ID diperlukan untuk memperbarui kategori.');
  }

  const payload: Partial<SupabaseSeserahanCategoryRow> = {
    updated_at: new Date().toISOString(),
  };

  if (changes.name !== undefined) payload.name = changes.name.trim();
  if (changes.sortOrder !== undefined) payload.sort_order = changes.sortOrder;

  const { data, error } = await supabase
    .from('seserahan_categories')
    .update(payload)
    .eq('id', categoryId)
    .eq('plan_id', planId)
    .select('*')
    .single();

  if (error) {
    console.error('[WedSiap] Failed to update seserahan category in Supabase:', error);
    throw new Error(error.message || 'Gagal memperbarui kategori seserahan di database.');
  }

  return mapRowToCategory(data as SupabaseSeserahanCategoryRow);
}

export async function deleteCategoryFromDb(planId: string, categoryId: string): Promise<void> {
  if (!planId || !categoryId) {
    throw new Error('Plan ID dan Category ID diperlukan untuk menghapus kategori.');
  }

  const { error } = await supabase
    .from('seserahan_categories')
    .delete()
    .eq('id', categoryId)
    .eq('plan_id', planId);

  if (error) {
    console.error('[WedSiap] Failed to delete seserahan category from Supabase:', error);
    throw new Error(error.message || 'Gagal menghapus kategori seserahan dari database.');
  }
}

// ─── Item Operations ─────────────────────────────────────────────────────────

export async function fetchItemsByPlanId(planId: string): Promise<SeserahanItem[]> {
  if (!planId) return [];

  const { data, error } = await supabase
    .from('seserahan_items')
    .select('*')
    .eq('plan_id', planId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') {
      return [];
    }
    console.error('[WedSiap] Failed to fetch seserahan items from Supabase:', error);
    throw new Error(error.message || 'Gagal mengambil daftar barang seserahan dari database.');
  }

  return (data || []).map((row) => mapRowToItem(row as SupabaseSeserahanItemRow));
}

export async function fetchItemById(planId: string, itemId: string): Promise<SeserahanItem | null> {
  if (!planId || !itemId) return null;

  const { data, error } = await supabase
    .from('seserahan_items')
    .select('*')
    .eq('id', itemId)
    .eq('plan_id', planId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') {
      return null;
    }
    console.error('[WedSiap] Failed to fetch seserahan item by ID:', error);
    throw new Error(error.message || 'Gagal mengambil data barang seserahan dari database.');
  }

  if (!data) return null;
  return mapRowToItem(data as SupabaseSeserahanItemRow);
}

export async function insertItem(
  planId: string,
  itemData: {
    categoryId?: string | null;
    name: string;
    status?: SeserahanItemStatus;
    estimatedCost?: number;
    actualCost?: number;
    notes?: string | null;
    sortOrder?: number;
    responsibleParty?: ResponsibleParty | null;
    responsiblePartyCustom?: string | null;
    dueDate?: string | null;
  }
): Promise<SeserahanItem> {
  if (!planId) {
    throw new Error('Plan ID diperlukan untuk membuat barang seserahan.');
  }

  const now = new Date().toISOString();
  const payload = {
    plan_id: planId,
    category_id: itemData.categoryId ?? null,
    name: itemData.name.trim(),
    status: itemData.status || 'planned',
    estimated_cost: itemData.estimatedCost ?? 0,
    actual_cost: itemData.actualCost ?? 0,
    notes: itemData.notes ? itemData.notes.trim() : null,
    sort_order: itemData.sortOrder ?? 0,
    responsible_party: itemData.responsibleParty ?? null,
    responsible_party_custom: itemData.responsiblePartyCustom ?? null,
    due_date: itemData.dueDate ?? null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('seserahan_items')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('[WedSiap] Failed to insert seserahan item into Supabase:', error);
    throw new Error(error.message || 'Gagal membuat barang seserahan di database.');
  }

  return mapRowToItem(data as SupabaseSeserahanItemRow);
}

export async function updateItemInDb(
  planId: string,
  itemId: string,
  changes: Partial<Omit<SeserahanItem, 'id' | 'planId' | 'createdAt' | 'updatedAt'>>
): Promise<SeserahanItem> {
  if (!planId || !itemId) {
    throw new Error('Plan ID dan Item ID diperlukan untuk memperbarui barang seserahan.');
  }

  const payload: Partial<SupabaseSeserahanItemRow> = {
    updated_at: new Date().toISOString(),
  };

  if (changes.categoryId !== undefined) payload.category_id = changes.categoryId;
  if (changes.name !== undefined) payload.name = changes.name.trim();
  if (changes.status !== undefined) payload.status = changes.status;
  if (changes.estimatedCost !== undefined) payload.estimated_cost = changes.estimatedCost;
  if (changes.actualCost !== undefined) payload.actual_cost = changes.actualCost;
  if (changes.notes !== undefined) payload.notes = changes.notes ? changes.notes.trim() : null;
  if (changes.sortOrder !== undefined) payload.sort_order = changes.sortOrder;
  if (changes.responsibleParty !== undefined) payload.responsible_party = changes.responsibleParty;
  if (changes.responsiblePartyCustom !== undefined) payload.responsible_party_custom = changes.responsiblePartyCustom;
  if (changes.dueDate !== undefined) payload.due_date = changes.dueDate;

  const { data, error } = await supabase
    .from('seserahan_items')
    .update(payload)
    .eq('id', itemId)
    .eq('plan_id', planId)
    .select('*')
    .single();

  if (error) {
    console.error('[WedSiap] Failed to update seserahan item in Supabase:', error);
    throw new Error(error.message || 'Gagal memperbarui barang seserahan di database.');
  }

  return mapRowToItem(data as SupabaseSeserahanItemRow);
}

export async function deleteItemFromDb(planId: string, itemId: string): Promise<void> {
  if (!planId || !itemId) {
    throw new Error('Plan ID dan Item ID diperlukan untuk menghapus barang seserahan.');
  }

  const { error } = await supabase
    .from('seserahan_items')
    .delete()
    .eq('id', itemId)
    .eq('plan_id', planId);

  if (error) {
    console.error('[WedSiap] Failed to delete seserahan item from Supabase:', error);
    throw new Error(error.message || 'Gagal menghapus barang seserahan dari database.');
  }
}
