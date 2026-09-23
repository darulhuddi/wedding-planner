import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GoogleDriveStorageProvider,
  SupabaseStorageProvider,
  ExternalUrlStorageProvider,
  getStorageProviderHandler,
  resolveMoodboardItemImage,
  driveThumbnailCache,
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
  },
}));

// Set environment mock flag for Google Drive tests
vi.stubEnv('VITE_GOOGLE_DRIVE_MOCK', 'true');

describe('Storage Provider Abstraction & Deletion Invariants Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    driveThumbnailCache.clear();
  });

  const baseItem: MoodboardItem = {
    id: 'item-100',
    moodboardId: 'mb-1',
    workspaceId: 'ws-1',
    imageUrl: 'https://example.com/fallback.jpg',
    storageProvider: 'external_url',
    storageFileId: null,
    storageFileName: null,
    storageMimeType: null,
    storageSize: null,
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

  describe('GoogleDriveStorageProvider', () => {
    const driveHandler = new GoogleDriveStorageProvider();

    it('resolves image asynchronously using Google Drive API / mock service', async () => {
      const driveItem: MoodboardItem = {
        ...baseItem,
        storageProvider: 'google_drive',
        storageFileId: 'drive_file_abc',
      };
      const res = await driveHandler.resolveDisplayImage(driveItem);
      expect(res.status).toBe('available');
      expect(res.src).toContain('https://images.unsplash.com');
    });

    it('caches retrieved thumbnail in short-lived TTL cache', async () => {
      const driveItem: MoodboardItem = {
        ...baseItem,
        storageProvider: 'google_drive',
        storageFileId: 'drive_cached_file',
      };
      await driveHandler.resolveDisplayImage(driveItem);
      expect(driveThumbnailCache.get('drive_cached_file')).toBeTruthy();
    });

    it('returns file_not_found status when file is missing in Drive (404)', async () => {
      const driveItem: MoodboardItem = {
        ...baseItem,
        imageUrl: '',
        storageProvider: 'google_drive',
        storageFileId: 'mock_drive_not_found',
      };
      const res = await driveHandler.resolveDisplayImage(driveItem);
      expect(res.status).toBe('unavailable');
      expect(res.reason).toBe('file_not_found');
      expect(res.message).toBe('Foto telah dihapus dari Google Drive');
    });

    it('returns auth_required status when token/access is invalid (401)', async () => {
      const driveItem: MoodboardItem = {
        ...baseItem,
        imageUrl: '',
        storageProvider: 'google_drive',
        storageFileId: 'mock_drive_unauthorized',
      };
      const res = await driveHandler.resolveDisplayImage(driveItem);
      expect(res.status).toBe('unavailable');
      expect(res.reason).toBe('auth_required');
      expect(res.message).toBe('Hubungkan kembali Google Drive');
    });


    it('INVARIANT: deleting google_drive item does NOT call Supabase Storage remove', async () => {
      const driveItem: MoodboardItem = {
        ...baseItem,
        storageProvider: 'google_drive',
        storageFileId: 'drive_file_abc',
      };

      await driveHandler.deleteStorageObject(driveItem);
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
        storageFileId: 'ws-1/mb-1/photo.webp',
      };
      const res = await supaHandler.resolveDisplayImage(supaItem);
      expect(res.status).toBe('available');
      expect(res.src).toBe('https://heavutiajotepwfhlccx.supabase.co/storage/v1/object/public/moodboard/ws-1/mb-1/photo.webp');
    });

    it('INVARIANT: deleting supabase item calls Supabase Storage remove for the storageFileId', async () => {
      const supaItem: MoodboardItem = {
        ...baseItem,
        storageProvider: 'supabase',
        storageFileId: 'ws-1/mb-1/photo.webp',
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
      expect(getStorageProviderHandler('google_drive')).toBeInstanceOf(GoogleDriveStorageProvider);
      expect(getStorageProviderHandler('supabase')).toBeInstanceOf(SupabaseStorageProvider);
      expect(getStorageProviderHandler('external_url')).toBeInstanceOf(ExternalUrlStorageProvider);
    });

    it('resolves image source correctly via helper', async () => {
      const driveItem: MoodboardItem = {
        ...baseItem,
        storageProvider: 'google_drive',
        storageFileId: 'drive_file_xyz',
      };
      const res = await resolveMoodboardItemImage(driveItem);
      expect(res.status).toBe('available');
      expect(res.src).toBeTruthy();
    });
  });
});

