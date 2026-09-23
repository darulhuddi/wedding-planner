import React from 'react';
import { Heart, Search, Plus, HardDrive } from 'lucide-react';
import { StorageQuotaInfo } from '../../hooks/useMoodboard';

export interface MoodboardHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddClick: () => void;
  quota?: StorageQuotaInfo;
}

export const MoodboardHeader: React.FC<MoodboardHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onAddClick,
  quota,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-beige">
      {/* Title & Subtitle */}
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-ivory-100 border border-beige-300 flex items-center justify-center text-burgundy shrink-0 shadow-2xs">
          <Heart className="w-5 h-5 fill-burgundy/10 text-burgundy" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-charcoal">
              Moodboard
            </h1>
            {quota && (
              <span className="hidden sm:inline-flex items-center gap-1 bg-ivory-100 border border-beige-300 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-charcoal-600">
                <HardDrive className="w-3 h-3 text-gold-600" />
                <span>{quota.formattedUsed} / {quota.formattedLimit}</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-charcoal-400 mt-0.5 font-sans">
            Kumpulkan hal-hal yang membuat kalian berkata, &ldquo;Nah, ini yang kita mau.&rdquo;
          </p>
        </div>
      </div>


      {/* Right Controls: Search Input & CTA Button */}
      <div className="flex items-center gap-2.5 w-full md:w-auto">
        {/* Search Input */}
        <div className="relative flex-1 md:w-72">
          <Search className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari inspirasi, tag, atau judul..."
            className="w-full bg-white border border-beige-300 rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-charcoal placeholder:text-charcoal-300 focus:outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy transition-all"
          />
        </div>

        {/* Primary CTA Button */}
        <button
          type="button"
          onClick={onAddClick}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-burgundy hover:bg-burgundy-800 text-white font-medium text-xs sm:text-sm rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer shrink-0 min-h-touch"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Inspirasi</span>
        </button>
      </div>
    </div>
  );
};
