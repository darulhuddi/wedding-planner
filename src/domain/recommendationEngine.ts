/**
 * WedFlow Starter Plan Recommendation Engine (Phase 2)
 *
 * Pure, deterministic recommendation engine.
 * Input: Workspace + Events + Religious/Cultural Context + Existing Tasks + Wedding Date + User Priority
 * Output: Top 0–5 StarterRecommendations
 *
 * Principles:
 * - Pure function, 0 database access.
 * - Centralized scoring weights.
 * - Conservative matching for custom tasks.
 * - Deterministic output order.
 * - No unsupported legal/religious claims.
 */

import {
  StarterRecommendation,
  StarterRecommendationInput,
  StarterTaskTemplate,
} from './templateTypes';
import { STARTER_TASK_TEMPLATES } from './templateLibrary';
import { resolveWeddingContext, customizeTemplateWithContext } from './contextResolver';
import { CATEGORY_LABELS } from './categories';
import { TaskItem, TaskPriority, TaskCategoryId } from '../types/checklist';
import { WeddingEvent } from './events';
import { StoredWorkspace } from '../types/workspace';

export const SCORING_WEIGHTS = {
  TIMING_IN_WINDOW: 35,
  /** Internal scoring boost when recommended start window has passed (catch-up urgency, not a task deadline) */
  TIMING_WINDOW_PASSED: 45,
  TIMING_OVERDUE: 45, // Backwards-compatible alias for TIMING_WINDOW_PASSED
  TIMING_FUTURE: 10,
  UNFINISHED_MODULE: 25,
  CATCH_UP_RELEVANCE: 40,
  USER_PLANNING_PRIORITY: 30,
  SEQUENCE_EARLY_BONUS: 20,
  EVENT_RELEVANCE: 15,
  CORE_APPLICABILITY: 10,
  PRIORITY_HIGH: 15,
  PRIORITY_MEDIUM: 10,
  PRIORITY_LOW: 5,
};

/**
 * Returns current date in YYYY-MM-DD format.
 */
function getTodayYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calculates days between two YYYY-MM-DD dates (target - source).
 */
