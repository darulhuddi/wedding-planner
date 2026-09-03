/**
 * WedFlow Dashboard Journey Selectors
 *
 * Pure selectors for deriving the dynamic "Perjalanan Persiapan" summary
 * on the Dashboard from workspace metadata and canonical TaskItem[].
 *
 * Rules:
 * - Pure functions, no side effects, no storage writes.
 * - Reuses existing date calculations from workspaceSelectors.
 * - Dynamically derives 4 meaningful relative time phases based on daysUntilWedding.
 * - Identifies active/completed tasks per phase and highlights the current focus ("Saat Ini").
 * - Handles empty workspaces and passed dates gracefully without inventing fake tasks.
 */

import { TaskItem, TaskCategoryId } from '../types/checklist';
import { CATEGORY_TAXONOMY } from './categories';
import { getDaysUntilWedding, formatIndonesianDate } from './workspaceSelectors';

export interface JourneyPhase {
  id: string;
  period: string; // e.g. "5–4 BULAN LAGI", "1 BULAN LAGI", "H-14"
  title: string;
  description: string;
  isCompleted: boolean;
  isCurrent: boolean;
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  categories: TaskCategoryId[];
}

export type JourneyStatus = 'active' | 'empty' | 'passed' | 'today';

export interface PreparationJourneyResult {
  status: JourneyStatus;
  phases: JourneyPhase[];
  daysUntilWedding: number;
  formattedWeddingDate: string;
  currentPhaseIndex: number;
  totalTasks: number;
  completedTasks: number;
}

interface PhaseTemplate {
  id: string;
  period: string;
  defaultTitle: string;
  defaultDescription: string;
  minDaysBeforeWedding: number; // e.g. 14 (means 14 days before wedding)
  maxDaysBeforeWedding: number; // e.g. 60 (means 60 days before wedding)
  primaryCategories: TaskCategoryId[];
}

function getTodayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDaysBetween(fromDateStr: string, toDateStr: string): number {
  if (!fromDateStr || !toDateStr) return 0;
  const from = new Date(fromDateStr + 'T00:00:00');
  const to = new Date(toDateStr + 'T00:00:00');
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Returns dynamic relative phase templates adapted to the remaining days until wedding.
 */
function getPhaseTemplatesForTimeline(daysUntilWedding: number): PhaseTemplate[] {
  if (daysUntilWedding > 150) {
    // 5+ Months away
    return [
      {
        id: 'phase_foundation',
        period: '5+ BULAN LAGI',
        defaultTitle: 'Venue & Konsep Dasar',
        defaultDescription: 'Kunci tanggal, tentukan venue, dan tetapkan konsep utama.',
        minDaysBeforeWedding: 120,
        maxDaysBeforeWedding: 9999,
        primaryCategories: ['venue', 'prosesi_administrasi', 'general'],
      },
      {
        id: 'phase_main_vendors',
        period: '4–2 BULAN LAGI',
        defaultTitle: 'Vendor Utama',
        defaultDescription: 'Pilih catering, dokumentasi, busana, dan dekorasi.',
        minDaysBeforeWedding: 60,
        maxDaysBeforeWedding: 119,
        primaryCategories: ['catering', 'photography', 'decoration', 'makeup_attire'],
      },
      {
        id: 'phase_guest_details',
        period: '1 BULAN LAGI',
        defaultTitle: 'Undangan & Tamu',
        defaultDescription: 'Sebar undangan, konfirmasi RSVP, dan finalisasi rincian acara.',
        minDaysBeforeWedding: 15,
        maxDaysBeforeWedding: 59,
        primaryCategories: ['invitation', 'general'],
      },
      {
        id: 'phase_final_prep',
        period: 'H-14 S/D HARI-H',
        defaultTitle: 'Final Check & Hari-H',
        defaultDescription: 'Gladi bersih, pelunasan vendor, dan koordinasi hari-H.',
        minDaysBeforeWedding: 0,
        maxDaysBeforeWedding: 14,
        primaryCategories: ['general', 'prosesi_administrasi'],
      },
    ];
  }

  if (daysUntilWedding > 60) {
    // 2 - 5 Months away
    return [
      {
        id: 'phase_foundation',
        period: `${Math.ceil(daysUntilWedding / 30)}–3 BULAN LAGI`,
        defaultTitle: 'Pondasi & Vendor Utama',
        defaultDescription: 'Pastikan venue dan vendor utama telah terkunci dengan baik.',
        minDaysBeforeWedding: 60,
        maxDaysBeforeWedding: 9999,
        primaryCategories: ['venue', 'catering', 'photography', 'decoration'],
      },
      {
        id: 'phase_main_vendors',
        period: '2 BULAN LAGI',
        defaultTitle: 'Busana & Detail Acara',
        defaultDescription: 'Fitting busana, MUA, dan konsep dekorasi final.',
        minDaysBeforeWedding: 30,
        maxDaysBeforeWedding: 59,
        primaryCategories: ['makeup_attire', 'decoration'],
      },
      {
        id: 'phase_guest_details',
        period: '1 BULAN LAGI',
        defaultTitle: 'Undangan & RSVP Tamu',
        defaultDescription: 'Pengiriman undangan dan penghitungan konfirmasi tamu.',
        minDaysBeforeWedding: 15,
        maxDaysBeforeWedding: 29,
        primaryCategories: ['invitation', 'general'],
      },
      {
        id: 'phase_final_prep',
        period: 'H-14 S/D HARI-H',
        defaultTitle: 'Final Check & Koordinasi',
        defaultDescription: 'Pemeriksaan akhir rundown dan kesiapan tim pelaksana.',
        minDaysBeforeWedding: 0,
        maxDaysBeforeWedding: 14,
        primaryCategories: ['general', 'prosesi_administrasi'],
      },
    ];
  }

  if (daysUntilWedding > 20) {
    // 20 - 60 Days away
    return [
      {
        id: 'phase_vendor_closing',
        period: '1–2 BULAN LAGI',
        defaultTitle: 'Finalisasi Vendor',
        defaultDescription: 'Selesaikan seluruh penawaran dan konfirmasi kesiapan vendor.',
        minDaysBeforeWedding: 21,
        maxDaysBeforeWedding: 9999,
        primaryCategories: ['venue', 'catering', 'photography', 'decoration', 'makeup_attire'],
      },
      {
        id: 'phase_guest_details',
        period: 'H-21 S/D H-14',
        defaultTitle: 'Undangan & Logistik',
        defaultDescription: 'Pastikan sebaran undangan selesai dan rincian logistik siap.',
        minDaysBeforeWedding: 14,
        maxDaysBeforeWedding: 20,
        primaryCategories: ['invitation', 'general'],
      },
      {
        id: 'phase_rundown_check',
        period: 'H-14 S/D H-7',
        defaultTitle: 'Rundown & Briefing',
        defaultDescription: 'Briefing panitia keluarga, WO, dan gladi kotor susunan acara.',
        minDaysBeforeWedding: 7,
        maxDaysBeforeWedding: 13,
        primaryCategories: ['prosesi_administrasi', 'general'],
      },
      {
        id: 'phase_final_prep',
        period: 'H-7 S/D HARI-H',
        defaultTitle: 'Gladi Bersih & Hari-H',
        defaultDescription: 'Pemeriksaan terakhir seluruh elemen menuju hari bahagia.',
        minDaysBeforeWedding: 0,
        maxDaysBeforeWedding: 6,
        primaryCategories: ['general', 'prosesi_administrasi'],
      },
    ];
  }

  // Final 20 days or less
  return [
    {
      id: 'phase_final_review',
      period: 'H-14',
      defaultTitle: 'Pemeriksaan Akhir',
      defaultDescription: 'Konfirmasi final vendor dan kelengkapan administrasi.',
      minDaysBeforeWedding: 8,
      maxDaysBeforeWedding: 9999,
      primaryCategories: ['venue', 'catering', 'photography', 'decoration', 'makeup_attire'],
    },
    {
      id: 'phase_briefing',
      period: 'H-7',
      defaultTitle: 'Briefing Pelaksana',
      defaultDescription: 'Penyelarasan panitia, WO, dan rundown teknis.',
      minDaysBeforeWedding: 4,
      maxDaysBeforeWedding: 7,
      primaryCategories: ['prosesi_administrasi', 'general'],
    },
    {
      id: 'phase_gladi',
      period: 'H-3',
      defaultTitle: 'Gladi & Fisik',
      defaultDescription: 'Istirahat yang cukup, cek kelengkapan busana dan perlengkapan.',
      minDaysBeforeWedding: 1,
      maxDaysBeforeWedding: 3,
      primaryCategories: ['makeup_attire', 'general'],
    },
    {
      id: 'phase_dday',
      period: 'HARI-H',
      defaultTitle: 'Hari-H Pernikahan',
      defaultDescription: 'Eksekusi rencana dengan tenang dan nikmati hari bahagiamu.',
      minDaysBeforeWedding: 0,
      maxDaysBeforeWedding: 0,
      primaryCategories: ['general'],
    },
  ];
}

/**
 * Calculates days remaining until wedding date from a given today reference date.
 */
export function calculateDaysRemaining(weddingDateStr: string, todayStr: string = getTodayYMD()): number {
  if (!weddingDateStr) return 0;
  const target = new Date(weddingDateStr + 'T00:00:00');
  const today = new Date(todayStr + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Derives dynamic "Perjalanan Persiapan" summary phases from canonical tasks and wedding date.
 */
export function derivePreparationJourney(
  weddingDate: string,
  tasks: TaskItem[] = [],
  today: string = getTodayYMD()
): PreparationJourneyResult {
  const daysUntilWedding = calculateDaysRemaining(weddingDate, today);
  const formattedWeddingDate = formatIndonesianDate(weddingDate);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;

  // 1. Check if wedding date is in the past
  if (weddingDate && daysUntilWedding < 0) {
    return {
      status: 'passed',
      phases: [],
      daysUntilWedding,
      formattedWeddingDate,
      currentPhaseIndex: -1,
      totalTasks,
      completedTasks,
    };
  }

  // 2. Check if wedding is today
  if (weddingDate && daysUntilWedding === 0) {
    return {
      status: 'today',
      phases: [],
      daysUntilWedding: 0,
      formattedWeddingDate,
      currentPhaseIndex: 0,
      totalTasks,
      completedTasks,
    };
  }

  // 3. Check if workspace has no tasks (empty / low data)
  if (totalTasks === 0) {
    return {
      status: 'empty',
      phases: [],
      daysUntilWedding,
      formattedWeddingDate,
      currentPhaseIndex: -1,
      totalTasks: 0,
      completedTasks: 0,
    };
  }

  // 4. Generate dynamic phases from wedding date and assign real tasks
  const templates = getPhaseTemplatesForTimeline(daysUntilWedding);

  // Group tasks into the 4 phases
  const phases: JourneyPhase[] = templates.map((tmpl) => {
    // Find tasks that belong to this phase:
    // A task belongs to this phase if:
    // - It has a dueDate and the dueDate's distance from wedding falls within template's days window
    // - OR if no dueDate, its category matches template's primaryCategories
    const matchingTasks = tasks.filter((task) => {
      if (task.dueDate && weddingDate) {
        const daysBeforeWedding = getDaysBetween(task.dueDate, weddingDate);
        return (
          daysBeforeWedding >= tmpl.minDaysBeforeWedding &&
          daysBeforeWedding <= tmpl.maxDaysBeforeWedding
        );
      }
      return tmpl.primaryCategories.includes(task.category);
    });

    const phaseTotal = matchingTasks.length;
    const phaseCompleted = matchingTasks.filter((t) => t.status === 'completed').length;
    const phaseActive = phaseTotal - phaseCompleted;
    const isCompleted = phaseTotal > 0 && phaseActive === 0;

    // Determine representative category labels from active tasks (or completed if all done)
    const relevantTasks = phaseActive > 0 
      ? matchingTasks.filter((t) => t.status !== 'completed')
      : matchingTasks;

    const uniqueCategories = Array.from(new Set(relevantTasks.map((t) => t.category)));
    const categoryLabels = uniqueCategories
      .map((cat) => (CATEGORY_TAXONOMY as any)[cat]?.label || cat)
      .filter(Boolean);

    // Dynamic Title and Description
    let title = tmpl.defaultTitle;
    let description = tmpl.defaultDescription;

    if (phaseTotal > 0) {
      if (isCompleted) {
        title = categoryLabels.length > 0 
          ? `${categoryLabels.slice(0, 2).join(' & ')} Selesai`
          : tmpl.defaultTitle;
        description = `${phaseTotal} tugas pada fase ini telah rampung.`;
      } else {
        if (categoryLabels.length > 0) {
          title = categoryLabels.slice(0, 2).join(' & ');
        }
        const topUnfinished = matchingTasks.filter((t) => t.status !== 'completed');
        if (topUnfinished.length > 0) {
          const sampleNames = topUnfinished.slice(0, 2).map((t) => t.title).join(', ');
          description = `${phaseActive} tugas aktif: ${sampleNames}${topUnfinished.length > 2 ? '…' : '.'}`;
        }
      }
    }

    return {
      id: tmpl.id,
      period: tmpl.period,
      title,
      description,
      isCompleted,
      isCurrent: false, // will be evaluated next
      totalTasks: phaseTotal,
      completedTasks: phaseCompleted,
      activeTasks: phaseActive,
      categories: uniqueCategories,
    };
  });

  // 5. Determine which phase is "Saat Ini" (isCurrent)
  // Rule:
  // Find the first phase that is not yet fully completed.
  // If all phases are completed, the last phase is considered final.
  let currentIdx = phases.findIndex((p) => !p.isCompleted && p.totalTasks > 0);
  if (currentIdx === -1) {
    // If no phase has active tasks or all are done/empty, pick first phase or active date window
    currentIdx = phases.findIndex((p) => !p.isCompleted);
    if (currentIdx === -1) {
      currentIdx = phases.length - 1;
    }
  }

  if (currentIdx >= 0 && currentIdx < phases.length) {
    phases[currentIdx].isCurrent = true;
  }

  return {
    status: 'active',
    phases,
    daysUntilWedding,
    formattedWeddingDate,
    currentPhaseIndex: currentIdx,
    totalTasks,
    completedTasks,
  };
}
