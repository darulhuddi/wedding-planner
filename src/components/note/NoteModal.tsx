import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Note, NoteCategory } from '../../types/note';
import { NOTE_CATEGORY_LABELS, ALL_NOTE_CATEGORIES } from '../../domain/notes';

export interface NoteModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialNote?: Note | null;
  onClose: () => void;
  onSave: (data: {
    title: string;
    category: NoteCategory;
    content: string;
    isPinned?: boolean;
  }) => void;
}

export const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  mode,
  initialNote,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<NoteCategory>('general');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && mode === 'edit' && initialNote) {
      setTitle(initialNote.title || '');
      setCategory(initialNote.category || 'general');
      setContent(initialNote.content || '');
      setIsPinned(initialNote.isPinned ?? false);
      setError(null);
    } else if (isOpen && mode === 'create') {
      setTitle('');
      setCategory('general');
      setContent('');
      setIsPinned(false);
      setError(null);
    }
  }, [isOpen, mode, initialNote]);

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

  if (!isOpen) return null;

  const isFormValid = Boolean(title.trim() && content.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setError('Judul catatan wajib diisi');
      return;
    }
    if (!trimmedContent) {
      setError('Isi catatan wajib diisi');
      return;
    }

    onSave({
      title: trimmedTitle,
      category,
      content: trimmedContent,
      isPinned,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs">
      <div
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-modal-title"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 sm:p-6 border-b border-beige">
          <h2 id="note-modal-title" className="font-serif text-xl font-bold text-charcoal">
            {mode === 'create' ? 'Tambah Catatan' : 'Edit Catatan'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-charcoal-400 hover:text-charcoal bg-ivory-100 hover:bg-beige-200 rounded-full transition-colors cursor-pointer min-h-touch min-w-touch flex items-center justify-center"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Judul Field (Required) */}
          <div>
            <label htmlFor="note-title" className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
              Judul <span className="text-burgundy">*</span>
            </label>
            <input
              id="note-title"
              type="text"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Contoh: Kesepakatan Warna Seragam Keluarga"
              className="w-full px-4 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-all"
            />
          </div>

          {/* Kategori Field */}
          <div>
            <label htmlFor="note-category" className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
              Kategori <span className="text-burgundy">*</span>
            </label>
            <select
              id="note-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as NoteCategory)}
              className="w-full px-3 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-all cursor-pointer"
            >
              {ALL_NOTE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {NOTE_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Catatan Content Field (Required Textarea) */}
          <div>
            <label htmlFor="note-content" className="block text-xs font-bold uppercase text-charcoal-400 mb-1">
              Catatan <span className="text-burgundy">*</span>
            </label>
            <textarea
              id="note-content"
              required
              rows={6}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Tuliskan catatan, ide, atau kesepakatan penting di sini..."
              className="w-full px-4 py-2.5 bg-white border border-beige-300 rounded-xl text-sm text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Modal Actions Footer */}
          <div className="pt-4 flex justify-end gap-3 border-t border-beige">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-charcoal-600 bg-ivory-100 hover:bg-beige-200 rounded-xl transition-colors cursor-pointer min-h-touch"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-burgundy hover:bg-burgundy-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors shadow-xs cursor-pointer min-h-touch"
            >
              {mode === 'create' ? 'Simpan Catatan' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
