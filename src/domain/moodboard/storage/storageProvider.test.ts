import { describe, it, expect } from 'vitest';
import { resolveMoodboardImageUrl } from './imageResolver';
import { MoodboardItem } from '../types';

describe('Moodboard Storage Provider Tests', () => {
  describe('resolveMoodboardImageUrl', () => {
    it('returns stored imageUrl for r2 storage provider', () => {
      const item: MoodboardItem = {
        id: 'item-r2-1',
        moodboardId: 'mb-1',
        workspaceId: 'ws-1',
        imageUrl: 'https://cdn.wedsiap.com/workspaces/ws-1/moodboard/file.webp',
        storageProvider: 'r2',
        storageKey: 'workspaces/ws-1/moodboard/file.webp',
        storageFileId: 'workspaces/ws-1/moodboard/file.webp',
        storageFileName: 'file.webp',
        storageMimeType: 'image/webp',
        storageSize: 500000,
        title: 'Garden Decor',
        note: null,
        category: 'decoration',
        tags: ['garden'],
        sourceUrl: null,
        isFavorite: false,
        sortOrder: 0,
        createdAt: '2026-09-23T00:00:00Z',
        updatedAt: '2026-09-23T00:00:00Z',
      };

      const resolved = resolveMoodboardImageUrl(item);
      expect(resolved).toBe('https://cdn.wedsiap.com/workspaces/ws-1/moodboard/file.webp');
    });

    it('returns stored imageUrl for supabase storage provider', () => {
      const item: MoodboardItem = {
        id: 'item-supa-1',
        moodboardId: 'mb-1',
        workspaceId: 'ws-1',
        imageUrl: 'https://heavutiajotepwfhlccx.supabase.co/storage/v1/object/public/moodboard/ws-1/mb-1/file.webp',
        storageProvider: 'supabase',
        storageKey: 'ws-1/mb-1/file.webp',
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
        storageKey: null,
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
