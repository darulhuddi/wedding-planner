/**
 * WedFlow Guest Domain Constants & Labels (Tamu v1)
 */

import { GuestSide, GuestInvitationStatus, GuestRsvpStatus } from '../types/guest';

export const GUEST_SIDE_LABELS: Record<GuestSide, string> = {
  groom: 'Pihak Pria',
  bride: 'Pihak Wanita',
  shared: 'Bersama',
};

export const GUEST_INVITATION_LABELS: Record<GuestInvitationStatus, string> = {
  not_invited: 'Belum Diundang',
  invited: 'Diundang',
};

export const GUEST_RSVP_LABELS: Record<GuestRsvpStatus, string> = {
  pending: 'Belum Konfirmasi',
  attending: 'Hadir',
  not_attending: 'Tidak Hadir',
};

export const ALL_GUEST_SIDES: GuestSide[] = ['groom', 'bride', 'shared'];

export const ALL_GUEST_INVITATION_STATUSES: GuestInvitationStatus[] = [
  'not_invited',
  'invited',
];

export const ALL_GUEST_RSVP_STATUSES: GuestRsvpStatus[] = [
  'pending',
  'attending',
  'not_attending',
];
