/**
 * WedSiap Supabase Moodboard Adapter (V1.1 - Storage Provider Architecture)
 *
 * Direct interface to public.moodboards, public.moodboard_items, and Supabase Storage bucket 'moodboard'.
 * Supports Google Drive references, Supabase Storage objects, and external URLs.
 */

import { supabase } from '../lib/supabaseClient';
import { Moodboard, MoodboardItem, MoodboardCategory, StorageProvider } from '../domain/moodboard/types';

export interface SupabaseMoodboardRow {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseMoodboardItemRow {
  id: string;
  moodboard_id: string;
  workspace_id: string;
  image_url: string;
  storage_provider?: string;
  storage_file_id?: string | null;
  storage_file_name?: string | null;
  storage_mime_type?: string | null;
  storage_size?: number | null;
  title: string | null;
  note: string | null;
  category: string;
  tags: string[];
  source_url: string | null;
  is_favorite: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function mapRowToMoodboard(row: SupabaseMoodboardRow): Moodboard {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRowToMoodboardItem(row: SupabaseMoodboardItemRow): MoodboardItem {
  return {
    id: row.id,
    moodboardId: row.moodboard_id,
    workspaceId: row.workspace_id,
    imageUrl: row.image_url,
    storageProvider: (row.storage_provider || 'external_url') as StorageProvider,
    storageFileId: row.storage_file_id ?? null,
    storageFileName: row.storage_file_name ?? null,
    storageMimeType: row.storage_mime_type ?? null,
    storageSize: row.storage_size != null ? Number(row.storage_size) : null,
    title: row.title,
    note: row.note,
    category: (row.category || 'other') as Exclude<MoodboardCategory, 'all'>,
    tags: Array.isArray(row.tags) ? row.tags : [],
    sourceUrl: row.source_url,
    isFavorite: Boolean(row.is_favorite),
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetches the single moodboard for a workspace.
 */
export async function fetchMoodboardByWorkspaceId(workspaceId: string): Promise<Moodboard | null> {
  if (!workspaceId) return null;

  const { data, error } = await supabase
    .from('moodboards')
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) {
    console.error('[WedSiap] Failed to fetch moodboard from Supabase:', error);
    throw new Error(error.message || 'Gagal mengambil moodboard dari database.');
  }

  return data ? mapRowToMoodboard(data) : null;
}

/**
 * Inserts a new default moodboard for a workspace.
 */
export async function insertMoodboard(workspaceId: string, name: string = 'Wedding Moodboard'): Promise<Moodboard> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk membuat moodboard.');
  }

  const { data, error } = await supabase
    .from('moodboards')
    .insert({
      workspace_id: workspaceId,
      name,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[WedSiap] Failed to insert default moodboard into Supabase:', error);
    throw new Error(error.message || 'Gagal membuat default moodboard di database.');
  }

  return mapRowToMoodboard(data);
}

/**
 * Fetches a single moodboard item by workspace and item ID.
 */
export async function fetchMoodboardItemById(workspaceId: string, itemId: string): Promise<MoodboardItem | null> {
  if (!workspaceId || !itemId) return null;

  const { data, error } = await supabase
    .from('moodboard_items')
    .select('*')
    .eq('id', itemId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) {
    console.error('[WedSiap] Failed to fetch item by id from Supabase:', error);
    return null;
  }

  return data ? mapRowToMoodboardItem(data) : null;
}

/**
 * Fetches all items for a moodboard, ordered by created_at.
 */
export async function fetchMoodboardItems(workspaceId: string, moodboardId: string): Promise<MoodboardItem[]> {
  if (!workspaceId || !moodboardId) return [];

  const { data, error } = await supabase
    .from('moodboard_items')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('moodboard_id', moodboardId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[WedSiap] Failed to fetch moodboard items from Supabase:', error);
    throw new Error(error.message || 'Gagal mengambil item inspirasi dari database.');
  }

  return (data || []).map(mapRowToMoodboardItem);
}

/**
 * Inserts a single moodboard item into Supabase.
 */
export async function insertMoodboardItem(
  workspaceId: string,
  item: Omit<MoodboardItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<MoodboardItem> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk menambahkan inspirasi.');
  }

  const payload = {
    moodboard_id: item.moodboardId,
    workspace_id: workspaceId,
    image_url: item.imageUrl,
    storage_provider: item.storageProvider || 'external_url',
    storage_file_id: item.storageFileId || null,
    storage_file_name: item.storageFileName || null,
    storage_mime_type: item.storageMimeType || null,
    storage_size: item.storageSize || null,
    title: item.title,
    note: item.note,
    category: item.category,
    tags: item.tags,
    source_url: item.sourceUrl,
    is_favorite: item.isFavorite,
    sort_order: item.sortOrder,
  };

  const { data, error } = await supabase
    .from('moodboard_items')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('[WedSiap] Failed to insert moodboard item into Supabase:', error);
    throw new Error(error.message || 'Gagal menyimpan item inspirasi ke database.');
  }

