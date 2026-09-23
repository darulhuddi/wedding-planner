/**
 * WedSiap Cloudflare R2 Storage Service
 *
 * Handles direct browser -> Cloudflare R2 upload via Edge Function presigned URLs,
 * and calls Edge Function for R2 object deletion.
 */

import { supabase } from '../../lib/supabaseClient';

export interface R2UploadResult {
  publicUrl: string;
  storageKey: string;
  storageSize: number;
  storageMimeType: string;
  storageFileName: string;
}

export function isR2MockMode(): boolean {
  return import.meta.env.VITE_R2_MOCK === 'true';
}

interface CachedDownloadUrl {
  url: string;
  expiresAt: number;
}

const downloadUrlCache = new Map<string, CachedDownloadUrl>();

/**
 * Uploads an optimized WebP Blob directly from the browser to Cloudflare R2.
 */
export async function uploadMoodboardImageToR2(
  workspaceId: string,
  optimizedBlob: Blob,
  fileName: string = 'moodboard_image.webp'
): Promise<R2UploadResult> {
  if (!workspaceId || !optimizedBlob) {
    throw new Error('Workspace ID dan file gambar terkompresi diperlukan untuk unggah R2.');
  }

  // Development / Test Mock Mode Fallback
  if (isR2MockMode()) {
    const mockKey = `workspaces/${workspaceId}/moodboard/mock_${Date.now()}.webp`;
    const mockPublicUrl = `https://cdn.wedsiap.com/${mockKey}`;
    return {
      publicUrl: mockPublicUrl,
      storageKey: mockKey,
      storageSize: optimizedBlob.size,
      storageMimeType: 'image/webp',
      storageFileName: fileName,
    };
  }

  // 1. Get user auth session token
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    throw new Error('Pengguna belum terotentikasi. Harap login kembali.');
  }

  // 2. Request Presigned Upload URL from Edge Function
  const { data: presignedData, error: edgeError } = await supabase.functions.invoke('r2-upload-url', {
    body: {
      workspaceId,
      sizeBytes: optimizedBlob.size,
      mimeType: 'image/webp',
    },
  });

  if (edgeError || !presignedData?.uploadUrl) {
    const msg = edgeError?.message || presignedData?.error || 'Gagal membuat presigned upload URL R2.';
    console.error('[R2 Storage Service] Presigned URL error:', msg);
    throw new Error(msg);
  }

  const { uploadUrl, storageKey, publicUrl } = presignedData;

  // Ensure payload is explicitly sent as a raw Blob instance
  const rawBlob = optimizedBlob instanceof Blob ? optimizedBlob : new Blob([optimizedBlob], { type: 'image/webp' });

  // 3. Direct Browser -> Cloudflare R2 Upload via HTTP PUT
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'image/webp',
    },
    body: rawBlob,
  });

  if (!uploadResponse.ok) {
    console.error('[R2 Storage Service] Direct PUT upload failed:', uploadResponse.statusText);
    throw new Error(`Gagal mengunggah file ke Cloudflare R2 (${uploadResponse.statusText}).`);
  }

  return {
    publicUrl,
    storageKey,
    storageSize: optimizedBlob.size,
    storageMimeType: 'image/webp',
    storageFileName: fileName,
  };
}

/**
 * Resolves a private R2 object display URL via Edge Function presigned GET download URL.
 * Implements client-side in-memory caching to avoid redundant network requests.
 */
export async function getR2DisplayUrl(workspaceId: string, storageKey: string): Promise<string> {
  if (!workspaceId || !storageKey) return '';

  if (isR2MockMode()) {
    return `https://cdn.wedsiap.com/${storageKey}`;
  }

  // 1. Check in-memory cache (reuse if valid for at least 5 more minutes)
  const cached = downloadUrlCache.get(storageKey);
  const now = Date.now();
  if (cached && cached.expiresAt - now > 5 * 60 * 1000) {
    return cached.url;
  }

  // 2. Request Presigned Download URL from Edge Function
  const { data, error } = await supabase.functions.invoke('r2-download-url', {
    body: {
      workspaceId,
      storageKey,
    },
  });

  if (error || !data?.downloadUrl) {
    console.error('[R2 Storage Service] Failed to get presigned download URL:', error || data);
    throw new Error(error?.message || data?.error || 'Gagal membuat presigned download URL R2.');
  }

  // Cache for 55 minutes (out of 60 min validity)
  downloadUrlCache.set(storageKey, {
    url: data.downloadUrl,
    expiresAt: now + 55 * 60 * 1000,
  });

  return data.downloadUrl;
}

/**
 * Deletes an object from Cloudflare R2 bucket via Edge Function.
 */
export async function deleteMoodboardImageFromR2(workspaceId: string, storageKey: string): Promise<void> {
  if (!workspaceId || !storageKey) return;

  if (isR2MockMode()) {
    console.log('[R2 Storage Service] Mock Mode: Object deleted cleanly:', storageKey);
    return;
  }

  const { error } = await supabase.functions.invoke('r2-delete-object', {
    body: {
      workspaceId,
      storageKey,
    },
  });

  if (error) {
    console.warn('[R2 Storage Service] Warning deleting object from Cloudflare R2:', error);
  }
}
