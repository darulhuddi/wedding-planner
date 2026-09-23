import { MoodboardItem } from '../types';

/**
 * Resolves a display image URL for any MoodboardItem based on its storageProvider.
 */
export function resolveMoodboardImageUrl(item: MoodboardItem): string {
  if (!item) return '';

  if (item.imageUrl) {
    return item.imageUrl;
  }

  if (item.storageKey) {
    const publicBase = typeof process !== 'undefined' && process.env.VITE_R2_PUBLIC_BASE_URL
      ? process.env.VITE_R2_PUBLIC_BASE_URL
      : '';
    return publicBase ? `${publicBase.replace(/\/$/, '')}/${item.storageKey}` : '';
  }

  return '';
}