  return mapRowToMoodboardItem(data);
}

/**
 * Updates an existing moodboard item in Supabase.
 */
export async function updateMoodboardItemInDb(
  workspaceId: string,
  itemId: string,
  changes: Partial<Omit<MoodboardItem, 'id' | 'workspaceId' | 'moodboardId' | 'createdAt' | 'updatedAt'>>
): Promise<MoodboardItem> {
  if (!workspaceId || !itemId) {
    throw new Error('Workspace ID dan Item ID diperlukan untuk memperbarui inspirasi.');
  }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (changes.imageUrl !== undefined) payload.image_url = changes.imageUrl;
  if (changes.storageProvider !== undefined) payload.storage_provider = changes.storageProvider;
  if (changes.storageFileId !== undefined) payload.storage_file_id = changes.storageFileId;
  if (changes.storageFileName !== undefined) payload.storage_file_name = changes.storageFileName;
  if (changes.storageMimeType !== undefined) payload.storage_mime_type = changes.storageMimeType;
  if (changes.storageSize !== undefined) payload.storage_size = changes.storageSize;
  if (changes.title !== undefined) payload.title = changes.title;
  if (changes.note !== undefined) payload.note = changes.note;
  if (changes.category !== undefined) payload.category = changes.category;
  if (changes.tags !== undefined) payload.tags = changes.tags;
  if (changes.sourceUrl !== undefined) payload.source_url = changes.sourceUrl;
  if (changes.isFavorite !== undefined) payload.is_favorite = changes.isFavorite;
  if (changes.sortOrder !== undefined) payload.sort_order = changes.sortOrder;

  const { data, error } = await supabase
    .from('moodboard_items')
    .update(payload)
    .eq('id', itemId)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single();

  if (error) {
    console.error('[WedSiap] Failed to update moodboard item in Supabase:', error);
    throw new Error(error.message || 'Gagal memperbarui item inspirasi di database.');
  }

  return mapRowToMoodboardItem(data);
}

/**
 * Deletes an item reference from public.moodboard_items table, scoped by workspace_id.
 */
export async function deleteMoodboardItemFromDb(workspaceId: string, itemId: string): Promise<void> {
  if (!workspaceId || !itemId) {
    throw new Error('Workspace ID dan Item ID diperlukan untuk menghapus inspirasi.');
  }

  const { error } = await supabase
    .from('moodboard_items')
    .delete()
    .eq('id', itemId)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[WedSiap] Failed to delete moodboard item from Supabase:', error);
    throw new Error(error.message || 'Gagal menghapus item inspirasi dari database.');
  }
}

/**
 * Uploads an image file to Supabase Storage bucket 'moodboard'.
 */
export async function uploadMoodboardImage(
  workspaceId: string,
  moodboardId: string,
  file: File
): Promise<{ publicUrl: string; storageFileId: string }> {
  if (!workspaceId || !moodboardId || !file) {
    throw new Error('Workspace ID, Moodboard ID, dan File gambar diperlukan untuk unggah.');
  }

  const extParts = file.name.split('.');
  const ext = extParts.length > 1 ? extParts.pop()!.toLowerCase() : 'webp';
  const uniqueName = `${crypto.randomUUID()}.${ext}`;
  const filePath = `${workspaceId}/${moodboardId}/${uniqueName}`;

  const { error: uploadError } = await supabase.storage
    .from('moodboard')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('[WedSiap] Storage upload error:', uploadError);
    throw new Error(uploadError.message || 'Gagal mengunggah gambar ke Supabase storage.');
  }

  const { data } = supabase.storage.from('moodboard').getPublicUrl(filePath);
  return {
    publicUrl: data.publicUrl,
    storageFileId: filePath,
  };
}
