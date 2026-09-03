import { describe, it, expect } from 'vitest';
import {
  isValidReligiousTradition,
  normalizeReligiousContexts,
  normalizeCulturalContext,
  validateReligiousContext,
  RELIGIOUS_TRADITIONS,
  ReligiousContext,
  CulturalContext,
} from './context';

describe('Wedding Context Domain & Validation Tests', () => {
  describe('ReligiousTradition Validation', () => {
    it('validates canonical religious traditions', () => {
      RELIGIOUS_TRADITIONS.forEach((tradition) => {
        expect(isValidReligiousTradition(tradition)).toBe(true);
      });
    });

    it('rejects invalid religious traditions', () => {
      expect(isValidReligiousTradition('unknown_religion')).toBe(false);
      expect(isValidReligiousTradition('')).toBe(false);
      expect(isValidReligiousTradition(null)).toBe(false);
      expect(isValidReligiousTradition(123)).toBe(false);
    });
  });

  describe('ReligiousContext Normalization', () => {
    it('normalizes null/undefined/non-array safely to empty array without default guessing', () => {
      expect(normalizeReligiousContexts(null)).toEqual([]);
      expect(normalizeReligiousContexts(undefined)).toEqual([]);
      expect(normalizeReligiousContexts('islam')).toEqual([]);
      expect(normalizeReligiousContexts({})).toEqual([]);
    });

    it('normalizes valid religious context array and trims labels', () => {
      const input = [
        { tradition: 'islam', label: '  KUA Kebayoran  ' },
        { tradition: 'catholic', label: null },
      ];

      const expected: ReligiousContext[] = [
        { tradition: 'islam', label: 'KUA Kebayoran' },
        { tradition: 'catholic', label: null },
      ];

      expect(normalizeReligiousContexts(input)).toEqual(expected);
    });

    it('falls back invalid tradition inside array to unspecified', () => {
      const input = [{ tradition: 'invalid_custom', label: 'Custom' }];
      const normalized = normalizeReligiousContexts(input);

      expect(normalized).toEqual([{ tradition: 'unspecified', label: 'Custom' }]);
    });
  });

  describe('CulturalContext Normalization', () => {
    it('normalizes null/undefined/non-object safely without inferring ethnicity', () => {
      const expected: CulturalContext = {
        hasTradition: null,
        description: null,
      };

      expect(normalizeCulturalContext(null)).toEqual(expected);
      expect(normalizeCulturalContext(undefined)).toEqual(expected);
      expect(normalizeCulturalContext('jawa')).toEqual(expected);
    });

    it('preserves free-form cultural descriptions without hardcoded restriction', () => {
      const sampleDescriptions = [
        'Adat Jawa Solo & Sunda',
        'Tradisi keluarga Tionghoa (Tea Pai)',
        'Belum menentukan rangkaian adat',
        'Rangkaian adat dari keluarga kedua pihak',
      ];

      sampleDescriptions.forEach((desc) => {
        const input = { hasTradition: true, description: `  ${desc}  ` };
        const result = normalizeCulturalContext(input);

        expect(result.hasTradition).toBe(true);
        expect(result.description).toBe(desc);
      });
    });
  });

  describe('validateReligiousContext', () => {
    it('validates single ReligiousContext object', () => {
      expect(validateReligiousContext({ tradition: 'islam', label: null }).isValid).toBe(true);
      expect(validateReligiousContext({ tradition: 'mixed', label: 'Lintas Tradisi' }).isValid).toBe(true);
      expect(validateReligiousContext({ tradition: 'invalid' }).isValid).toBe(false);
      expect(validateReligiousContext(null).isValid).toBe(false);
    });
  });
});
