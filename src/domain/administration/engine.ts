/**
 * WedFlow Marriage Administration Pure Engine (V1)
 *
 * Deterministic domain logic for:
 * - Age derivation & legal category determination
 * - Working days & deadline engine (H-10 business days legal limit, H-35 planning target)
 * - PNBP fee assessment (Rp0 vs Rp600.000)
 * - Administrative Risk Assessment (Low, Medium, High, Critical)
 * - Deterministic Next Best Action Decision Tree
 * - Task generation based on profile & events
 *
 * Zero database, zero side-effects, 100% testable pure functions.
 */

import {
  AgeLegalCategory,
  AdministrativeRiskAssessment,
  AdministrativeRiskLevel,
  PnbpAssessmentStatus,
  StoredAdministrationContext,
} from './types';
import { ADMINISTRATIVE_TEMPLATES, AdministrativeTaskTemplate } from './templates';
import { TaskItem, TaskPriority } from '../../types/checklist';
import { WeddingEvent } from '../events';
import { NextBestAction } from '../../types/onboarding';
import { generateTaskId } from '../../utils/checklistUtils';

/**
 * Normalizes a YYYY-MM-DD string into parts safely.
 */
function parseYMD(ymd: string): { year: number; month: number; day: number } | null {
  if (!ymd || typeof ymd !== 'string') return null;
  const parts = ymd.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return null;
  }
  return { year: parts[0], month: parts[1], day: parts[2] };
}

/**
 * Formats a Date object into YYYY-MM-DD in local time.
 */
function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calculates exact age at target date (off-by-one and leap-year safe).
 */
export function calculateAgeAtDate(birthDateYMD: string | null, targetDateYMD: string): number | null {
  if (!birthDateYMD || !targetDateYMD) return null;
  const birth = parseYMD(birthDateYMD);
  const target = parseYMD(targetDateYMD);
  if (!birth || !target) return null;

  let age = target.year - birth.year;
  if (target.month < birth.month || (target.month === birth.month && target.day < birth.day)) {
    age--;
  }
  return age;
}

/**
 * Returns legal age category based on statutory marriage law.
 * - under_19: Requires Religious Court dispensation (UU 16/2019)
 * - between_19_and_21: Requires parental consent (UU 1/1974)
 * - adult_21_plus: Independent adult
 */
export function getAgeLegalCategory(age: number | null): AgeLegalCategory {
  if (age === null) return 'adult_21_plus';
  if (age < 19) return 'under_19';
  if (age < 21) return 'between_19_and_21';
  return 'adult_21_plus';
}

/**
 * Calculates calendar date N days before a target date.
 */
export function calculateDaysBefore(dateYMD: string, calendarDays: number): string | null {
  const parsed = parseYMD(dateYMD);
  if (!parsed) return null;
  const d = new Date(parsed.year, parsed.month - 1, parsed.day);
  d.setDate(d.getDate() - calendarDays);
  return toYMD(d);
}

/**
 * Checks if a Date is a weekend (Saturday=6, Sunday=0).
 */
export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * Calculates date N working days (Monday-Friday) before a target date.
 * Excludes weekends (Saturday & Sunday).
 */
export function calculateBusinessDaysBefore(dateYMD: string, workingDays: number): string | null {
  const parsed = parseYMD(dateYMD);
  if (!parsed) return null;
  const d = new Date(parsed.year, parsed.month - 1, parsed.day);

  let count = 0;
  while (count < workingDays) {
    d.setDate(d.getDate() - 1);
    if (!isWeekend(d)) {
      count++;
    }
  }
  return toYMD(d);
}

/**
 * Calculates remaining working days between today and target date.
 */
export function calculateRemainingWorkingDays(fromYMD: string, targetYMD: string): number {
  const from = parseYMD(fromYMD);
  const target = parseYMD(targetYMD);
  if (!from || !target) return 0;

  const current = new Date(from.year, from.month - 1, from.day);
  const end = new Date(target.year, target.month - 1, target.day);

  if (current >= end) return 0;

  let workingDays = 0;
  // Iterate days from current + 1 up to end
  const iter = new Date(current);
  while (iter < end) {
    iter.setDate(iter.getDate() + 1);
    if (!isWeekend(iter)) {
      workingDays++;
    }
  }
  return workingDays;
}

