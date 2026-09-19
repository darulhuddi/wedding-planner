/**
 * WedSiap Seserahan Readiness Engine (V2)
 *
 * Pure, deterministic evaluation of Seserahan readiness state.
 * Evaluates completion facts, packaging lifecycle, and final check status.
 *
 * REQUIRED ITEM RULE:
 * In Seserahan V2, all active items in the plan are considered required by default.
 * Readiness requires all active items to reach 'completed' status before the plan
 * can advance to 'almost_ready' or 'ready'. Deleted or non-existent items are never
 * evaluated.
 *
 * Zero arbitrary thresholds (e.g. 80% or 90%). 100% explainable fact-based rules.
 */

import { SeserahanPlan, SeserahanItem, SeserahanReadiness, SeserahanReadinessStatus } from './types';

/**
 * Calculates deterministic readiness state, score, facts, and explainable reasons.
 */
export function calculateSeserahanReadiness(
  plan: SeserahanPlan | null | undefined,
  items: SeserahanItem[],
  today: string = new Date().toISOString().split('T')[0]
): SeserahanReadiness {
  const safeItems = Array.isArray(items) ? items : [];
  const totalItems = safeItems.length;

  let completedItems = 0;
  let purchasedItems = 0;
  let overdueItems = 0;

  for (const item of safeItems) {
    if (item.status === 'completed') {
      completedItems += 1;
    } else {
      if (item.status === 'purchased') {
        purchasedItems += 1;
      }
      if (item.dueDate && item.dueDate < today) {
        overdueItems += 1;
      }
    }
  }

  const packagingDone = Boolean(plan?.packagingCompletedAt);
  const packagingInProgress = Boolean(plan?.packagingStartedAt && !plan?.packagingCompletedAt);
  const finalCheckDone = Boolean(plan?.finalCheckedAt);

  const facts = {
    totalItems,
    completedItems,
    purchasedItems,
    pendingItems: totalItems - (completedItems + purchasedItems),
    packagingCompleted: packagingDone,
    packagingStarted: Boolean(plan?.packagingStartedAt),
    finalCheckCompleted: finalCheckDone,
  };

  // 1. NOT_READY:
  // - No active items
  if (totalItems === 0) {
    return {
      status: 'not_ready',
      label: 'Belum Siap',
      score: 0,
      facts,
      reasons: ['Belum ada item seserahan yang ditambahkan.'],
      targetMilestone: 'Susun daftar barang seserahan',
    };
  }

  // - Planning exists but no items completed or purchased
  if (completedItems === 0 && purchasedItems === 0) {
    const reasons: string[] = [
      `0 dari ${totalItems} item selesai disiapkan.`,
      'Belum ada barang yang dibeli atau disiapkan.',
    ];
    if (overdueItems > 0) {
      reasons.push(`${overdueItems} item telah melewati batas waktu.`);
    }

    return {
      status: 'not_ready',
      label: 'Belum Siap',
      score: 10,
      facts,
      reasons,
      targetMilestone: 'Mulai pembelian barang seserahan',
    };
  }

  const allItemsCompleted = completedItems === totalItems && totalItems > 0;

  // 2. READY:
  // - 100% active items completed
  // - AND packaging completed
  // - AND final check completed
  if (allItemsCompleted && packagingDone && finalCheckDone) {
    return {
      status: 'ready',
      label: 'Sudah Siap',
      score: 100,
      facts,
      reasons: [
        'Seluruh item lengkap, terkemas rapi, dan telah lolos final check.',
        `Semua ${totalItems} barang seserahan telah lengkap.`,
      ],
      targetMilestone: 'Siap dibawa ke hari-H pernikahan',
    };
  }

  // 3. ALMOST_READY:
  // - 100% active items completed
  // - AND packaging completed (or in progress)
  // - BUT final check is pending
  if (allItemsCompleted && (packagingDone || packagingInProgress)) {
    const reasons: string[] = [];
    if (packagingDone) {
      reasons.push('Pengemasan selesai. Perlu final check dan serah terima sebelum hari-H.');
    } else {
      reasons.push('Semua item siap. Pengemasan kotak sedang berjalan.');
    }

    return {
      status: 'almost_ready',
      label: 'Hampir Siap',
      score: packagingDone ? 90 : 80,
      facts,
      reasons,
      targetMilestone: packagingDone ? 'Lakukan pengecekan akhir (H-1)' : 'Selesaikan pengemasan kotak (H-7)',
    };
  }

  // 4. IN_PROGRESS:
  // Either items are partially completed, OR all items completed but packaging has not started at all
  let score = Math.round((completedItems / totalItems) * 60 + (purchasedItems / totalItems) * 20);
  if (packagingDone) score += 10;
  else if (packagingInProgress) score += 5;

  const reasons: string[] = [];
  if (allItemsCompleted && !packagingDone && !packagingInProgress) {
    reasons.push('Semua item siap, namun pengemasan/penataan kotak seserahan belum selesai.');
  } else {
    reasons.push(`${completedItems} dari ${totalItems} item selesai disiapkan.`);
    if (purchasedItems > 0) {
      reasons.push(`${purchasedItems} barang dalam proses pembelian.`);
    }
  }

  if (overdueItems > 0) {
    reasons.push(`${overdueItems} item telah melewati batas waktu.`);
  }

  if (packagingDone) {
    reasons.push('Pengemasan kotak sudah selesai lebih awal.');
  }

  return {
    status: 'in_progress',
    label: 'Sedang Berjalan',
    score: Math.min(score, 75),
    facts,
    reasons,
    targetMilestone: 'Target: Semua barang siap H-14',
  };
}
