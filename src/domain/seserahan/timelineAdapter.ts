/**
 * WedSiap Seserahan Global Timeline Integration Adapter (V2)
 *
 * Exposes Seserahan milestones and due-date signals to the global timeline architecture.
 * Does NOT create a separate calendar or duplicate timeline systems.
 * Pure, deterministic mapping between Seserahan plan/items and global timeline event models.
 */

import { SeserahanPlan, SeserahanItem, ResponsibleParty } from './types';
import { calculateMilestoneDeadline, SESERAHAN_MILESTONES, SeserahanMilestone } from './deadlines';

export interface SeserahanTimelineEvent {
  id: string;
  source: 'seserahan_milestone' | 'seserahan_item';
  eventType: 'milestone' | 'item_deadline';
  title: string;
  category: 'seserahan';
  date: string | null;
  targetDate: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'overdue' | 'pending';
  description?: string;
  itemId?: string;
  responsibleParty?: ResponsibleParty | null;
}

/**
 * Extracts Seserahan milestones and item deadlines into unified timeline event representations.
 */
export function extractSeserahanTimelineEvents(
  plan: SeserahanPlan | null | undefined,
  items: SeserahanItem[],
  weddingDate: string | null | undefined,
  today: string = new Date().toISOString().split('T')[0]
): SeserahanTimelineEvent[] {
  const events: SeserahanTimelineEvent[] = [];
  const safeItems = Array.isArray(items) ? items : [];

  if (!plan && safeItems.length === 0) {
    return events;
  }

  // 1. Plan-level milestone events based on wedding date
  if (weddingDate) {
    const milestones: { key: SeserahanMilestone; title: string }[] = [
      { key: 'finalize_list', title: 'Finalisasi Daftar Seserahan' },
      { key: 'start_purchasing', title: 'Batas Waktu Pembelian' },
      { key: 'all_items_available', title: 'Target Semua Item Siap' },
      { key: 'packaging', title: 'Target Selesai Hias & Kemas' },
      { key: 'final_check', title: 'Pengecekan Akhir' },
    ];

    for (const ms of milestones) {
      const milestoneDate = calculateMilestoneDeadline(weddingDate, ms.key);
      let status: SeserahanTimelineEvent['status'] = 'planned';

      if (ms.key === 'packaging' && plan?.packagingCompletedAt) {
        status = 'completed';
      } else if (ms.key === 'packaging' && plan?.packagingStartedAt) {
        status = 'in_progress';
      } else if (ms.key === 'final_check' && plan?.finalCheckedAt) {
        status = 'completed';
      } else if (ms.key === 'all_items_available') {
        const allDone = safeItems.length > 0 && safeItems.every((i) => i.status === 'completed');
        if (allDone) status = 'completed';
        else if (milestoneDate && milestoneDate < today) status = 'overdue';
      } else if (milestoneDate && milestoneDate < today) {
        status = 'overdue';
      }

      events.push({
        id: `seserahan-milestone-${ms.key}`,
        source: 'seserahan_milestone',
        eventType: 'milestone',
        title: ms.title,
        category: 'seserahan',
        date: milestoneDate,
        targetDate: milestoneDate,
        status,
        description: SESERAHAN_MILESTONES[ms.key].description,
      });
    }
  }

  // 2. Item-level events for items with user-defined due dates
  for (const item of safeItems) {
    if (item.dueDate) {
      let itemEventStatus: SeserahanTimelineEvent['status'] = 'pending';
      if (item.status === 'completed') {
        itemEventStatus = 'completed';
      } else if (item.dueDate < today) {
        itemEventStatus = 'overdue';
      } else if (item.status === 'purchased') {
        itemEventStatus = 'in_progress';
      }

      events.push({
        id: `seserahan-item-${item.id}`,
        source: 'seserahan_item',
        eventType: 'item_deadline',
        title: `Seserahan: ${item.name}`,
        category: 'seserahan',
        date: item.dueDate,
        targetDate: item.dueDate,
        status: itemEventStatus,
        description: item.notes || undefined,
        itemId: item.id,
        responsibleParty: item.responsibleParty,
      });
    }
  }

  // Sort chronologically by date
  events.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  return events;
}
