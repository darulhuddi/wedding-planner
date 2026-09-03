/**
 * WedFlow Canonical Category Definitions
 *
 * Single source of truth for all category IDs and display labels.
 * All modules must import from here — do not define category labels elsewhere.
 */

import { TaskCategoryId } from '../types/checklist';
import { CategoryId } from '../types/onboarding';

/**
 * Ordered list of the 6 vendor preparation categories.
 * Used by NBA engine, PreparationCategories component, and onboarding.
 */
export const CATEGORY_ORDER: CategoryId[] = [
  'venue',
  'catering',
  'photography',
  'decoration',
  'makeup_attire',
  'invitation',
];

/**
 * All task category IDs (vendor categories + 'general' + 'prosesi_administrasi').
 */
export const ALL_TASK_CATEGORY_IDS: TaskCategoryId[] = [
  'general',
  'venue',
  'catering',
  'photography',
  'decoration',
  'makeup_attire',
  'invitation',
  'prosesi_administrasi',
];

/**
 * Display labels for all task categories.
 * Used by Checklist, TaskRow, UpcomingTasks, and any component displaying category names.
 */
export const CATEGORY_LABELS: Record<TaskCategoryId, string> = {
  general: 'Umum',
  venue: 'Venue & Gedung',
  catering: 'Catering',
  photography: 'Foto & Video',
  decoration: 'Dekorasi',
  makeup_attire: 'MUA & Busana',
  invitation: 'Undangan',
  prosesi_administrasi: 'Administrasi',
};

/**
 * Presentation-layer helper mapping internal category IDs to human-readable labels.
 * Guarantees raw identifiers like 'proses_i_administrasi' or 'prosesi_administrasi'
 * are never shown to the user.
 */
export function getCategoryDisplayName(cat: string): string {
  if (cat === 'prosesi_administrasi' || cat === 'proses_i_administrasi') return 'Administrasi';
  if (cat === 'photography' || cat === 'foto_video') return 'Foto & Video';
  if (cat === 'makeup_attire' || cat === 'mua_busana') return 'MUA & Busana';
  if (cat === 'venue') return 'Venue & Gedung';
  if (cat === 'catering') return 'Catering';
  if (cat === 'decoration') return 'Dekorasi';
  if (cat === 'invitation') return 'Undangan';
  if (cat === 'general') return 'Umum';
  return (CATEGORY_LABELS as any)[cat] || cat;
}

/**
 * Taxonomy map for vendor categories.
 * Used by NBA engine and PreparationCategories component.
 */
export const CATEGORY_TAXONOMY: Record<CategoryId, { id: CategoryId; label: string }> = {
  venue: { id: 'venue', label: 'Venue & Gedung' },
  catering: { id: 'catering', label: 'Catering' },
  photography: { id: 'photography', label: 'Foto & Video' },
  decoration: { id: 'decoration', label: 'Dekorasi' },
  makeup_attire: { id: 'makeup_attire', label: 'MUA & Busana' },
  invitation: { id: 'invitation', label: 'Undangan' },
};
