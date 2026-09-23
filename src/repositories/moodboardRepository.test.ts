import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as moodboardRepository from './moodboardRepository';
import * as adapter from './supabaseMoodboardAdapter';

vi.mock('./supabaseMoodboardAdapter', () => ({
  fetchMoodboardByWorkspaceId: vi.fn(),
  insertMoodboard: vi.fn(),
  fetchMoodboardItems: vi.fn(),
  fetchMoodboardItemById: vi.fn(),
  insertMoodboardItem: vi.fn(),
  updateMoodboardItemInDb: vi.fn(),
  deleteMoodboardItemFromDb: vi.fn(),
  uploadMoodboardImage: vi.fn(),
}));

describe('moodboardRepository Cloudflare R2 Storage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMoodboardItem', () => {
    it('creates moodboard item record with storageProvider = r2 and storageKey', async () => {
      const createdItem = {
        id: 'item-r2-1',
        moodboardId: 'mb-1',
        workspaceId: 'ws-1',
        imageUrl: 'https://cdn.wedsiap.com/workspaces/ws-1/moodboard/photo.webp',
        storageProvider: 'r2' as const,
        storageKey: 'workspaces/ws-1/moodboard/photo.webp',
        storageFileId: 'workspaces/ws-1/moodboard/photo.webp',
        storageFileName: 'prewed_photo.webp',
        storageMimeType: 'image/webp',
        storageSize: 2048000,
        title: 'prewed_photo',
        note: null,
        category: 'prewedding' as const,
        tags: [],
        sourceUrl: null,
        isFavorite: false,
        sortOrder: 0,
        createdAt: '2026-09-23T00:00:00Z',
        updatedAt: '2026-09-23T00:00:00Z',
      };

      vi.mocked(adapter.insertMoodboardItem).mockResolvedValue(createdItem);

      const result = await moodboardRepository.createMoodboardItem('ws-1', 'mb-1', {
        category: 'prewedding',
        imageUrl: 'https://cdn.wedsiap.com/workspaces/ws-1/moodboard/photo.webp',
        storageProvider: 'r2',
        storageKey: 'workspaces/ws-1/moodboard/photo.webp',
        storageFileName: 'prewed_photo.webp',
        storageMimeType: 'image/webp',
        storageSize: 2048000,
      });

      expect(result).toEqual(createdItem);
      expect(adapter.insertMoodboardItem).toHaveBeenCalledWith(
        'ws-1',
        expect.objectContaining({
          storageProvider: 'r2',
          storageKey: 'workspaces/ws-1/moodboard/photo.webp',
          storageFileName: 'prewed_photo.webp',
        })
      );
    });
  });

  describe('deleteMoodboardItem', () => {
    it('delegates deletion to deleteMoodboardItemFromDb without throwing error', async () => {
      vi.mocked(adapter.deleteMoodboardItemFromDb).mockResolvedValue(undefined);

      await expect(moodboardRepository.deleteMoodboardItem('ws-1', 'item-1')).resolves.toBeUndefined();
      expect(adapter.deleteMoodboardItemFromDb).toHaveBeenCalledWith('ws-1', 'item-1');
    });
  });
});
