import React, { useState } from 'react';
import { MoodboardItem, MOODBOARD_CATEGORIES } from '../../domain/moodboard/types';
import { useMoodboardImage } from '../../hooks/useMoodboardImage';
import {
  X,
  Tag,
  ExternalLink,
  Edit3,
  Trash2,
  FolderInput,
  Heart,
  AlertCircle,
} from 'lucide-react';

export interface MoodboardDetailPanelProps {
  item: MoodboardItem | null;
  onClose: () => void;
  onEdit: (item: MoodboardItem) => void;
  onDelete: (item: MoodboardItem) => void;
  onChangeCategory: (item: MoodboardItem) => void;
  onToggleFavorite: (itemId: string) => void;
}

export const MoodboardDetailPanel: React.FC<MoodboardDetailPanelProps> = ({
  item,
  onClose,
  onEdit,
  onDelete,
  onChangeCategory,
  onToggleFavorite,
}) => {
  const [hasImageError, setHasImageError] = useState(false);

  const imageState = useMoodboardImage(item);

  if (!item) return null;

  const catMeta = MOODBOARD_CATEGORIES.find((c) => c.id === item.category);
  const categoryLabel = catMeta ? catMeta.label : item.category;

  const isUnavailable = imageState.status === 'unavailable' || hasImageError;

  // Format display host for source URL
  let sourceDisplay = 'Buka Tautan';
  if (item.sourceUrl) {
    try {
      const parsed = new URL(item.sourceUrl);
      if (parsed.hostname.includes('instagram.com')) {
        sourceDisplay = 'Instagram';
      } else if (parsed.hostname.includes('pinterest.com') || parsed.hostname.includes('pin.it')) {
        sourceDisplay = 'Pinterest';
      } else {
        sourceDisplay = parsed.hostname.replace(/^www\./, '');
      }
    } catch {
      sourceDisplay = item.sourceUrl;
    }
  }

  const contentMarkup = (
    <div className="flex flex-col h-full space-y-5 p-4 sm:p-5 overflow-y-auto no-scrollbar">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase font-bold tracking-wider text-gold-600 block">
            Detail Inspirasi
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleFavorite(item.id)}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              item.isFavorite
                ? 'text-burgundy bg-burgundy-50 hover:bg-burgundy-100'
                : 'text-charcoal-400 hover:text-burgundy hover:bg-ivory-100'
            }`}
            title={item.isFavorite ? 'Favorit' : 'Tambah ke favorit'}
          >
            <Heart className={`w-4 h-4 ${item.isFavorite ? 'fill-burgundy text-burgundy' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-ivory-100 hover:bg-beige-200/80 flex items-center justify-center text-charcoal-500 hover:text-charcoal transition-colors cursor-pointer"
            aria-label="Tutup detail"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Large Image Preview */}
      <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden border border-beige-300 bg-ivory-100 shadow-2xs shrink-0 flex items-center justify-center">
        {imageState.isLoading ? (
          <div className="w-full h-full bg-ivory-200 animate-pulse flex items-center justify-center">
            <span className="text-xs text-charcoal-400">Memuat gambar...</span>
          </div>
        ) : isUnavailable ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-charcoal-500 space-y-2 bg-ivory-200/60 w-full h-full">
            <AlertCircle className="w-8 h-8 text-amber-600" />
            <p className="text-xs sm:text-sm font-bold text-charcoal">Foto tidak tersedia</p>
            <p className="text-xs text-charcoal-400 max-w-xs">
              {imageState.message || 'File tidak dapat diakses atau URL gambar tidak valid.'}
            </p>
          </div>
        ) : (
          <img
            src={imageState.src}
            alt={item.title || categoryLabel}
            className="w-full h-full object-cover"
            onError={() => setHasImageError(true)}
          />
        )}
      </div>




      {/* Title & Category Badge */}
      <div className="space-y-2">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal leading-snug">
          {item.title || `${categoryLabel} Inspiration`}
        </h2>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 bg-ivory-100 border border-beige-300 px-3 py-1 rounded-full text-xs font-semibold text-charcoal">
            <Tag className="w-3.5 h-3.5 text-burgundy" />
            <span>{categoryLabel}</span>
          </div>
        </div>
      </div>

      {/* Hashtag Tags */}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="inline-block bg-ivory-100/90 border border-beige-200 text-charcoal-600 text-xs font-medium px-2.5 py-1 rounded-lg"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Notes Callout */}
      {item.note && (
        <div className="bg-ivory-100/90 border border-beige-300/80 rounded-xl p-3.5 text-xs sm:text-sm text-charcoal-700 leading-relaxed font-sans shadow-2xs">
          &ldquo;{item.note}&rdquo;
        </div>
      )}

      {/* Source Link */}
      {item.sourceUrl && (
        <div className="space-y-1.5 pt-1">
          <span className="text-xs font-bold text-charcoal-400 block">Source</span>
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-burgundy hover:text-burgundy-800 underline decoration-burgundy-200 underline-offset-4 transition-colors break-all"
          >
            <span>{sourceDisplay}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-4 border-t border-beige grid grid-cols-3 gap-2 mt-auto">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-beige-300 hover:border-burgundy-200 hover:bg-ivory-50 text-charcoal rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-touch shadow-2xs"
        >
          <Edit3 className="w-3.5 h-3.5 text-charcoal-500" />
          <span>Edit</span>
        </button>

        <button
          type="button"
          onClick={() => onDelete(item)}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-touch shadow-2xs"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
          <span>Hapus</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeCategory(item)}
          className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white border border-beige-300 hover:border-burgundy-200 hover:bg-ivory-50 text-charcoal rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-touch shadow-2xs text-center"
        >
          <FolderInput className="w-3.5 h-3.5 text-charcoal-500" />
          <span className="truncate">Pindah Kategori</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Panel Container */}
      <aside className="hidden lg:block w-96 shrink-0 bg-white border border-beige-300 rounded-3xl shadow-soft h-[calc(100vh-140px)] sticky top-6 overflow-hidden">
        {contentMarkup}
      </aside>

      {/* Mobile & Tablet Bottom Sheet Overlay */}
      <div className="lg:hidden fixed inset-0 z-50">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Sheet Card */}
        <div
          className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-3xl border-t border-beige-300 shadow-2xl z-50 overflow-hidden animate-in slide-in-from-bottom duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Drag Handle Indicator */}
          <div className="w-12 h-1 bg-beige-300 rounded-full mx-auto my-2.5 shrink-0" />
          {contentMarkup}
        </div>
      </div>
    </>
  );
};
