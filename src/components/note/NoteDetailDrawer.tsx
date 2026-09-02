import React, { useEffect } from 'react';
import { X, Edit2, Trash2, Pin } from 'lucide-react';
import { Note } from '../../types/note';
import { NOTE_CATEGORY_LABELS } from '../../domain/notes';
import { formatNoteDate } from '../../utils/noteUtils';

export interface NoteDetailDrawerProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (note: Note) => void;
  onDeleteRequest: (note: Note) => void;
  onTogglePin?: (note: Note) => void;
}

export const NoteDetailDrawer: React.FC<NoteDetailDrawerProps> = ({
  note,
  isOpen,
  onClose,
  onEdit,
  onDeleteRequest,
  onTogglePin,
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

  if (!isOpen || !note) return null;

  const formattedDate = formatNoteDate(note.updatedAt || note.createdAt);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-charcoal/40 backdrop-blur-xs flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Drawer Container */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-beige flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-semibold text-burgundy-900 bg-burgundy-50/80 border border-burgundy-100/60 px-2.5 py-0.5 rounded-full inline-block">
                {NOTE_CATEGORY_LABELS[note.category]}
              </span>

              {note.isPinned && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gold-700 bg-gold-50 border border-gold-200/70 px-2 py-0.5 rounded-full">
                  <Pin className="w-2.5 h-2.5 fill-gold-600 rotate-45" />
                  <span>Disematkan</span>
                </span>
              )}
            </div>

            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal leading-tight tracking-tight break-words">
              {note.title}
            </h2>

            <p className="text-xs text-charcoal-400 mt-1.5">
              Diperbarui {formattedDate}
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="prose prose-sm max-w-none text-charcoal-600">
            <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans text-charcoal break-words">
              {note.content}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-beige bg-ivory-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDeleteRequest(note)}
              className="px-3.5 py-2.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 min-h-touch"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>

            {onTogglePin && (
              <button
                type="button"
                onClick={() => onTogglePin(note)}
                className={`px-3.5 py-2.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 min-h-touch ${
                  note.isPinned
                    ? 'bg-gold-50 text-gold-700 border-gold-200 hover:bg-gold-100'
                    : 'bg-white text-charcoal-600 border-beige hover:bg-ivory-100'
                }`}
              >
                <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-gold-600 rotate-45' : ''}`} />
                <span>{note.isPinned ? 'Lepas Sematan' : 'Sematkan'}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onEdit(note)}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-burgundy hover:bg-burgundy-700 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 min-h-touch"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
