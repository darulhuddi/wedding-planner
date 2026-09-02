import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Guest } from '../../types/guest';

export interface DeleteGuestModalProps {
  isOpen: boolean;
  guest: Guest | null;
  onClose: () => void;
  onConfirmDelete: (guestId: string) => void;
}

export const DeleteGuestModal: React.FC<DeleteGuestModalProps> = ({
  isOpen,
  guest,
  onClose,
  onConfirmDelete,
}) => {
  if (!isOpen || !guest) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs">
      <div
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-guest-title"
        aria-describedby="delete-guest-desc"
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-charcoal-400 hover:text-charcoal bg-ivory-100 hover:bg-beige-200 rounded-full transition-colors cursor-pointer min-h-touch min-w-touch flex items-center justify-center"
              aria-label="Tutup modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 id="delete-guest-title" className="font-serif text-xl font-bold text-charcoal mb-2">
            Hapus tamu ini?
          </h3>

          <p id="delete-guest-desc" className="text-sm text-charcoal-400 leading-relaxed">
            Data tamu <strong className="text-charcoal">{guest.name}</strong> akan dihapus dari workspace.
          </p>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-charcoal-600 bg-ivory-100 hover:bg-beige-200 rounded-xl transition-colors cursor-pointer min-h-touch"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => onConfirmDelete(guest.id)}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-burgundy hover:bg-burgundy-700 rounded-xl transition-colors shadow-xs cursor-pointer min-h-touch"
            >
              Hapus Tamu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