/**
 * Assesses PNBP fee status based on ceremony event date, time, and location.
 */
export function assessPnbpStatus(ceremonyEvent?: WeddingEvent | null): {
  status: PnbpAssessmentStatus;
  amount: number;
} {
  if (!ceremonyEvent) {
    return { status: 'STANDARD_OUTSIDE_OR_WEEKEND', amount: 600000 };
  }

  const loc = (ceremonyEvent.location || '').toLowerCase();
  const name = (ceremonyEvent.name || '').toLowerCase();
  const isAtKuaOffice = loc.includes('kua') || loc.includes('kantor urusan agama') || name.includes('balai nikah');

  if (!isAtKuaOffice) {
    return { status: 'STANDARD_OUTSIDE_OR_WEEKEND', amount: 600000 };
  }

  // If at KUA, check if on a weekend
  if (ceremonyEvent.date) {
    const parsed = parseYMD(ceremonyEvent.date);
    if (parsed) {
      const d = new Date(parsed.year, parsed.month - 1, parsed.day);
      if (isWeekend(d)) {
        return { status: 'STANDARD_OUTSIDE_OR_WEEKEND', amount: 600000 };
      }
    }
  }

  // Check office hours (07:30 - 16:00)
  if (ceremonyEvent.startTime) {
    const [h, m] = ceremonyEvent.startTime.split(':').map(Number);
    if (!isNaN(h)) {
      const totalMinutes = h * 60 + (m || 0);
      // 07:30 = 450, 16:00 = 960
      if (totalMinutes < 450 || totalMinutes > 960) {
        return { status: 'STANDARD_OUTSIDE_OR_WEEKEND', amount: 600000 };
      }
    }
  }

  return { status: 'ZERO_AT_KUA_OFFICE_HOURS', amount: 0 };
}

/**
 * Evaluates administrative risk deterministically.
 */
