import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Guest } from '../../types/guest';
import {
  GUEST_SIDE_LABELS,
  GUEST_INVITATION_LABELS,
  GUEST_RSVP_LABELS,
} from '../../domain/guests';

export interface GuestCardProps {
  guest: Guest;
  onClick: (guest: Guest) => void;
}

export const GuestCard: React.FC<GuestCardProps> = ({ guest, onClick }) => {
  const rsvpBadgeColor =
    guest.rsvpStatus === 'attending'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : guest.rsvpStatus === 'not_attending'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-amber-50 text-amber-700 border-amber-200';

  const invitationBadgeColor =
    guest.invitationStatus === 'invited'
      ? 'bg-burgundy-50 text-burgundy-800 border-burgundy-200'
      : 'bg-ivory-100 text-charcoal-500 border-beige';

  return (
    <div
      onClick={() => onClick(guest)}
      className="bg-white rounded-2xl p-4 border border-beige shadow-xs hover:border-burgundy-200 transition-all cursor-pointer min-h-[52px] flex items-center justify-between gap-3 active:bg-ivory-50"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(guest);
        }
      }}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-serif text-base font-bold text-charcoal truncate">
            {guest.name}
          </h4>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${rsvpBadgeColor}`}
          >
            {GUEST_RSVP_LABELS[guest.rsvpStatus]}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-charcoal-400">
          <span className="font-medium text-charcoal-600">
            {GUEST_SIDE_LABELS[guest.side]}
          </span>
          <span>·</span>
          <span>{guest.pax} orang</span>
        </div>

        <div className="pt-0.5">
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded border inline-block ${invitationBadgeColor}`}
          >
            {GUEST_INVITATION_LABELS[guest.invitationStatus]}
          </span>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-charcoal-300 shrink-0" />
    </div>
  );
};
