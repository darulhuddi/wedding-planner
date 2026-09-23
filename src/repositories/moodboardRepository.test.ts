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

vi.mock('../services/storage/imageOptimizer', () => ({
  optimizeImageBeforeUpload: vi.fn((file) => Promise.resolve(file)),
}));

describe('moodboardRepository V1.1 Storage Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMoodboardItemsFromGoogleDrive', () => {
    it('creates items with storageProvider = google_drive from selected Google Drive files', async () => {
      const driveFiles = [
        {
          fileId: 'drive-123',
          fileName: 'prewed_photo.jpg',
          mimeType: 'image/jpeg',
          size: 2048000,
        },
      ];

      const createdItem = {
        id: 'item-drive-1',
        moodboardId: 'mb-1',
        workspaceId: 'ws-1',
        imageUrl: '',
        storageProvider: 'google_drive' as const,
        storageFileId: 'drive-123',
        storageFileName: 'prewed_photo.jpg',
        storageMimeType: 'image/jpeg',
        storageSize: 2048000,
        title: 'prewed_photo',
        note: null,
        category: 'prewedding' as const,
        tags: [],
        sourceUrl: 'https://drive.google.com/file/d/drive-123/view',
        isFavorite: false,
        sortOrder: 0,
        createdAt: '2026-09-21T00:00:00Z',
        updatedAt: '2026-09-21T00:00:00Z',
      };

      vi.mocked(adapter.insertMoodboardItem).mockResolvedValue(createdItem);

      const result = await moodboardRepository.createMoodboardItemsFromGoogleDrive(
        'ws-1',
        'mb-1',
        driveFiles,
        'prewedding'
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(createdItem);
      expect(adapter.insertMoodboardItem).toHaveBeenCalledWith(
        'ws-1',
        expect.objectContaining({
          storageProvider: 'google_drive',
          storageFileId: 'drive-123',
          storageFileName: 'prewed_photo.jpg',
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