export function calculateAdministrativeRisk(
  tasks: TaskItem[],
  context: StoredAdministrationContext | null | undefined,
  ceremonyDate: string,
  today: string
): AdministrativeRiskAssessment {
  const reasons: string[] = [];

  const admTasks = (tasks || []).filter((t) => t.category === 'prosesi_administrasi');
  const getTaskStatus = (templateId: string) => {
    const found = admTasks.find((t) => t.templateId === templateId);
    return found ? found.status : 'todo';
  };

  const isRegistrationDone = getTaskStatus('adm-daftar-kua') === 'completed';
  const remainingWorkingDays = calculateRemainingWorkingDays(today, ceremonyDate);

  // 1. Check Special Condition Blockers
  const hasDispensationGroom = admTasks.some((t) => t.templateId === 'adm-spec-dispensasi-groom' && t.status !== 'completed');
  const hasDispensationBride = admTasks.some((t) => t.templateId === 'adm-spec-dispensasi-bride' && t.status !== 'completed');
  const hasMilitaryGroom = admTasks.some((t) => t.templateId === 'adm-spec-tni-polri-groom' && t.status !== 'completed');
  const hasMilitaryBride = admTasks.some((t) => t.templateId === 'adm-spec-tni-polri-bride' && t.status !== 'completed');
  const hasPolygamy = admTasks.some((t) => t.templateId === 'adm-spec-poligami' && t.status !== 'completed');

  const hasUnresolvedCourtOrMilitary = hasDispensationGroom || hasDispensationBride || hasMilitaryGroom || hasMilitaryBride || hasPolygamy;

  // 2. CRITICAL RISK
  if (!isRegistrationDone && remainingWorkingDays <= 10) {
    reasons.push(`Sisa waktu pendaftaran tinggal ${remainingWorkingDays} hari kerja (melewati batas normal 10 hari kerja PMA 30/2024).`);
    return {
      level: 'CRITICAL',
      label: 'Kritis (Mendekati Batas KUA)',
      reasons,
    };
  }

  if (hasUnresolvedCourtOrMilitary && remainingWorkingDays <= 20) {
    reasons.push('Proses izin pengadilan / kedinasan belum selesai padahal waktu pendaftaran KUA semakin dekat.');
    return {
      level: 'CRITICAL',
      label: 'Kritis (Syarat Khusus Belum Selesai)',
      reasons,
    };
  }

  // 3. HIGH RISK
  if (!isRegistrationDone && remainingWorkingDays <= 15) {
    reasons.push(`Sisa waktu ${remainingWorkingDays} hari kerja. Mendekati batas minimum pendaftaran KUA.`);
    return {
      level: 'HIGH',
      label: 'Perlu Perhatian Segera',
      reasons,
    };
  }

  const pnbpTask = admTasks.find((t) => t.templateId === 'adm-daftar-bayar-pnbp');
  if (isRegistrationDone && pnbpTask && pnbpTask.status !== 'completed' && remainingWorkingDays <= 5) {
    reasons.push('Pendaftaran KUA sudah masuk tetapi tagihan PNBP Rp600.000 belum dibayar.');
    return {
      level: 'HIGH',
      label: 'Tagihan Billing Menunggu',
      reasons,
    };
  }

  // 4. MEDIUM RISK
  const n1Status = getTaskStatus('adm-urus-n1');
  if (!isRegistrationDone && n1Status !== 'completed' && remainingWorkingDays <= 25) {
    reasons.push('Surat Pengantar N1 dari Kelurahan belum selesai diurus.');
    return {
      level: 'MEDIUM',
      label: 'Persiapan Berkas Berjalan',
      reasons,
    };
  }

  // 5. LOW RISK
  if (isRegistrationDone) {
    reasons.push('Pendaftaran kehendak nikah di KUA sudah berhasil diselesaikan.');
  } else {
    reasons.push(`Waktu pendaftaran masih aman (${remainingWorkingDays} hari kerja tersisa).`);
  }

  return {
    level: 'LOW',
    label: 'Terkendali',
    reasons,
  };
}

/**
 * Deterministic Next Best Action selector for Marriage Administration.
 */
