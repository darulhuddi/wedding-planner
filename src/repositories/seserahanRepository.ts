/**
 * WedSiap Seserahan Repository (V1 Phase 1)
 *
 * Domain-oriented repository abstraction for the Seserahan domain.
 * Mediates between domain logic and the persistence adapter.
 *
 * Architecture:
 *   UI / Features
 *        ↓
 *   seserahanRepository
 *        ↓
 *   supabaseSeserahanAdapter
 *        ↓
 *   Supabase PostgreSQL
 */

import {
  SeserahanPlan,
  SeserahanCategory,
  SeserahanItem,
  SeserahanMetrics,
} from '../domain/seserahan/types';
import {
  validateSeserahanPlan,
  validateSeserahanCategory,
  validateSeserahanItem,
} from '../domain/seserahan/validation';
import { calculateSeserahanMetrics } from '../domain/seserahan/metrics';
import { SESERAHAN_TEMPLATES, SeserahanTemplateType } from '../domain/seserahan/templates';
import {
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
} from './supabaseSeserahanAdapter';

import { getDefaultRecommendedItemDeadline } from '../domain/seserahan/deadlines';
import {
  updatePackagingStatusInDb,
  updateFinalCheckStatusInDb,
} from './supabaseSeserahanAdapter';

// ─── Plan Repository ─────────────────────────────────────────────────────────

export async function getSeserahanPlan(workspaceId: string): Promise<SeserahanPlan | null> {
  if (!workspaceId) return null;
  return fetchPlanByWorkspaceId(workspaceId);
}

export async function getSeserahanPlanById(
  workspaceId: string,
  planId: string
): Promise<SeserahanPlan | null> {
  if (!workspaceId || !planId) return null;
  return fetchPlanById(workspaceId, planId);
}

export async function createSeserahanPlan(
  workspaceId: string,
  payload?: { name?: string; budget?: number }
): Promise<SeserahanPlan> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk membuat rencana seserahan.');
  }

  const validation = validateSeserahanPlan(payload || {});
  if (!validation.isValid) {
    throw new Error(`Validasi gagal: ${validation.errors.join(', ')}`);
  }

  return insertPlan(workspaceId, payload || {});
}

/**
 * Creates a Seserahan plan and populates it with starter categories and items
 * from a selected starter template.
 * If weddingDate is provided, populates default recommended deadlines (H-14).
 */
export async function createPlanFromTemplate(
  workspaceId: string,
  templateType: SeserahanTemplateType,
  customBudget?: number,
  weddingDate?: string | null
): Promise<{ plan: SeserahanPlan; categories: SeserahanCategory[]; items: SeserahanItem[] }> {
  const template = SESERAHAN_TEMPLATES[templateType] || SESERAHAN_TEMPLATES.standard;
  const budgetToUse = typeof customBudget === 'number' && customBudget >= 0
    ? customBudget
    : template.recommendedBudget;

  const defaultDueDate = getDefaultRecommendedItemDeadline(weddingDate);

  const plan = await createSeserahanPlan(workspaceId, {
    name: 'Seserahan',
    budget: budgetToUse,
  });

  const createdCategories: SeserahanCategory[] = [];
  const createdItems: SeserahanItem[] = [];

  for (let cIdx = 0; cIdx < template.categories.length; cIdx++) {
    const catDef = template.categories[cIdx];
    const category = await createSeserahanCategory(plan.id, {
      name: catDef.name,
      sortOrder: cIdx,
    });
    createdCategories.push(category);

    for (let iIdx = 0; iIdx < catDef.items.length; iIdx++) {
      const itemDef = catDef.items[iIdx];
      const item = await createSeserahanItem(plan.id, {
        categoryId: category.id,
        name: itemDef.name,
        estimatedCost: itemDef.estimatedCost,
        actualCost: 0,
        status: 'planned',
        notes: itemDef.notes || null,
        sortOrder: iIdx,
        responsibleParty: itemDef.responsibleParty || 'groom',
        responsiblePartyCustom: null,
        dueDate: defaultDueDate,
      });
      createdItems.push(item);
    }
  }

  return { plan, categories: createdCategories, items: createdItems };
}

export async function updateSeserahanPlan(
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

  const validation = validateSeserahanPlan(changes);
  if (!validation.isValid) {
    throw new Error(`Validasi gagal: ${validation.errors.join(', ')}`);
  }

  return updatePlanInDb(workspaceId, planId, changes);
}

export async function updateSeserahanPackaging(
  workspaceId: string,
  planId: string,
  started: boolean,
  completed: boolean
): Promise<SeserahanPlan> {
  const now = new Date().toISOString();
  let startedAt: string | null = null;
  let completedAt: string | null = null;

  if (completed) {
    startedAt = now;
    completedAt = now;
  } else if (started) {
    startedAt = now;
    completedAt = null;
  }

  return updatePackagingStatusInDb(workspaceId, planId, startedAt, completedAt);
}

