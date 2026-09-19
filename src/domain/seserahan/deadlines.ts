/**
 * WedSiap Seserahan Deadline & Due-Date Utilities (V2)
 *
 * Pure, deterministic utilities for milestone recommendations and due-date status.
 * Wedding date comes from global wedding context; Seserahan does NOT store wedding date.
 */

import { SeserahanItem, ItemDueStatus } from './types';

export const DUE_SOON_THRESHOLD_DAYS = 7;

export type SeserahanMilestone =
  | 'finalize_list'
  | 'start_purchasing'
  | 'all_items_available'
  | 'packaging'
  | 'final_check';

export const SESERAHAN_MILESTONES: Record<
  SeserahanMilestone,
  { daysBeforeWedding: number; label: string; description: string }
> = {
  finalize_list: {
    daysBeforeWedding: 45,
    label: 'Finalisasi Daftar (H-45)',
    description: 'Sepakati jumlah kotak, daftar barang, dan pembagian tanggung jawab.',
  },
  start_purchasing: {
    daysBeforeWedding: 30,
    label: 'Mulai Pembelian (H-30)',
    description: 'Mulai belanja barang seserahan yang membutuhkan fitting/pre-order.',
  },
  all_items_available: {
    daysBeforeWedding: 14,
    label: 'Semua Barang Siap (H-14)',
    description: 'Seluruh barang telah dibeli dan diterima dalam kondisi lengkap.',
  },
  packaging: {
    daysBeforeWedding: 7,
    label: 'Pengemasan & Hias Kotak (H-7)',
    description: 'Kotak seserahan dihias dan ditata rapi oleh vendor atau keluarga.',
  },
  final_check: {
    daysBeforeWedding: 1,
    label: 'Pengecekan Akhir (H-1)',
    description: 'Pastikan seluruh kotak utuh, rapi, dan siap dibawa ke lokasi acara.',
  },
};

/**
 * Safely calculates difference in calendar days (targetDate - today).
 * Positive = future, 0 = today, negative = past.
 */
export function calculateDaysDifference(targetDate: string, today: string): number {
  if (!targetDate || !today) return 0;
  const target = new Date(targetDate + 'T00:00:00');
  const current = new Date(today + 'T00:00:00');
  if (isNaN(target.getTime()) || isNaN(current.getTime())) return 0;
  return Math.ceil((target.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculates a recommended ISO YYYY-MM-DD deadline for a milestone given the wedding date.
 * Returns null if wedding date is missing or invalid.
 */
export function calculateMilestoneDeadline(
  weddingDate: string | null | undefined,
  milestone: SeserahanMilestone
): string | null {
  if (!weddingDate || typeof weddingDate !== 'string') return null;

  const wedding = new Date(weddingDate + 'T00:00:00');
  if (isNaN(wedding.getTime())) return null;

  const daysOffset = SESERAHAN_MILESTONES[milestone].daysBeforeWedding;
  const targetTime = wedding.getTime() - daysOffset * 24 * 60 * 60 * 1000;
  const targetDate = new Date(targetTime);

  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns the default recommended item deadline (H-14, all items available).
 * Does not overwrite existing user-defined due dates.
 */
export function getDefaultRecommendedItemDeadline(
  weddingDate: string | null | undefined
): string | null {
  return calculateMilestoneDeadline(weddingDate, 'all_items_available');
}

/**
 * Deterministically classifies an item's due status against reference date `today`.
 * Completed items are NEVER considered overdue or due soon.
 */
export function classifyItemDueStatus(
  item: Pick<SeserahanItem, 'status' | 'dueDate'>,
  today: string = new Date().toISOString().split('T')[0]
): ItemDueStatus {
  if (item.status === 'completed') {
    return 'completed';
  }

  if (!item.dueDate) {
    return 'no_date';
  }

  const diff = calculateDaysDifference(item.dueDate, today);

  if (diff < 0) {
    return 'overdue';
  }

  if (diff <= DUE_SOON_THRESHOLD_DAYS) {
    return 'due_soon';
  }

  return 'normal';
}

/**
 * Human-friendly label and badge configuration for due status.
 */
export function getDueStatusDisplay(status: ItemDueStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'overdue':
      return {
        label: 'Terlambat',
        badgeClass: 'bg-burgundy/10 text-burgundy border-burgundy/20 font-semibold',
      };
    case 'due_soon':
      return {
        label: 'Segera',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-medium',
      };
    case 'completed':
      return {
        label: 'Selesai',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'normal':
      return {
        label: 'Aman',
        badgeClass: 'bg-beige/40 text-charcoal-500 border-beige-300',
      };
    case 'no_date':
    default:
      return {
        label: 'Belum diatur',
        badgeClass: 'bg-gray-100 text-gray-400 border-gray-200',
      };
  }
}
