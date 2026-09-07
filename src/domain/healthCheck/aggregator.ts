/**
 * WedSiap Wedding Health Check - Health Report Aggregator (Phase 1.6 Refined)
 *
 * Deterministic aggregation layer that synthesizes outputs from:
 * - nextBestActionEngine (NBA v3)
 * - timelineSelectors & journeySelectors (Timeline & 4-Phase Journey)
 * - budgetSelectors (Budget Overview, Categorization & Overrun Insights)
 * - administration/engine (Marriage Administration Legal Risk PMA 30/2024)
 * - moduleSelectors (Module-level completion & semantic states)
 * - recommendationEngine (Complementary Starter Recommendations)
 * - templateLibrary (Recommended Preparation Windows & Category Sequences)
 *
 * Principles:
 * - Readiness measures preparedness relative to remaining time (NOT remaining time alone).
 * - 0 duplicate formulas for urgency, timeline, budget, or ranking.
 * - 100% pure function, 0 database calls.
 * - Calm, intelligent, non-alarmist status presentation.
 */

import {
  TemporaryAssessmentState,
  WeddingHealthReport,
  HealthStatusLevel,
  HealthRisk,
} from './types';
import { NextBestAction, CategoryId } from '../../types/onboarding';
import { getNextBestAction } from '../../utils/nextBestActionEngine';
import { getTimelineGroups, getTimelineSummary } from '../timelineSelectors';
import { derivePreparationJourney } from '../journeySelectors';
import {
  calculateBudgetOverview,
  calculateCategorySummaries,
  getBudgetInsights,
} from '../budgetSelectors';
import {
  calculateAdministrativeRisk,
  calculateRemainingWorkingDays,
} from '../administration/engine';
import {
  getAllModulesProgress,
  getCompletedModuleCount,
  TOTAL_CANONICAL_MODULES,
} from '../moduleSelectors';
import { getStarterRecommendations } from '../recommendationEngine';
import { formatIndonesianDate, getDaysUntilWedding } from '../workspaceSelectors';
import { CATEGORY_ORDER } from '../categories';

function getTodayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface CategoryTimelinessAssessment {
  category: CategoryId;
  status: 'completed' | 'in_progress' | 'not_started';
  isPastRecommendedWindow: boolean;
  isCriticalWindowElapsed: boolean;
  penalty: number;
}

/**
 * Evaluates whether incomplete categories have passed their recommended preparation windows
 * based on canonical template sequences and days until wedding.
 *
 * Principles:
 * - Completed categories receive 0 penalty, regardless of wedding date.
 * - Early/Safe dates (e.g. H-180, H-365) receive 0 penalty for unfinished later-stage modules.
 * - Near wedding dates with missing foundation (e.g. H-30 without venue) receive meaningful penalties.
 */
