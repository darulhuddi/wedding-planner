/**
 * WedFlow Workspace Selectors
 *
 * Pure functions for deriving display values and computed state from StoredWorkspace.
 * No side effects. No storage access. No mutation.
 *
 * Call deriveWorkspaceViewModel() at the application boundary (App.tsx) to produce
 * a WorkspaceViewModel that all UI components can consume.
 */

import { StoredWorkspace, WorkspaceViewModel } from '../types/workspace';
import { getNextBestAction } from '../utils/nextBestActionEngine';
import { TaskItem } from '../types/checklist';
import {
  getCompletedModuleCount,
  getOverallModuleProgressPercentage,
  TOTAL_CANONICAL_MODULES,
} from './moduleSelectors';

// ─── Date Utilities ──────────────────────────────────────────────────────────

/**
 * Calculates days remaining until wedding date from today.
 * Returns negative if the date has passed, 0 if today.
 */
export function getDaysUntilWedding(weddingDateStr: string): number {
  if (!weddingDateStr) return 0;
  const target = new Date(weddingDateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Alias for backward compat with onboarding step components. */
export const calculateDaysUntilWedding = getDaysUntilWedding;

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/**
 * Formats YYYY-MM-DD to natural Indonesian date: "14 Februari 2027"
 */
export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  return `${date.getDate()} ${INDONESIAN_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Formats a numeric IDR value to Rupiah display: 100000000 → "Rp100.000.000"
 */
export function formatRupiahNumber(amount: number): string {
  if (!amount || isNaN(amount)) return 'Rp0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace('IDR', 'Rp')
    .replace(/\s+/g, '');
}

/**
 * Formats a numeric IDR value into a compact human-readable display:
 * 1_000_000 -> "Rp1 juta"
 * 25_000_000 -> "Rp25 juta"
 * 125_000_000 -> "Rp125 juta"
 * 1_200_000_000 -> "Rp1,2 miliar"
 */
export function formatCompactRupiah(amount: number): string {
  if (!amount || isNaN(amount) || amount === 0) return 'Rp0';

  if (amount >= 1_000_000_000) {
    const miliar = amount / 1_000_000_000;
    const formatted = miliar % 1 === 0 ? miliar.toString() : Number(miliar.toFixed(2)).toString().replace('.', ',');
    return `Rp${formatted} miliar`;
  }

  if (amount >= 1_000_000) {
    const juta = amount / 1_000_000;
    const formatted = juta % 1 === 0 ? juta.toString() : Number(juta.toFixed(2)).toString().replace('.', ',');
    return `Rp${formatted} juta`;
  }

  if (amount >= 1_000) {
    const ribu = amount / 1_000;
    const formatted = ribu % 1 === 0 ? ribu.toString() : Number(ribu.toFixed(2)).toString().replace('.', ',');
    return `Rp${formatted} ribu`;
  }

  return `Rp${amount}`;
}

// ─── Workspace Derivation ────────────────────────────────────────────────────

const TOTAL_VENDOR_CATEGORIES = 6;

function getTodayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

import {
  calculateAgeAtDate,
  getAgeLegalCategory,
  assessPnbpStatus,
  calculateBusinessDaysBefore,
  calculateDaysBefore,
  calculateRemainingWorkingDays,
  calculateAdministrativeRisk,
} from './administration/engine';
import { WeddingEvent } from './events';
import { DerivedAdministrativeProperties } from './administration/types';

/**
 * Derives a WorkspaceViewModel from a StoredWorkspace.
 * Computes all display values and the current NBA at runtime.
 *
 * Call this at the application boundary (App.tsx) before passing
 * workspace data to any UI component.
 */
export function deriveWorkspaceViewModel(
  workspace: StoredWorkspace, 
  tasks: TaskItem[],
  today: string = getTodayYMD(),
  ceremonyEvent?: WeddingEvent | null,
  events?: WeddingEvent[]
): WorkspaceViewModel {
  const daysUntilWedding = getDaysUntilWedding(workspace.weddingDate);
  const completedCategoriesCount = getCompletedModuleCount(tasks);
  const completionPercentage = getOverallModuleProgressPercentage(tasks);

  const nextBestAction = getNextBestAction(workspace, tasks, today, events);

  let administration: DerivedAdministrativeProperties | undefined = undefined;
  if (workspace.administrationContext) {
    const groomAge = calculateAgeAtDate(workspace.administrationContext.groom.birthDate, workspace.weddingDate);
    const brideAge = calculateAgeAtDate(workspace.administrationContext.bride.birthDate, workspace.weddingDate);
    const pnbp = assessPnbpStatus(ceremonyEvent);
    const legalDeadlineDate = calculateBusinessDaysBefore(workspace.weddingDate, 10);
    const planningTargetDate = calculateDaysBefore(workspace.weddingDate, 35);
    const remainingWorkingDays = calculateRemainingWorkingDays(today, workspace.weddingDate);
    const riskAssessment = calculateAdministrativeRisk(tasks, workspace.administrationContext, workspace.weddingDate, today);

    const admTasks = (tasks || []).filter((t) => t.category === 'prosesi_administrasi');
    const totalAdm = admTasks.length;
    const completedAdm = admTasks.filter((t) => t.status === 'completed').length;
    const admPercentage = totalAdm > 0 ? Math.round((completedAdm / totalAdm) * 100) : 0;

    administration = {
      groomAgeAtCeremony: groomAge,
      brideAgeAtCeremony: brideAge,
      groomAgeCategory: getAgeLegalCategory(groomAge),
      brideAgeCategory: getAgeLegalCategory(brideAge),
      pnbpAssessment: pnbp.status,
      estimatedPnbpAmount: pnbp.amount,
      legalDeadlineDate,
      planningTargetDate,
      remainingWorkingDays,
      riskAssessment,
      completionPercentage: admPercentage,
    };
  }

  return {
    ...workspace,
    formattedDate: formatIndonesianDate(workspace.weddingDate),
    formattedBudget: formatRupiahNumber(workspace.estimatedBudget),
    daysUntilWedding,
    completedCategoriesCount,
    totalCategoriesCount: TOTAL_CANONICAL_MODULES,
    completionPercentage,
    nextBestAction,
    administration,
  };
}

/**
 * Determines whether a workspace has completed onboarding.
 * A workspace is considered onboarded if and only if it has a non-empty couple name
 * and a non-empty wedding date.
 */
export function isWorkspaceOnboarded(
  workspace: StoredWorkspace | null | undefined
): boolean {
  if (!workspace) return false;
  const hasCoupleName = Boolean(workspace.coupleName && workspace.coupleName.trim().length > 0);
  const hasWeddingDate = Boolean(workspace.weddingDate && workspace.weddingDate.trim().length > 0);
  return hasCoupleName && hasWeddingDate;
}

