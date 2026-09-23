import React from 'react';
import { Heart, Plus } from 'lucide-react';

export interface MoodboardEmptyStateProps {
  onAddClick: () => void;
  isFiltered?: boolean;
}

export const MoodboardEmptyState: React.FC<MoodboardEmptyStateProps> = ({
  onAddClick,
  isFiltered = false,
}) => {
  return (
    <div className="bg-white border border-beige-300 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-2xs my-8 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-ivory-100 border border-beige-300 flex items-center justify-center text-burgundy mx-auto shadow-2xs">
        <Heart className="w-7 h-7 fill-burgundy/10 text-burgundy" />
      </div>

      <div className="space-y-1.5">
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-charcoal">
          {isFiltered
            ? 'Tidak ada inspirasi yang cocok'
            : 'Mulai kumpulkan inspirasi pernikahanmu.'}
        </h3>
        <p className="text-xs sm:text-sm text-charcoal-500 leading-relaxed font-sans max-w-md mx-auto">
          {isFiltered
            ? 'Coba ubah kata kunci pencarian atau pilih kategori lain untuk menemukan inspirasi.'
            : 'Simpan dekorasi, dress, venue, bouquet, dan berbagai detail yang membuat kalian jatuh hati pada satu tempat.'}
        </p>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onAddClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-burgundy hover:bg-burgundy-800 text-white font-medium text-xs sm:text-sm rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer min-h-touch"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Inspirasi</span>
        </button>
      </div>
    </div>
  );
};
