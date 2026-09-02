import { NextBestAction } from '../types/onboarding';
import { StoredWorkspace } from '../types/workspace';
import { TaskItem } from '../types/checklist';
import { CATEGORY_TAXONOMY, CATEGORY_ORDER } from '../domain/categories';

export { CATEGORY_TAXONOMY, CATEGORY_ORDER };

interface CandidateEval {
  task: TaskItem;
  score: number;
  action: NextBestAction;
}

function calculateDaysDifference(targetDate: string, today: string): number {
  const target = new Date(targetDate + 'T00:00:00');
  const current = new Date(today + 'T00:00:00');
  return Math.ceil((target.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Next Best Action Engine v2 (Task-Aware)
 * 
 * Deterministic, rule-based recommendation engine for WedFlow.
 * Evaluates concrete TaskItems based on:
 *   candidateScore = urgencyScore + priorityScore + userPriorityScore + sequenceScore
 */
export function getNextBestAction(
  workspace: StoredWorkspace,
  tasks: TaskItem[],
  today: string
): NextBestAction {
  const daysUntilWedding = calculateDaysDifference(workspace.weddingDate, today);

  // Dedicated state if wedding date has already passed
  if (daysUntilWedding < 0) {
    return {
      type: 'timeline',
      category: null,
      title: 'Perbarui Tanggal Pernikahan',
      description: 'Tanggal pernikahan yang terdaftar telah lewat. Tinjau kembali alur persiapan atau perbarui tanggal di pengaturan.',
      reason: 'Tanggal pernikahan telah lewat.',
      priority: 'high',
      source: 'urgency',
      priorityTag: 'Tanggal Lewat',
    };
  }

  // 1. Empty task list handling (no tasks generated or present)
  if (tasks.length === 0) {
    return {
      type: 'checklist',
      category: null,
      title: 'Belum Ada Tugas',
      description: 'Belum ada tugas di checklist persiapanmu. Mulai dengan membuat tugas pertama atau atur alur persiapan.',
      reason: 'Belum ada tugas yang terdaftar.',
      priority: 'medium',
      source: 'completion',
      priorityTag: 'Setup Tugas',
    };
  }

  // 2. Filter active candidates (todo & in_progress are eligible)
  const activeTasks = tasks.filter(t => t.status === 'todo' || t.status === 'in_progress');

  // 3. All tasks completed fallback
  if (activeTasks.length === 0) {
    return {
      type: 'timeline',
      category: null,
      title: 'Persiapan Selesai!',
      description: 'Kamu telah menyelesaikan semua tugas di checklist. Tinjau ulang timeline untuk memastikan tidak ada yang terlewat.',
      reason: 'Semua tugas telah diselesaikan.',
      priority: 'medium',
      source: 'completion',
      priorityTag: 'Tugas Selesai',
    };
  }

  const candidates: CandidateEval[] = [];

  for (const task of activeTasks) {
    let urgencyScore = 0;
    let urgencySource: NextBestAction['source'] = 'sequence';
    let daysUntilDue: number | null = null;

    // --- 1. Urgency Score ---
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

    // --- 2. Priority Score ---
    let priorityScore = 0;
    if (task.priority === 'high') {
      priorityScore = 20;
    } else if (task.priority === 'medium') {
      priorityScore = 10;
    }

    // --- 3. User Planning Priority Score ---
    // Only 'vendor' priority has reliable category mapping
    let userPriorityScore = 0;
    const isVendorCategory = CATEGORY_ORDER.includes(task.category as any);
    if (workspace.primaryPlanningPriority === 'vendor' && isVendorCategory) {
      userPriorityScore = 10;
    }

    // --- 4. Sequence Score ---
    let sequenceScore = 0;
    const catIndex = CATEGORY_ORDER.indexOf(task.category as any);
    if (catIndex !== -1) {
      sequenceScore = 6 - catIndex;
    }

    const finalScore = urgencyScore + priorityScore + userPriorityScore + sequenceScore;

    // --- Primary Source & Reason Selection ---
    let finalSource: NextBestAction['source'] = urgencySource;
    let reason = '';
    let priorityTag = 'Langkah Berikutnya';

    if (daysUntilDue !== null && daysUntilDue < 0) {
      finalSource = 'overdue';
      reason = 'Tugas ini sudah melewati tenggat waktu.';
      priorityTag = 'Terlambat';
    } else if (daysUntilDue !== null && daysUntilDue === 0) {
      finalSource = 'due_today';
      reason = 'Tugas ini harus diselesaikan hari ini.';
      priorityTag = 'Hari Ini';
    } else if (daysUntilDue !== null && daysUntilDue >= 1 && daysUntilDue <= 30) {
      finalSource = 'deadline';
      reason = 'Tenggat waktu tugas ini sudah dekat.';
      priorityTag = 'Tenggat Dekat';
    } else if (userPriorityScore > 0) {
      finalSource = 'user_priority';
      reason = 'Sesuai dengan fokus prioritas vendor pilihanmu.';
      priorityTag = 'Fokus Pilihanmu';
    } else if (task.priority === 'high') {
      finalSource = 'priority';
      reason = 'Tugas ini memiliki prioritas tinggi.';
      priorityTag = 'Prioritas Tinggi';
    } else if (catIndex !== -1) {
      finalSource = 'sequence';
      reason = 'Sesuai urutan alur persiapan pernikahan.';
      priorityTag = 'Alur Persiapan';
    } else {
      finalSource = daysUntilDue !== null ? 'deadline' : 'priority';
      reason = 'Segera selesaikan tugas ini untuk kelancaran persiapan.';
      priorityTag = 'Langkah Berikutnya';
    }

    candidates.push({
      task,
      score: finalScore,
      action: {
        type: 'task',
        taskId: task.id,
        category: task.category === 'general' ? null : (task.category as any),
        title: task.title,
        description: task.description || 'Segera selesaikan tugas ini untuk kelancaran persiapan pernikahanmu.',
        reason,
        priority: task.priority,
        source: finalSource,
        priorityTag,
      },
    });
  }

  // --- REQUIRED CORRECTION #1: Deterministic Tie-Break ---
  // 1. Higher final score
  // 2. Earlier due date (tasks with due date before tasks without due date)
  // 3. Higher task priority (high > medium > low)
  // 4. Earlier category sequence (venue > catering > ... > general)
  // 5. Stable task ID fallback
  candidates.sort((a, b) => {
    // Rule 1: Final score
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    // Rule 2: Earlier due date
    const aDate = a.task.dueDate;
    const bDate = b.task.dueDate;
    if (aDate && bDate) {
      if (aDate !== bDate) return aDate.localeCompare(bDate);
    } else if (aDate && !bDate) {
      return -1; // a has date, b doesn't -> a wins
    } else if (!aDate && bDate) {
      return 1; // b has date, a doesn't -> b wins
    }

    // Rule 3: Task priority (high > medium > low)
    const prioWeight = { high: 3, medium: 2, low: 1 };
    const aPrio = prioWeight[a.task.priority] || 0;
    const bPrio = prioWeight[b.task.priority] || 0;
    if (bPrio !== aPrio) {
      return bPrio - aPrio;
    }

    // Rule 4: Earlier category sequence
    const aCatIdx = CATEGORY_ORDER.indexOf(a.task.category as any);
    const bCatIdx = CATEGORY_ORDER.indexOf(b.task.category as any);
    const aSeq = aCatIdx !== -1 ? aCatIdx : 999;
    const bSeq = bCatIdx !== -1 ? bCatIdx : 999;
    if (aSeq !== bSeq) {
      return aSeq - bSeq;
    }

    // Rule 5: Stable task ID fallback
    return a.task.id.localeCompare(b.task.id);
  });

  return candidates[0].action;
}
