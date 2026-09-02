import React from 'react';
import { MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { Guest } from '../../types/guest';
import {
  GUEST_SIDE_LABELS,
  GUEST_INVITATION_LABELS,
  GUEST_RSVP_LABELS,
} from '../../domain/guests';

export interface GuestRowProps {
  guest: Guest;
  onClick: (guest: Guest) => void;
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
}

export const GuestRow: React.FC<GuestRowProps> = ({
  guest,
  onClick,
  onEdit,
  onDelete,
}) => {
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
    <tr
      onClick={() => onClick(guest)}
      className="group hover:bg-ivory-50 transition-colors border-b border-beige cursor-pointer"
    >
      {/* 1. Nama */}
      <td className="py-3.5 px-4 font-serif font-bold text-charcoal text-sm min-w-[160px]">
        <div className="flex flex-col">
          <span className="truncate max-w-[180px] sm:max-w-[240px] xl:max-w-[320px]">
            {guest.name}
          </span>
          {guest.phone && (
            <span className="font-sans text-[11px] font-normal text-charcoal-400">
              {guest.phone}
            </span>
          )}
        </div>
      </td>

      {/* 2. Pihak */}
      <td className="py-3.5 px-4 text-xs font-medium text-charcoal-600 min-w-[115px] w-[115px] whitespace-nowrap">
        {GUEST_SIDE_LABELS[guest.side]}
      </td>

      {/* 3. Jumlah Orang */}
      <td className="py-3.5 px-4 text-xs font-semibold text-charcoal min-w-[120px] w-[120px] whitespace-nowrap">
        {guest.pax} orang
      </td>

      {/* 4. Undangan */}
      <td className="py-3.5 px-4 min-w-[130px] w-[130px]">
        <span
          className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border inline-block whitespace-nowrap ${invitationBadgeColor}`}
        >
          {GUEST_INVITATION_LABELS[guest.invitationStatus]}
        </span>
      </td>

      {/* 5. RSVP */}
      <td className="py-3.5 px-4 min-w-[135px] w-[135px]">
        <span
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-block whitespace-nowrap ${rsvpBadgeColor}`}
        >
          {GUEST_RSVP_LABELS[guest.rsvpStatus]}
        </span>
      </td>

      {/* 6. Action */}
      <td className="py-3.5 px-4 text-right min-w-[95px] w-[95px] whitespace-nowrap">
        <div
          className="inline-flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onEdit(guest)}
            className="p-1.5 text-charcoal-400 hover:text-burgundy hover:bg-ivory-100 rounded-lg transition-colors cursor-pointer"
            title="Edit Tamu"
            aria-label="Edit Tamu"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(guest)}
            className="p-1.5 text-charcoal-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Hapus Tamu"
            aria-label="Hapus Tamu"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onClick(guest)}
            className="p-1.5 text-charcoal-400 hover:text-charcoal hover:bg-ivory-100 rounded-lg transition-colors cursor-pointer"
            title="Detail Tamu"
            aria-label="Detail Tamu"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};
