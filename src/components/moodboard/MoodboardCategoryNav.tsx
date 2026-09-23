import React from 'react';
import { MOODBOARD_CATEGORIES, MoodboardCategory, MoodboardSortOption } from '../../domain/moodboard/types';
import { SlidersHorizontal, Check } from 'lucide-react';

export interface MoodboardCategoryNavProps {
  selectedCategory: MoodboardCategory;
  onSelectCategory: (category: MoodboardCategory) => void;
  sortOrder: MoodboardSortOption;
  onSortChange: (sort: MoodboardSortOption) => void;
}

export const MoodboardCategoryNav: React.FC<MoodboardCategoryNavProps> = ({
  selectedCategory,
  onSelectCategory,
  sortOrder,
  onSortChange,
}) => {
  const [isSortOpen, setIsSortOpen] = React.useState(false);
  const sortRef = React.useRef<HTMLDivElement>(null);

  // Close sort menu on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
      {/* Category Pills (Horizontal Scroll) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 scroll-smooth max-w-full">
        {MOODBOARD_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap border shrink-0 ${
                isActive
                  ? 'bg-burgundy text-white border-burgundy shadow-2xs'
                  : 'bg-white text-charcoal-600 border-beige-300 hover:border-burgundy-200 hover:bg-ivory-100'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Sort Dropdown */}
      <div className="relative shrink-0 self-end sm:self-auto" ref={sortRef}>
        <button
          type="button"
          onClick={() => setIsSortOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-beige-300 hover:border-burgundy-200 rounded-xl text-xs font-medium text-charcoal shadow-2xs hover:bg-ivory-50 transition-all cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-charcoal-400" />
          <span>{sortOrder === 'newest' ? 'Terbaru' : 'Terlama'}</span>
        </button>

        {isSortOpen && (
          <div className="absolute right-0 mt-1.5 w-36 bg-white border border-beige-300 rounded-xl shadow-lg p-1 z-30 animate-in fade-in slide-in-from-top-2 duration-150">
            <button
              type="button"
              onClick={() => {
                onSortChange('newest');
                setIsSortOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg text-left transition-colors cursor-pointer ${
                sortOrder === 'newest' ? 'bg-burgundy-50 text-burgundy font-semibold' : 'text-charcoal-600 hover:bg-ivory-100'
              }`}
            >
              <span>Terbaru</span>
              {sortOrder === 'newest' && <Check className="w-3.5 h-3.5 text-burgundy" />}
            </button>
            <button
              type="button"
              onClick={() => {
                onSortChange('oldest');
                setIsSortOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg text-left transition-colors cursor-pointer ${
                sortOrder === 'oldest' ? 'bg-burgundy-50 text-burgundy font-semibold' : 'text-charcoal-600 hover:bg-ivory-100'
              }`}
            >
              <span>Terlama</span>
              {sortOrder === 'oldest' && <Check className="w-3.5 h-3.5 text-burgundy" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
