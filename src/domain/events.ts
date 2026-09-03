/**
 * WedFlow Wedding Event Domain Types & Pure Validation Utilities
 *
 * Part of Phase 1: Wedding Context & Event Foundation.
 * Provides types and pure validation for wedding events.
 *
 * Principles:
 * - date: YYYY-MM-DD
 * - time: HH:mm
 * - Do not enforce arbitrary ordering between event types.
 * - Pure functions with zero side-effects.
 */

export type EventType =
  | 'ceremony'
  | 'reception'
  | 'cultural'
  | 'family'
  | 'other';

export interface WeddingEvent {
  id: string;
  workspaceId: string;
  type: EventType;
  name: string;
  date: string | null;      // YYYY-MM-DD
  startTime: string | null; // HH:mm
  endTime: string | null;   // HH:mm
  location: string | null;
  createdAt: string;        // ISO timestamp
  updatedAt: string;        // ISO timestamp
}

export const EVENT_TYPES: EventType[] = [
  'ceremony',
  'reception',
  'cultural',
  'family',
  'other',
];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  ceremony: 'Akad Nikah / Pemberkatan / Upacara Keagamaan',
  reception: 'Resepsi Pernikahan',
  cultural: 'Rangkaian Adat / Budaya',
  family: 'Acara Keluarga / Lamaran / Syukuran',
  other: 'Acara Lainnya',
};

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Type guard for EventType.
 */
export function isValidEventType(val: unknown): val is EventType {
  return typeof val === 'string' && EVENT_TYPES.includes(val as EventType);
}

/**
 * Validates HH:mm time format.
 */
export function isValidTimeFormat(val: string | null | undefined): boolean {
  if (!val) return true;
  return TIME_REGEX.test(val.trim());
}

/**
 * Validates YYYY-MM-DD date format.
 */
export function isValidDateFormat(val: string | null | undefined): boolean {
  if (!val) return true;
  if (!DATE_REGEX.test(val.trim())) return false;
  const [year, month, day] = val.trim().split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

/**
 * Validates start and end times consistency.
 * If both exist, endTime must not be earlier than startTime.
 */
export function validateEventTimes(
  startTime: string | null | undefined,
  endTime: string | null | undefined
): { isValid: boolean; error?: string } {
  if (startTime && !isValidTimeFormat(startTime)) {
    return { isValid: false, error: 'Format waktu mulai tidak valid (gunakan format HH:mm).' };
  }

  if (endTime && !isValidTimeFormat(endTime)) {
    return { isValid: false, error: 'Format waktu selesai tidak valid (gunakan format HH:mm).' };
  }

  if (startTime && endTime) {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (endMinutes < startMinutes) {
      return {
        isValid: false,
        error: 'Waktu selesai tidak boleh lebih awal dari waktu mulai.',
      };
    }
  }

  return { isValid: true };
}

/**
 * Pure validation for a WeddingEvent entity or creation payload.
 */
export function validateWeddingEvent(
  event: Partial<WeddingEvent>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!event.name || typeof event.name !== 'string' || event.name.trim().length === 0) {
    errors.push('Nama acara wajib diisi.');
  }

  if (!event.type || !isValidEventType(event.type)) {
    errors.push(`Tipe acara tidak valid. Harus salah satu dari: ${EVENT_TYPES.join(', ')}.`);
  }

  if (event.date && !isValidDateFormat(event.date)) {
    errors.push('Format tanggal tidak valid (gunakan format YYYY-MM-DD).');
  }

  const timeValidation = validateEventTimes(event.startTime, event.endTime);
  if (!timeValidation.isValid && timeValidation.error) {
    errors.push(timeValidation.error);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