export function evaluateCategoryTimeliness(
  completedCategories: CategoryId[],
  inProgressCategories: CategoryId[],
  daysUntilWedding: number
): {
  assessments: CategoryTimelinessAssessment[];
  totalTimelinessPenalty: number;
  hasCriticalFoundationMissing: boolean;
  criticalMissingCategoryLabels: string[];
} {
  const completedSet = new Set(completedCategories);
  const inProgressSet = new Set(inProgressCategories);

  const assessments: CategoryTimelinessAssessment[] = [];
  let totalPenalty = 0;
  let hasCriticalFoundationMissing = false;
  const criticalMissingCategoryLabels: string[] = [];

  for (const cat of CATEGORY_ORDER) {
    const isCompleted = completedSet.has(cat);
    const isInProgress = inProgressSet.has(cat);
    const status: 'completed' | 'in_progress' | 'not_started' = isCompleted
      ? 'completed'
      : isInProgress
      ? 'in_progress'
      : 'not_started';

    if (isCompleted) {
      assessments.push({
        category: cat,
        status: 'completed',
        isPastRecommendedWindow: false,
        isCriticalWindowElapsed: false,
        penalty: 0,
      });
      continue;
    }

    let penalty = 0;
    let isPastRecommendedWindow = false;
    let isCriticalWindowElapsed = false;

    if (cat === 'venue') {
      // Venue locking window is ideal >= 120 days
      if (daysUntilWedding < 120) {
        isPastRecommendedWindow = true;
        if (daysUntilWedding <= 60) {
          isCriticalWindowElapsed = true;
          hasCriticalFoundationMissing = true;
          criticalMissingCategoryLabels.push('Venue / Gedung');
          penalty = status === 'not_started' ? 22 : 8;
        } else {
          penalty = status === 'not_started' ? 12 : 4;
        }
      }
    } else if (cat === 'catering') {
      // Catering locking window is ideal >= 90 days
      if (daysUntilWedding < 90) {
        isPastRecommendedWindow = true;
        if (daysUntilWedding <= 45) {
          isCriticalWindowElapsed = true;
          if (status === 'not_started') {
            criticalMissingCategoryLabels.push('Catering');
          }
          penalty = status === 'not_started' ? 14 : 5;
        } else {
          penalty = status === 'not_started' ? 8 : 3;
        }
      }
    } else if (cat === 'photography' || cat === 'decoration') {
      // Photography & Decoration locking window is ideal >= 60 days
      if (daysUntilWedding < 60) {
        isPastRecommendedWindow = true;
        if (daysUntilWedding <= 30) {
          isCriticalWindowElapsed = true;
          penalty = status === 'not_started' ? 8 : 3;
        } else {
          penalty = status === 'not_started' ? 4 : 1;
        }
      }
    } else if (cat === 'makeup_attire') {
      // Makeup & Attire fitting window is ideal >= 45 days
      if (daysUntilWedding < 45) {
        isPastRecommendedWindow = true;
        if (daysUntilWedding <= 21) {
          isCriticalWindowElapsed = true;
          penalty = status === 'not_started' ? 6 : 2;
        } else {
          penalty = status === 'not_started' ? 3 : 1;
        }
      }
    } else if (cat === 'invitation') {
      // Invitation distribution window is ideal >= 21 days
      if (daysUntilWedding < 21) {
        isPastRecommendedWindow = true;
        if (daysUntilWedding <= 14) {
          isCriticalWindowElapsed = true;
          penalty = status === 'not_started' ? 6 : 0;
        } else {
          penalty = status === 'not_started' ? 3 : 0;
        }
      }
    }

    totalPenalty += penalty;
    assessments.push({
      category: cat,
      status,
      isPastRecommendedWindow,
      isCriticalWindowElapsed,
      penalty,
    });
  }

  return {
    assessments,
    totalTimelinessPenalty: Math.min(40, totalPenalty),
    hasCriticalFoundationMissing,
    criticalMissingCategoryLabels,
  };
}

/**
 * Derives the composite readiness score (0..100) deterministically from
 * module progress, foundational inputs, overdue tasks, timeliness adjustments, and blocker penalties.
 */