export function getAdministrativeNextBestAction(
  tasks: TaskItem[],
  context: StoredAdministrationContext | null | undefined,
  ceremonyDate: string,
  today: string
): NextBestAction | null {
  const admTasks = (tasks || []).filter((t) => t.category === 'prosesi_administrasi');

  // Check if profile setup is completed
  if (!context || !context.isSetupCompleted) {
    return {
      type: 'task',
      category: null,
      title: 'Lengkapi Profil Administrasi Pernikahan',
      description: 'Isi beberapa informasi ringkas untuk membuat panduan berkas KUA yang akurat.',
      reason: 'WedSiap membutuhkan data domisili dan status pernikahan untuk menyusun daftar dokumen yang sesuai.',
      priority: 'high',
      source: 'urgency',
      priorityTag: 'Setup Awal',
    };
  }

  const remainingWorkingDays = calculateRemainingWorkingDays(today, ceremonyDate);
  const getTask = (templateId: string) => admTasks.find((t) => t.templateId === templateId);

  const regTask = getTask('adm-daftar-kua');
  const isRegistrationDone = regTask && regTask.status === 'completed';

  // 1. Critical Urgency (< 10 business days and not registered)
  if (!isRegistrationDone && remainingWorkingDays <= 10 && regTask) {
    return {
      type: 'task',
      category: null,
      taskId: regTask.id,
      title: 'Daftarkan Kehendak Nikah di KUA Hari Ini',
      description: 'Bawa berkas langsung ke KUA tempat akad dan siapkan Surat Dispensasi Camat / Surat Pernyataan.',
      reason: `Waktu tersisa hanya ${remainingWorkingDays} hari kerja. Segera koordinasi dengan KUA agar pernikahan tetap dapat dicatat.`,
      priority: 'high',
      source: 'overdue',
      priorityTag: 'Batas Kritis',
    };
  }

  // 2. Billing payment pending
  const pnbpTask = getTask('adm-daftar-bayar-pnbp');
  if (isRegistrationDone && pnbpTask && pnbpTask.status !== 'completed') {
    return {
      type: 'task',
      category: null,
      taskId: pnbpTask.id,
      title: 'Bayar Tagihan PNBP Nikah Rp600.000 via SIMKAH',
      description: 'Lakukan pembayaran kode billing SIMKAH melalui Bank, ATM, atau M-Banking.',
      reason: 'Pembayaran biaya resmi PNBP diperlukan untuk mengunci jadwal kehadiran penghulu.',
      priority: 'high',
      source: 'priority',
      priorityTag: 'Pembayaran Resmi',
    };
  }

  // 3. Special court/military permit prerequisites
  const specialBlockers = admTasks.filter(
    (t) =>
      t.status !== 'completed' &&
      [
        'adm-spec-dispensasi-groom',
        'adm-spec-dispensasi-bride',
        'adm-spec-poligami',
        'adm-spec-tni-polri-groom',
        'adm-spec-tni-polri-bride',
      ].includes(t.templateId || '')
  );

  if (specialBlockers.length > 0) {
    const blocker = specialBlockers[0];
    return {
      type: 'task',
      category: null,
      taskId: blocker.id,
      title: blocker.title,
      description: blocker.description || 'Lengkapi dokumen persyaratan hukum ini terlebih dahulu.',
      reason: 'Dokumen penetapan/izin resmi ini wajib ada sebelum pendaftaran KUA dapat diproses.',
      priority: 'high',
      source: 'priority',
      priorityTag: 'Syarat Khusus',
    };
  }

  // 4. Recommendation letter from origin KUA (Numpang Nikah)
  const recoGroom = getTask('adm-urus-rekomendasi-groom');
  if (recoGroom && recoGroom.status !== 'completed') {
    const n1Task = getTask('adm-urus-n1');
    if (n1Task && n1Task.status === 'completed') {
      return {
        type: 'task',
        category: null,
        taskId: recoGroom.id,
        title: 'Bawa Surat N1 ke KUA Asal untuk Surat Rekomendasi',
        description: 'Minta Surat Rekomendasi Nikah (Numpang Nikah) di KUA kecamatan domisili calon suami.',
        reason: 'Surat rekomendasi dari KUA asal wajib dilampirkan ke KUA tempat pelaksanaan akad nikah.',
        priority: 'high',
        source: 'sequence',
        priorityTag: 'Numpang Nikah',
      };
    }
  }

  const recoBride = getTask('adm-urus-rekomendasi-bride');
  if (recoBride && recoBride.status !== 'completed') {
    const n1Task = getTask('adm-urus-n1');
    if (n1Task && n1Task.status === 'completed') {
      return {
        type: 'task',
        category: null,
        taskId: recoBride.id,
        title: 'Bawa Surat N1 ke KUA Asal untuk Surat Rekomendasi',
        description: 'Minta Surat Rekomendasi Nikah (Numpang Nikah) di KUA kecamatan domisili calon istri.',
        reason: 'Surat rekomendasi dari KUA asal wajib dilampirkan ke KUA tempat pelaksanaan akad nikah.',
        priority: 'high',
        source: 'sequence',
        priorityTag: 'Numpang Nikah',
      };
    }
  }

  // 5. Kelurahan N1 Letter
  const n1 = getTask('adm-urus-n1');
  if (n1 && n1.status !== 'completed') {
    return {
      type: 'task',
      category: null,
      taskId: n1.id,
      title: 'Urus Surat Pengantar Nikah (Model N1) di Kelurahan',
      description: 'Bawa fotokopi KTP, KK, dan pengantar RT/RW ke kantor Kelurahan/Desa domisili.',
      reason: 'Surat N1 dari kelurahan adalah berkas pengantar utama untuk mendaftar ke KUA.',
      priority: 'high',
      source: 'sequence',
      priorityTag: 'Kelurahan/Desa',
    };
  }

  // 6. Ready to Register at KUA
  if (!isRegistrationDone && regTask) {
    return {
      type: 'task',
      category: null,
      taskId: regTask.id,
      title: 'Daftarkan Kehendak Nikah di KUA / SIMKAH Online',
      description: 'Berkas pengantar sudah siap. Daftarkan jadwal akad melalui SIMKAH atau langsung di KUA tempat akad.',
      reason: 'Mendaftar lebih awal memastikan kamu mendapatkan jadwal dan kuota penghulu yang diinginkan.',
      priority: 'high',
      source: 'deadline',
      priorityTag: 'Pendaftaran KUA',
    };
  }

  // 7. Examination / Rapak
  const rapak = getTask('adm-periksa-rapak');
  if (rapak && rapak.status !== 'completed') {
    return {
      type: 'task',
      category: null,
      taskId: rapak.id,
      title: 'Konfirmasi Jadwal Pemeriksaan Berkas (Rapak) di KUA',
      description: 'Hadir ke KUA bersama pasangan dan wali nikah membawa seluruh dokumen asli.',
      reason: 'Pemeriksaan nikah diperlukan untuk verifikasi keabsahan data sebelum buku nikah diterbitkan.',
      priority: 'medium',
      source: 'sequence',
      priorityTag: 'Pemeriksaan KUA',
    };
  }

  // 8. Bimwin
  const bimwin = getTask('adm-periksa-bimwin');
  if (bimwin && bimwin.status !== 'completed') {
    return {
      type: 'task',
      category: null,
      taskId: bimwin.id,
      title: 'Ikuti Bimbingan Perkawinan (Bimwin) Calon Pengantin',
      description: 'Tanyakan jadwal dan modul Bimwin kepada petugas KUA saat verifikasi berkas.',
      reason: 'Bimbingan perkawinan memberikan pembekalan penting untuk kesiapan membangun rumah tangga.',
      priority: 'medium',
      source: 'completion',
      priorityTag: 'Pembekalan Catin',
    };
  }

  // 9. Early Health Screening / Prep
  const health = getTask('adm-urus-kesehatan');
  if (health && health.status !== 'completed') {
    return {
      type: 'task',
      category: null,
      taskId: health.id,
      title: 'Lakukan Skrining Kesehatan Catin di Puskesmas',
      description: 'Jadwalkan pemeriksaan kesehatan pranikah di Puskesmas terdekat (ideal 1–3 bulan sebelum akad).',
      reason: 'Pemeriksaan kesehatan sejak dini memastikan kamu memiliki waktu cukup untuk imunisasi & sertifikat sehat.',
      priority: 'medium',
      source: 'urgency',
      priorityTag: 'Kesehatan Catin',
    };
  }

  return null;
}

