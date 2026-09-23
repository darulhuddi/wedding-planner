import React, { useState } from 'react';
import { MoodboardItem, MOODBOARD_CATEGORIES } from '../../domain/moodboard/types';
import { useMoodboardImage } from '../../hooks/useMoodboardImage';
import { Heart, MoreHorizontal, AlertCircle, HardDrive } from 'lucide-react';

export interface MoodboardCardProps {
  item: MoodboardItem;
  isSelected?: boolean;
  onSelect: (item: MoodboardItem) => void;
  onToggleFavorite: (itemId: string, e: React.MouseEvent) => void;
  onEdit?: (item: MoodboardItem, e: React.MouseEvent) => void;
  onDelete?: (item: MoodboardItem, e: React.MouseEvent) => void;
}

export const MoodboardCard: React.FC<MoodboardCardProps> = ({
  item,
  isSelected = false,
  onSelect,
  onToggleFavorite,
  onEdit,
  onDelete,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const imageState = useMoodboardImage(item);

  // Get category label
  const catMeta = MOODBOARD_CATEGORIES.find((c) => c.id === item.category);
  const categoryLabel = catMeta ? catMeta.label : item.category;

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isUnavailable = imageState.status === 'unavailable' || hasImageError;

  return (
    <div
      onClick={() => onSelect(item)}
      className={`group relative bg-white rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md flex flex-col justify-between select-none ${
        isSelected
          ? 'border-burgundy ring-2 ring-burgundy/20 shadow-md'
          : 'border-beige-300 hover:border-burgundy-200'
      }`}
    >
      {/* Image Container */}
      <div className="relative aspect-4/3 w-full bg-ivory-100 overflow-hidden flex items-center justify-center">
        {imageState.isLoading ? (
          <div className="w-full h-full bg-ivory-200 animate-pulse flex items-center justify-center">
            <span className="text-xs text-charcoal-400">Memuat...</span>
          </div>
        ) : isUnavailable ? (
          /* Graceful Missing Image Fallback */
          <div className="flex flex-col items-center justify-center p-3 text-center text-charcoal-400 space-y-1 bg-ivory-200/60 w-full h-full">
            <AlertCircle className="w-6 h-6 text-amber-600" />
            <span className="text-[11px] font-semibold text-charcoal-600">Foto tidak tersedia</span>
            <span className="text-[10px] text-charcoal-400">
              {imageState.message || 'File mungkin tidak dapat diakses'}
            </span>
          </div>
        ) : (
          <img
            src={imageState.src}
            alt={item.title || categoryLabel}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setHasImageError(true)}
          />
        )}

        {/* Category Badge */}
        <div className="absolute bottom-2.5 left-2.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/60 shadow-2xs flex items-center gap-1">
          {item.storageProvider === 'google_drive' && (
            <span title="Tersimpan di Google Drive">
              <HardDrive className="w-3 h-3 text-emerald-600 shrink-0" />
            </span>
          )}
          <span className="text-[11px] font-semibold text-charcoal block tracking-tight">
            {categoryLabel}
          </span>
        </div>

        {/* Overflow Menu Button */}
        <div className="absolute top-2.5 right-2.5" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen((prev) => !prev);
            }}
            className="w-7 h-7 rounded-full bg-white/80 hover:bg-white backdrop-blur-md flex items-center justify-center text-charcoal hover:text-burgundy transition-all shadow-2xs opacity-90 hover:opacity-100 cursor-pointer"
            aria-label="Opsi item"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-32 bg-white border border-beige-300 rounded-xl shadow-lg p-1 z-20 animate-in fade-in slide-in-from-top-1 duration-150">
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onEdit(item, e);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-charcoal hover:bg-ivory-100 rounded-lg transition-colors cursor-pointer"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onDelete(item, e);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  Hapus
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          {/* Title */}
          <h3 className="font-serif text-sm sm:text-base font-bold text-charcoal leading-snug line-clamp-2">
            {item.title || `${categoryLabel} Inspiration`}
          </h3>

          {/* Hashtag Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block bg-ivory-100 border border-beige-200 text-charcoal-500 text-[10px] font-medium px-2 py-0.5 rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Favorite Heart Button */}
        <div className="flex items-center justify-end pt-1">
          <button
            type="button"
            onClick={(e) => onToggleFavorite(item.id, e)}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              item.isFavorite
                ? 'text-burgundy bg-burgundy-50 hover:bg-burgundy-100'
                : 'text-charcoal-400 hover:text-burgundy hover:bg-ivory-100'
            }`}
            aria-label={item.isFavorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}
            title={item.isFavorite ? 'Favorit' : 'Tambah ke favorit'}
          >
            <Heart
              className={`w-4 h-4 transition-transform ${
                item.isFavorite ? 'fill-burgundy text-burgundy scale-110' : 'text-charcoal-400'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
