import { describe, it, expect } from 'vitest';
import { resolveDriveImageUrl, resolveMoodboardImageUrl } from './imageResolver';
import { MoodboardItem } from '../types';

describe('Moodboard Storage Provider Tests', () => {
  describe('resolveDriveImageUrl', () => {
    it('constructs canonical Google Drive high-res thumbnail URL from file ID', () => {
      const fileId = '1abc_XYZ_123456';
      const resolved = resolveDriveImageUrl(fileId);
      expect(resolved).toBe('https://lh3.googleusercontent.com/d/1abc_XYZ_123456=s1600');
    });

    it('returns empty string for missing file ID', () => {
      expect(resolveDriveImageUrl('')).toBe('');
    });
  });

  describe('resolveMoodboardImageUrl', () => {
    it('resolves Google Drive image URL using storageFileId when provider is google_drive', () => {
      const item: MoodboardItem = {
        id: 'item-drive-1',
        moodboardId: 'mb-1',
        workspaceId: 'ws-1',
        imageUrl: '',
        storageProvider: 'google_drive',
        storageFileId: 'drive_file_999',
        storageFileName: 'wedding_decor.jpg',
        storageMimeType: 'image/jpeg',
        storageSize: 1024000,
        title: 'Garden Decor',
        note: null,
        category: 'decoration',
        tags: ['garden'],
        sourceUrl: null,
        isFavorite: false,
        sortOrder: 0,
        createdAt: '2026-09-21T00:00:00Z',
        updatedAt: '2026-09-21T00:00:00Z',
      };

      const resolved = resolveMoodboardImageUrl(item);
      expect(resolved).toBe('https://lh3.googleusercontent.com/d/drive_file_999=s1600');
    });

    it('returns stored imageUrl for supabase storage provider', () => {
      const item: MoodboardItem = {
        id: 'item-supa-1',
        moodboardId: 'mb-1',
        workspaceId: 'ws-1',
        imageUrl: 'https://heavutiajotepwfhlccx.supabase.co/storage/v1/object/public/moodboard/ws-1/mb-1/file.webp',
        storageProvider: 'supabase',
        storageFileId: 'ws-1/mb-1/file.webp',
        storageFileName: 'file.webp',
        storageMimeType: 'image/webp',
        storageSize: 500000,
        title: 'Bridal Dress',
        note: null,
        category: 'dress',
        tags: ['minimalist'],
        sourceUrl: null,
        isFavorite: true,
        sortOrder: 0,
        createdAt: '2026-09-21T00:00:00Z',
        updatedAt: '2026-09-21T00:00:00Z',
      };

      const resolved = resolveMoodboardImageUrl(item);
      expect(resolved).toBe('https://heavutiajotepwfhlccx.supabase.co/storage/v1/object/public/moodboard/ws-1/mb-1/file.webp');
    });

    it('returns stored imageUrl for external_url provider', () => {
      const item: MoodboardItem = {
        id: 'item-ext-1',
        moodboardId: 'mb-1',
        workspaceId: 'ws-1',
        imageUrl: 'https://images.unsplash.com/photo-1519741497674',
        storageProvider: 'external_url',
        storageFileId: null,
        storageFileName: null,
        storageMimeType: null,
        storageSize: null,
        title: 'Rustic Table',
        note: null,
        category: 'table_setting',
        tags: ['rustic'],
        sourceUrl: 'https://pinterest.com/pin/123',
        isFavorite: false,
        sortOrder: 0,
        createdAt: '2026-09-21T00:00:00Z',
        updatedAt: '2026-09-21T00:00:00Z',
      };

      const resolved = resolveMoodboardImageUrl(item);
      expect(resolved).toBe('https://images.unsplash.com/photo-1519741497674');
    });
  });
});
