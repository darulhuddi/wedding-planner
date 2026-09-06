import { NextBestAction, NextBestActionPriority } from '../types/onboarding';
import { StoredWorkspace } from '../types/workspace';
import { TaskItem } from '../types/checklist';
import { WeddingEvent } from '../domain/events';
import { CATEGORY_TAXONOMY, CATEGORY_ORDER } from '../domain/categories';
import { getReligiousContextStatus } from '../domain/context';
import {
  hasGeneratedAdministrativeGuide,
  getApplicableAdministrativeTasks,
} from '../domain/administration/engine';

export { CATEGORY_TAXONOMY, CATEGORY_ORDER };

interface CandidateEval {
  task: TaskItem;
  score: number;
  action: NextBestAction;
}

export function calculateDaysDifference(targetDate: string, today: string): number {
  const target = new Date(targetDate + 'T00:00:00');
  const current = new Date(today + 'T00:00:00');
  return Math.ceil((target.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Determines whether the passed wedding date blocker applies.
 * Active workspaces with past wedding dates are blocked with UPDATE_WEDDING_DATE.
 * Bypassed for workspaces with archived/completed/history lifecycle status.
 */
function isPassedWeddingDateBlocker(workspace: StoredWorkspace, daysUntilWedding: number): boolean {
  const workspaceStatus = (workspace as any).status;
  if (workspaceStatus === 'archived' || workspaceStatus === 'completed' || workspaceStatus === 'history') {
    return false;
  }
  return daysUntilWedding < 0;
}

/**
 * Next Best Action Engine v3 (Deterministic & Multi-Domain Aware)
 * 
 * Single authoritative recommendation engine for WedSiap.
 * Evaluates:
 *   P0 — BLOCKER: Wedding date passed (active workspaces), missing wedding identity, missing religious context, or administration setup incomplete (Islam).
 *   P1 — TIME CRITICAL: Admin guide missing (Islam), overdue admin tasks, overdue checklist tasks, due today.
 *   P2 — HIGH PRIORITY: Upcoming tasks (due in 1–3 days), high priority tasks.
 *   P3 — PLANNING GAP: Budget missing, guest target missing, events missing.
 *   P4 — OPTIMIZATION / SEQUENCE: Sequential category workflow, all-current-tasks-completed state.
 */
export function getNextBestAction(
  workspace: StoredWorkspace,
  tasks: TaskItem[],
  today: string = new Date().toISOString().split('T')[0],
  events?: WeddingEvent[]
): NextBestAction {
  const daysUntilWedding = calculateDaysDifference(workspace.weddingDate, today);

  // ─── P0: BLOCKER 1 — Wedding date has passed (Active Workspaces) ───
  if (isPassedWeddingDateBlocker(workspace, daysUntilWedding)) {
    return {
      type: 'timeline',
      category: null,
      title: 'Perbarui Tanggal Pernikahan',
      description: 'Tanggal pernikahan yang terdaftar telah lewat. Tinjau kembali alur persiapan atau perbarui tanggal di pengaturan.',
      reason: 'Tanggal pernikahan telah lewat.',
      priorityLevel: 'P0',
      priority: 'high',
      source: 'urgency',
      priorityTag: 'Tanggal Lewat',
      actionType: 'OPEN_WEDDING_IDENTITY',
      target: 'dashboard',
      ctaLabel: 'Perbarui Tanggal',
    };
  }

  // ─── P0: BLOCKER 2 — Wedding Identity Incomplete ───
  if (!workspace.coupleName || !workspace.coupleName.trim() || !workspace.weddingDate) {
    return {
      type: 'identity',
      category: null,
      title: 'Lengkapi Data Pernikahan',
      description: 'Nama pasangan dan tanggal pernikahan diperlukan sebagai fondasi utama seluruh linimasa persiapan.',
      reason: 'Data inti pernikahan belum lengkap.',
      priorityLevel: 'P0',
      priority: 'high',
      source: 'blocker',
      priorityTag: 'Data Inti',
      actionType: 'OPEN_WEDDING_IDENTITY',
      target: 'dashboard',
      ctaLabel: 'Lengkapi Sekarang',
    };
  }

  // ─── P0: BLOCKER 3 — Religious Context Missing / Incomplete ───
  const religiousStatus = getReligiousContextStatus(workspace.religiousContexts);
  const currentReligion = workspace.religiousContexts?.[0]?.tradition || 'unspecified';

  if (religiousStatus === 'missing') {
    return {
      type: 'administration',
      category: null,
      title: 'Tentukan Konteks Agama & Pernikahan',
      description: 'Pilih konteks keagamaan atau tradisi pernikahanmu untuk menentukan alur administrasi dan pencatatan resmi yang sesuai.',
      reason: 'Konteks agama dan tradisi diperlukan untuk menentukan lembaga pencatatan pernikahan yang tepat.',
      priorityLevel: 'P0',
      priority: 'high',
      source: 'blocker',
      priorityTag: 'Konteks Pernikahan',
      actionType: 'OPEN_ADMINISTRATION_SETUP',
      target: 'administration',
      ctaLabel: 'Tentukan Konteks',
    };
  }

  // ─── P0: BLOCKER 4 — Administration Context Incomplete (for Islamic Context) ───
  const isSetupCompleted = Boolean(workspace.administrationContext?.isSetupCompleted);
  if (religiousStatus === 'islam' && !isSetupCompleted) {
    return {
      type: 'administration',
      category: null,
      title: 'Lengkapi Profil Administrasi',
      description: 'Isi data domisili, status perkawinan, dan persyaratan hukum pasangan untuk menyusun panduan berkas nikah.',
      reason: 'Data ini diperlukan sebelum WedSiap dapat menentukan berkas syarat hukum yang tepat.',
      priorityLevel: 'P0',
      priority: 'high',
      source: 'blocker',
      priorityTag: 'Profil Administrasi',
      actionType: 'OPEN_ADMINISTRATION_SETUP',
      target: 'administration',
      ctaLabel: 'Lengkapi Profil',
    };
  }

  // Authoritative task filtering based on current religious context
  const applicableTasks = getApplicableAdministrativeTasks(tasks, currentReligion);

  // Helper to identify administrative tasks across domain mappings
  const isAdministrationTask = (t: TaskItem) =>
    t.category === 'prosesi_administrasi' ||
    (t.category as string) === 'administration';

  // Filter administrative tasks vs general tasks
  const administrativeTasks = applicableTasks.filter(isAdministrationTask);
  const activeAdminTasks = administrativeTasks.filter((t) => t.status === 'todo' || t.status === 'in_progress');
  const activeTasks = applicableTasks.filter((t) => t.status === 'todo' || t.status === 'in_progress');

  // Semantic Source of Truth for Guide Generation
  const guideGenerated = hasGeneratedAdministrativeGuide(tasks, currentReligion);

  // ─── P1: TIME CRITICAL 1 — Administration Guide Missing (for Islamic Context) ───
  if (religiousStatus === 'islam' && isSetupCompleted && !guideGenerated) {
    return {
      type: 'administration',
      category: null,
      title: 'Buat Panduan Berkas Administrasi',
      description: 'Profil administrasimu sudah lengkap. Buat daftar panduan dokumen resmi dan jadwal pendaftaran KUA sekarang.',
      reason: 'WedSiap dapat menyusun daftar berkas resmi secara personal berdasarkan profil pernikahanmu.',
      priorityLevel: 'P1',
      priority: 'high',
      source: 'setup',
      priorityTag: 'Panduan Berkas',
      actionType: 'GENERATE_ADMIN_GUIDE',
      target: 'administration',
      ctaLabel: 'Buat Panduan',
    };
  }

  // ─── P1: TIME CRITICAL 2 — Overdue Administrative Tasks ───
  const overdueAdminTasks = activeAdminTasks.filter(
    (t) => t.dueDate && calculateDaysDifference(t.dueDate, today) < 0
  );
  if (overdueAdminTasks.length > 0) {
    overdueAdminTasks.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    const targetTask = overdueAdminTasks[0];
    return {
      type: 'task',
      taskId: targetTask.id,
      category: null,
      title: targetTask.title,
      description: targetTask.description || 'Dokumen resmi ini telah melewati batas waktu persiapan.',
      reason: 'Dokumen ini sudah melewati tenggat waktu persiapan resmi.',
      priorityLevel: 'P1',
      priority: 'high',
      source: 'overdue',
      priorityTag: 'Terlambat',
      actionType: 'OPEN_ADMIN_TASK',
      target: 'administration',
      ctaLabel: 'Buka Dokumen',
    };
  }

  // ─── P1 & P2: Evaluate Active Task Candidates (General & Administrative) ───
  if (activeTasks.length > 0) {
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

      let finalSource: NextBestAction['source'] = urgencySource;
      let reason = '';
      let priorityTag = 'Langkah Berikutnya';
      let priorityLevel: NextBestActionPriority = 'P4';

      if (daysUntilDue !== null && daysUntilDue < 0) {
        finalSource = 'overdue';
        reason = 'Tugas ini sudah melewati tenggat waktu.';
        priorityTag = 'Terlambat';
        priorityLevel = 'P1';
      } else if (daysUntilDue !== null && daysUntilDue === 0) {
        finalSource = 'due_today';
        reason = 'Tugas ini harus diselesaikan hari ini.';
        priorityTag = 'Hari Ini';
        priorityLevel = 'P1';
      } else if (daysUntilDue !== null && daysUntilDue >= 1 && daysUntilDue <= 3) {
        finalSource = 'deadline';
        reason = 'Tenggat waktu tugas ini sudah sangat dekat.';
        priorityTag = 'Tenggat Dekat';
        priorityLevel = 'P2';
      } else if (task.priority === 'high') {
        finalSource = 'priority';
        reason = 'Tugas ini memiliki prioritas tinggi.';
        priorityTag = 'Prioritas Tinggi';
        priorityLevel = 'P2';
      } else if (daysUntilDue !== null && daysUntilDue <= 30) {
        finalSource = 'deadline';
        reason = 'Tenggat waktu tugas ini sudah dekat.';
        priorityTag = 'Tenggat Dekat';
        priorityLevel = 'P3';
      } else if (userPriorityScore > 0) {
        finalSource = 'user_priority';
        reason = 'Sesuai dengan fokus prioritas vendor pilihanmu.';
        priorityTag = 'Fokus Pilihanmu';
        priorityLevel = 'P4';
      } else if (catIndex !== -1) {
        finalSource = 'sequence';
        reason = 'Sesuai urutan alur persiapan pernikahan.';
        priorityTag = 'Alur Persiapan';
        priorityLevel = 'P4';
      } else {
        finalSource = daysUntilDue !== null ? 'deadline' : 'priority';
        reason = 'Segera selesaikan tugas ini untuk kelancaran persiapan.';
        priorityTag = 'Langkah Berikutnya';
        priorityLevel = 'P4';
      }

      const isAdminTask = isAdministrationTask(task);
      const actionType = isAdminTask ? 'OPEN_ADMIN_TASK' : 'OPEN_CHECKLIST_TASK';
      const target = isAdminTask ? 'administration' : 'checklist';
      const ctaLabel = isAdminTask ? 'Buka Dokumen' : 'Buka Checklist';

      candidates.push({
        task,
        score: finalScore,
        action: {
          type: 'task',
          taskId: task.id,
          category: task.category === 'general' || isAdminTask ? null : (task.category as any),
          title: task.title,
          description: task.description || 'Segera selesaikan tugas ini untuk kelancaran persiapan pernikahanmu.',
          reason,
          priorityLevel,
          priority: task.priority,
          source: finalSource,
          priorityTag,
          actionType,
          target,
          ctaLabel,
        },
      });
    }

    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aDate = a.task.dueDate;
      const bDate = b.task.dueDate;
      if (aDate && bDate) {
        if (aDate !== bDate) return aDate.localeCompare(bDate);
      } else if (aDate && !bDate) {
        return -1;
      } else if (!aDate && bDate) {
        return 1;
      }
      const prioWeight = { high: 3, medium: 2, low: 1 };
      const aPrio = prioWeight[a.task.priority] || 0;
      const bPrio = prioWeight[b.task.priority] || 0;
      if (bPrio !== aPrio) return bPrio - aPrio;
      const aCatIdx = CATEGORY_ORDER.indexOf(a.task.category as any);
      const bCatIdx = CATEGORY_ORDER.indexOf(b.task.category as any);
      const aSeq = aCatIdx !== -1 ? aCatIdx : 999;
      const bSeq = bCatIdx !== -1 ? bCatIdx : 999;
      if (aSeq !== bSeq) return aSeq - bSeq;
      return a.task.id.localeCompare(b.task.id);
    });

    const topCandidate = candidates[0];

    // If top candidate is P1 or P2, return immediately
    if (topCandidate.action.priorityLevel === 'P1' || topCandidate.action.priorityLevel === 'P2') {
      return topCandidate.action;
    }

    // ─── P3: PLANNING GAPS (Evaluated sequentially if no P1/P2 task urgency) ───
    // 1. Budget missing
    if (!workspace.estimatedBudget || workspace.estimatedBudget <= 0) {
      return {
        type: 'budget',
        category: null,
        title: 'Atur Target Budget Pernikahan',
        description: 'Tentukan perkiraan anggaran pernikahan untuk memantau alokasi dan pengeluaran.',
        reason: 'Target budget menjadi tolak ukur penting agar pengeluaran pernikahan tetap terkendali.',
        priorityLevel: 'P3',
        priority: 'medium',
        source: 'setup',
        priorityTag: 'Target Budget',
        actionType: 'OPEN_BUDGET',
        target: 'budget',
        ctaLabel: 'Atur Budget',
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
        priorityLevel: 'P3',
        priority: 'medium',
        source: 'setup',
        priorityTag: 'Target Tamu',
        actionType: 'OPEN_GUESTS',
        target: 'guests',
        ctaLabel: 'Atur Tamu',
      };
    }

    // 3. Events missing
    if (events !== undefined && events.length === 0) {
      return {
        type: 'events',
        category: null,
        title: 'Catat Rangkaian Acara',
        description: 'Tambahkan jadwal acara penting seperti Akad Nikah, Pemberkatan, atau Resepsi.',
        reason: 'Rangkaian acara membantu mengelompokkan jadwal vendor dan susunan waktu persiapan.',
        priorityLevel: 'P3',
        priority: 'medium',
        source: 'setup',
        priorityTag: 'Jadwal Acara',
        actionType: 'OPEN_EVENTS',
        target: 'dashboard',
        ctaLabel: 'Tambah Acara',
      };
    }

    // Otherwise return top sequential candidate (P4)
    return topCandidate.action;
  }

  // ─── P3: PLANNING GAPS when task list is empty ───
  // 1. Budget missing
  if (!workspace.estimatedBudget || workspace.estimatedBudget <= 0) {
    return {
      type: 'budget',
      category: null,
      title: 'Atur Target Budget Pernikahan',
      description: 'Tentukan perkiraan anggaran pernikahan untuk memantau alokasi dan pengeluaran.',
      reason: 'Target budget menjadi tolak ukur penting agar pengeluaran pernikahan tetap terkendali.',
      priorityLevel: 'P3',
      priority: 'medium',
      source: 'setup',
      priorityTag: 'Target Budget',
      actionType: 'OPEN_BUDGET',
      target: 'budget',
      ctaLabel: 'Atur Budget',
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
      priorityLevel: 'P3',
      priority: 'medium',
      source: 'setup',
      priorityTag: 'Target Tamu',
      actionType: 'OPEN_GUESTS',
      target: 'guests',
      ctaLabel: 'Atur Tamu',
    };
  }

  // 3. Events missing
  if (events !== undefined && events.length === 0) {
    return {
      type: 'events',
      category: null,
      title: 'Catat Rangkaian Acara',
      description: 'Tambahkan jadwal acara penting seperti Akad Nikah, Pemberkatan, atau Resepsi.',
      reason: 'Rangkaian acara membantu mengelompokkan jadwal vendor dan susunan waktu persiapan.',
      priorityLevel: 'P3',
      priority: 'medium',
      source: 'setup',
      priorityTag: 'Jadwal Acara',
      actionType: 'OPEN_EVENTS',
      target: 'dashboard',
      ctaLabel: 'Tambah Acara',
    };
  }

  // ─── All Current Tasks Completed State ───
  if (tasks.length > 0 && activeTasks.length === 0) {
    return {
      type: 'timeline',
      category: null,
      title: 'Semua Tugas Saat Ini Selesai',
      description: 'Seluruh tugas di checklist aktif telah diselesaikan. Tinjau linimasa atau tambahkan tugas baru jika masih ada persiapan lanjutan.',
      reason: 'Semua tugas checklist saat ini telah diselesaikan.',
      priorityLevel: 'P4',
      priority: 'medium',
      source: 'completion',
      priorityTag: 'Checklist Selesai',
      actionType: 'OPEN_TIMELINE',
      target: 'timeline',
      ctaLabel: 'Lihat Timeline',
    };
  }

  // ─── Empty Tasks Fallback ───
  return {
    type: 'checklist',
    category: null,
    title: 'Belum Ada Tugas',
    description: 'Belum ada tugas di checklist persiapanmu. Mulai dengan membuat tugas pertama atau gunakan template persiapan.',
    reason: 'Belum ada tugas yang terdaftar di checklist.',
    priorityLevel: 'P4',
    priority: 'medium',
    source: 'setup',
    priorityTag: 'Mulai Checklist',
    actionType: 'OPEN_CHECKLIST',
    target: 'checklist',
    ctaLabel: 'Buat Tugas',
  };
}
