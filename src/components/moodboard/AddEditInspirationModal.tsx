import React, { useState, useEffect } from 'react';
import {
  MoodboardItem,
  MOODBOARD_CATEGORIES,
  MoodboardCategory,
  CreateMoodboardItemInput,
} from '../../domain/moodboard/types';
import { validateImageFile } from '../../domain/moodboard/validation';
import { X, Upload, Link as LinkIcon, Image as ImageIcon, Loader2, Cloud } from 'lucide-react';

export interface AddEditInspirationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateMoodboardItemInput, file?: File) => Promise<void>;
  initialData?: MoodboardItem | null;
  categoryOnlyMode?: boolean;
}

export const AddEditInspirationModal: React.FC<AddEditInspirationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  categoryOnlyMode = false,
}) => {
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [category, setCategory] = useState<Exclude<MoodboardCategory, 'all'>>('decoration');
  const [title, setTitle] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [tags, setTags] = useState<string>('');
  const [sourceUrl, setSourceUrl] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Synchronize state when initialData or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      setIsSubmitting(false);
      setFile(null);
      setFilePreview(null);

      if (initialData) {
        setImageMode('url');
        setImageUrl(initialData.imageUrl || '');
        setCategory(initialData.category || 'decoration');
        setTitle(initialData.title || '');
        setNote(initialData.note || '');
        setTags(initialData.tags ? initialData.tags.map((t) => `#${t}`).join(' ') : '');
        setSourceUrl(initialData.sourceUrl || '');
      } else {
        setImageMode('upload');
        setImageUrl('');
        setCategory('decoration');
        setTitle('');
        setNote('');
        setTags('');
        setSourceUrl('');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const validCategories = MOODBOARD_CATEGORIES.filter((c) => c.id !== 'all');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validation = validateImageFile(selectedFile);
    if (!validation.isValid) {
      setFormError(validation.errors.join(', '));
      return;
    }

    setFormError(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!categoryOnlyMode) {
      if (imageMode === 'upload' && !file && !initialData) {
        setFormError('Silakan pilih file foto untuk diunggah.');
        return;
      }

      if (imageMode === 'url' && !imageUrl.trim()) {
        setFormError('Silakan masukkan URL Gambar.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await onSave(
        {
          imageUrl: imageMode === 'url' ? imageUrl.trim() : undefined,
          category,
          title: title.trim() || undefined,
          note: note.trim() || undefined,
          tags: tags.trim() || undefined,
          sourceUrl: sourceUrl.trim() || undefined,
        },
        imageMode === 'upload' && file ? file : undefined
      );
      onClose();
    } catch (err: unknown) {
      console.error('[AddEditInspirationModal] Error submitting form:', err);
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan inspirasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        className="relative bg-white rounded-3xl border border-beige-300 shadow-2xl w-full max-w-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-beige">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-gold-600 block">
              {categoryOnlyMode ? 'Pindah Kategori' : initialData ? 'Edit Inspirasi' : 'Tambah Inspirasi Baru'}
            </span>
            <h2 className="font-serif text-lg font-bold text-charcoal">
              {categoryOnlyMode ? 'Pilih Kategori Baru' : initialData ? 'Perbarui Inspirasi' : 'Simpan Inspirasi Visual'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal-400 hover:text-charcoal hover:bg-ivory-100 transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
          {formError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
              {formError}
            </div>
          )}

          {!categoryOnlyMode && !initialData && (
            <>
              {/* IMAGE INPUT METHOD SELECTOR */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-charcoal block">
                  Pilih Sumber Foto Inspirasi <span className="text-burgundy">*</span>
                </label>

                {/* Mode Tabs */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-ivory-100 rounded-xl border border-beige-300 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setImageMode('upload')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                      imageMode === 'upload'
                        ? 'bg-white text-burgundy font-bold shadow-2xs'
                        : 'text-charcoal-600 hover:text-charcoal'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="truncate">Upload Foto (Cloudflare R2)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode('url')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
                      imageMode === 'url'
                        ? 'bg-white text-burgundy font-bold shadow-2xs'
                        : 'text-charcoal-600 hover:text-charcoal'
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span className="truncate">Tautan URL Gambar</span>
                  </button>
                </div>


                {/* Option 1: Upload ke Cloudflare R2 (WebP optimized) */}
                {imageMode === 'upload' && (
                  <div className="border-2 border-dashed border-beige-300 hover:border-burgundy-300 bg-ivory-50/50 hover:bg-ivory-100/60 rounded-2xl p-4 text-center transition-all space-y-2">
                    {filePreview ? (
                      <div className="space-y-2">
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="max-h-40 mx-auto rounded-xl object-cover border border-beige-300 shadow-2xs"
                        />
                        <p className="text-xs text-charcoal-500 truncate">{file?.name}</p>
                        <label className="inline-block px-3 py-1 bg-white border border-beige-300 text-xs font-semibold text-charcoal rounded-lg cursor-pointer hover:bg-ivory-100">
                          Ganti Foto
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2 cursor-pointer py-3">
                        <div className="w-10 h-10 rounded-2xl bg-white border border-beige-300 flex items-center justify-center text-burgundy shadow-2xs">
                          <Cloud className="w-5 h-5 text-burgundy" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-charcoal">
                            Klik untuk cari atau drag & drop foto
                          </p>
                          <p className="text-[11px] text-charcoal-400 mt-0.5">
                            Dikompresi otomatis ke WebP & diunggah langsung ke Cloudflare R2
                          </p>
                        </div>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}


                {/* Option 3: URL Paste */}
                {imageMode === 'url' && (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full bg-white border border-beige-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy"
                    />
                    {imageUrl.trim() && (
                      <div className="mt-2 text-center">
                        <img
                          src={imageUrl.trim()}
                          alt="URL Preview"
                          className="max-h-36 mx-auto rounded-xl object-cover border border-beige-300 shadow-2xs"
                          onError={() => {
                            setFormError('URL Gambar tidak dapat dimuat. Pastikan URL langsung menuju file foto.');
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* CATEGORY (Required) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-charcoal block">
              Kategori Inspirasi <span className="text-burgundy">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Exclude<MoodboardCategory, 'all'>)}
              className="w-full bg-white border border-beige-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-charcoal focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy"
            >
              {validCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {!categoryOnlyMode && (
            <>
              {/* TITLE */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-charcoal block">Judul Inspirasi</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Misal: Garden Wedding dengan Warm Lighting"
                  className="w-full bg-white border border-beige-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy"
                />
              </div>

              {/* NOTE */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-charcoal block">Catatan / Alasan Suka</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Suka banget dengan pencahayaan hangat dan kombinasi bunga putihnya..."
                  className="w-full bg-white border border-beige-300 rounded-xl p-3 text-xs sm:text-sm text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy"
                />
              </div>

              {/* TAGS */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-charcoal block">Tags (Pisahkan dengan koma / spasi)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="warm, floral, elegant"
                  className="w-full bg-white border border-beige-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy"
                />
              </div>

              {/* SOURCE URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-charcoal block">Source URL (Instagram / Pinterest / Web)</label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/xxxx"
                  className="w-full bg-white border border-beige-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy"
                />
              </div>
            </>
          )}

          {/* Form Action Buttons */}
          <div className="pt-4 border-t border-beige flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-white border border-beige-300 hover:bg-ivory-100 text-charcoal text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 min-h-touch"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 px-5 py-2 bg-burgundy hover:bg-burgundy-800 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 min-h-touch shadow-2xs"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Simpan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
