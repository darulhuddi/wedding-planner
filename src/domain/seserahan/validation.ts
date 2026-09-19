/**
 * WedSiap Seserahan Domain Validation Utilities (V1 Phase 1)
 *
 * Pure validation functions with zero side-effects.
 * Enforces business rules:
 * - Plan budget cannot be negative
 * - Estimated cost cannot be negative
 * - Actual cost cannot be negative
 * - Item must have a name
 * - Item status must be valid ('planned' | 'purchased' | 'completed')
 */

import {
  SeserahanItemStatus,
  SESERAHAN_ITEM_STATUSES,
  SeserahanPlan,
  SeserahanCategory,
  SeserahanItem,
} from './types';

/**
 * Type guard to check if a value is a valid SeserahanItemStatus.
 */
export function isValidItemStatus(status: unknown): status is SeserahanItemStatus {
  return (
    typeof status === 'string' &&
    SESERAHAN_ITEM_STATUSES.includes(status as SeserahanItemStatus)
  );
}

/**
 * Validates a SeserahanPlan payload.
 */
export function validateSeserahanPlan(
  plan: Partial<SeserahanPlan>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (plan.name !== undefined) {
    if (typeof plan.name !== 'string' || plan.name.trim().length === 0) {
      errors.push('Nama rencana seserahan tidak boleh kosong.');
    }
  }

  if (plan.budget !== undefined) {
    if (typeof plan.budget !== 'number' || Number.isNaN(plan.budget) || plan.budget < 0) {
      errors.push('Budget seserahan tidak boleh negatif.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a SeserahanCategory payload.
 */
export function validateSeserahanCategory(
  category: Partial<SeserahanCategory>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (category.name === undefined || typeof category.name !== 'string' || category.name.trim().length === 0) {
    errors.push('Nama kategori seserahan wajib diisi.');
  }

  if (category.sortOrder !== undefined) {
    if (typeof category.sortOrder !== 'number' || Number.isNaN(category.sortOrder) || category.sortOrder < 0) {
      errors.push('Nomor urut kategori harus berupa angka non-negatif.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a SeserahanItem payload.
 */
export function validateSeserahanItem(
  item: Partial<SeserahanItem>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (item.name === undefined || typeof item.name !== 'string' || item.name.trim().length === 0) {
    errors.push('Nama barang seserahan wajib diisi.');
  }

  if (item.status !== undefined && !isValidItemStatus(item.status)) {
    errors.push(`Status barang tidak valid. Harus salah satu dari: ${SESERAHAN_ITEM_STATUSES.join(', ')}.`);
  }

  if (item.estimatedCost !== undefined) {
    if (typeof item.estimatedCost !== 'number' || Number.isNaN(item.estimatedCost) || item.estimatedCost < 0) {
      errors.push('Estimasi biaya tidak boleh bernilai negatif.');
    }
  }

  if (item.actualCost !== undefined && item.actualCost !== null) {
    if (typeof item.actualCost !== 'number' || Number.isNaN(item.actualCost) || item.actualCost < 0) {
      errors.push('Biaya aktual tidak boleh bernilai negatif.');
    }
  }

  if (item.sortOrder !== undefined) {
    if (typeof item.sortOrder !== 'number' || Number.isNaN(item.sortOrder) || item.sortOrder < 0) {
      errors.push('Nomor urut barang harus berupa angka non-negatif.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
