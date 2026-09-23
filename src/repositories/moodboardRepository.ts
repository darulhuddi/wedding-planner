/**
 * WedSiap Moodboard Repository (V1.1 - Pure Persistence & CRUD)
 *
 * Domain-oriented repository abstraction for the Moodboard domain.
 * Mediates persistence and mapping domain ↔ PostgreSQL tables.
 *
 * Clean Architecture Rules:
 * - NO Canvas API / image compression in repository (handled by imageOptimizer service).
 * - NO Google Picker UI or OAuth in repository (handled by googleDrivePicker service).
 * - Delegates storage object cleanup to StorageProvider strategy handlers.
 */

import {
  Moodboard,
  MoodboardItem,
  CreateMoodboardItemInput,
  UpdateMoodboardItemInput,
  GoogleDriveSelectedFile,
  StorageProvider,
} from '../domain/moodboard/types';
import {
  parseTags,
  validateCreateMoodboardItemInput,
  validateUpdateMoodboardItemInput,
} from '../domain/moodboard/validation';
import {
  fetchMoodboardByWorkspaceId,
  insertMoodboard,
  fetchMoodboardItems,
  fetchMoodboardItemById,
  insertMoodboardItem,
  updateMoodboardItemInDb,
  deleteMoodboardItemFromDb,
  uploadMoodboardImage,
} from './supabaseMoodboardAdapter';
import { getStorageProviderHandler } from '../services/storage/storageProviders';

/**
 * Retrieves the workspace's Moodboard, creating a default one if none exists yet.
 */
export async function getOrCreateMoodboard(workspaceId: string): Promise<Moodboard> {
  if (!workspaceId) {
    throw new Error('Workspace ID diperlukan untuk mengakses Moodboard.');
  }

  const existing = await fetchMoodboardByWorkspaceId(workspaceId);
  if (existing) {
    return existing;
  }

  return insertMoodboard(workspaceId, 'Wedding Moodboard');
}

/**
 * Retrieves all items for a moodboard.
 */
export async function getMoodboardItems(workspaceId: string, moodboardId: string): Promise<MoodboardItem[]> {
  if (!workspaceId || !moodboardId) return [];
  return fetchMoodboardItems(workspaceId, moodboardId);
}

/**
 * Creates a new moodboard item record.
 * Accepts already-optimized file if performing local device upload.
 */
export async function createMoodboardItem(
  workspaceId: string,
  moodboardId: string,
  input: CreateMoodboardItemInput,
  optimizedFile?: File
): Promise<MoodboardItem> {
  if (!workspaceId || !moodboardId) {
    throw new Error('Workspace ID dan Moodboard ID diperlukan untuk membuat inspirasi.');
  }

  // Validate payload
  const validation = validateCreateMoodboardItemInput(input, Boolean(optimizedFile) || Boolean(input.storageFileId));
  if (!validation.isValid) {
    throw new Error(`Validasi gagal: ${validation.errors.join(', ')}`);
  }

  let finalImageUrl = input.imageUrl ? input.imageUrl.trim() : '';
  let provider: StorageProvider = input.storageProvider || 'external_url';
  let storageFileId = input.storageFileId || null;
  let storageFileName = input.storageFileName || null;
  let storageMimeType = input.storageMimeType || null;
  let storageSize = input.storageSize || null;

  // Handle local device upload
  if (optimizedFile) {
    provider = 'supabase';
    const uploadResult = await uploadMoodboardImage(workspaceId, moodboardId, optimizedFile);
    finalImageUrl = uploadResult.publicUrl;
    storageFileId = uploadResult.storageFileId;
    storageFileName = optimizedFile.name;
    storageMimeType = optimizedFile.type;
    storageSize = optimizedFile.size;
  }

  const cleanTags = parseTags(input.tags);

  return insertMoodboardItem(workspaceId, {
    moodboardId,
    workspaceId,
    imageUrl: finalImageUrl,
    storageProvider: provider,
    storageFileId,
    storageFileName,
    storageMimeType,
    storageSize,
    title: input.title ? input.title.trim() : null,
    note: input.note ? input.note.trim() : null,
    category: input.category,
    tags: cleanTags,
    sourceUrl: input.sourceUrl ? input.sourceUrl.trim() : null,
    isFavorite: Boolean(input.isFavorite),
    sortOrder: 0,
  });
}

