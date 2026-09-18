/**
 * WedSiap Next Best Action Engine v3 (Unified Decision Engine)
 *
 * Deterministic, multi-domain aware recommendation engine.
 * Consumes signals from:
 *   - TIME (wedding date, countdown milestone, time horizons)
 *   - DEPENDENCY (prerequisites, blockers, administration profile, vendor selection)
 *   - BUDGET (budget overview, budget health, projection deficit, overrun)
 *   - VENDOR (missing critical vendors, selected vendors, quotation status)
 *   - PAYMENT (overdue payments, due-soon obligations, unpaid balances)
 *   - CHECKLIST (active tasks, due dates, urgency, priority, sequence)
 *   - ADMINISTRATION (religious context, administration profile, guide generation, KUA deadline)
 *   - READINESS (module progress, category lag, user planning priority)
 *
 * Architecture:
 *   Signal Extraction -> Candidate Generation -> Constraint Filtering -> Priority Scoring -> Tie-Breaking -> Why Now + Action Mapping
 *
 * Principles:
 *   - 100% Deterministic (0 LLM/AI decision making).
 *   - Backward compatible with existing UI and test contracts.
 *   - Zero duplicate state, zero fake data.
 */

import { NextBestAction, NextBestActionPriority } from '../types/onboarding';
import { StoredWorkspace } from '../types/workspace';
import { TaskItem } from '../types/checklist';
import { WeddingEvent } from '../domain/events';
import { StoredBudget, BudgetCategory } from '../types/budget';
import { Vendor } from '../types/vendor';
import { CATEGORY_TAXONOMY, CATEGORY_ORDER, CATEGORY_LABELS } from '../domain/categories';
import { getReligiousContextStatus } from '../domain/context';
import {
  hasGeneratedAdministrativeGuide,
  getApplicableAdministrativeTasks,
} from '../domain/administration/engine';
import {
  calculateBudgetOverview,
  calculateBudgetProjection,
  calculateUpcomingPayments,
} from '../domain/budgetSelectors';
import { formatRupiahNumber } from '../domain/workspaceSelectors';

export { CATEGORY_TAXONOMY, CATEGORY_ORDER };

// ─── SIGNAL MODEL ────────────────────────────────────────────────────────────

export type NBASignalType =
  | 'time'
  | 'dependency'
  | 'budget'
  | 'vendor'
  | 'payment'
  | 'checklist'
  | 'administration'
  | 'readiness';

export interface NBASignal {
  type: NBASignalType;
  source: string;
  severity: number; // 0 to 100
  urgency: number; // 0 to 100
  message: string;
  metadata?: Record<string, unknown>;
}

// ─── CANDIDATE MODEL ─────────────────────────────────────────────────────────

export interface NBACandidate {
  id: string;
  action: NextBestAction;
  priorityScore: number;
  urgencyScore: number;
  dependencyScore: number;
  financialScore: number;
  timelineScore: number;
  readinessScore: number;
  userPriorityScore: number;
  sequenceScore: number;
  priorityLevel: NextBestActionPriority;
  sourceSignals: NBASignal[];
  whyNow: string;
  dueDate?: string | null;
  prerequisites?: string[];
  isBlocked?: boolean;
}

// ─── DATE UTILITIES ──────────────────────────────────────────────────────────

