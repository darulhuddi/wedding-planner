/**
 * WedSiap Moodboard Storage Providers Abstraction
 *
 * Implements strategy pattern for handling display image resolution and storage deletion
 * across Cloudflare R2, Supabase Storage, and External URLs.
 */

import { MoodboardItem, StorageProvider } from '../../domain/moodboard/types';
import { supabase } from '../../lib/supabaseClient';
import { deleteMoodboardImageFromR2, getR2DisplayUrl } from './r2StorageService';

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

export class R2StorageProvider implements MoodboardStorageProvider {
  readonly providerType: StorageProvider = 'r2';

  async resolveDisplayImage(item: MoodboardItem): Promise<MoodboardImageResolutionResult> {
    const key = item.storageKey || item.storageFileId;
    if (key && item.workspaceId) {
      try {
        const signedUrl = await getR2DisplayUrl(item.workspaceId, key);
        if (signedUrl) {
          return { status: 'available', src: signedUrl };
        }
      } catch (err) {
        console.warn('[R2StorageProvider] Failed to generate presigned download URL:', err);
      }
    }

    if (item.imageUrl) {
      return { status: 'available', src: item.imageUrl };
    }

    return {
      status: 'unavailable',
      reason: 'file_not_found',
      message: 'Foto tidak ditemukan di Cloudflare R2',
    };
  }

  /**
   * Delete Invariant:
   * When deleting a Moodboard item stored on Cloudflare R2, deletes the underlying object
   * via Edge Function / R2 service using item.storageKey (or storageFileId).
   */
  async deleteStorageObject(item: MoodboardItem): Promise<void> {
    const storageKey = item.storageKey || item.storageFileId;
    if (!storageKey || !item.workspaceId) return;

    try {
      await deleteMoodboardImageFromR2(item.workspaceId, storageKey);
    } catch (err) {
      console.warn('[R2StorageProvider] Error deleting object from R2:', err);
    }
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
   * When deleting a Moodboard item uploaded to Supabase Storage, cleans up the corresponding object
   * in Supabase Storage bucket 'moodboard'.
   */
  async deleteStorageObject(item: MoodboardItem): Promise<void> {
    const fileId = item.storageKey || item.storageFileId;
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

const r2Handler = new R2StorageProvider();
const supabaseHandler = new SupabaseStorageProvider();
const externalUrlHandler = new ExternalUrlStorageProvider();

export function getStorageProviderHandler(providerType?: StorageProvider): MoodboardStorageProvider {
  switch (providerType) {
    case 'r2':
      return r2Handler;
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
