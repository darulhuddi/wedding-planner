import { describe, it, expect } from 'vitest';
import {
  parseTags,
  validateImageFile,
  validateCreateMoodboardItemInput,
  validateUpdateMoodboardItemInput,
  MAX_IMAGE_FILE_SIZE_BYTES,
} from './validation';

describe('Moodboard Validation & Helper Tests', () => {
  describe('parseTags', () => {
    it('parses comma-separated tag string correctly', () => {
      const result = parseTags('warm, floral, elegant');
      expect(result).toEqual(['warm', 'floral', 'elegant']);
    });

    it('parses hashtag strings with leading # correctly', () => {
      const result = parseTags('#warm #floral #elegant');
      expect(result).toEqual(['warm', 'floral', 'elegant']);
    });

    it('handles mixed arrays and strings with deduplication', () => {
      const result = parseTags(['#Warm', 'floral', 'warm']);
      expect(result).toEqual(['warm', 'floral']);
    });

    it('returns empty array for empty inputs', () => {
      expect(parseTags('')).toEqual([]);
      expect(parseTags(null)).toEqual([]);
      expect(parseTags(undefined)).toEqual([]);
    });
  });

  describe('validateImageFile', () => {
    it('passes for valid image files under 5MB', () => {
      const validFile = new File(['dummy content'], 'test.webp', { type: 'image/webp' });
      const result = validateImageFile(validFile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails if file size exceeds 5MB limit', () => {
      const largeContent = new Uint8Array(MAX_IMAGE_FILE_SIZE_BYTES + 1024);
      const largeFile = new File([largeContent], 'heavy.jpg', { type: 'image/jpeg' });
      const result = validateImageFile(largeFile);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('melebihi batas 5 MB');
    });

    it('fails if mime type is not image', () => {
      const pdfFile = new File(['pdf text'], 'doc.pdf', { type: 'application/pdf' });
      const result = validateImageFile(pdfFile);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('harus berupa gambar');
    });
  });

  describe('validateCreateMoodboardItemInput', () => {
    it('passes when valid image URL and category are provided', () => {
      const result = validateCreateMoodboardItemInput({
        imageUrl: 'https://images.unsplash.com/photo-1234',
        category: 'decoration',
      });
      expect(result.isValid).toBe(true);
    });

    it('passes when file upload is present without image URL', () => {
      const result = validateCreateMoodboardItemInput(
        {
          category: 'venue',
        },
        true
      );
      expect(result.isValid).toBe(true);
    });

    it('fails when neither image URL nor upload is present', () => {
      const result = validateCreateMoodboardItemInput({
        category: 'dress',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('URL Gambar atau file upload wajib diisi');
    });

    it('fails for invalid category', () => {
      const result = validateCreateMoodboardItemInput({
        imageUrl: 'https://example.com/img.png',
        // @ts-expect-error testing invalid category
        category: 'invalid_cat',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Kategori inspirasi wajib dipilih');
    });
  });
});