/**
 * Creates moodboard items directly from selected Google Drive files.
 */
export async function createMoodboardItemsFromGoogleDrive(
  workspaceId: string,
  moodboardId: string,
  driveFiles: GoogleDriveSelectedFile[],
  category: CreateMoodboardItemInput['category'],
  details?: { title?: string; note?: string; tags?: string[] | string; sourceUrl?: string }
): Promise<MoodboardItem[]> {
  if (!workspaceId || !moodboardId || !driveFiles || driveFiles.length === 0) {
    return [];
  }

  const createdItems: MoodboardItem[] = [];

  for (const driveFile of driveFiles) {
    const item = await createMoodboardItem(workspaceId, moodboardId, {
      category,
      storageProvider: 'google_drive',
      storageFileId: driveFile.fileId,
      storageFileName: driveFile.fileName,
      storageMimeType: driveFile.mimeType,
      storageSize: driveFile.size || null,
      title: details?.title || driveFile.fileName.replace(/\.[^/.]+$/, ''),
      note: details?.note,
      tags: details?.tags,
      sourceUrl: details?.sourceUrl || `https://drive.google.com/file/d/${driveFile.fileId}/view`,
    });
    createdItems.push(item);
  }

  return createdItems;
}

/**
 * Updates an existing moodboard item.
 */
export async function updateMoodboardItem(
  workspaceId: string,
  itemId: string,
  input: UpdateMoodboardItemInput
): Promise<MoodboardItem> {
  if (!workspaceId || !itemId) {
    throw new Error('Workspace ID dan Item ID diperlukan untuk memperbarui inspirasi.');
  }

  const validation = validateUpdateMoodboardItemInput(input);
  if (!validation.isValid) {
    throw new Error(`Validasi gagal: ${validation.errors.join(', ')}`);
  }

  const changes: Partial<Omit<MoodboardItem, 'id' | 'workspaceId' | 'moodboardId' | 'createdAt' | 'updatedAt'>> = {};

  if (input.imageUrl !== undefined) changes.imageUrl = input.imageUrl ? input.imageUrl.trim() : '';
  if (input.storageProvider !== undefined) changes.storageProvider = input.storageProvider;
  if (input.storageFileId !== undefined) changes.storageFileId = input.storageFileId;
  if (input.storageFileName !== undefined) changes.storageFileName = input.storageFileName;
  if (input.storageMimeType !== undefined) changes.storageMimeType = input.storageMimeType;
  if (input.storageSize !== undefined) changes.storageSize = input.storageSize;
  if (input.title !== undefined) changes.title = input.title ? input.title.trim() : null;
  if (input.note !== undefined) changes.note = input.note ? input.note.trim() : null;
  if (input.category !== undefined) changes.category = input.category;
  if (input.tags !== undefined) changes.tags = parseTags(input.tags);
  if (input.sourceUrl !== undefined) changes.sourceUrl = input.sourceUrl ? input.sourceUrl.trim() : null;
  if (input.isFavorite !== undefined) changes.isFavorite = Boolean(input.isFavorite);
  if (input.sortOrder !== undefined) changes.sortOrder = input.sortOrder;

  return updateMoodboardItemInDb(workspaceId, itemId, changes);
}

/**
 * Quick favorite toggle action for an item.
 */
export async function toggleFavoriteMoodboardItem(
  workspaceId: string,
  itemId: string,
  isFavorite: boolean
): Promise<MoodboardItem> {
  return updateMoodboardItem(workspaceId, itemId, { isFavorite });
}

/**
 * Deletes a moodboard item reference.
 * Delegates storage object cleanup strategy to StorageProvider (No-Op for Google Drive, object deletion for Supabase Storage).
 */
export async function deleteMoodboardItem(workspaceId: string, itemId: string): Promise<void> {
  if (!workspaceId || !itemId) {
    throw new Error('Workspace ID dan Item ID diperlukan untuk menghapus inspirasi.');
  }

  // Fetch item details to run provider deletion strategy
  const item = await fetchMoodboardItemById(workspaceId, itemId);
  if (item) {
    const handler = getStorageProviderHandler(item.storageProvider);
    await handler.deleteStorageObject(item);
  }

  return deleteMoodboardItemFromDb(workspaceId, itemId);
}