/**
 * Generates initial personalized TaskItem[] for marriage administration.
 */
export function generateAdministrativeTasks(
  context: StoredAdministrationContext | null | undefined,
  weddingDate: string,
  ceremonyEvent?: WeddingEvent | null,
  existingTasks: TaskItem[] = []
): TaskItem[] {
  const now = new Date().toISOString();
  const today = toYMD(new Date());

  const daysUntilWedding = weddingDate
    ? Math.round((new Date(weddingDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
    : 120;

  const pnbp = assessPnbpStatus(ceremonyEvent);

  // Determine applicable templates
  const applicableTemplateIds: string[] = [
    'adm-doc-ktp',
    'adm-doc-kk',
    'adm-doc-akta',
    'adm-doc-foto',
    'adm-doc-wali-saksi',
    'adm-urus-kesehatan',
    'adm-urus-rt-rw',
    'adm-urus-n1',
    'adm-daftar-kua',
    'adm-periksa-rapak',
    'adm-periksa-bimwin',
  ];

  // PNBP Payment or Zero Rate
  if (pnbp.amount > 0) {
    applicableTemplateIds.push('adm-daftar-bayar-pnbp');
  } else {
    applicableTemplateIds.push('adm-daftar-tarif-nol');
  }

  if (context) {
    const groomAge = calculateAgeAtDate(context.groom.birthDate, weddingDate);
    const brideAge = calculateAgeAtDate(context.bride.birthDate, weddingDate);

    // Jurisdiction (Rekomendasi Numpang Nikah)
    if (!context.groom.isSameKuaDistrictAsCeremony) {
      applicableTemplateIds.push('adm-urus-rekomendasi-groom');
    }
    if (!context.bride.isSameKuaDistrictAsCeremony) {
      applicableTemplateIds.push('adm-urus-rekomendasi-bride');
    }

    // Age rules
    if (groomAge !== null && groomAge < 19) {
      applicableTemplateIds.push('adm-spec-dispensasi-groom');
    } else if (groomAge !== null && groomAge < 21) {
      applicableTemplateIds.push('adm-spec-izin-ortu-groom');
    }

    if (brideAge !== null && brideAge < 19) {
      applicableTemplateIds.push('adm-spec-dispensasi-bride');
    } else if (brideAge !== null && brideAge < 21) {
      applicableTemplateIds.push('adm-spec-izin-ortu-bride');
    }

    // Marital status
    if (context.groom.maritalStatus === 'divorced_alive') {
      applicableTemplateIds.push('adm-spec-cerai-hidup-groom');
    } else if (context.groom.maritalStatus === 'widowed') {
      applicableTemplateIds.push('adm-spec-cerai-mati-groom');
    } else if (context.groom.maritalStatus === 'polygamy_married') {
      applicableTemplateIds.push('adm-spec-poligami');
    }

    if (context.bride.maritalStatus === 'divorced_alive') {
      applicableTemplateIds.push('adm-spec-cerai-hidup-bride');
    } else if (context.bride.maritalStatus === 'widowed') {
      applicableTemplateIds.push('adm-spec-cerai-mati-bride');
    }

    // Military service
    if (context.groom.serviceStatus === 'tni_polri') {
      applicableTemplateIds.push('adm-spec-tni-polri-groom');
    }
    if (context.bride.serviceStatus === 'tni_polri') {
      applicableTemplateIds.push('adm-spec-tni-polri-bride');
    }

    // Foreigner (WNA)
    if (context.groom.citizenship === 'wna') {
      applicableTemplateIds.push('adm-spec-wna-groom');
    }
    if (context.bride.citizenship === 'wna') {
      applicableTemplateIds.push('adm-spec-wna-bride');
    }

    // Wali Hakim
    if (context.hasSpecialWaliCase) {
      applicableTemplateIds.push('adm-spec-wali-hakim');
    }
  }

  // Generate TaskItem[] preserving any existing task status
  const existingMap = new Map<string, TaskItem>();
  existingTasks.forEach((t) => {
    if (t.templateId) existingMap.set(t.templateId, t);
  });

  return applicableTemplateIds.map((templateId) => {
    // Only adm-daftar-kua has a strict legal deadline (H-10 working days, PMA No. 30/2024).
    // All other preparation/document tasks have null dueDate to prevent false overdue alarms in Checklist.
    const legalDueDate = (weddingDate && templateId === 'adm-daftar-kua')
      ? calculateBusinessDaysBefore(weddingDate, 10)
      : null;

    const existing = existingMap.get(templateId);
    if (existing) {
      // Reconcile dueDate to clear legacy artificial planning deadlines (H-45/H-60) while preserving user status and id
      return {
        ...existing,
        dueDate: legalDueDate,
      };
    }

    const tpl: AdministrativeTaskTemplate | undefined = ADMINISTRATIVE_TEMPLATES[templateId];
    const title = tpl ? tpl.title : templateId;
    const description = tpl ? tpl.description : null;
    const priority = tpl ? tpl.priority : 'medium';
    const estimatedMinutes = tpl ? tpl.estimatedMinutes : 60;

    return {
      id: generateTaskId(),
      title,
      description,
      category: 'prosesi_administrasi',
      status: 'todo',
      priority,
      dueDate: legalDueDate,
      estimatedMinutes,
      source: 'template',
      templateId,
      eventIds: ceremonyEvent ? [ceremonyEvent.id] : [],
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
  });
}
