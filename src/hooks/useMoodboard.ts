import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Moodboard,
  MoodboardItem,
  MoodboardCategory,
  MoodboardSortOption,
  CreateMoodboardItemInput,
  UpdateMoodboardItemInput,
  GoogleDriveSelectedFile,
} from '../domain/moodboard/types';
import * as moodboardRepository from '../repositories/moodboardRepository';
import { optimizeImageBeforeUpload } from '../services/storage/imageOptimizer';

export interface UseMoodboardReturn {
  moodboard: Moodboard | null;
  items: MoodboardItem[];
  filteredItems: MoodboardItem[];
  selectedCategory: MoodboardCategory;
  searchQuery: string;
  sortOrder: MoodboardSortOption;
  selectedItemId: string | null;
  selectedItem: MoodboardItem | null;
  isAddModalOpen: boolean;
  editingItem: MoodboardItem | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Actions
  setSelectedCategory: (cat: MoodboardCategory) => void;
  setSearchQuery: (query: string) => void;
  setSortOrder: (sort: MoodboardSortOption) => void;
  setSelectedItemId: (id: string | null) => void;
  setIsAddModalOpen: (open: boolean) => void;
  setEditingItem: (item: MoodboardItem | null) => void;
  refresh: () => Promise<void>;

  addItem: (input: CreateMoodboardItemInput, file?: File) => Promise<MoodboardItem>;
  addGoogleDriveItems: (
    driveFiles: GoogleDriveSelectedFile[],
    category: Exclude<MoodboardCategory, 'all'>,
    details?: { title?: string; note?: string; tags?: string[] | string; sourceUrl?: string }
  ) => Promise<MoodboardItem[]>;
  updateItem: (itemId: string, input: UpdateMoodboardItemInput) => Promise<MoodboardItem>;
  toggleFavorite: (itemId: string) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
}

export function useMoodboard(workspaceId?: string): UseMoodboardReturn {
  const [moodboard, setMoodboard] = useState<Moodboard | null>(null);
  const [items, setItems] = useState<MoodboardItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MoodboardCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<MoodboardSortOption>('newest');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MoodboardItem | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!workspaceId) {
      setMoodboard(null);
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const mb = await moodboardRepository.getOrCreateMoodboard(workspaceId);
      setMoodboard(mb);

      const fetchedItems = await moodboardRepository.getMoodboardItems(workspaceId, mb.id);
      setItems(fetchedItems);
    } catch (err: unknown) {
      console.error('[useMoodboard] Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat moodboard.');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived filtered & sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Category filter
        if (selectedCategory !== 'all' && item.category !== selectedCategory) {
          return false;
        }

        // Search filter (title, note, tags)
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchTitle = item.title ? item.title.toLowerCase().includes(q) : false;
          const matchNote = item.note ? item.note.toLowerCase().includes(q) : false;
          const matchTags = item.tags.some((tag) => tag.toLowerCase().includes(q));

          if (!matchTitle && !matchNote && !matchTags) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [items, selectedCategory, searchQuery, sortOrder]);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return items.find((item) => item.id === selectedItemId) || null;
  }, [items, selectedItemId]);

  // Add Single Item (Local device upload or URL)
  const addItem = async (input: CreateMoodboardItemInput, file?: File): Promise<MoodboardItem> => {
    if (!workspaceId || !moodboard) {
      throw new Error('Workspace atau moodboard belum diinisialisasi.');
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let optimizedFile: File | undefined;
      if (file) {
        // Application layer performs client-side WebP canvas optimization before calling repository
        optimizedFile = await optimizeImageBeforeUpload(file);
      }

      const created = await moodboardRepository.createMoodboardItem(workspaceId, moodboard.id, input, optimizedFile);
      setItems((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      return created;
    } catch (err: unknown) {
      console.error('[useMoodboard] Failed to add item:', err);
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan inspirasi.';
      setError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Multiple Items from Google Drive
  const addGoogleDriveItems = async (
    driveFiles: GoogleDriveSelectedFile[],
    category: Exclude<MoodboardCategory, 'all'>,
    details?: { title?: string; note?: string; tags?: string[] | string; sourceUrl?: string }
  ): Promise<MoodboardItem[]> => {
    if (!workspaceId || !moodboard) {
      throw new Error('Workspace atau moodboard belum diinisialisasi.');
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const createdList = await moodboardRepository.createMoodboardItemsFromGoogleDrive(
        workspaceId,
        moodboard.id,
        driveFiles,
        category,
        details
      );
      setItems((prev) => [...createdList, ...prev]);
      setIsAddModalOpen(false);
      return createdList;
    } catch (err: unknown) {
      console.error('[useMoodboard] Failed to add Google Drive items:', err);
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan inspirasi dari Google Drive.';
      setError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Item
  const updateItem = async (itemId: string, input: UpdateMoodboardItemInput): Promise<MoodboardItem> => {
    if (!workspaceId) {
      throw new Error('Workspace belum diinisialisasi.');
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updated = await moodboardRepository.updateMoodboardItem(workspaceId, itemId, input);
      setItems((prev) => prev.map((item) => (item.id === itemId ? updated : item)));
      setEditingItem(null);
      return updated;
    } catch (err: unknown) {
      console.error('[useMoodboard] Failed to update item:', err);
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui inspirasi.';
      setError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Favorite toggle
  const toggleFavorite = async (itemId: string): Promise<void> => {
    if (!workspaceId) return;

    const target = items.find((i) => i.id === itemId);
    if (!target) return;

    const nextState = !target.isFavorite;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, isFavorite: nextState } : i))
    );

    try {
      await moodboardRepository.toggleFavoriteMoodboardItem(workspaceId, itemId, nextState);
    } catch (err) {
      console.error('[useMoodboard] Failed to toggle favorite:', err);
      // Rollback
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, isFavorite: target.isFavorite } : i))
      );
    }
  };

  // Delete Item
  const deleteItem = async (itemId: string): Promise<void> => {
    if (!workspaceId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await moodboardRepository.deleteMoodboardItem(workspaceId, itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      if (selectedItemId === itemId) {
        setSelectedItemId(null);
      }
    } catch (err: unknown) {
      console.error('[useMoodboard] Failed to delete item:', err);
      const msg = err instanceof Error ? err.message : 'Gagal menghapus inspirasi.';
      setError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    moodboard,
    items,
    filteredItems,
    selectedCategory,
    searchQuery,
    sortOrder,
    selectedItemId,
    selectedItem,
    isAddModalOpen,
    editingItem,
    isLoading,
    isSubmitting,
    error,
    setSelectedCategory,
    setSearchQuery,
    setSortOrder,
    setSelectedItemId,
    setIsAddModalOpen,
    setEditingItem,
    refresh: loadData,
    addItem,
    addGoogleDriveItems,
    updateItem,
    toggleFavorite,
    deleteItem,
  };
}