export function calculateCompositeReadinessScore(params: {
  completedModules: number;
  inProgressModules: number;
  hasBudget: boolean;
  hasGuests: boolean;
  hasWeddingDate: boolean;
  daysUntilWedding: number;
  nba: NextBestAction;
  overdueTasks: number;
  adminRiskLevel: string;
  isBudgetOverrun: boolean;
  isBudgetApproaching: boolean;
  timelinessPenalty: number;
  hasCriticalFoundationMissing: boolean;
}): number {
  const {
    completedModules,
    inProgressModules,
    hasBudget,
    hasGuests,
    hasWeddingDate,
    daysUntilWedding,
    nba,
    overdueTasks,
    adminRiskLevel,
    isBudgetOverrun,
    isBudgetApproaching,
    timelinessPenalty,
    hasCriticalFoundationMissing,
  } = params;

  // 1. Date passed is an automatic 0 readiness for active planning
  if (hasWeddingDate && daysUntilWedding < 0) {
    return 0;
  }

  // 2. Base score from foundation setup (max 20 points)
  let baseScore = 0;
  if (hasWeddingDate) baseScore += 10;
  if (hasBudget) baseScore += 5;
  if (hasGuests) baseScore += 5;

  // 3. Module progress score (max 80 points)
  const completedScore = (completedModules / TOTAL_CANONICAL_MODULES) * 65;
  const inProgressScore = Math.min(15, inProgressModules * 3);

  let rawScore = Math.round(baseScore + completedScore + inProgressScore);

  // 4. Timeliness & Critical Foundation Adjustments
  if (timelinessPenalty > 0) {
    rawScore = rawScore - timelinessPenalty;
  }

  // 5. Blockers & Penalties
  // P0 Blocker caps readiness at 40
  if (nba.priorityLevel === 'P0') {
    rawScore = Math.min(rawScore, 40);
  }

  // Administrative critical risk caps readiness at 50, penalty -20
  if (adminRiskLevel === 'CRITICAL') {
    rawScore = Math.min(rawScore - 20, 50);
  } else if (adminRiskLevel === 'HIGH') {
    rawScore = rawScore - 10;
  }

  // Overdue tasks penalty: -4 points per overdue task (max -20)
  if (overdueTasks > 0) {
    const overduePenalty = Math.min(20, overdueTasks * 4);
    rawScore = rawScore - overduePenalty;
  }

  // Budget overrun penalty: -15 points
  if (isBudgetOverrun) {
    rawScore = rawScore - 15;
  } else if (isBudgetApproaching) {
    rawScore = rawScore - 5;
  }

  return Math.min(100, Math.max(0, rawScore));
}

/**
 * Determines the calm, narrative health status level and label.
 */
export function deriveHealthStatusLevel(params: {
  score: number;
  daysUntilWedding: number;
  nba: NextBestAction;
  adminRiskLevel: string;
  overdueTasks: number;
  isBudgetOverrun: boolean;
  hasCriticalFoundationMissing: boolean;
}): { level: HealthStatusLevel; label: string; summary: string } {
  const {
    score,
    daysUntilWedding,
    nba,
    adminRiskLevel,
    overdueTasks,
    isBudgetOverrun,
    hasCriticalFoundationMissing,
  } = params;

  if (daysUntilWedding < 0 || nba.priorityLevel === 'P0' || adminRiskLevel === 'CRITICAL') {
    return {
      level: 'critical_urgency',
      label: 'Perlu Penyesuaian Segera',
      summary:
        'Terdapat hal mendasar atau tenggat hukum resmi yang memerlukan perhatian sebelum melanjutkan persiapan lainnya.',
    };
  }

  if (
    hasCriticalFoundationMissing ||
    overdueTasks > 0 ||
    isBudgetOverrun ||
    adminRiskLevel === 'HIGH' ||
    (nba.priorityLevel === 'P1' && nba.source === 'overdue')
  ) {
    return {
      level: 'needs_attention',
      label: 'Perlu Perhatian',
      summary:
        'Sebagian besar persiapan berjalan, namun ada beberapa tugas penting atau pos anggaran yang perlu segera dirapikan.',
    };
  }

  if (score >= 70 && overdueTasks === 0 && !hasCriticalFoundationMissing) {
    return {
      level: 'on_track',
      label: 'On Track & Terkendali',
      summary:
        'Ritme persiapan pernikahanmu berada dalam alur yang sangat baik dan sesuai dengan sisa waktu yang tersedia.',
    };
  }

  return {
    level: 'quite_on_track',
    label: 'Cukup On Track',
    summary:
      'Pondasi persiapan sudah mulai terbentuk. Fokus pada langkah prioritas berikutnya untuk menjaga kelancaran timeline.',
  };
}

/**
 * Aggregates top 3 distinct biggest risks from existing engine outputs.
 */
