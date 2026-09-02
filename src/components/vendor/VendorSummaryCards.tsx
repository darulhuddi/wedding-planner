import React from 'react';
import { Layers, CheckCircle2, Bookmark, PhoneCall } from 'lucide-react';
import { VendorSummary } from '../../utils/vendorUtils';

interface VendorSummaryCardsProps {
  summary: VendorSummary;
}

export const VendorSummaryCards: React.FC<VendorSummaryCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Total Vendor */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-beige shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ivory-100 border border-beige flex items-center justify-center text-charcoal shrink-0">
          <Layers className="w-5 h-5 text-burgundy" />
        </div>
        <div>
          <span className="text-[10px] sm:text-xs uppercase font-bold text-gold-600 tracking-wider block">
            Total Vendor
          </span>
          <span className="font-serif text-xl sm:text-2xl font-bold text-charcoal block leading-tight">
            {summary.total}
          </span>
        </div>
      </div>

      {/* Dipilih */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-beige shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] sm:text-xs uppercase font-bold text-gold-600 tracking-wider block">
            Dipilih
          </span>
          <span className="font-serif text-xl sm:text-2xl font-bold text-charcoal block leading-tight">
            {summary.selected}
          </span>
        </div>
      </div>

      {/* Pertimbangkan */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-beige shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
          <Bookmark className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] sm:text-xs uppercase font-bold text-gold-600 tracking-wider block">
            Pertimbangkan
          </span>
          <span className="font-serif text-xl sm:text-2xl font-bold text-charcoal block leading-tight">
            {summary.considering}
          </span>
        </div>
      </div>

      {/* Dihubungi */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-beige shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
          <PhoneCall className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] sm:text-xs uppercase font-bold text-gold-600 tracking-wider block">
            Dihubungi
          </span>
          <span className="font-serif text-xl sm:text-2xl font-bold text-charcoal block leading-tight">
            {summary.contacted}
          </span>
        </div>
      </div>
    </div>
  );
};
