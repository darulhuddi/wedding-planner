import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Edit2 } from 'lucide-react';

export interface SeserahanCategoryModalProps {
  isOpen: boolean;
  initialName?: string;
  isEditing?: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void> | void;
}

export const SeserahanCategoryModal: React.FC<SeserahanCategoryModalProps> = ({
  isOpen,
  initialName = '',
  isEditing = false,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState<string>(initialName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama kategori seserahan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(name.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan kategori.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs animate-fadeIn">
      <div
        className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl border border-beige-300 shadow-2xl p-6 relative animate-scaleUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal p-1.5 rounded-full hover:bg-beige-100 transition-colors cursor-pointer"
          aria-label="Tutup modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0">
            {isEditing ? <Edit2 className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
          </div>
          <div>
            <h3 id="category-modal-title" className="font-serif text-lg font-bold text-charcoal">
              {isEditing ? 'Ubah Nama Kategori' : 'Tambah Kategori Seserahan'}
            </h3>
            <p className="text-xs text-charcoal-400">
              {isEditing
                ? 'Perbarui nama kelompok hantaran seserahan.'
                : 'Kelompokkan barang seserahan ke dalam kategori baru.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="category-name-input" className="block text-xs font-semibold text-charcoal mb-1.5">
              Nama Kategori
            </label>
            <input
              id="category-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className="w-full px-3.5 py-2.5 bg-ivory-50 border border-beige-300 focus:border-burgundy focus:ring-1 focus:ring-burgundy rounded-xl text-charcoal font-medium text-sm transition-all outline-none"
              placeholder="Contoh: Perhiasan, Beauty & Care, Ibadah..."
              autoFocus
            />
            {error && <p className="text-xs text-rose-600 mt-1.5">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-charcoal-500 hover:text-charcoal hover:bg-beige-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-burgundy hover:bg-burgundy-700 text-white text-sm font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambah Kategori'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
