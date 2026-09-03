import { describe, it, expect } from 'vitest';
import {
  isValidEventType,
  isValidDateFormat,
  isValidTimeFormat,
  validateEventTimes,
  validateWeddingEvent,
  EVENT_TYPES,
  WeddingEvent,
} from './events';

describe('Wedding Events Domain & Validation Tests', () => {
  describe('EventType Validation', () => {
    it('validates all canonical EventType values', () => {
      EVENT_TYPES.forEach((type) => {
        expect(isValidEventType(type)).toBe(true);
      });
    });

    it('rejects invalid event types', () => {
      expect(isValidEventType('party')).toBe(false);
      expect(isValidEventType('')).toBe(false);
      expect(isValidEventType(null)).toBe(false);
      expect(isValidEventType(123)).toBe(false);
    });
  });

  describe('Date and Time Validation', () => {
    it('validates YYYY-MM-DD date formats', () => {
      expect(isValidDateFormat('2027-06-20')).toBe(true);
      expect(isValidDateFormat('2026-12-31')).toBe(true);
      expect(isValidDateFormat('2027-02-29')).toBe(false); // 2027 is not leap
      expect(isValidDateFormat('20-06-2027')).toBe(false);
      expect(isValidDateFormat('invalid')).toBe(false);
      expect(isValidDateFormat(null)).toBe(true); // optional
      expect(isValidDateFormat(undefined)).toBe(true); // optional
    });

    it('validates HH:mm time formats', () => {
      expect(isValidTimeFormat('08:00')).toBe(true);
      expect(isValidTimeFormat('19:30')).toBe(true);
      expect(isValidTimeFormat('23:59')).toBe(true);
      expect(isValidTimeFormat('24:00')).toBe(false);
      expect(isValidTimeFormat('8:00')).toBe(false);
      expect(isValidTimeFormat('19:60')).toBe(false);
      expect(isValidTimeFormat(null)).toBe(true); // optional
    });

    it('validates that endTime is not earlier than startTime', () => {
      expect(validateEventTimes('08:00', '11:00').isValid).toBe(true);
      expect(validateEventTimes('10:00', '10:00').isValid).toBe(true);
      expect(validateEventTimes('19:00', '22:00').isValid).toBe(true);

      const invalidTime = validateEventTimes('14:00', '11:00');
      expect(invalidTime.isValid).toBe(false);
      expect(invalidTime.error).toContain('tidak boleh lebih awal');
    });
  });

  describe('WeddingEvent Entity Validation', () => {
    it('passes validation for valid event payload', () => {
      const validEvent: Partial<WeddingEvent> = {
        name: 'Akad Nikah',
        type: 'ceremony',
        date: '2027-06-20',
        startTime: '08:00',
        endTime: '11:00',
        location: 'Masjid Agung',
      };

      const result = validateWeddingEvent(validEvent);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates required name and rejects empty or whitespace-only name', () => {
      const emptyName = validateWeddingEvent({
        name: '   ',
        type: 'ceremony',
      });
      expect(emptyName.isValid).toBe(false);
      expect(emptyName.errors).toContain('Nama acara wajib diisi.');
    });

    it('rejects invalid event type in event entity', () => {
      const invalidType = validateWeddingEvent({
        name: 'Syukuran',
        type: 'invalid_type' as any,
      });
      expect(invalidType.isValid).toBe(false);
      expect(invalidType.errors[0]).toContain('Tipe acara tidak valid');
    });

    it('does not enforce arbitrary date ordering between event types (supports any sequence)', () => {
      // Cultural event before ceremony is valid
      const culturalEvent: Partial<WeddingEvent> = {
        name: 'Siraman',
        type: 'cultural',
        date: '2027-06-19',
      };
      // Ceremony on wedding day
      const ceremonyEvent: Partial<WeddingEvent> = {
        name: 'Akad Nikah',
        type: 'ceremony',
        date: '2027-06-20',
      };

      expect(validateWeddingEvent(culturalEvent).isValid).toBe(true);
      expect(validateWeddingEvent(ceremonyEvent).isValid).toBe(true);
    });
  });
});
