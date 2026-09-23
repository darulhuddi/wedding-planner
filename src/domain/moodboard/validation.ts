/**
 * WedSiap Moodboard Validation & Utilities
 */

import { CreateMoodboardItemInput, UpdateMoodboardItemInput, MOODBOARD_CATEGORIES, MoodboardCategory } from './types';

export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Normalizes input tag string or array into clean lowercase hashtag/word array.
 * Example: "#warm, #floral, elegant" -> ["warm", "floral", "elegant"]
 */
export function parseTags(tagsInput: string[] | string | undefined | null): string[] {
  if (!tagsInput) return [];
  
  let rawItems: string[] = [];
  if (Array.isArray(tagsInput)) {
    rawItems = tagsInput;
  } else if (typeof tagsInput === 'string') {
    rawItems = tagsInput.split(/[\s,]+/);
  }

  const cleaned = rawItems
    .map((tag) => tag.trim().replace(/^#+/, '').toLowerCase())
    .filter((tag) => tag.length > 0);

  // Return unique tags preserving order
  return Array.from(new Set(cleaned));
}

/**
 * Validates file upload constraints (max 5MB, image mime type).
 */
export function validateImageFile(file: File): ValidationResult {
  const errors: string[] = [];

  if (!file) {
    errors.push('File gambar tidak boleh kosong.');
    return { isValid: false, errors };
  }

  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    errors.push(`Ukuran file gambar melebihi batas 5 MB (ukuran file: ${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
  }

  if (!file.type.startsWith('image/')) {
    errors.push('File yang diunggah harus berupa gambar (JPG, PNG, WebP, GIF).');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates create item input payload.
 */
export function validateCreateMoodboardItemInput(
  input: CreateMoodboardItemInput,
  hasUploadedFile: boolean = false
): ValidationResult {
  const errors: string[] = [];

  if (!hasUploadedFile && (!input.imageUrl || !input.imageUrl.trim())) {
    errors.push('URL Gambar atau file upload wajib diisi.');
  }

  if (input.imageUrl && input.imageUrl.trim()) {
    const url = input.imageUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:image/')) {
      errors.push('URL Gambar harus dimulai dengan http:// atau https://');
    }
  }

  const validCategories = MOODBOARD_CATEGORIES.filter((c) => c.id !== 'all').map((c) => c.id as string);
  if (!input.category || !validCategories.includes(input.category)) {
    errors.push('Kategori inspirasi wajib dipilih dan harus valid.');
  }

  if (input.sourceUrl && input.sourceUrl.trim()) {
    const sUrl = input.sourceUrl.trim();
    if (!sUrl.startsWith('http://') && !sUrl.startsWith('https://')) {
      errors.push('Source URL harus berupa tautan web yang valid (dimulai dengan http:// atau https://).');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates update item input payload.
 */
export function validateUpdateMoodboardItemInput(input: UpdateMoodboardItemInput): ValidationResult {
  const errors: string[] = [];

  if (input.category) {
    const validCategories = MOODBOARD_CATEGORIES.filter((c) => c.id !== 'all').map((c) => c.id as string);
    if (!validCategories.includes(input.category)) {
      errors.push('Kategori inspirasi tidak valid.');
    }
  }

  if (input.sourceUrl && input.sourceUrl.trim()) {
    const sUrl = input.sourceUrl.trim();
    if (!sUrl.startsWith('http://') && !sUrl.startsWith('https://')) {
      errors.push('Source URL harus berupa tautan web yang valid (dimulai dengan http:// atau https://).');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
