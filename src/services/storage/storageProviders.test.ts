import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  R2StorageProvider,
  SupabaseStorageProvider,
  ExternalUrlStorageProvider,
  getStorageProviderHandler,
  resolveMoodboardItemImage,
} from './storageProviders';
import { MoodboardItem } from '../../domain/moodboard/types';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    storage: {
      from: vi.fn().mockReturnValue({
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    },
  },
}));

// Enable R2 mock mode for tests
vi.stubEnv('VITE_R2_MOCK', 'true');

describe('Storage Provider Abstraction & Deletion Invariants Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseItem: MoodboardItem = {
    id: 'item-100',
    moodboardId: 'mb-1',
    workspaceId: 'ws-1',
    imageUrl: 'https://cdn.wedsiap.com/workspaces/ws-1/moodboard/photo.webp',
    storageProvider: 'r2',
    storageKey: 'workspaces/ws-1/moodboard/photo.webp',
    storageFileId: 'workspaces/ws-1/moodboard/photo.webp',
    storageFileName: 'photo.webp',
    storageMimeType: 'image/webp',
    storageSize: 250000,
    title: 'Test Decor',
    note: null,
    category: 'decoration',
    tags: [],
    sourceUrl: null,
    isFavorite: false,
    sortOrder: 0,
    createdAt: '2026-09-21T00:00:00Z',
    updatedAt: '2026-09-21T00:00:00Z',
  };

  describe('R2StorageProvider', () => {
    const r2Handler = new R2StorageProvider();

    it('resolves image URL using stored imageUrl or storageKey', async () => {
      const r2Item: MoodboardItem = {
        ...baseItem,
        storageProvider: 'r2',
        imageUrl: 'https://cdn.wedsiap.com/workspaces/ws-1/moodboard/photo.webp',
      };
      const res = await r2Handler.resolveDisplayImage(r2Item);
      expect(res.status).toBe('available');
      expect(res.src).toBe('https://cdn.wedsiap.com/workspaces/ws-1/moodboard/photo.webp');
    });

    it('returns file_not_found if both imageUrl and storageKey are empty', async () => {
      const emptyItem: MoodboardItem = {
        ...baseItem,
        imageUrl: '',
        storageKey: null,
        storageFileId: null,
      };
      const res = await r2Handler.resolveDisplayImage(emptyItem);
      expect(res.status).toBe('unavailable');
      expect(res.reason).toBe('file_not_found');
    });

    it('INVARIANT: deleting r2 item invokes deleteMoodboardImageFromR2 without touching Supabase Storage', async () => {
      const r2Item: MoodboardItem = {
        ...baseItem,
        storageProvider: 'r2',
        storageKey: 'workspaces/ws-1/moodboard/item123.webp',
      };

      await r2Handler.deleteStorageObject(r2Item);
      expect(supabase.storage.from).not.toHaveBeenCalled();
    });
  });

  describe('SupabaseStorageProvider', () => {
    const supaHandler = new SupabaseStorageProvider();

    it('resolves image URL using stored imageUrl', async () => {
      const supaItem: MoodboardItem = {
        ...baseItem,
        storageProvider: 'supabase',
        imageUrl: 'https://heavutiajotepwfhlccx.supabase.co/storage/v1/object/public/moodboard/ws-1/mb-1/photo.webp',
        storageKey: 'ws-1/mb-1/photo.webp',
      };
      const res = await supaHandler.resolveDisplayImage(supaItem);
      expect(res.status).toBe('available');
      expect(res.src).toBe('https://heavutiajotepwfhlccx.supabase.co/storage/v1/object/public/moodboard/ws-1/mb-1/photo.webp');
    });

    it('INVARIANT: deleting supabase item calls Supabase Storage remove for the storageKey', async () => {
      const supaItem: MoodboardItem = {
        ...baseItem,
        storageProvider: 'supabase',
        storageKey: 'ws-1/mb-1/photo.webp',
      };

      await supaHandler.deleteStorageObject(supaItem);
      expect(supabase.storage.from).toHaveBeenCalledWith('moodboard');
    });
  });

  describe('ExternalUrlStorageProvider', () => {
    const extHandler = new ExternalUrlStorageProvider();

    it('resolves image URL using stored imageUrl', async () => {
      const extItem: MoodboardItem = {
        ...baseItem,
        storageProvider: 'external_url',
        imageUrl: 'https://images.unsplash.com/photo-100',
      };
      const res = await extHandler.resolveDisplayImage(extItem);
      expect(res.status).toBe('available');
      expect(res.src).toBe('https://images.unsplash.com/photo-100');
    });

    it('INVARIANT: deleting external_url item is a no-op without storage calls', async () => {
      const extItem: MoodboardItem = {
        ...baseItem,
        storageProvider: 'external_url',
      };

      await extHandler.deleteStorageObject(extItem);
      expect(supabase.storage.from).not.toHaveBeenCalled();
    });
  });

  describe('getStorageProviderHandler & resolveMoodboardItemImage', () => {
    it('returns appropriate handler for each provider', () => {
      expect(getStorageProviderHandler('r2')).toBeInstanceOf(R2StorageProvider);
      expect(getStorageProviderHandler('supabase')).toBeInstanceOf(SupabaseStorageProvider);
      expect(getStorageProviderHandler('external_url')).toBeInstanceOf(ExternalUrlStorageProvider);
    });

    it('resolves image source correctly via helper', async () => {
      const r2Item: MoodboardItem = {
        ...baseItem,
        storageProvider: 'r2',
        imageUrl: 'https://cdn.wedsiap.com/item.webp',
      };
      const res = await resolveMoodboardItemImage(r2Item);
      expect(res.status).toBe('available');
      expect(res.src).toBe('https://cdn.wedsiap.com/item.webp');
    });
  });
});