export function aggregateTopRisks(params: {
  nba: NextBestAction;
  adminRisk: { level: string; reasons: string[] };
  overdueTasks: number;
  overBudgetCategories: string[];
  isTotalBudgetOverrun: boolean;
  daysUntilWedding: number;
  criticalMissingCategoryLabels: string[];
}): HealthRisk[] {
  const {
    nba,
    adminRisk,
    overdueTasks,
    overBudgetCategories,
    isTotalBudgetOverrun,
    daysUntilWedding,
    criticalMissingCategoryLabels,
  } = params;

  const risks: HealthRisk[] = [];

  // 1. Critical Foundation Missing Near Wedding (e.g. Venue at H-30)
  if (criticalMissingCategoryLabels.length > 0) {
    risks.push({
      id: 'risk-foundation-missing',
      title: `${criticalMissingCategoryLabels.join(' & ')} Belum Diamankan`,
      description: `Waktu pernikahan tersisa ${daysUntilWedding} hari, namun persiapan ${criticalMissingCategoryLabels.join(' & ').toLowerCase()} belum diamankan.`,
      severity: 'high',
      source: 'planning',
    });
  }

  // 2. Marriage Administration Legal Risk
  if (adminRisk.level === 'CRITICAL' || adminRisk.level === 'HIGH') {
    risks.push({
      id: 'risk-admin-legal',
      title: 'Tenggat Administrasi Pernikahan',
      description:
        adminRisk.reasons[0] ||
        'Persiapan berkas pernikahan mendekati batas waktu pendaftaran resmi.',
      severity: 'high',
      source: 'administration',
    });
  }

  // 3. Overdue Checklist Tasks
  if (overdueTasks > 0) {
    risks.push({
      id: 'risk-timeline-overdue',
      title: 'Tugas Melewati Tenggat',
      description: `${overdueTasks} tugas persiapan telah melewati jadwal target yang disarankan.`,
      severity: 'high',
      source: 'timeline',
    });
  }

  // 4. Budget Overrun Risk
  if (isTotalBudgetOverrun) {
    risks.push({
      id: 'risk-budget-overrun-total',
      title: 'Anggaran Melebihi Batas Total',
      description: 'Total pengeluaran dan komitmen telah melampaui target anggaran awal pernikahan.',
      severity: 'high',
      source: 'budget',
    });
  } else if (overBudgetCategories.length > 0) {
    risks.push({
      id: 'risk-budget-overrun-category',
      title: `Alokasi ${overBudgetCategories.slice(0, 2).join(' & ')} Terlampaui`,
      description: `Komitmen biaya pada pos ${overBudgetCategories.slice(0, 2).join(' & ')} melebihi alokasi yang direncanakan.`,
      severity: 'high',
      source: 'budget',
    });
  }

  // 5. Blocker / High Priority NBA Signal
  if (nba.priorityLevel === 'P0' && !risks.some((r) => r.source === 'planning')) {
    risks.push({
      id: 'risk-planning-blocker',
      title: nba.title,
      description: nba.reason || nba.description,
      severity: 'high',
      source: 'planning',
    });
  } else if (nba.priorityLevel === 'P1' && !risks.some((r) => r.source === 'timeline')) {
    risks.push({
      id: 'risk-planning-time-critical',
      title: nba.title,
      description: nba.reason || nba.description,
      severity: 'high',
      source: 'planning',
    });
  }

  // 6. Timeline Window Compression (Proximity Attention)
  if (daysUntilWedding <= 60 && daysUntilWedding > 0 && risks.length < 3) {
    risks.push({
      id: 'risk-timeline-proximity',
      title: 'Sisa Waktu Kurang dari 2 Bulan',
      description:
        'Persiapan memasuki fase akhir. Pastikan konfirmasi seluruh vendor utama telah terkunci.',
      severity: 'attention',
      source: 'timeline',
    });
  }

  // Return at most 3 prioritized distinct risks
  return risks.slice(0, 3);
}

/**
 * Authoritative Wedding Health Report Aggregator.
 * Produces a complete WeddingHealthReport by synthesizing all existing domain engines.
 */
