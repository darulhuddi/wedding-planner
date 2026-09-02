/**
 * WedFlow Note Domain Types (Catatan v1)
 */

export type NoteCategory =
  | 'general'
  | 'vendor'
  | 'venue'
  | 'family'
  | 'idea';

export interface Note {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}
