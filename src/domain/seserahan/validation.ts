/**
 * WedSiap Seserahan Domain Validation Utilities (V2 Planning Foundation)
 *
 * Pure validation functions with zero side-effects.
 * Enforces business rules:
 * - Plan budget cannot be negative
 * - Estimated cost cannot be negative
 * - Actual cost cannot be negative
 * - Item must have a name
 * - Item status must be valid ('planned' | 'purchased' | 'completed')
 * - Responsible party must be one of allowed values or null
 * - When responsible party is 'custom', responsiblePartyCustom is required
 * - When responsible party is NOT 'custom', responsiblePartyCustom must be null
 * - Due date must be valid ISO format (YYYY-MM-DD) or null
 * - Plan lifecycle timestamps must be valid ISO date strings or null
 */

import {
  SeserahanItemStatus,
  SESERAHAN_ITEM_STATUSES,
  ResponsibleParty,
  RESPONSIBLE_PARTIES,
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
 * Type guard to check if a value is a valid ResponsibleParty.
 */
export function isValidResponsibleParty(party: unknown): party is ResponsibleParty {
  return (
    typeof party === 'string' &&
    RESPONSIBLE_PARTIES.includes(party as ResponsibleParty)
  );
}

/**
 * Validates a date string (YYYY-MM-DD or ISO string).
 */
export function isValidDateString(dateStr: unknown): boolean {
  if (typeof dateStr !== 'string' || dateStr.trim().length === 0) return false;
  const parsed = new Date(dateStr);
  return !isNaN(parsed.getTime());
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

  if (plan.packagingStartedAt !== undefined && plan.packagingStartedAt !== null) {
    if (!isValidDateString(plan.packagingStartedAt)) {
      errors.push('Format waktu mulai pengemasan tidak valid.');
    }
  }

  if (plan.packagingCompletedAt !== undefined && plan.packagingCompletedAt !== null) {
    if (!isValidDateString(plan.packagingCompletedAt)) {
      errors.push('Format waktu selesai pengemasan tidak valid.');
    }
  }

  if (plan.finalCheckedAt !== undefined && plan.finalCheckedAt !== null) {
    if (!isValidDateString(plan.finalCheckedAt)) {
      errors.push('Format waktu pengecekan akhir tidak valid.');
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

  // Responsible party validation
  if (item.responsibleParty !== undefined && item.responsibleParty !== null) {
    if (!isValidResponsibleParty(item.responsibleParty)) {
      errors.push(`Pihak penanggung jawab tidak valid. Pilihan: ${RESPONSIBLE_PARTIES.join(', ')}.`);
    }

    if (item.responsibleParty === 'custom') {
      if (!item.responsiblePartyCustom || typeof item.responsiblePartyCustom !== 'string' || item.responsiblePartyCustom.trim().length === 0) {
        errors.push('Nama pihak penanggung jawab kustom wajib diisi ketika memilih "Lainnya".');
      }
    } else {
      if (item.responsiblePartyCustom && item.responsiblePartyCustom.trim().length > 0) {
        errors.push('Nama kustom hanya boleh diisi jika penanggung jawab adalah "Lainnya".');
      }
    }
  } else {
    // If responsibleParty is null or not provided, responsiblePartyCustom must not be set
    if (item.responsiblePartyCustom && item.responsiblePartyCustom.trim().length > 0) {
      errors.push('Nama penanggung jawab kustom tidak dapat diisi tanpa memilih pihak "Lainnya".');
    }
  }

  // Due date validation
  if (item.dueDate !== undefined && item.dueDate !== null && item.dueDate.trim().length > 0) {
    if (!isValidDateString(item.dueDate)) {
      errors.push('Format tenggat waktu (due date) tidak valid.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