export async function updateSeserahanFinalCheck(
  workspaceId: string,
  planId: string,
  checked: boolean
): Promise<SeserahanPlan> {
  const checkedAt = checked ? new Date().toISOString() : null;
  return updateFinalCheckStatusInDb(workspaceId, planId, checkedAt);
}

export async function deleteSeserahanPlan(
  workspaceId: string,
  planId: string
): Promise<void> {
  if (!workspaceId || !planId) {
    throw new Error('Workspace ID dan Plan ID diperlukan untuk menghapus rencana seserahan.');
  }

  return deletePlanFromDb(workspaceId, planId);
}

// ─── Categories Repository ───────────────────────────────────────────────────

export async function getSeserahanCategories(planId: string): Promise<SeserahanCategory[]> {
  if (!planId) return [];
  return fetchCategoriesByPlanId(planId);
}

export async function createSeserahanCategory(
  planId: string,
  payload: { name: string; sortOrder?: number }
): Promise<SeserahanCategory> {
  if (!planId) {
    throw new Error('Plan ID diperlukan untuk membuat kategori seserahan.');
  }

  const validation = validateSeserahanCategory(payload);
  if (!validation.isValid) {
    throw new Error(`Validasi gagal: ${validation.errors.join(', ')}`);
  }

  return insertCategory(planId, payload);
}

export async function updateSeserahanCategory(
  planId: string,
  categoryId: string,
  changes: Partial<{ name: string; sortOrder: number }>
): Promise<SeserahanCategory> {
  if (!planId || !categoryId) {
    throw new Error('Plan ID dan Category ID diperlukan untuk memperbarui kategori.');
  }

  const validation = validateSeserahanCategory(changes);
  if (!validation.isValid) {
    throw new Error(`Validasi gagal: ${validation.errors.join(', ')}`);
  }

  return updateCategoryInDb(planId, categoryId, changes);
}

export async function deleteSeserahanCategory(
  planId: string,
  categoryId: string
): Promise<void> {
  if (!planId || !categoryId) {
    throw new Error('Plan ID dan Category ID diperlukan untuk menghapus kategori.');
  }

  return deleteCategoryFromDb(planId, categoryId);
}

// ─── Items Repository ────────────────────────────────────────────────────────

export async function getSeserahanItems(planId: string): Promise<SeserahanItem[]> {
  if (!planId) return [];
  return fetchItemsByPlanId(planId);
}

export async function getSeserahanItem(
  planId: string,
  itemId: string
): Promise<SeserahanItem | null> {
  if (!planId || !itemId) return null;
  return fetchItemById(planId, itemId);
}

export async function createSeserahanItem(
  planId: string,
  payload: {
    categoryId?: string | null;
    name: string;
    status?: SeserahanItem['status'];
    estimatedCost?: number;
    actualCost?: number;
    notes?: string | null;
    sortOrder?: number;
    responsibleParty?: SeserahanItem['responsibleParty'];
    responsiblePartyCustom?: string | null;
    dueDate?: string | null;
  }
): Promise<SeserahanItem> {
  if (!planId) {
    throw new Error('Plan ID diperlukan untuk membuat barang seserahan.');
  }

  const validation = validateSeserahanItem(payload);
  if (!validation.isValid) {
    throw new Error(`Validasi gagal: ${validation.errors.join(', ')}`);
  }

  return insertItem(planId, payload);
}

export async function updateSeserahanItem(
  planId: string,
  itemId: string,
  changes: Partial<Omit<SeserahanItem, 'id' | 'planId' | 'createdAt' | 'updatedAt'>>
): Promise<SeserahanItem> {
  if (!planId || !itemId) {
    throw new Error('Plan ID dan Item ID diperlukan untuk memperbarui barang seserahan.');
  }

  const validation = validateSeserahanItem(changes);
  if (!validation.isValid) {
    throw new Error(`Validasi gagal: ${validation.errors.join(', ')}`);
  }

  return updateItemInDb(planId, itemId, changes);
}

export async function deleteSeserahanItem(
  planId: string,
  itemId: string
): Promise<void> {
  if (!planId || !itemId) {
    throw new Error('Plan ID dan Item ID diperlukan untuk menghapus barang seserahan.');
  }

  return deleteItemFromDb(planId, itemId);
}

// ─── Derived Metrics Service Integration ─────────────────────────────────────

export async function getSeserahanMetrics(
  workspaceId: string,
  today: string = new Date().toISOString().split('T')[0]
): Promise<SeserahanMetrics> {
  if (!workspaceId) {
    return calculateSeserahanMetrics(0, []);
  }

  const plan = await fetchPlanByWorkspaceId(workspaceId);
  if (!plan) {
    return calculateSeserahanMetrics(0, []);
  }

  const items = await fetchItemsByPlanId(plan.id);
  return calculateSeserahanMetrics(plan.budget, items, plan, today);
}
