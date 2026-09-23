import { useState, useEffect } from 'react';
import { MoodboardItem } from '../domain/moodboard/types';
import {
  resolveMoodboardItemImage,
  MoodboardImageResolutionResult,
} from '../services/storage/storageProviders';

export interface UseMoodboardImageState extends MoodboardImageResolutionResult {
  isLoading: boolean;
}

export function useMoodboardImage(item: MoodboardItem | null): UseMoodboardImageState {
  const [state, setState] = useState<UseMoodboardImageState>({
    isLoading: Boolean(item),
    status: 'available',
    src: item?.imageUrl || undefined,
  });

  useEffect(() => {
    if (!item) {
      setState({
        isLoading: false,
        status: 'unavailable',
        reason: 'file_not_found',
        message: 'Foto tidak tersedia',
      });
      return;
    }

    let isMounted = true;

    setState((prev) => ({ ...prev, isLoading: true }));

    resolveMoodboardItemImage(item)
      .then((res) => {
        if (isMounted) {
          setState({
            isLoading: false,
            status: res.status,
            src: res.src,
            reason: res.reason,
            message: res.message,
          });
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('[useMoodboardImage] Error resolving image:', err);
          setState({
            isLoading: false,
            status: 'unavailable',
            reason: 'temporary_error',
            message: 'Gagal memuat foto',
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [item?.id, item?.storageProvider, item?.storageFileId, item?.imageUrl]);

  return state;
}

