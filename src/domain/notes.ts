/**
 * WedFlow Note Domain Constants & Labels (Catatan v1)
 */

import { NoteCategory } from '../types/note';

export const NOTE_CATEGORY_LABELS: Record<NoteCategory, string> = {
  general: 'Umum',
  vendor: 'Vendor',
  venue: 'Venue',
  family: 'Keluarga',
  idea: 'Ide',
};

export const ALL_NOTE_CATEGORIES: NoteCategory[] = [
  'general',
  'vendor',
  'venue',
  'family',
  'idea',
];
