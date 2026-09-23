import { MoodboardItem } from '../types';

/**
 * Resolves high-res preview URL for Google Drive file ID.
 */
export function resolveDriveImageUrl(fileId: string): string {
  if (!fileId) return '';
  // Google Drive usercontent CDN thumbnail endpoint for direct high-res image rendering
  return `https://lh3.googleusercontent.com/d/${fileId}=s1600`;
}

/**
 * Resolves a usable display image URL for any MoodboardItem based on its storageProvider.
 */
export function resolveMoodboardImageUrl(item: MoodboardItem): string {
  if (!item) return '';

  if (item.storageProvider === 'google_drive' && item.storageFileId) {
    return resolveDriveImageUrl(item.storageFileId);
  }

  return item.imageUrl || '';
}
