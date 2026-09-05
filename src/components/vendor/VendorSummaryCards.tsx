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
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-beige shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-card hover:border-beige-300">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] sm:text-xs uppercase font-bold text-gold-600 tracking-wider block">
            Total Vendor
          </span>
          <div className="w-8 h-8 rounded-xl bg-ivory-100 border border-beige flex items-center justify-center text-burgundy shrink-0">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div>
          <span className="font-sans text-2xl sm:text-3xl font-bold text-charcoal block leading-tight tracking-tight">
            {summary.total}
          </span>
          <p className="text-[11px] text-charcoal-400 mt-0.5">
            Vendor terdaftar
          </p>
        </div>
      </div>

      {/* Dipilih */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-beige shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-card hover:border-beige-300">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] sm:text-xs uppercase font-bold text-emerald-700 tracking-wider block">
            Dipilih
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div>
          <span className="font-sans text-2xl sm:text-3xl font-bold text-emerald-700 block leading-tight tracking-tight">
            {summary.selected}
          </span>
          <p className="text-[11px] text-charcoal-400 mt-0.5">
            Vendor dikonfirmasi
          </p>
        </div>
      </div>

      {/* Pertimbangkan */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-beige shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-card hover:border-beige-300">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] sm:text-xs uppercase font-bold text-amber-700 tracking-wider block">
            Pertimbangkan
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Bookmark className="w-4 h-4" />
          </div>
        </div>
        <div>
          <span className="font-sans text-2xl sm:text-3xl font-bold text-amber-700 block leading-tight tracking-tight">
            {summary.considering}
          </span>
          <p className="text-[11px] text-charcoal-400 mt-0.5">
            Masuk perbandingan
          </p>
        </div>
      </div>

      {/* Dihubungi */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-beige shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-card hover:border-beige-300">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] sm:text-xs uppercase font-bold text-sky-700 tracking-wider block">
            Dihubungi
          </span>
          <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <PhoneCall className="w-4 h-4" />
          </div>
        </div>
        <div>
          <span className="font-sans text-2xl sm:text-3xl font-bold text-sky-700 block leading-tight tracking-tight">
            {summary.contacted}
          </span>
          <p className="text-[11px] text-charcoal-400 mt-0.5">
            Menunggu penawaran
          </p>
        </div>
      </div>
    </div>
  );
};

