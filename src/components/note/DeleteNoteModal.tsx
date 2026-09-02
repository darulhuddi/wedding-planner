import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Note } from '../../types/note';

export interface DeleteNoteModalProps {
  isOpen: boolean;
  note: Note | null;
  onClose: () => void;
  onConfirmDelete: (noteId: string) => void;
}

export const DeleteNoteModal: React.FC<DeleteNoteModalProps> = ({
  isOpen,
  note,
  onClose,
  onConfirmDelete,
}) => {
  if (!isOpen || !note) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs">
      <div
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-note-title"
        aria-describedby="delete-note-desc"
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

          <h3 id="delete-note-title" className="font-serif text-xl font-bold text-charcoal mb-2">
            Hapus catatan ini?
          </h3>

          <p id="delete-note-desc" className="text-sm text-charcoal-400 leading-relaxed">
            Catatan <strong className="text-charcoal">{note.title}</strong> akan dihapus secara permanen dari workspace.
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
              onClick={() => onConfirmDelete(note.id)}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-burgundy hover:bg-burgundy-700 rounded-xl transition-colors shadow-xs cursor-pointer min-h-touch"
            >
              Hapus Catatan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
