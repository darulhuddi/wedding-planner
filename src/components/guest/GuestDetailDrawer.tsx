import React, { useEffect } from 'react';
import {
  X,
  Edit2,
  Trash2,
  Phone,
  FileText,
  Users,
  Mail,
  UserCheck,
} from 'lucide-react';
import { Guest } from '../../types/guest';
import {
  GUEST_SIDE_LABELS,
  GUEST_INVITATION_LABELS,
  GUEST_RSVP_LABELS,
} from '../../domain/guests';

export interface GuestDetailDrawerProps {
  guest: Guest | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (guest: Guest) => void;
  onDeleteRequest: (guest: Guest) => void;
}

export const GuestDetailDrawer: React.FC<GuestDetailDrawerProps> = ({
  guest,
  isOpen,
  onClose,
  onEdit,
  onDeleteRequest,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !guest) return null;

  const rsvpBadgeColor =
    guest.rsvpStatus === 'attending'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : guest.rsvpStatus === 'not_attending'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-amber-50 text-amber-700 border-amber-200';

  const invitationBadgeColor =
    guest.invitationStatus === 'invited'
      ? 'bg-burgundy-50 text-burgundy-800 border-burgundy-200'
      : 'bg-ivory-200 text-charcoal-500 border-beige-300';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-charcoal/40 backdrop-blur-xs flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-beige flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-burgundy bg-burgundy-50 border border-burgundy-100 px-2 py-0.5 rounded-full inline-block mb-1.5">
              {GUEST_SIDE_LABELS[guest.side]}
            </span>
            <h2 className="font-serif text-2xl font-bold text-charcoal truncate">
              {guest.name}
            </h2>
            <p className="text-xs text-charcoal-400 mt-0.5">
              {guest.pax} orang
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-charcoal-400 hover:text-charcoal bg-ivory-100 hover:bg-beige-200 rounded-full transition-colors cursor-pointer shrink-0 min-h-touch min-w-touch flex items-center justify-center"
            aria-label="Tutup detail"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Status Indicators Card */}
          <div className="bg-ivory-50 rounded-2xl p-4 border border-beige space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-charcoal-500 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-burgundy" />
                Status Kehadiran
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${rsvpBadgeColor}`}
              >
                {GUEST_RSVP_LABELS[guest.rsvpStatus]}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-beige/60">
              <span className="text-xs font-semibold text-charcoal-500 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-burgundy" />
                Status Undangan
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${invitationBadgeColor}`}
              >
                {GUEST_INVITATION_LABELS[guest.invitationStatus]}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-beige/60">
              <span className="text-xs font-semibold text-charcoal-500 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-burgundy" />
                Jumlah Orang
              </span>
              <span className="text-xs font-bold text-charcoal">
                {guest.pax} orang
              </span>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-400">
              Informasi Kontak
            </h3>

            {guest.phone ? (
              <div className="flex items-center gap-3 p-3 bg-white border border-beige rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-charcoal-400 block">No. Telepon / WA</span>
                  <a
                    href={`tel:${guest.phone}`}
                    className="text-xs font-semibold text-charcoal hover:text-burgundy transition-colors truncate block"
                  >
                    {guest.phone}
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-xs text-charcoal-400 italic">
                Belum ada nomor telepon tersimpan.
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-400">
              Catatan
            </h3>

            {guest.notes ? (
              <div className="p-3.5 bg-ivory-50 border border-beige rounded-xl flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-charcoal-400 shrink-0 mt-0.5" />
                <p className="text-xs text-charcoal leading-relaxed whitespace-pre-wrap">
                  {guest.notes}
                </p>
              </div>
            ) : (
              <p className="text-xs text-charcoal-400 italic">
                Belum ada catatan untuk tamu ini.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-beige bg-ivory-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onDeleteRequest(guest)}
            className="px-3.5 py-2.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 min-h-touch"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Tamu</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(guest)}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-burgundy hover:bg-burgundy-700 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 min-h-touch"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Tamu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
