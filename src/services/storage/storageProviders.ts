/**
 * WedSiap Moodboard Storage Providers Abstraction
 *
 * Implements strategy pattern for handling display image resolution and storage deletion
 * across Google Drive, Supabase Storage, and External URLs.
 */

import { MoodboardItem, StorageProvider } from '../../domain/moodboard/types';
import { supabase } from '../../lib/supabaseClient';
import { fetchDriveFileMetadata } from './googleDrivePicker';

export type ImageResolutionStatus = 'available' | 'unavailable';
export type ImageUnavailableReason = 'auth_required' | 'file_not_found' | 'access_denied' | 'temporary_error';

export interface MoodboardImageResolutionResult {
  status: ImageResolutionStatus;
  src?: string;
  reason?: ImageUnavailableReason;
  message?: string;
}

export interface MoodboardStorageProvider {
  providerType: StorageProvider;
  resolveDisplayImage(item: MoodboardItem): Promise<MoodboardImageResolutionResult>;
  deleteStorageObject(item: MoodboardItem): Promise<void>;
}

/**
 * In-memory client-side cache for short-lived Google Drive thumbnailLinks with TTL expiration.
 */
interface CachedThumbnail {
  thumbnailLink: string;
  expiresAt: number;
}

class DriveThumbnailCache {
  private cache = new Map<string, CachedThumbnail>();
  private defaultTtlMs = 2 * 60 * 60 * 1000; // 2 hours TTL

  get(fileId: string): string | null {
    const entry = this.cache.get(fileId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(fileId);
      return null;
    }
    return entry.thumbnailLink;
  }

  set(fileId: string, thumbnailLink: string, ttlMs: number = this.defaultTtlMs) {
    this.cache.set(fileId, {
      thumbnailLink,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear() {
    this.cache.clear();
  }
}

export const driveThumbnailCache = new DriveThumbnailCache();

export class GoogleDriveStorageProvider implements MoodboardStorageProvider {
  readonly providerType: StorageProvider = 'google_drive';

  async resolveDisplayImage(item: MoodboardItem): Promise<MoodboardImageResolutionResult> {
    const fileId = item.storageFileId;

    if (!fileId) {
      // Fall back to stored imageUrl if no fileId (e.g. legacy fallback)
      if (item.imageUrl) {
        return { status: 'available', src: item.imageUrl };
      }
      return {
        status: 'unavailable',
        reason: 'file_not_found',
        message: 'Foto tidak tersedia',
      };
    }

    // 1. Check in-memory short-lived TTL cache
    const cachedLink = driveThumbnailCache.get(fileId);
    if (cachedLink) {
      return { status: 'available', src: cachedLink };
    }

    // 2. Fetch fresh thumbnail metadata via Google Drive API service layer
    try {
      const meta = await fetchDriveFileMetadata(fileId);
      if (meta.thumbnailLink) {
        driveThumbnailCache.set(fileId, meta.thumbnailLink);
        return { status: 'available', src: meta.thumbnailLink };
      }
      // If metadata has no thumbnailLink, check fallback
      if (item.imageUrl) {
        return { status: 'available', src: item.imageUrl };
      }
      return {
        status: 'unavailable',
        reason: 'file_not_found',
        message: 'Foto tidak tersedia di Google Drive',
      };
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;

      if (status === 404) {
        return {
          status: 'unavailable',
          reason: 'file_not_found',
          message: 'Foto telah dihapus dari Google Drive',
        };
      }

      if (status === 401 || status === 403) {
        return {
          status: 'unavailable',
          reason: 'auth_required',
          message: 'Hubungkan kembali Google Drive',
        };
      }

      // If we have a fallback image URL stored in DB (e.g. external reference), try that
      if (item.imageUrl) {
        return { status: 'available', src: item.imageUrl };
      }

      return {
        status: 'unavailable',
        reason: 'temporary_error',
        message: 'Gagal memuat foto',
      };
    }
  }

  /**
   * Delete Invariant:
   * When deleting a Moodboard item referenced from Google Drive, WedSiap ONLY removes
   * the database reference. It NEVER deletes the user's actual Google Drive file!
   */
  async deleteStorageObject(_item: MoodboardItem): Promise<void> {
    // Intentional No-Op: User's Google Drive file is owned by the user and untouched.
    return Promise.resolve();
  }
}

export class SupabaseStorageProvider implements MoodboardStorageProvider {
  readonly providerType: StorageProvider = 'supabase';

  async resolveDisplayImage(item: MoodboardItem): Promise<MoodboardImageResolutionResult> {
    if (item.imageUrl) {
      return Promise.resolve({ status: 'available', src: item.imageUrl });
    }
    return Promise.resolve({
      status: 'unavailable',
      reason: 'file_not_found',
      message: 'Foto tidak ditemukan',
    });
  }

  /**
   * Delete Invariant:
   * When deleting a Moodboard item uploaded to Supabase, cleans up the corresponding object
   * in Supabase Storage bucket 'moodboard'.
   */
  async deleteStorageObject(item: MoodboardItem): Promise<void> {
    const fileId = item.storageFileId;
    if (!fileId) return;

    try {
      const { error } = await supabase.storage.from('moodboard').remove([fileId]);
      if (error) {
        console.warn('[SupabaseStorageProvider] Warning removing storage object:', error);
      }
    } catch (err) {
      console.warn('[SupabaseStorageProvider] Error removing storage object:', err);
    }
  }
}

export class ExternalUrlStorageProvider implements MoodboardStorageProvider {
  readonly providerType: StorageProvider = 'external_url';

  async resolveDisplayImage(item: MoodboardItem): Promise<MoodboardImageResolutionResult> {
    if (item.imageUrl) {
      return Promise.resolve({ status: 'available', src: item.imageUrl });
    }
    return Promise.resolve({
      status: 'unavailable',
      reason: 'file_not_found',
      message: 'Foto tidak ditemukan',
    });
  }

  async deleteStorageObject(_item: MoodboardItem): Promise<void> {
    // No-Op for external web image links
    return Promise.resolve();
  }
}

const googleDriveHandler = new GoogleDriveStorageProvider();
const supabaseHandler = new SupabaseStorageProvider();
const externalUrlHandler = new ExternalUrlStorageProvider();

export function getStorageProviderHandler(providerType?: StorageProvider): MoodboardStorageProvider {
  switch (providerType) {
    case 'google_drive':
      return googleDriveHandler;
    case 'supabase':
      return supabaseHandler;
    case 'external_url':
    default:
      return externalUrlHandler;
  }
}

export async function resolveMoodboardItemImage(item: MoodboardItem): Promise<MoodboardImageResolutionResult> {
  const handler = getStorageProviderHandler(item.storageProvider);
  return handler.resolveDisplayImage(item);
}