export function calculateDaysDifference(targetDate: string, today: string): number {
  if (!targetDate) return 0;
  const target = new Date(targetDate + 'T00:00:00');
  const current = new Date(today + 'T00:00:00');
  return Math.ceil((target.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
}

function isPassedWeddingDateBlocker(workspace: StoredWorkspace, daysUntilWedding: number): boolean {
  const workspaceStatus = (workspace as any).status;
  if (workspaceStatus === 'archived' || workspaceStatus === 'completed' || workspaceStatus === 'history') {
    return false;
  }
  return daysUntilWedding < 0;
}

// ─── OPTIONS & INTERFACES ────────────────────────────────────────────────────

export interface NextBestActionOptions {
  today?: string;
  events?: WeddingEvent[];
  budget?: StoredBudget;
  vendors?: Vendor[];
}

/**
 * Main Authoritative Next Best Action Engine v3
 */
export function getNextBestAction(
  workspace: StoredWorkspace,
  tasks: TaskItem[] = [],
  todayOrOptions?: string | NextBestActionOptions,
  events?: WeddingEvent[],
  budget?: StoredBudget,
  vendors?: Vendor[]
): NextBestAction {
  // 1. Resolve arguments
  let today = new Date().toISOString().split('T')[0];
  let effectiveEvents = events;
  let effectiveBudget = budget;
  let effectiveVendors = vendors;

  if (typeof todayOrOptions === 'object' && todayOrOptions !== null) {
    if (todayOrOptions.today) today = todayOrOptions.today;
    if (todayOrOptions.events !== undefined) effectiveEvents = todayOrOptions.events;
    if (todayOrOptions.budget !== undefined) effectiveBudget = todayOrOptions.budget;
    if (todayOrOptions.vendors !== undefined) effectiveVendors = todayOrOptions.vendors;
  } else if (typeof todayOrOptions === 'string') {
    today = todayOrOptions;
  }

  const daysUntilWedding = calculateDaysDifference(workspace.weddingDate, today);
  const religiousStatus = getReligiousContextStatus(workspace.religiousContexts);
  const currentReligion = workspace.religiousContexts?.[0]?.tradition || 'unspecified';
  const isSetupCompleted = Boolean(workspace.administrationContext?.isSetupCompleted);

  // Authoritative task filtering based on current religious context
  const applicableTasks = getApplicableAdministrativeTasks(tasks, currentReligion);
  const isAdministrationTask = (t: TaskItem) =>
    t.category === 'prosesi_administrasi' || (t.category as string) === 'administration';

  const administrativeTasks = applicableTasks.filter(isAdministrationTask);
  const activeAdminTasks = administrativeTasks.filter((t) => t.status === 'todo' || t.status === 'in_progress');
  const activeTasks = applicableTasks.filter((t) => t.status === 'todo' || t.status === 'in_progress');
  const guideGenerated = hasGeneratedAdministrativeGuide(tasks, currentReligion);

  // ─── P0: HARD BLOCKER EVALUATION (Highest Precedence) ───────────────────────

  // P0.1: Wedding date has passed in active workspaces
  if (isPassedWeddingDateBlocker(workspace, daysUntilWedding)) {
    return {
      type: 'timeline',
      category: null,
      title: 'Perbarui Tanggal Pernikahan',
      description: 'Tanggal pernikahan yang terdaftar telah lewat. Tinjau kembali alur persiapan atau perbarui tanggal di pengaturan.',
      reason: 'Tanggal pernikahan telah lewat.',
      whyNow: 'Tanggal pernikahan yang sudah lewat menghentikan perhitungan linimasa otomatis seluruh persiapan.',
      priorityLevel: 'P0',
      priority: 'high',
      source: 'urgency',
      priorityTag: 'Tanggal Lewat',
      actionType: 'OPEN_WEDDING_IDENTITY',
      target: 'dashboard',
      ctaLabel: 'Perbarui Tanggal',
      priorityScore: 120,
    };
  }

  // P0.2: Missing core wedding identity (Couple Name or Wedding Date)
  if (!workspace.coupleName || !workspace.coupleName.trim() || !workspace.weddingDate) {
    return {
      type: 'identity',
      category: null,
      title: 'Lengkapi Data Pernikahan',
      description: 'Nama pasangan dan tanggal pernikahan diperlukan sebagai fondasi utama seluruh linimasa persiapan.',
      reason: 'Data inti pernikahan belum lengkap.',
      whyNow: 'Nama pasangan dan tanggal pernikahan diperlukan untuk menyusun seluruh linimasa dan prioritas.',
      priorityLevel: 'P0',
      priority: 'high',
      source: 'blocker',
      priorityTag: 'Data Inti',
      actionType: 'OPEN_WEDDING_IDENTITY',
      target: 'dashboard',
      ctaLabel: 'Lengkapi Sekarang',
      priorityScore: 110,
    };
  }

  // P0.3: Missing religious context
  if (religiousStatus === 'missing') {
    return {
      type: 'administration',
      category: null,
      title: 'Tentukan Konteks Agama & Pernikahan',
      description: 'Pilih konteks keagamaan atau tradisi pernikahanmu untuk menentukan alur administrasi dan pencatatan resmi yang sesuai.',
      reason: 'Konteks agama dan tradisi diperlukan untuk menentukan lembaga pencatatan pernikahan yang tepat.',
      whyNow: 'Konteks agama dan tradisi pernikahan menentukan apakah pendaftaran dilakukan di KUA atau Disdukcapil.',
      priorityLevel: 'P0',
      priority: 'high',
      source: 'blocker',
      priorityTag: 'Konteks Pernikahan',
      actionType: 'OPEN_ADMINISTRATION_SETUP',
      target: 'administration',
      ctaLabel: 'Tentukan Konteks',
      priorityScore: 105,
    };
  }

  // P0.4: Islamic Administration context incomplete
  if (religiousStatus === 'islam' && !isSetupCompleted) {
    return {
      type: 'administration',
      category: null,
      title: 'Lengkapi Profil Administrasi',
      description: 'Isi data domisili, status perkawinan, dan persyaratan hukum pasangan untuk menyusun panduan berkas nikah.',
      reason: 'Data ini diperlukan sebelum WedSiap dapat menentukan berkas syarat hukum yang tepat.',
      whyNow: 'Data profil pasangan diperlukan sebelum WedSiap dapat menentukan syarat hukum KUA yang tepat.',
      priorityLevel: 'P0',
      priority: 'high',
      source: 'blocker',
      priorityTag: 'Profil Administrasi',
      actionType: 'OPEN_ADMINISTRATION_SETUP',
      target: 'administration',
      ctaLabel: 'Lengkapi Profil',
      priorityScore: 100,
    };
  }

  // ─── CANDIDATE POOL GENERATION (P1 to P4) ──────────────────────────────────
  const candidates: NBACandidate[] = [];

  // P1.1: Administration Guide Generation Missing (for completed Islamic setup)
  if (religiousStatus === 'islam' && isSetupCompleted && !guideGenerated) {
    candidates.push({
      id: 'admin-generate-guide',
      action: {
        type: 'administration',
        category: null,
        title: 'Buat Panduan Berkas Administrasi',
        description: 'Profil administrasimu sudah lengkap. Buat daftar panduan dokumen resmi dan jadwal pendaftaran KUA sekarang.',
        reason: 'WedSiap dapat menyusun daftar berkas resmi secara personal berdasarkan profil pernikahanmu.',
        whyNow: 'Profil administrasi sudah selesai diisi. Buat daftar dokumen resmi sekarang agar batas waktu KUA tidak terlewat.',
        priorityLevel: 'P1',
        priority: 'high',
        source: 'setup',
        priorityTag: 'Panduan Berkas',
        actionType: 'GENERATE_ADMIN_GUIDE',
        target: 'administration',
        ctaLabel: 'Buat Panduan',
        priorityScore: 95,
      },
      priorityScore: 95,
      urgencyScore: 25,
      dependencyScore: 30,
      financialScore: 0,
      timelineScore: 20,
      readinessScore: 20,
      userPriorityScore: 0,
      sequenceScore: 0,
      priorityLevel: 'P1',
      sourceSignals: [
        {
          type: 'administration',
          source: 'hasGeneratedAdministrativeGuide',
          severity: 90,
          urgency: 80,
          message: 'Administration guide not generated',
        },
      ],
      whyNow: 'Profil administrasi sudah selesai diisi. Buat daftar dokumen resmi sekarang agar batas waktu KUA tidak terlewat.',
    });
  }

  // Helper map for vendor selection status
  const selectedVendorCategories = new Set<BudgetCategory>();
  if (effectiveVendors) {
    effectiveVendors
      .filter((v) => v.status === 'selected')
      .forEach((v) => selectedVendorCategories.add(v.category as BudgetCategory));
  }

  // ─── CANDIDATE SET 1: VENDOR & TASK PAYMENT OBLIGATIONS ────────────────────
  const paymentTaskIds = new Set<string>();
  if (effectiveBudget) {
    const upcomingPayments = calculateUpcomingPayments(
      effectiveVendors || [],
      applicableTasks,
      effectiveBudget,
      today
    );

    for (const payment of upcomingPayments) {
      if (payment.amount <= 0) continue;
      if (payment.taskId) {
        paymentTaskIds.add(payment.taskId);
      }
      if (payment.sourceType === 'task') {
        paymentTaskIds.add(payment.id);
      }

      if (payment.isOverdue) {
        // Overdue Payment (P1)
        candidates.push({
          id: `payment-overdue-${payment.id}`,
          action: {
            type: 'budget',
            category: payment.category === 'general' ? null : (payment.category as any),
            title: `Selesaikan Pembayaran ${payment.title}`,
            description: `Pembayaran sebesar ${formatRupiahNumber(payment.amount)} telah melewati batas jatuh tempo (${payment.dueDateFormatted}).`,
            reason: `Pembayaran ${payment.title} sudah melewati tanggal jatuh tempo.`,
            whyNow: `Pembayaran ${payment.title} sebesar ${formatRupiahNumber(payment.amount)} telah jatuh tempo pada ${payment.dueDateFormatted}.`,
            priorityLevel: 'P1',
            priority: 'high',
            source: 'payment',
            priorityTag: 'Jatuh Tempo',
            actionType: 'OPEN_BUDGET',
            target: 'budget',
            ctaLabel: 'Lihat Pembayaran',
            priorityScore: 98,
          },
          priorityScore: 98,
          urgencyScore: 30,
          dependencyScore: 20,
          financialScore: 25,
          timelineScore: 15,
          readinessScore: 8,
          userPriorityScore: 0,
          sequenceScore: 0,
          priorityLevel: 'P1',
          sourceSignals: [
            {
              type: 'payment',
              source: 'calculateUpcomingPayments',
              severity: 90,
              urgency: 100,
              message: `Overdue payment ${payment.title}`,
            },
          ],
          whyNow: `Pembayaran ${payment.title} sebesar ${formatRupiahNumber(payment.amount)} telah jatuh tempo pada ${payment.dueDateFormatted}.`,
          dueDate: payment.dueDate,
        });
      } else if (payment.daysRemaining !== null && payment.daysRemaining === 0) {
        // Payment Due Today (P1)
        candidates.push({
          id: `payment-today-${payment.id}`,
          action: {
            type: 'budget',
            category: payment.category === 'general' ? null : (payment.category as any),
            title: `Selesaikan Pembayaran ${payment.title}`,
            description: `Pembayaran ${payment.categoryLabel} sebesar ${formatRupiahNumber(payment.amount)} jatuh tempo hari ini (${payment.dueDateFormatted}).`,
            reason: `Tenggat pembayaran ${payment.title} adalah hari ini.`,
            whyNow: `Pembayaran ${payment.title} sebesar ${formatRupiahNumber(payment.amount)} jatuh tempo hari ini.`,
            priorityLevel: 'P1',
            priority: 'high',
            source: 'payment',
            priorityTag: 'Hari Ini',
            actionType: 'OPEN_BUDGET',
            target: 'budget',
            ctaLabel: 'Lihat Pembayaran',
            priorityScore: 90,
          },
          priorityScore: 90,
          urgencyScore: 30,
          dependencyScore: 18,
          financialScore: 22,
          timelineScore: 12,
          readinessScore: 8,
          userPriorityScore: 0,
          sequenceScore: 0,
          priorityLevel: 'P1',
          sourceSignals: [
            {
              type: 'payment',
              source: 'calculateUpcomingPayments',
              severity: 85,
              urgency: 90,
              message: `Payment ${payment.title} is due today`,
            },
          ],
          whyNow: `Pembayaran ${payment.title} sebesar ${formatRupiahNumber(payment.amount)} jatuh tempo hari ini (${payment.dueDateFormatted}).`,
          dueDate: payment.dueDate,
        });
      } else if (payment.daysRemaining !== null && payment.daysRemaining > 0 && payment.daysRemaining <= 7) {
        // Payment due within 7 days (P2)
        const isUrgent3Days = payment.daysRemaining <= 3;
        const score = isUrgent3Days ? 80 : 74;
        candidates.push({
          id: `payment-upcoming-${payment.id}`,
          action: {
            type: 'budget',
            category: payment.category === 'general' ? null : (payment.category as any),
            title: `Siapkan Pembayaran ${payment.title}`,
            description: `Pembayaran ${payment.categoryLabel} sebesar ${formatRupiahNumber(payment.amount)} jatuh tempo dalam ${payment.daysRemaining} hari (${payment.dueDateFormatted}).`,
            reason: `Tenggat pembayaran ${payment.title} sudah dekat.`,
            whyNow: `Pembayaran ${payment.title} sebesar ${formatRupiahNumber(payment.amount)} jatuh tempo dalam ${payment.daysRemaining} hari.`,
            priorityLevel: 'P2',
            priority: 'high',
            source: 'payment',
            priorityTag: isUrgent3Days ? 'Jatuh Tempo Dekat' : 'Pembayaran Dekat',
            actionType: 'OPEN_BUDGET',
            target: 'budget',
            ctaLabel: 'Lihat Pembayaran',
            priorityScore: score,
          },
          priorityScore: score,
          urgencyScore: isUrgent3Days ? 25 : 20,
          dependencyScore: 15,
          financialScore: 18,
          timelineScore: 10,
          readinessScore: 5,
          userPriorityScore: 0,
          sequenceScore: 0,
          priorityLevel: 'P2',
          sourceSignals: [
            {
              type: 'payment',
              source: 'calculateUpcomingPayments',
              severity: 70,
              urgency: isUrgent3Days ? 80 : 60,
              message: `Upcoming payment due in ${payment.daysRemaining} days`,
            },
          ],
          whyNow: `Pembayaran ${payment.title} sebesar ${formatRupiahNumber(payment.amount)} jatuh tempo dalam ${payment.daysRemaining} hari (${payment.dueDateFormatted}).`,
          dueDate: payment.dueDate,
        });
      }
    }
  }

  // ─── CANDIDATE SET 2: BUDGET HEALTH & PROJECTION SIGNALS ───────────────────
  if (effectiveBudget && workspace.estimatedBudget > 0) {
    const budgetOverview = calculateBudgetOverview(workspace.estimatedBudget, effectiveBudget);
    const budgetProjection = calculateBudgetProjection(
      workspace.estimatedBudget,
      effectiveBudget,
      effectiveVendors || []
    );

    // Over-budget overrun
    if (budgetOverview.totalSpent > budgetOverview.totalBudget) {
      const overrun = budgetOverview.totalSpent - budgetOverview.totalBudget;
      candidates.push({
        id: 'budget-overrun-candidate',
        action: {
          type: 'budget',
          category: null,
          title: 'Tinjau Pengeluaran Melebihi Anggaran',
          description: `Total pengeluaran saat ini telah melebihi target anggaran sebesar ${formatRupiahNumber(overrun)}. Tinjau kembali pengeluaran pos mendatang.`,
          reason: 'Total pengeluaran melebihi anggaran keseluruhan.',
          whyNow: `Pengeluaran riil saat ini telah melampaui target budget sebesar ${formatRupiahNumber(overrun)}.`,
          priorityLevel: 'P1',
          priority: 'high',
          source: 'budget',
          priorityTag: 'Budget Terlampaui',
          actionType: 'OPEN_BUDGET',
          target: 'budget',
          ctaLabel: 'Tinjau Budget',
          priorityScore: 82,
        },
        priorityScore: 82,
        urgencyScore: 25,
        dependencyScore: 15,
        financialScore: 25,
        timelineScore: 10,
        readinessScore: 7,
        userPriorityScore: 0,
        sequenceScore: 0,
        priorityLevel: 'P1',
        sourceSignals: [
          {
            type: 'budget',
            source: 'calculateBudgetOverview',
            severity: 85,
            urgency: 75,
            message: `Budget overrun by ${overrun}`,
          },
        ],
        whyNow: `Pengeluaran saat ini (${formatRupiahNumber(budgetOverview.totalSpent)}) telah melebihi total anggaran (${formatRupiahNumber(budgetOverview.totalBudget)}).`,
      });
    } else if (budgetProjection.hasSufficientData && !budgetProjection.isWithinBudget) {
      // Projected Deficit
      const shortfall = Math.abs(budgetProjection.projectedBalance);
      candidates.push({
        id: 'budget-deficit-candidate',
        action: {
          type: 'budget',
          category: null,
          title: 'Review Alokasi Anggaran Pernikahan',
          description: `Estimasi kebutuhan mendatang (${formatRupiahNumber(budgetProjection.estimatedRemainingNeeds)}) melebihi sisa budget (${formatRupiahNumber(budgetProjection.remainingBudget)}) dengan potensi defisit ${formatRupiahNumber(shortfall)}.`,
          reason: 'Estimasi kebutuhan mendatang melebihi sisa budget.',
          whyNow: `Estimasi kebutuhan mendatang saat ini melebihi sisa budget dengan potensi kekurangan ${formatRupiahNumber(shortfall)}.`,
          priorityLevel: 'P2',
          priority: 'high',
          source: 'budget',
          priorityTag: 'Potensi Defisit',
          actionType: 'OPEN_BUDGET',
          target: 'budget',
          ctaLabel: 'Review Budget',
          priorityScore: 66,
        },
        priorityScore: 66,
        urgencyScore: 15,
        dependencyScore: 15,
        financialScore: 22,
        timelineScore: 8,
        readinessScore: 6,
        userPriorityScore: 0,
        sequenceScore: 0,
        priorityLevel: 'P2',
        sourceSignals: [
          {
            type: 'budget',
            source: 'calculateBudgetProjection',
            severity: 70,
            urgency: 60,
            message: `Projected budget deficit of ${shortfall}`,
          },
        ],
        whyNow: `Estimasi kebutuhan mendatang (${formatRupiahNumber(budgetProjection.estimatedRemainingNeeds)}) melebihi sisa budget (${formatRupiahNumber(budgetProjection.remainingBudget)}) dengan potensi kekurangan ${formatRupiahNumber(shortfall)}.`,
      });
    }
  }

  // ─── CANDIDATE SET 3: ACTIVE CHECKLIST & ADMINISTRATIVE TASKS ──────────────
  for (const task of activeTasks) {
    if (paymentTaskIds.has(task.id)) continue;

    let urgencyScore = 0;
    let urgencySource: NextBestAction['source'] = 'sequence';
    let daysUntilDue: number | null = null;

    if (!task.dueDate) {
      urgencyScore = 5;
    } else {
      daysUntilDue = calculateDaysDifference(task.dueDate, today);
      if (daysUntilDue < 0) {
        urgencyScore = 60;
        urgencySource = 'overdue';
      } else if (daysUntilDue === 0) {
        urgencyScore = 55;
        urgencySource = 'due_today';
      } else if (daysUntilDue <= 3) {
        urgencyScore = 45;
        urgencySource = 'deadline';
      } else if (daysUntilDue <= 7) {
        urgencyScore = 35;
        urgencySource = 'deadline';
      } else if (daysUntilDue <= 30) {
        urgencyScore = 25;
        urgencySource = 'deadline';
      } else {
        urgencyScore = 15;
        urgencySource = 'deadline';
      }
    }

    // Priority Score
    let priorityScore = 0;
    if (task.priority === 'high') {
      priorityScore = 20;
    } else if (task.priority === 'medium') {
      priorityScore = 10;
    }

    // User Planning Priority Score
    let userPriorityScore = 0;
    const isVendorCategory = CATEGORY_ORDER.includes(task.category as any);
    if (workspace.primaryPlanningPriority === 'vendor' && isVendorCategory) {
      userPriorityScore = 10;
    }

    // Sequence Score
    let sequenceScore = 0;
    const catIndex = CATEGORY_ORDER.indexOf(task.category as any);
    if (catIndex !== -1) {
      sequenceScore = 6 - catIndex;
    }

    const finalScore = urgencyScore + priorityScore + userPriorityScore + sequenceScore;

    let finalSource: NextBestAction['source'] = urgencySource;
    let reason = '';
    let whyNow = '';
    let priorityTag = 'Langkah Berikutnya';
    let priorityLevel: NextBestActionPriority = 'P4';

    if (daysUntilDue !== null && daysUntilDue < 0) {
      finalSource = 'overdue';
      reason = 'Tugas ini sudah melewati tenggat waktu.';
      whyNow = 'Tenggat waktu tugas ini telah terlewati, segera selesaikan untuk menghindari penumpukan beban persiapan.';
      priorityTag = 'Terlambat';
      priorityLevel = 'P1';
    } else if (daysUntilDue !== null && daysUntilDue === 0) {
      finalSource = 'due_today';
      reason = 'Tugas ini harus diselesaikan hari ini.';
      whyNow = 'Tenggat waktu tugas ini adalah hari ini.';
      priorityTag = 'Hari Ini';
      priorityLevel = 'P1';
    } else if (daysUntilDue !== null && daysUntilDue >= 1 && daysUntilDue <= 3) {
      finalSource = 'deadline';
      reason = 'Tenggat waktu tugas ini sudah sangat dekat.';
      whyNow = `Tenggat waktu tugas ini tersisa ${daysUntilDue} hari lagi.`;
      priorityTag = 'Tenggat Dekat';
      priorityLevel = 'P2';
    } else if (daysUntilDue !== null && daysUntilDue >= 4 && daysUntilDue <= 7) {
      finalSource = 'deadline';
      reason = 'Tenggat waktu tugas ini sudah dekat.';
      whyNow = `Tenggat waktu tugas ini tersisa ${daysUntilDue} hari lagi.`;
      priorityTag = 'Tenggat Dekat';
      priorityLevel = 'P2';
    } else if (task.priority === 'high') {
      finalSource = 'priority';
      reason = 'Tugas ini memiliki prioritas tinggi.';
      whyNow = 'Tugas ini memiliki prioritas tinggi yang memengaruhi kelancaran tahapan persiapan lainnya.';
      priorityTag = 'Prioritas Tinggi';
      priorityLevel = 'P2';
    } else if (daysUntilDue !== null && daysUntilDue <= 30) {
      finalSource = 'deadline';
      reason = 'Tenggat waktu tugas ini sudah dekat.';
      whyNow = `Tenggat waktu tugas ini jatuh dalam ${daysUntilDue} hari ke depan.`;
      priorityTag = 'Tenggat Dekat';
      priorityLevel = 'P3';
    } else if (userPriorityScore > 0) {
      finalSource = 'user_priority';
      reason = 'Sesuai dengan fokus prioritas vendor pilihanmu.';
      whyNow = 'Sesuai fokus prioritas vendor yang telah kamu tentukan di awal perencanaan.';
      priorityTag = 'Fokus Pilihanmu';
      priorityLevel = 'P4';
    } else if (catIndex !== -1) {
      finalSource = 'sequence';
      reason = 'Sesuai urutan alur persiapan pernikahan.';
      whyNow = `Langkah persiapan ${CATEGORY_LABELS[task.category as BudgetCategory] || task.category} penting dilakukan pada alur persiapan ini.`;
      priorityTag = 'Alur Persiapan';
      priorityLevel = 'P4';
    } else {
      finalSource = daysUntilDue !== null ? 'deadline' : 'priority';
      reason = 'Segera selesaikan tugas ini untuk kelancaran persiapan.';
      whyNow = 'Selesaikan tugas ini untuk memperlancar persiapan pernikahanmu.';
      priorityTag = 'Langkah Berikutnya';
      priorityLevel = 'P4';
    }

    const isAdminTask = isAdministrationTask(task);
    if (isAdminTask && daysUntilDue !== null && daysUntilDue < 0) {
      reason = 'Dokumen ini sudah melewati tenggat waktu persiapan resmi.';
      whyNow = 'Dokumen resmi ini telah melewati batas waktu yang disarankan untuk pendaftaran pernikahan.';
    }

    const actionType = isAdminTask ? 'OPEN_ADMIN_TASK' : 'OPEN_CHECKLIST_TASK';
    const target = isAdminTask ? 'administration' : 'checklist';
    const ctaLabel = isAdminTask ? 'Buka Dokumen' : 'Buka Checklist';

    candidates.push({
      id: `task-${task.id}`,
      action: {
        type: 'task',
        taskId: task.id,
        category: task.category === 'general' || isAdminTask ? null : (task.category as any),
        title: task.title,
        description: task.description || 'Segera selesaikan tugas ini untuk kelancaran persiapan pernikahanmu.',
        reason,
        whyNow,
        priorityLevel,
        priority: task.priority,
        source: finalSource,
        priorityTag,
        actionType,
        target,
        ctaLabel,
        priorityScore: finalScore,
      },
      priorityScore: finalScore,
      urgencyScore,
      dependencyScore: 0,
      financialScore: 0,
      timelineScore: 0,
      readinessScore: 0,
      userPriorityScore,
      sequenceScore,
      priorityLevel,
      sourceSignals: [
        {
          type: 'checklist',
          source: 'activeTasks',
          severity: priorityScore,
          urgency: urgencyScore,
          message: `Checklist task ${task.title}`,
        },
      ],
      whyNow,
      dueDate: task.dueDate,
    });
  }

  // ─── CANDIDATE SET 4: CRITICAL VENDOR SOURCING ─────────────────────────────
  if (effectiveVendors && workspace.estimatedBudget > 0 && daysUntilWedding > 0) {
    // Venue is foundational (check if venue is missing)
    if (!selectedVendorCategories.has('venue') && daysUntilWedding <= 365) {
      candidates.push({
        id: 'vendor-sourcing-venue',
        action: {
          type: 'vendor',
          category: 'venue',
          title: 'Cari dan Tentukan Venue Pernikahan',
          description: 'Pilih lokasi venue atau gedung pernikahan untuk mengunci tanggal dan menentukan kapasitas katering serta dekorasi.',
          reason: 'Venue menjadi penentu tanggal dan kapasitas seluruh persiapan pernikahan.',
          whyNow: 'Venue perlu diamankan lebih awal karena ketersediaan tanggal gedung sangat terbatas dan memengaruhi seluruh vendor lainnya.',
          priorityLevel: daysUntilWedding <= 180 ? 'P2' : 'P3',
          priority: 'high',
          source: 'vendor',
          priorityTag: 'Pencarian Vendor',
          actionType: 'OPEN_VENDOR',
          target: 'vendor',
          ctaLabel: 'Cari Vendor',
          priorityScore: daysUntilWedding <= 180 ? 64 : 52,
        },
        priorityScore: daysUntilWedding <= 180 ? 64 : 52,
        urgencyScore: daysUntilWedding <= 180 ? 20 : 10,
        dependencyScore: 25,
        financialScore: 15,
        timelineScore: 12,
        readinessScore: 8,
        userPriorityScore: workspace.primaryPlanningPriority === 'vendor' ? 10 : 0,
        sequenceScore: 6,
        priorityLevel: daysUntilWedding <= 180 ? 'P2' : 'P3',
        sourceSignals: [
          {
            type: 'vendor',
            source: 'selectedVendorCategories',
            severity: 60,
            urgency: daysUntilWedding <= 180 ? 70 : 40,
            message: 'Venue not selected',
          },
        ],
        whyNow: 'Venue perlu diamankan lebih awal karena memengaruhi dekorasi, kapasitas katering, dan jadwal acara.',
      });
    }
  }

  const TIER_WEIGHT: Record<NextBestActionPriority, number> = {
    P0: 5,
    P1: 4,
    P2: 3,
    P3: 2,
    P4: 1,
  };

  // ─── SORT CANDIDATES (Deterministic Multi-Level Scoring & Tie-Breaking) ────
  candidates.sort((a, b) => {
    // 0. Strict Priority Tier comparison (P0 > P1 > P2 > P3 > P4)
    const aTier = TIER_WEIGHT[a.priorityLevel] || 0;
    const bTier = TIER_WEIGHT[b.priorityLevel] || 0;
    if (bTier !== aTier) {
      return bTier - aTier;
    }

    // 1. Primary score comparison within the same tier
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }

    // 2. Earliest due date wins
    const aDate = a.dueDate;
    const bDate = b.dueDate;
    if (aDate && bDate) {
      if (aDate !== bDate) return aDate.localeCompare(bDate);
    } else if (aDate && !bDate) {
      return -1;
    } else if (!aDate && bDate) {
      return 1;
    }

    // 3. Priority weight (high > medium > low)
    const prioWeight = { high: 3, medium: 2, low: 1 };
    const aPrio = prioWeight[a.action.priority || 'low'] || 0;
    const bPrio = prioWeight[b.action.priority || 'low'] || 0;
    if (bPrio !== aPrio) return bPrio - aPrio;

    // 4. Category sequence order
    const aCat = a.action.category as any;
    const bCat = b.action.category as any;
    const aCatIdx = CATEGORY_ORDER.indexOf(aCat);
    const bCatIdx = CATEGORY_ORDER.indexOf(bCat);
    const aSeq = aCatIdx !== -1 ? aCatIdx : 999;
    const bSeq = bCatIdx !== -1 ? bCatIdx : 999;
    if (aSeq !== bSeq) return aSeq - bSeq;

    // 5. Stable ID tie-breaker
    return a.id.localeCompare(b.id);
  });

  // If we have high urgency / priority candidates (P1 or P2), return top candidate immediately
  if (candidates.length > 0) {
    const topCandidate = candidates[0];
    if (topCandidate.action.priorityLevel === 'P1' || topCandidate.action.priorityLevel === 'P2') {
      return topCandidate.action;
    }
  }

  // ─── P3: PLANNING GAPS (Evaluated if no P1/P2 urgency) ──────────────────────

  // 1. Budget missing
  if (!workspace.estimatedBudget || workspace.estimatedBudget <= 0) {
    return {
      type: 'budget',
      category: null,
      title: 'Atur Target Budget Pernikahan',
      description: 'Tentukan perkiraan anggaran pernikahan untuk memantau alokasi dan pengeluaran.',
      reason: 'Target budget menjadi tolak ukur penting agar pengeluaran pernikahan tetap terkendali.',
      whyNow: 'Menetapkan estimasi total anggaran pernikahan diperlukan sebagai acuan alokasi per kategori vendor.',
      priorityLevel: 'P3',
      priority: 'medium',
      source: 'setup',
      priorityTag: 'Target Budget',
      actionType: 'OPEN_BUDGET',
      target: 'budget',
      ctaLabel: 'Atur Budget',
      priorityScore: 50,
    };
  }

  // 2. Guests target missing
  if (!workspace.estimatedGuestCount || workspace.estimatedGuestCount <= 0) {
    return {
      type: 'guests',
      category: null,
      title: 'Atur Target Jumlah Tamu',
      description: 'Tentukan perkiraan tamu undangan untuk estimasi kapasitas gedung dan catering.',
      reason: 'Jumlah tamu diperlukan untuk menghitung kebutuhan porsi katering dan undangan.',
      whyNow: 'Perkiraan jumlah tamu diperlukan untuk menghitung estimasi kapasitas gedung dan porsi katering.',
      priorityLevel: 'P3',
      priority: 'medium',
      source: 'setup',
      priorityTag: 'Target Tamu',
      actionType: 'OPEN_GUESTS',
      target: 'guests',
      ctaLabel: 'Atur Tamu',
      priorityScore: 48,
    };
  }

  // 3. Events missing
  if (effectiveEvents !== undefined && effectiveEvents.length === 0) {
    return {
      type: 'events',
      category: null,
      title: 'Catat Rangkaian Acara',
      description: 'Tambahkan jadwal acara penting seperti Akad Nikah, Pemberkatan, atau Resepsi.',
      reason: 'Rangkaian acara membantu mengelompokkan jadwal vendor dan susunan waktu persiapan.',
      whyNow: 'Jadwal rangkaian acara membantu mengelompokkan timeline persiapan dan koordinasi vendor hari-H.',
      priorityLevel: 'P3',
      priority: 'medium',
      source: 'setup',
      priorityTag: 'Jadwal Acara',
      actionType: 'OPEN_EVENTS',
      target: 'dashboard',
      ctaLabel: 'Tambah Acara',
      priorityScore: 45,
    };
  }

  // If there are P3 or P4 candidates, return the top candidate
  if (candidates.length > 0) {
    return candidates[0].action;
  }

  // ─── P4: ALL CURRENT TASKS COMPLETED ───────────────────────────────────────
  if (tasks.length > 0 && activeTasks.length === 0) {
    return {
      type: 'timeline',
      category: null,
      title: 'Semua Tugas Saat Ini Selesai',
      description: 'Seluruh tugas di checklist aktif telah diselesaikan. Tinjau linimasa atau tambahkan tugas baru jika masih ada persiapan lanjutan.',
      reason: 'Semua tugas checklist saat ini telah diselesaikan.',
      whyNow: 'Semua tugas checklist aktif saat ini telah selesai.',
      priorityLevel: 'P4',
      priority: 'medium',
      source: 'completion',
      priorityTag: 'Checklist Selesai',
      actionType: 'OPEN_TIMELINE',
      target: 'timeline',
      ctaLabel: 'Lihat Timeline',
      priorityScore: 30,
    };
  }

  // ─── P4: EMPTY CHECKLIST FALLBACK ──────────────────────────────────────────
  return {
    type: 'checklist',
    category: null,
    title: 'Belum Ada Tugas',
    description: 'Belum ada tugas di checklist persiapanmu. Mulai dengan membuat tugas pertama atau gunakan template persiapan.',
    reason: 'Belum ada tugas yang terdaftar di checklist.',
    whyNow: 'Mulai dengan menambahkan tugas pertama di checklist untuk memantau progres persiapan.',
    priorityLevel: 'P4',
    priority: 'medium',
    source: 'setup',
    priorityTag: 'Mulai Checklist',
    actionType: 'OPEN_CHECKLIST',
    target: 'checklist',
    ctaLabel: 'Buat Tugas',
    priorityScore: 20,
  };
}
