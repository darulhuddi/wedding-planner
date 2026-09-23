/**
 * WedSiap Moodboard Domain Types (V1.2 - Cloudflare R2 Storage Provider Architecture)
 */

export type StorageProvider = 'r2' | 'supabase' | 'external_url';

export type MoodboardCategory =
  | 'all'
  | 'decoration'
  | 'venue'
  | 'dress'
  | 'suit'
  | 'makeup'
  | 'bouquet'
  | 'photography'
  | 'invitation'
  | 'table_setting'
  | 'prewedding'
  | 'other';

export interface MoodboardCategoryMeta {
  id: MoodboardCategory;
  label: string;
}

export const MOODBOARD_CATEGORIES: MoodboardCategoryMeta[] = [
  { id: 'all', label: 'Semua' },
  { id: 'decoration', label: 'Dekorasi' },
  { id: 'venue', label: 'Venue' },
  { id: 'dress', label: 'Dress' },
  { id: 'suit', label: 'Suit' },
  { id: 'makeup', label: 'Makeup' },
  { id: 'bouquet', label: 'Bouquet' },
  { id: 'photography', label: 'Photography' },
  { id: 'invitation', label: 'Invitation' },
  { id: 'table_setting', label: 'Table Setting' },
  { id: 'prewedding', label: 'Prewedding' },
  { id: 'other', label: 'Other' },
];

export interface Moodboard {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoodboardItem {
  id: string;
  moodboardId: string;
  workspaceId: string;
  imageUrl: string;
  storageProvider: StorageProvider;
  storageKey: string | null;
  storageFileId: string | null;
  storageFileName: string | null;
  storageMimeType: string | null;
  storageSize: number | null;
  title: string | null;
  note: string | null;
  category: Exclude<MoodboardCategory, 'all'>;
  tags: string[];
  sourceUrl: string | null;
  isFavorite: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMoodboardItemInput {
  imageUrl?: string;
  storageProvider?: StorageProvider;
  storageKey?: string | null;
  storageFileId?: string | null;
  storageFileName?: string | null;
  storageMimeType?: string | null;
  storageSize?: number | null;
  title?: string | null;
  note?: string | null;
  category: Exclude<MoodboardCategory, 'all'>;
  tags?: string[] | string;
  sourceUrl?: string | null;
  isFavorite?: boolean;
}

export interface UpdateMoodboardItemInput {
  imageUrl?: string;
  storageProvider?: StorageProvider;
  storageKey?: string | null;
  storageFileId?: string | null;
  storageFileName?: string | null;
  storageMimeType?: string | null;
  storageSize?: number | null;
  title?: string | null;
  note?: string | null;
  category?: Exclude<MoodboardCategory, 'all'>;
  tags?: string[] | string;
  sourceUrl?: string | null;
  isFavorite?: boolean;
  sortOrder?: number;
}

export type MoodboardSortOption = 'newest' | 'oldest';