export function calculateDaysBetween(fromYMD: string, toYMD: string): number {
  const from = new Date(fromYMD + 'T00:00:00');
  const to = new Date(toYMD + 'T00:00:00');
  const diffMs = to.getTime() - from.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Adds days to a YYYY-MM-DD string.
 */
function addDays(ymd: string, days: number): string {
  const d = new Date(ymd + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Normalizes title for conservative comparison.
 */
export function normalizeTitle(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if an existing task matches a template using conservative normalization.
 */
function isTaskMatchingTemplate(task: TaskItem, template: StarterTaskTemplate): boolean {
  // 1. Direct template ID match
  if (task.templateId && task.templateId === template.id) {
    return true;
  }

  // 2. Conservative title match
  const normTaskTitle = normalizeTitle(task.title);
  const normTplTitle = normalizeTitle(template.title);

  if (normTaskTitle === normTplTitle) {
    return true;
  }

  // Check if both share the same category and key unique words
  if (task.category === template.category) {
    const taskWords = new Set(normTaskTitle.split(' ').filter((w) => w.length > 3));
    const tplWords = new Set(normTplTitle.split(' ').filter((w) => w.length > 3));
    if (tplWords.size > 0) {
      let matchCount = 0;
      tplWords.forEach((w) => {
        if (taskWords.has(w)) matchCount++;
      });
      if (matchCount >= 2 && matchCount === tplWords.size) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Derives module completion status strictly from canonical TaskItem[].
 * - not_started: totalTasks === 0 || completedTasks === 0
 * - in_progress: completedTasks > 0 && completedTasks < totalTasks
 * - completed: completedTasks === totalTasks && totalTasks > 0
 */
export function getCategoryCompletionStatus(
  tasks: TaskItem[],
  category: TaskCategoryId
): 'not_started' | 'in_progress' | 'completed' {
  const categoryTasks = (tasks || []).filter((task) => task.category === category);
  const totalTasks = categoryTasks.length;
  const completedTasks = categoryTasks.filter((task) => task.status === 'completed').length;

  if (totalTasks === 0 || completedTasks === 0) {
    return 'not_started';
  }
  if (completedTasks === totalTasks) {
    return 'completed';
  }
  return 'in_progress';
}

/**
 * Evaluates whether a template is eligible for recommendation.
 */
function isTemplateEligible(
  template: StarterTaskTemplate,
  input: StarterRecommendationInput,
  daysUntilWedding: number
): boolean {
  const { workspace, tasks, events } = input;

  // 1. Exclude if template already exists in tasks (active or completed)
  const isAlreadyCovered = tasks.some((t) => isTaskMatchingTemplate(t, template));
  if (isAlreadyCovered) {
    return false;
  }

  // 2. Module status check from current TaskItem[] (Source of Truth):
  // If the module is actually completed (completedTasks === totalTasks && totalTasks > 0),
  // exclude early starter steps (seq <= 3) since this module is already fully completed.
  // Onboarding completedCategories is ONLY historical setup context and NOT the current source of truth.
  const moduleStatus = getCategoryCompletionStatus(tasks, template.category);
  if (moduleStatus === 'completed' && template.sequence <= 3) {
    return false;
  }

  // 3. Check Event Type Compatibility
  if (events.length > 0) {
    const workspaceEventTypes = new Set(events.map((e) => e.type));
    // If template has specific applicable events, at least one must exist in workspace events
    const hasMatchingEvent = template.applicableEvents.some((t) => workspaceEventTypes.has(t));
    if (!hasMatchingEvent) {
      return false;
    }
  }

  // 4. Check Context Requirements (Cultural / Religious)
  if (template.contextRequirements) {
    const { requiresCulturalTradition, traditions } = template.contextRequirements;
    if (requiresCulturalTradition && !workspace.culturalContext?.hasTradition) {
      return false;
    }
    if (traditions && traditions.length > 0) {
      const workspaceTraditions = (workspace.religiousContexts || []).map((r) => r.tradition);
      const matches = traditions.some((t) => workspaceTraditions.includes(t));
      if (!matches) {
        return false;
      }
    }
  }

  // 5. In early starter mode, check prerequisites
  if (template.prerequisites.length > 0) {
    const completedOrExistingTaskIds = new Set(
      tasks.map((t) => t.templateId).filter(Boolean) as string[]
    );
    // If none of the prerequisites have been started/completed and template is not starter candidate, hold off
    const hasAnyPrereq = template.prerequisites.some((p) => completedOrExistingTaskIds.has(p));
    if (!hasAnyPrereq && !template.isStarterCandidate && daysUntilWedding > 90) {
      return false;
    }
  }

  return true;
}

/**
 * Calculates a deterministic relevance score for an eligible template.
 */
function calculateTemplateScore(
  template: StarterTaskTemplate,
  input: StarterRecommendationInput,
  daysUntilWedding: number,
  isCatchUpMode: boolean
): number {
  let score = 0;
  const { workspace, tasks, events } = input;

  // 1. Timing Score (internal scoring concept, not an overdue task status)
  const { minDaysBeforeWedding, maxDaysBeforeWedding } = template.recommendedWindow;
  if (daysUntilWedding >= minDaysBeforeWedding && daysUntilWedding <= maxDaysBeforeWedding) {
    score += SCORING_WEIGHTS.TIMING_IN_WINDOW;
  } else if (daysUntilWedding < minDaysBeforeWedding) {
    // Recommended start window has elapsed -> internal scoring boost for catch-up urgency
    score += SCORING_WEIGHTS.TIMING_WINDOW_PASSED;
  } else {
    // Far in the future
    score += SCORING_WEIGHTS.TIMING_FUTURE;
  }

  // 2. Unfinished Module Score derived strictly from current TaskItem[]
  const moduleStatus = getCategoryCompletionStatus(tasks, template.category);
  if (moduleStatus !== 'completed') {
    score += SCORING_WEIGHTS.UNFINISHED_MODULE;
  }

  // 3. Catch-up vs Normal Starter Relevance
  if (isCatchUpMode) {
    if (template.isCatchUpCandidate) {
      score += SCORING_WEIGHTS.CATCH_UP_RELEVANCE;
    }
  } else {
    if (template.isStarterCandidate) {
      score += 25;
    }
  }

  // 4. User Planning Priority Relevance
  const priority = workspace.primaryPlanningPriority;
  if (priority === 'vendor') {
    if (['venue', 'catering', 'photography', 'decoration', 'makeup_attire'].includes(template.category)) {
      score += SCORING_WEIGHTS.USER_PLANNING_PRIORITY;
    }
  } else if (priority === 'budget') {
    if (template.category === 'venue' || template.category === 'catering' || template.category === 'general') {
      score += SCORING_WEIGHTS.USER_PLANNING_PRIORITY;
    }
  } else if (priority === 'timeline') {
    if (template.sequence === 1 || template.category === 'general') {
      score += SCORING_WEIGHTS.USER_PLANNING_PRIORITY;
    }
  } else if (priority === 'checklist') {
    if (template.isStarterCandidate) {
      score += 15;
    }
  }

  // 5. Sequence Early Bonus (lower sequence = higher foundational priority)
  score += Math.max(0, (8 - template.sequence) * 3);

  // 6. Event Relevance Bonus
  if (events.length > 0) {
    const hasMatchingEvent = events.some((e) => template.applicableEvents.includes(e.type));
    if (hasMatchingEvent) {
      score += SCORING_WEIGHTS.EVENT_RELEVANCE;
    }
  }

  // 7. Base Applicability and Priority Bonus
  if (template.applicability === 'core') {
    score += SCORING_WEIGHTS.CORE_APPLICABILITY;
  }
  if (template.priority === 'high') {
    score += SCORING_WEIGHTS.PRIORITY_HIGH;
  } else if (template.priority === 'medium') {
    score += SCORING_WEIGHTS.PRIORITY_MEDIUM;
  } else {
    score += SCORING_WEIGHTS.PRIORITY_LOW;
  }

  return score;
}

/**
 * Calculates suggested due date deterministically.
 */
function calculateSuggestedDueDate(
  template: StarterTaskTemplate,
  weddingDate: string,
  today: string,
  daysUntilWedding: number,
  isCatchUpMode: boolean
): string | null {
  if (!weddingDate) return null;

  if (daysUntilWedding <= 0) {
    return today;
  }

  if (isCatchUpMode) {
    // In catch up mode, place due date in next 7 to 14 days
    const offset = Math.min(14, Math.max(3, Math.floor(daysUntilWedding / 4)));
    const target = addDays(today, offset);
    return target > weddingDate ? weddingDate : target;
  }

  // Normal mode: aim for reasonable lead time within the recommended window
  const leadDays = Math.max(
    14,
    Math.min(daysUntilWedding - 14, template.recommendedWindow.minDaysBeforeWedding)
  );
  const targetDate = addDays(weddingDate, -leadDays);

  // Never return a date in the past
  return targetDate < today ? addDays(today, 7) : targetDate;
}

/**
 * Generates a deterministic, user-friendly reason in Indonesian.
 */
function generateReason(
  template: StarterTaskTemplate,
  workspace: StoredWorkspace,
  daysUntilWedding: number,
  isCatchUpMode: boolean
): string {
  const categoryLabel = CATEGORY_LABELS[template.category] || template.category;

  if (isCatchUpMode) {
    return `Hari pernikahanmu sudah dekat (${daysUntilWedding} hari lagi), sehingga persiapan ${categoryLabel.toLowerCase()} ini perlu segera diamankan.`;
  }

  if (
    workspace.primaryPlanningPriority === 'vendor' &&
    ['venue', 'catering', 'photography', 'decoration', 'makeup_attire'].includes(template.category)
  ) {
    return `Sesuai fokus utamamu mencari vendor, langkah awal ${categoryLabel.toLowerCase()} ini penting diselesaikan terlebih dahulu.`;
  }

  if (workspace.primaryPlanningPriority === 'budget' && (template.category === 'venue' || template.category === 'catering')) {
    return `Pos ${categoryLabel.toLowerCase()} memiliki porsi anggaran signifikan, sehingga penting ditentukan di awal.`;
  }

  if (template.sequence === 1) {
    return `Langkah awal yang tepat untuk memulai persiapan ${categoryLabel.toLowerCase()} secara bertahap.`;
  }

  return `Waktu yang tepat untuk melanjutkan persiapan ${categoryLabel.toLowerCase()} berdasarkan timeline pernikahanmu.`;
}

/**
 * Links matching event IDs to the recommendation.
 */
function findMatchingEventIds(template: StarterTaskTemplate, events: WeddingEvent[]): string[] {
  if (events.length === 0) return [];
  return events
    .filter((e) => template.applicableEvents.includes(e.type))
    .map((e) => e.id);
}

/**
 * Pure function to generate Top 0–5 StarterRecommendations.
 */
export function getStarterRecommendations(
  input: StarterRecommendationInput
): StarterRecommendation[] {
  const { workspace, tasks, events } = input;
  const today = input.today || getTodayYMD();

  const daysUntilWedding = calculateDaysBetween(today, workspace.weddingDate);
  const isCatchUpMode = daysUntilWedding <= 120;
  const contextPack = resolveWeddingContext(workspace);

  // 1. Filter Eligible Templates
  const eligibleTemplates = STARTER_TASK_TEMPLATES.filter((template) =>
    isTemplateEligible(template, input, daysUntilWedding)
  );

  // 2. Score Candidates
  const scoredTemplates = eligibleTemplates.map((template) => {
    const score = calculateTemplateScore(template, input, daysUntilWedding, isCatchUpMode);
    return { template, score };
  });

  // 3. Sort deterministically:
  // - Highest score first
  // - Then lowest sequence first
  // - Then template ID alphabetically
  scoredTemplates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.template.sequence !== b.template.sequence) {
      return a.template.sequence - b.template.sequence;
    }
    return a.template.id.localeCompare(b.template.id);
  });

  // 4. Ensure diversity: take at most 2 tasks from the same category unless fewer categories available
  const selected: StarterTaskTemplate[] = [];
  const categoryCounts: Record<string, number> = {};

  for (const item of scoredTemplates) {
    if (selected.length >= 5) break;

    const cat = item.template.category;
    const currentCount = categoryCounts[cat] || 0;

    // Allow at most 2 recommendations per category in the top 5
    if (currentCount < 2) {
      selected.push(item.template);
      categoryCounts[cat] = currentCount + 1;
    }
  }

  // If we still have room (< 5) and more scored items, backfill without strict diversity
  if (selected.length < 5) {
    for (const item of scoredTemplates) {
      if (selected.length >= 5) break;
      if (!selected.some((s) => s.id === item.template.id)) {
        selected.push(item.template);
      }
    }
  }

  // 5. Transform into StarterRecommendation output
  return selected.map((template) => {
    const { title, description } = customizeTemplateWithContext(template, contextPack);
    const suggestedDueDate = calculateSuggestedDueDate(
      template,
      workspace.weddingDate,
      today,
      daysUntilWedding,
      isCatchUpMode
    );
    const reason = generateReason(template, workspace, daysUntilWedding, isCatchUpMode);
    const eventIds = findMatchingEventIds(template, events);

    return {
      id: `rec-${template.id}`,
      templateId: template.id,
      title,
      description,
      category: template.category,
      eventIds,
      priority: template.priority as TaskPriority,
      suggestedDueDate,
      reason,
      mode: isCatchUpMode ? 'catch_up' : 'normal',
      source: 'starter_plan_engine',
    };
  });
}
