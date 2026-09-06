/**
 * WedFlow Wedding Context Domain Types & Pure Utilities
 *
 * Part of Phase 1: Wedding Context & Event Foundation.
 * Provides types and pure validation/normalization for religious and cultural contexts.
 *
 * Principles:
 * - No inferred religion or culture.
 * - Free-form cultural descriptions.
 * - Pure functions with zero side-effects.
 */

export type ReligiousTradition =
  | 'islam'
  | 'christian'
  | 'catholic'
  | 'hindu'
  | 'buddhist'
  | 'confucian'
  | 'belief'
  | 'other'
  | 'mixed'
  | 'unspecified';

export interface ReligiousContext {
  tradition: ReligiousTradition;
  label: string | null;
}

export interface CulturalContext {
  hasTradition: boolean | null;
  description: string | null;
}

export const RELIGIOUS_TRADITIONS: ReligiousTradition[] = [
  'islam',
  'christian',
  'catholic',
  'hindu',
  'buddhist',
  'confucian',
  'belief',
  'other',
  'mixed',
  'unspecified',
];

export const RELIGIOUS_TRADITION_LABELS: Record<ReligiousTradition, string> = {
  islam: 'Islam',
  christian: 'Kristen Protestan',
  catholic: 'Katolik',
  hindu: 'Hindu',
  buddhist: 'Buddha',
  confucian: 'Konghucu',
  belief: 'Penghayat Kepercayaan',
  other: 'Lainnya',
  mixed: 'Pernikahan Lintas Agama / Tradisi',
  unspecified: 'Belum Ditentukan',
};

/**
 * Type guard for ReligiousTradition.
 */
export function isValidReligiousTradition(val: unknown): val is ReligiousTradition {
  return typeof val === 'string' && RELIGIOUS_TRADITIONS.includes(val as ReligiousTradition);
}

/**
 * Normalizes an unknown value safely into ReligiousContext[].
 * Guarantees a safe array without inferring or fabricating defaults.
 */
export function normalizeReligiousContexts(val: unknown): ReligiousContext[] {
  if (!Array.isArray(val)) {
    return [];
  }

  const result: ReligiousContext[] = [];

  for (const item of val) {
    if (item && typeof item === 'object') {
      const tradition = isValidReligiousTradition((item as any).tradition)
        ? (item as any).tradition
        : 'unspecified';

      const rawLabel = (item as any).label;
      const label = typeof rawLabel === 'string' ? rawLabel.trim() || null : null;

      result.push({
        tradition,
        label,
      });
    }
  }

  return result;
}

/**
 * Normalizes an unknown value safely into CulturalContext.
 * Guarantees a safe empty context when absent/null without guessing culture.
 */
export function normalizeCulturalContext(val: unknown): CulturalContext {
  if (!val || typeof val !== 'object') {
    return {
      hasTradition: null,
      description: null,
    };
  }

  const raw = val as any;
  const hasTradition = typeof raw.hasTradition === 'boolean' ? raw.hasTradition : null;
  const description = typeof raw.description === 'string' ? raw.description.trim() || null : null;

  return {
    hasTradition,
    description,
  };
}

/**
 * Pure validation for a ReligiousContext item.
 */
export function validateReligiousContext(context: unknown): { isValid: boolean; error?: string } {
  if (!context || typeof context !== 'object') {
    return { isValid: false, error: 'Religious context must be an object.' };
  }

  const raw = context as any;
  if (!isValidReligiousTradition(raw.tradition)) {
    return {
      isValid: false,
      error: `Invalid religious tradition. Must be one of: ${RELIGIOUS_TRADITIONS.join(', ')}`,
    };
  }

  return { isValid: true };
}

export type ReligiousContextStatus = 'missing' | 'islam' | 'non_islam' | 'mixed_or_tradition';

/**
 * Categorizes the workspace religious context cleanly:
 * - 'missing': context has not been specified / empty array / tradition is 'unspecified'
 * - 'islam': Islamic context (KUA & SIMKAH jurisdiction)
 * - 'non_islam': Explicit non-Muslim religion (Christian, Catholic, Hindu, Buddhist, Confucian)
 * - 'mixed_or_tradition': Interfaith, Penghayat Kepercayaan, or custom tradition
 */
export function getReligiousContextStatus(religiousContexts?: ReligiousContext[] | string[] | null): ReligiousContextStatus {
  if (!religiousContexts || !Array.isArray(religiousContexts) || religiousContexts.length === 0) {
    return 'missing';
  }

  const first: any = religiousContexts[0];
  const tradition: ReligiousTradition = typeof first === 'string' ? first : first?.tradition;

  if (!tradition || tradition === 'unspecified') {
    return 'missing';
  }

  if (tradition === 'islam') {
    return 'islam';
  }

  if (tradition === 'mixed' || tradition === 'other' || tradition === 'belief') {
    return 'mixed_or_tradition';
  }

  return 'non_islam';
}