export function generateWeddingHealthReport(
  state: TemporaryAssessmentState,
  today: string = getTodayYMD()
): WeddingHealthReport {
  const { workspace, tasks, budget, events } = state;
  const ceremonyEvent = events.find((e) => e.type === 'ceremony') || null;
  const daysUntilWedding = getDaysUntilWedding(workspace.weddingDate);
  const formattedWeddingDate = formatIndonesianDate(workspace.weddingDate);

  // ─── 1. Run Authoritative NBA Engine v3 ───
  const primaryNba = getNextBestAction(workspace, tasks, today, events);

  // ─── 2. Run Complementary Starter Recommendations ───
  const starterRecs = getStarterRecommendations({
    workspace,
    tasks,
    events,
    today,
  });

  const recommendedActions: NextBestAction[] = starterRecs.slice(0, 3).map((rec) => ({
    id: rec.id,
    type: 'task',
    category: rec.category === 'general' ? null : (rec.category as any),
    title: rec.title,
    description: rec.description,
    reason: rec.reason,
    priorityLevel: 'P4',
    priority: rec.priority,
    source: 'sequence',
    priorityTag: rec.mode === 'catch_up' ? 'Perlu Diamankan' : 'Langkah Awal',
    actionType: 'OPEN_CHECKLIST_TASK',
    target: 'checklist',
    ctaLabel: 'Lihat Detail',
  }));

  // ─── 3. Run Module Selectors ───
  const allModulesProgress = getAllModulesProgress(tasks, primaryNba.category);
  const taskCompletedModulesCount = getCompletedModuleCount(tasks);
  const workspaceCompletedCategoriesCount = workspace.completedCategories?.length || 0;
  const completedModulesCount = Math.max(taskCompletedModulesCount, workspaceCompletedCategoriesCount);

  // Identify in-progress categories directly from tasks or module progress
  const inProgressCategories = CATEGORY_ORDER.filter((cat) => {
    if (workspace.completedCategories?.includes(cat)) return false;
    const catTasks = tasks.filter((t) => t.category === cat);
    return catTasks.some((t) => t.status === 'in_progress' || t.status === 'completed');
  });
  const inProgressModulesCount = inProgressCategories.length;

  // ─── 4. Evaluate Timeliness & Preparation Windows ───
  const timeliness = evaluateCategoryTimeliness(
    workspace.completedCategories,
    inProgressCategories,
    daysUntilWedding
  );

  // ─── 5. Run Timeline & Journey Selectors ───
  const timelineSummary = getTimelineSummary(tasks, workspace.weddingDate, today);
  const timelineGroups = getTimelineGroups(tasks, workspace.weddingDate, today);
  const journey = derivePreparationJourney(workspace.weddingDate, tasks, today);

  // ─── 6. Run Budget Selectors ───
  const budgetOverview = calculateBudgetOverview(workspace.estimatedBudget, budget);
  const categorySummaries = calculateCategorySummaries(budget);
  const budgetInsights = getBudgetInsights(budgetOverview, categorySummaries);

  const overBudgetCategories = Object.values(categorySummaries)
    .filter((s) => s.status === 'melebihi_budget')
    .map((s) => s.category);

  const isBudgetOverrun =
    budgetOverview.totalSpent > budgetOverview.totalBudget && budgetOverview.totalBudget > 0;
  const isBudgetApproaching = Object.values(categorySummaries).some(
    (s) => s.status === 'mendekati_batas'
  );

  let budgetStatus: 'aman' | 'mendekati_batas' | 'melebihi_budget' | 'belum_dialokasikan' = 'aman';
  let budgetStatusLabel = 'Anggaran Aman';
  let budgetSummary = 'Alokasi dan komitmen pengeluaran masih berada dalam batas yang direncanakan.';

  if (isBudgetOverrun || overBudgetCategories.length > 0) {
    budgetStatus = 'melebihi_budget';
    budgetStatusLabel = 'Melebihi Alokasi';
    budgetSummary =
      budgetInsights.find((i) => i.isCritical)?.title ||
      'Terdapat pos pengeluaran yang telah melampaui alokasi target anggaran.';
  } else if (isBudgetApproaching) {
    budgetStatus = 'mendekati_batas';
    budgetStatusLabel = 'Mendekati Batas';
    budgetSummary = 'Sebagian pos pengeluaran telah mencapai 80% atau lebih dari alokasi yang disiapkan.';
  } else if (workspace.estimatedBudget <= 0) {
    budgetStatus = 'belum_dialokasikan';
    budgetStatusLabel = 'Belum Ditentukan';
    budgetSummary = 'Target anggaran belum ditentukan.';
  }

  // ─── 7. Run Marriage Administration Engine ───
  const religion = workspace.religiousContexts?.[0]?.tradition || 'islam';
  const adminRisk = calculateAdministrativeRisk(
    tasks,
    workspace.administrationContext,
    workspace.weddingDate,
    today,
    religion
  );

  // ─── 8. Calculate Readiness Score & Overall Status ───
  const readinessScore = calculateCompositeReadinessScore({
    completedModules: completedModulesCount,
    inProgressModules: inProgressModulesCount,
    hasBudget: workspace.estimatedBudget > 0,
    hasGuests: workspace.estimatedGuestCount > 0,
    hasWeddingDate: Boolean(workspace.weddingDate),
    daysUntilWedding,
    nba: primaryNba,
    overdueTasks: timelineSummary.overdueTasks,
    adminRiskLevel: adminRisk.level,
    isBudgetOverrun: isBudgetOverrun || overBudgetCategories.length > 0,
    isBudgetApproaching,
    timelinessPenalty: timeliness.totalTimelinessPenalty,
    hasCriticalFoundationMissing: timeliness.hasCriticalFoundationMissing,
  });

  const overall = deriveHealthStatusLevel({
    score: readinessScore,
    daysUntilWedding,
    nba: primaryNba,
    adminRiskLevel: adminRisk.level,
    overdueTasks: timelineSummary.overdueTasks,
    isBudgetOverrun: isBudgetOverrun || overBudgetCategories.length > 0,
    hasCriticalFoundationMissing: timeliness.hasCriticalFoundationMissing,
  });

  // ─── 9. Aggregate Top Risks ───
  const topRisks = aggregateTopRisks({
    nba: primaryNba,
    adminRisk,
    overdueTasks: timelineSummary.overdueTasks,
    overBudgetCategories,
    isTotalBudgetOverrun: isBudgetOverrun,
    daysUntilWedding,
    criticalMissingCategoryLabels: timeliness.criticalMissingCategoryLabels,
  });

  return {
    generatedAt: new Date().toISOString(),
    daysUntilWedding,
    formattedWeddingDate,
    overall: {
      status: overall.level,
      statusLabel: overall.label,
      summary: overall.summary,
      score: readinessScore,
    },
    readiness: {
      score: readinessScore,
      status: `${completedModulesCount} dari ${TOTAL_CANONICAL_MODULES} modul utama siap`,
      summary: `${completedModulesCount} kategori utama telah diamankan, dengan ${inProgressModulesCount} kategori sedang berjalan.`,
      completedModulesCount,
      totalModulesCount: TOTAL_CANONICAL_MODULES,
      moduleProgress: allModulesProgress,
    },
    budget: {
      status: budgetStatus,
      statusLabel: budgetStatusLabel,
      summary: budgetSummary,
      overview: budgetOverview,
      categorySummaries,
      insights: budgetInsights,
    },
    timeline: {
      status:
        timelineSummary.overdueTasks > 0
          ? `${timelineSummary.overdueTasks} tugas terlambat`
          : 'Linimasa Terjadwal',
      summary: `Tersisa ${daysUntilWedding} hari menuju Hari-H dengan ${timelineSummary.activeTasks} tugas aktif yang terjadwal.`,
      daysUntilWedding,
      timelineSummary,
      timelineGroups,
      journey,
    },
    administration: {
      riskLevel: adminRisk.level,
      riskLabel: adminRisk.label,
      reasons: adminRisk.reasons,
    },
    risks: topRisks,
    nextBestAction: primaryNba,
    recommendedActions,
    source: {
      engineVersion: 'WedSiap-Core-v3',
    },
  };
}
