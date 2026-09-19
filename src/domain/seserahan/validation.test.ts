import { describe, it, expect } from 'vitest';
import {
  isValidItemStatus,
  validateSeserahanPlan,
  validateSeserahanCategory,
  validateSeserahanItem,
} from './validation';

describe('Seserahan Domain Validation Tests', () => {
  describe('isValidItemStatus', () => {
    it('accepts valid statuses', () => {
      expect(isValidItemStatus('planned')).toBe(true);
      expect(isValidItemStatus('purchased')).toBe(true);
      expect(isValidItemStatus('completed')).toBe(true);
    });

    it('rejects invalid statuses', () => {
      expect(isValidItemStatus('in_progress')).toBe(false);
      expect(isValidItemStatus('')).toBe(false);
      expect(isValidItemStatus(null)).toBe(false);
      expect(isValidItemStatus(undefined)).toBe(false);
      expect(isValidItemStatus(123)).toBe(false);
    });
  });

  describe('validateSeserahanPlan', () => {
    it('passes for a valid plan', () => {
      const result = validateSeserahanPlan({
        name: 'Seserahan Utama',
        budget: 10000000,
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects negative budget', () => {
      const result = validateSeserahanPlan({
        name: 'Seserahan',
        budget: -50000,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Budget seserahan tidak boleh negatif.');
    });

    it('rejects empty plan name', () => {
      const result = validateSeserahanPlan({
        name: '   ',
        budget: 5000000,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Nama rencana seserahan tidak boleh kosong.');
    });
  });

  describe('validateSeserahanCategory', () => {
    it('passes for a valid category', () => {
      const result = validateSeserahanCategory({
        name: 'Perlengkapan Ibadah',
        sortOrder: 1,
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects missing or empty category name', () => {
      const result1 = validateSeserahanCategory({ name: '' });
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Nama kategori seserahan wajib diisi.');

      const result2 = validateSeserahanCategory({ name: '   ' });
      expect(result2.isValid).toBe(false);

      const result3 = validateSeserahanCategory({});
      expect(result3.isValid).toBe(false);
    });

    it('rejects negative sort order', () => {
      const result = validateSeserahanCategory({
        name: 'Busana',
        sortOrder: -1,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Nomor urut kategori harus berupa angka non-negatif.');
    });
  });

  describe('validateSeserahanItem', () => {
    it('passes for a valid item', () => {
      const result = validateSeserahanItem({
        name: 'Mukena Sutra',
        status: 'planned',
        estimatedCost: 750000,
        actualCost: 0,
        sortOrder: 1,
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects missing or empty item name', () => {
      const result1 = validateSeserahanItem({ name: '' });
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Nama barang seserahan wajib diisi.');

      const result2 = validateSeserahanItem({ name: '   ' });
      expect(result2.isValid).toBe(false);
    });

    it('rejects invalid item status', () => {
      const result = validateSeserahanItem({
        name: 'Parfum',
        status: 'unknown_status' as any,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Status barang tidak valid');
    });

    it('rejects negative estimated cost', () => {
      const result = validateSeserahanItem({
        name: 'Sepatu',
        estimatedCost: -200000,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Estimasi biaya tidak boleh bernilai negatif.');
    });

    it('rejects negative actual cost', () => {
      const result = validateSeserahanItem({
        name: 'Sepatu',
        actualCost: -10000,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Biaya aktual tidak boleh bernilai negatif.');
    });

    it('rejects negative sort order', () => {
      const result = validateSeserahanItem({
        name: 'Tas',
        sortOrder: -5,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Nomor urut barang harus berupa angka non-negatif.');
    });
  });
});
