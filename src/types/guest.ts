/**
 * WedFlow Guest Domain Types (Tamu v1)
 */

export type GuestSide = 'groom' | 'bride' | 'shared';

export type GuestInvitationStatus = 'not_invited' | 'invited';

export type GuestRsvpStatus = 'pending' | 'attending' | 'not_attending';

export interface Guest {
  id: string;
  name: string;
  side: GuestSide;
  invitationStatus: GuestInvitationStatus;
  rsvpStatus: GuestRsvpStatus;
  pax: number;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
