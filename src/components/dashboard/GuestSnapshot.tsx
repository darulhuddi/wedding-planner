import React from 'react';
import { Users, ArrowRight } from 'lucide-react';

export interface GuestSnapshotProps {
  guestCount: number;
  onViewGuests: () => void;
}

export const GuestSnapshot: React.FC<GuestSnapshotProps> = ({
  guestCount,
  onViewGuests,
}) => {
  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-beige-300 shadow-card h-full flex flex-col justify-between space-y-4">
      <div>
        <div className="flex justify-between items-center text-xs text-charcoal-400 mb-2">
          <span className="font-semibold text-charcoal flex items-center gap-1.5">
            <Users className="w-4 h-4 text-gold-600 shrink-0" />
            Jumlah Tamu
          </span>
          <span className="text-[10px] bg-ivory-100 text-charcoal-400 px-2 py-0.5 rounded border border-beige font-medium">
            Perkiraan
          </span>
        </div>

        {/* Large Readable Guest Count Number */}
        <div className="font-serif text-2xl sm:text-3xl xl:text-3xl font-bold text-charcoal tracking-tight truncate mt-1">
          {guestCount} <span className="text-sm font-sans font-normal text-charcoal-400">orang</span>
        </div>

        <p className="text-xs text-charcoal-400 mt-2 leading-relaxed">
          Acuan awal untuk venue & catering.
        </p>
      </div>

      <div className="pt-3 border-t border-beige">
        <button
          onClick={onViewGuests}
          className="text-xs font-semibold text-burgundy hover:text-burgundy-700 flex items-center gap-1 transition-colors min-h-touch cursor-pointer"
        >
          <span>Lihat Tamu</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
