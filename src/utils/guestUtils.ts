/**
 * WedFlow Guest Pure Utilities (Tamu v1)
 */

import {
  Guest,
  GuestSide,
  GuestInvitationStatus,
  GuestRsvpStatus,
} from '../types/guest';

export interface CreateGuestInput {
  name: string;
  side?: GuestSide;
  invitationStatus?: GuestInvitationStatus;
  rsvpStatus?: GuestRsvpStatus;
  pax?: number;
  phone?: string | null;
  notes?: string | null;
}

export interface UpdateGuestInput {
  name?: string;
  side?: GuestSide;
  invitationStatus?: GuestInvitationStatus;
  rsvpStatus?: GuestRsvpStatus;
  pax?: number;
  phone?: string | null;
  notes?: string | null;
}

export interface GuestSummary {
  totalPax: number;
  attendingPax: number;
  pendingPax: number;
  notAttendingPax: number;
  invitedPax: number;
  notInvitedPax: number;
  totalGuestsCount: number;
}

/**
 * Validates whether a value is a valid positive integer (>= 1).
 */
export function isValidPax(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 1;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return false;
    const num = parseInt(trimmed, 10);
    return Number.isInteger(num) && num >= 1;
  }
  return false;
}

/**
 * Parses and validates pax. Returns positive integer or null if invalid.
 */
export function validatePax(value: unknown): number | null {
  if (isValidPax(value)) {
    if (typeof value === 'number') return value;
    return parseInt((value as string).trim(), 10);
  }
  return null;
}

/**
 * Generates a unique guest ID.
 */
function generateGuestId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
}

/**
 * Creates a new Guest record with default values.
 * Default new Guest:
 *   side = 'shared'
 *   pax = 1
 *   invitationStatus = 'not_invited'
 *   rsvpStatus = 'pending'
 */
export function createGuest(
  existingGuests: Guest[],
  input: CreateGuestInput
): { updatedGuests: Guest[]; newGuest: Guest } {
  const now = new Date().toISOString();

  let pax = 1;
  if (input.pax !== undefined) {
    const valid = validatePax(input.pax);
    if (valid !== null) {
      pax = valid;
    }
  }

  const newGuest: Guest = {
    id: generateGuestId(),
    name: input.name.trim(),
    side: input.side ?? 'shared',
    invitationStatus: input.invitationStatus ?? 'not_invited',
    rsvpStatus: input.rsvpStatus ?? 'pending',
    pax,
    phone: input.phone?.trim() ? input.phone.trim() : null,
    notes: input.notes?.trim() ? input.notes.trim() : null,
    createdAt: now,
    updatedAt: now,
  };

  return {
    updatedGuests: [newGuest, ...existingGuests],
    newGuest,
  };
}

/**
 * Updates an existing Guest by ID.
 */
export function updateGuest(
  existingGuests: Guest[],
  guestId: string,
  input: UpdateGuestInput
): Guest[] {
  const now = new Date().toISOString();

  return existingGuests.map((guest) => {
    if (guest.id !== guestId) return guest;

    let updatedPax = guest.pax;
    if (input.pax !== undefined) {
      const valid = validatePax(input.pax);
      if (valid !== null) {
        updatedPax = valid;
      }
    }

    return {
      ...guest,
      name: input.name !== undefined ? input.name.trim() : guest.name,
      side: input.side ?? guest.side,
      invitationStatus: input.invitationStatus ?? guest.invitationStatus,
      rsvpStatus: input.rsvpStatus ?? guest.rsvpStatus,
      pax: updatedPax,
      phone:
        input.phone !== undefined
          ? input.phone?.trim()
            ? input.phone.trim()
            : null
          : guest.phone,
      notes:
        input.notes !== undefined
          ? input.notes?.trim()
            ? input.notes.trim()
            : null
          : guest.notes,
      updatedAt: now,
    };
  });
}

/**
 * Deletes a Guest by ID.
 */
export function deleteGuest(
  existingGuests: Guest[],
  guestId: string
): { updatedGuests: Guest[] } {
  return {
    updatedGuests: existingGuests.filter((g) => g.id !== guestId),
  };
}

/**
 * Filters guests based on query (by name), side, rsvpStatus, and invitationStatus.
 */
export function filterGuests(
  guests: Guest[],
  query: string,
  sideFilter: GuestSide | 'all' = 'all',
  rsvpFilter: GuestRsvpStatus | 'all' = 'all',
  invitationFilter: GuestInvitationStatus | 'all' = 'all'
): Guest[] {
  const q = query.trim().toLowerCase();

  return guests.filter((guest) => {
    if (q && !guest.name.toLowerCase().includes(q)) {
      return false;
    }
    if (sideFilter !== 'all' && guest.side !== sideFilter) {
      return false;
    }
    if (rsvpFilter !== 'all' && guest.rsvpStatus !== rsvpFilter) {
      return false;
    }
    if (invitationFilter !== 'all' && guest.invitationStatus !== invitationFilter) {
      return false;
    }
    return true;
  });
}

/**
 * Derives guest summary metrics from Guest array.
 * Note: Metric sums represent total Pax, not just number of guest entries.
 */
export function getGuestSummary(guests: Guest[]): GuestSummary {
  let totalPax = 0;
  let attendingPax = 0;
  let pendingPax = 0;
  let notAttendingPax = 0;
  let invitedPax = 0;
  let notInvitedPax = 0;

  for (const guest of guests) {
    const pax = guest.pax || 0;
    totalPax += pax;

    if (guest.rsvpStatus === 'attending') {
      attendingPax += pax;
    } else if (guest.rsvpStatus === 'pending') {
      pendingPax += pax;
    } else if (guest.rsvpStatus === 'not_attending') {
      notAttendingPax += pax;
    }

    if (guest.invitationStatus === 'invited') {
      invitedPax += pax;
    } else if (guest.invitationStatus === 'not_invited') {
      notInvitedPax += pax;
    }
  }

  return {
    totalPax,
    attendingPax,
    pendingPax,
    notAttendingPax,
    invitedPax,
    notInvitedPax,
    totalGuestsCount: guests.length,
  };
}

/**
 * Filter guests by Side.
 */
export function getGuestsBySide(guests: Guest[], side: GuestSide): Guest[] {
  return guests.filter((g) => g.side === side);
}

/**
 * Filter guests by RSVP status.
 */
export function getGuestsByRsvpStatus(
  guests: Guest[],
  rsvpStatus: GuestRsvpStatus
): Guest[] {
  return guests.filter((g) => g.rsvpStatus === rsvpStatus);
}

/**
 * Filter guests by Invitation status.
 */
export function getGuestsByInvitationStatus(
  guests: Guest[],
  invitationStatus: GuestInvitationStatus
): Guest[] {
  return guests.filter((g) => g.invitationStatus === invitationStatus);
}
