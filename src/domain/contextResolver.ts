/**
 * WedFlow Centralized Context Resolver (Phase 2)
 *
 * Resolves religious traditions and free-form cultural contexts into a structured ContextPack.
 *
 * Principles:
 * - Centralized dictionary, no scattered `if (religion === ...)` checks.
 * - Affects only: terminology, eligibility, and contextual guidance.
 * - Does NOT provide legal/religious advice.
 * - Does NOT infer religion or culture from couple names, locations, or dates.
 * - Cultural context remains free-form.
 */

import { ReligiousTradition } from './context';
import { StoredWorkspace } from '../types/workspace';
import { StarterTaskTemplate } from './templateTypes';

export interface TraditionConfig {
  ceremonyTerminology: string;
  religiousLeaderTerm: string;
  officialInstitutionTerm: string;
  guidanceNotes: string[];
}

export const TRADITION_CONFIGS: Record<ReligiousTradition, TraditionConfig> = {
  islam: {
    ceremonyTerminology: 'Akad Nikah',
    religiousLeaderTerm: 'Penghulu / Petugas KUA',
    officialInstitutionTerm: 'KUA (Kantor Urusan Agama)',
    guidanceNotes: [
      'Pemeriksaan berkas nikah di KUA setempat',
      'Penyiapan wali nikah, saksi, dan mahar',
    ],
  },
  christian: {
    ceremonyTerminology: 'Pemberkatan Pernikahan',
    religiousLeaderTerm: 'Pendeta / Majelis Gereja',
    officialInstitutionTerm: 'Gereja & Disdukcapil',
    guidanceNotes: [
      'Penyelesaian bimbingan pranikah gereja',
      'Pencatatan sipil resmi',
    ],
  },
  catholic: {
    ceremonyTerminology: 'Pemberkatan / Perayaan Sakramen Pernikahan',
    religiousLeaderTerm: 'Pastor / Imam Paroki',
    officialInstitutionTerm: 'Sekretariat Paroki & Disdukcapil',
    guidanceNotes: [
      'Kursus Persiapan Perkawinan (KPP)',
      'Penyelidikan Kanonik di paroki',
      'Pencatatan sipil resmi',
    ],
  },
  buddhist: {
    ceremonyTerminology: 'Upacara Pemberkatan Perkawinan (Vivāhamaṅgala)',
    religiousLeaderTerm: 'Pandita / Bhikkhu Sangha',
    officialInstitutionTerm: 'Vihara / Majelis Agama Buddha & Disdukcapil',
    guidanceNotes: [
      'Pemberkatan perkawinan di vihara',
      'Pencatatan sipil resmi',
    ],
  },
  hindu: {
    ceremonyTerminology: 'Upacara Wiwaha',
    religiousLeaderTerm: 'Pemangku / Sulinggih',
    officialInstitutionTerm: 'Parisada Hindu Dharma Indonesia (PHDI) & Disdukcapil',
    guidanceNotes: [
      'Koordinasi upakara dan prosesi Wiwaha',
      'Pencatatan perkawinan di Disdukcapil',
    ],
  },
  confucian: {
    ceremonyTerminology: 'Upacara Peneguhan (Li Yuan)',
    religiousLeaderTerm: 'Rohaniwan Khonghucu',
    officialInstitutionTerm: 'MATAKIN / Klenteng & Disdukcapil',
    guidanceNotes: [
      'Peneguhan pernikahan di hadapan rohaniwan',
      'Pencatatan sipil resmi',
    ],
  },
  belief: {
    ceremonyTerminology: 'Upacara Perkawinan Penghayat Kepercayaan',
    religiousLeaderTerm: 'Pemuka Penghayat Kepercayaan',
    officialInstitutionTerm: 'Organisasi Penghayat & Disdukcapil',
    guidanceNotes: [
      'Upacara perkawinan oleh Pemuka Penghayat',
      'Pencatatan perkawinan di Disdukcapil',
    ],
  },
  mixed: {
    ceremonyTerminology: 'Rangkaian Upacara Pernikahan / Ijab Qobul / Pemberkatan',
    religiousLeaderTerm: 'Pemimpin Upacara Masing-masing / Terkait',
    officialInstitutionTerm: 'Instansi Terkait & Disdukcapil',
    guidanceNotes: [
      'Koordinasi tata cara keluarga dari kedua belah pihak',
      'Penyelarasan administrasi pencatatan resmi',
    ],
  },
  other: {
    ceremonyTerminology: 'Upacara Pernikahan',
    religiousLeaderTerm: 'Pemimpin Upacara / Tokoh Terkait',
    officialInstitutionTerm: 'Instansi Terkait & Disdukcapil',
    guidanceNotes: [
      'Penyelarasan tata upacara dan kebutuhan legalitas dokumen',
    ],
  },
  unspecified: {
    ceremonyTerminology: 'Upacara Pernikahan / Ijab Qobul / Pemberkatan',
    religiousLeaderTerm: 'Pemimpin Upacara / Pihak Berwenang',
    officialInstitutionTerm: 'Instansi Terkait',
    guidanceNotes: [
      'Konsultasikan kebutuhan administrasi dan tata upacara dengan keluarga',
    ],
  },
};

