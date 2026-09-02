import React from 'react';
import { Pin } from 'lucide-react';
import { Note } from '../../types/note';
import { NOTE_CATEGORY_LABELS } from '../../domain/notes';
import { formatNoteDate } from '../../utils/noteUtils';

export interface NoteCardProps {
  note: Note;
  onClick: (note: Note) => void;
  onTogglePin?: (e: React.MouseEvent, note: Note) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onClick,
  onTogglePin,
}) => {
  const formattedDate = formatNoteDate(note.updatedAt || note.createdAt);

  return (
    <div
      onClick={() => onClick(note)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(note);
        }
      }}
      className={`group relative bg-white rounded-2xl p-5 border transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between text-left select-none ${
        note.isPinned
          ? 'border-gold-400/60 bg-gradient-to-b from-ivory-50/50 to-white shadow-2xs'
          : 'border-beige hover:border-beige-400'
      }`}
    >
      <div>
        {/* Top Header: Category Pill & Pin Indicator/Toggle */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-semibold text-burgundy-900 bg-burgundy-50/80 border border-burgundy-100/60 px-2.5 py-0.5 rounded-full">
            {NOTE_CATEGORY_LABELS[note.category]}
          </span>

          <div className="flex items-center gap-1">
            {note.isPinned && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gold-700 bg-gold-50 border border-gold-200/70 px-2 py-0.5 rounded-full">
                <Pin className="w-2.5 h-2.5 fill-gold-600 rotate-45" />
                <span>Disematkan</span>
              </span>
            )}

            {onTogglePin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(e, note);
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  note.isPinned
                    ? 'text-gold-600 hover:bg-gold-50'
                    : 'text-charcoal-300 opacity-0 group-hover:opacity-100 hover:text-charcoal hover:bg-ivory-100 focus:opacity-100'
                }`}
                title={note.isPinned ? 'Lepas Sematan' : 'Sematkan Catatan'}
                aria-label={note.isPinned ? 'Lepas Sematan' : 'Sematkan Catatan'}
              >
                <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-gold-600 rotate-45' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Note Title */}
        <h3 className="font-serif text-lg font-bold text-charcoal leading-snug tracking-tight mb-2 group-hover:text-burgundy transition-colors line-clamp-2">
          {note.title}
        </h3>

        {/* Content Preview */}
        <p className="text-xs text-charcoal-500 leading-relaxed line-clamp-4 whitespace-pre-wrap">
          {note.content}
        </p>
      </div>

      {/* Footer: Updated Date */}
      <div className="pt-4 mt-4 border-t border-beige/60 flex items-center justify-between text-[11px] text-charcoal-400">
        <span>Diperbarui {formattedDate}</span>
      </div>
    </div>
  );
};