export interface ContextPack {
  traditions: ReligiousTradition[];
  ceremonyTerminology: string;
  religiousLeaderTerm: string;
  officialInstitutionTerm: string;
  guidanceNotes: string[];
  hasCulturalTradition: boolean | null;
  culturalDescription: string | null;
}

/**
 * Resolves workspace context safely into a unified ContextPack.
 */
export function resolveWeddingContext(workspace: StoredWorkspace): ContextPack {
  const religiousContexts = Array.isArray(workspace.religiousContexts)
    ? workspace.religiousContexts
    : [];

  const traditions: ReligiousTradition[] = religiousContexts.length > 0
    ? religiousContexts.map((c) => c.tradition)
    : ['unspecified'];

  let ceremonyTerminology: string;
  let religiousLeaderTerm: string;
  let officialInstitutionTerm: string;
  const guidanceNotes: string[] = [];

  if (traditions.length === 1) {
    const single = traditions[0];
    const cfg = TRADITION_CONFIGS[single] || TRADITION_CONFIGS.unspecified;
    ceremonyTerminology = cfg.ceremonyTerminology;
    religiousLeaderTerm = cfg.religiousLeaderTerm;
    officialInstitutionTerm = cfg.officialInstitutionTerm;
    guidanceNotes.push(...cfg.guidanceNotes);
  } else if (traditions.includes('mixed')) {
    const cfg = TRADITION_CONFIGS.mixed;
    ceremonyTerminology = cfg.ceremonyTerminology;
    religiousLeaderTerm = cfg.religiousLeaderTerm;
    officialInstitutionTerm = cfg.officialInstitutionTerm;
    guidanceNotes.push(...cfg.guidanceNotes);
  } else {
    // Multi-tradition / interfaith
    ceremonyTerminology = 'Rangkaian Upacara Pernikahan / Akad & Pemberkatan';
    religiousLeaderTerm = 'Pemimpin Upacara / Rohaniwan Terkait';
    officialInstitutionTerm = 'Instansi Terkait & Disdukcapil';
    traditions.forEach((t) => {
      const cfg = TRADITION_CONFIGS[t];
      if (cfg) {
        guidanceNotes.push(...cfg.guidanceNotes);
      }
    });
  }

  const culturalContext = workspace.culturalContext || {
    hasTradition: null,
    description: null,
  };

  return {
    traditions,
    ceremonyTerminology,
    religiousLeaderTerm,
    officialInstitutionTerm,
    guidanceNotes: Array.from(new Set(guidanceNotes)),
    hasCulturalTradition: culturalContext.hasTradition ?? null,
    culturalDescription: culturalContext.description ?? null,
  };
}

/**
 * Pure function adapting task titles and descriptions contextually based on the resolved ContextPack.
 * Does not make legal or theological claims.
 */
export function customizeTemplateWithContext(
  template: StarterTaskTemplate,
  context: ContextPack
): { title: string; description: string } {
  let title = template.title;
  let description = template.description;

  // Adapt religious ceremony leader term if template mentions it
  if (template.id === 'prosesi-6-confirm-religious') {
    title = `Konfirmasi detail prosesi dengan ${context.religiousLeaderTerm.toLowerCase()}`;
    description = `Diskusikan susunan tata cara untuk ${context.ceremonyTerminology.toLowerCase()}, durasi, dan perlengkapan khusus.`;
  } else if (template.id === 'prosesi-5-confirm-procedure') {
    title = `Konfirmasi prosedur dengan ${context.officialInstitutionTerm}`;
    description = `Pastikan jadwal pemeriksaan berkas dan kehadiran petugas resmi pada hari acara.`;
  } else if (template.id === 'prosesi-1-plan') {
    if (context.hasCulturalTradition && context.culturalDescription) {
      description = `Sepakati urutan acara ${context.ceremonyTerminology.toLowerCase()} serta rangkaian ${context.culturalDescription}.`;
    } else {
      description = `Sepakati urutan acara ${context.ceremonyTerminology.toLowerCase()} dan prosesi yang akan dijalankan.`;
    }
  }

  return { title, description };
}
