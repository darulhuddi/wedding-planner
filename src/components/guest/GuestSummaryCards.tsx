import React from 'react';
import { Users, UserCheck, Clock, Mail } from 'lucide-react';
import { GuestSummary } from '../../utils/guestUtils';

export interface GuestSummaryCardsProps {
  summary: GuestSummary;
}

export const GuestSummaryCards: React.FC<GuestSummaryCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Total Tamu (Total Pax) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-beige shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-card hover:border-beige-300">
        <div className="flex items-center justify-between text-charcoal-400 mb-2">
          <span className="text-[10px] sm:text-xs uppercase font-bold text-gold-600 tracking-wider flex items-center gap-1.5">
            Total Tamu
          </span>
          <div className="w-8 h-8 rounded-xl bg-ivory-100 border border-beige flex items-center justify-center text-burgundy shrink-0">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="font-sans text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
            {summary.totalPax} <span className="text-xs font-sans font-normal text-charcoal-400">orang</span>
          </div>
          <p className="text-[11px] text-charcoal-400 mt-0.5">
            Dari {summary.totalGuestsCount} catatan tamu
          </p>
        </div>
      </div>

      {/* 2. Hadir (Attending Pax) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-beige shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-card hover:border-beige-300">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-xs uppercase font-bold text-emerald-700 tracking-wider flex items-center gap-1.5">
            Hadir
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="font-sans text-2xl sm:text-3xl font-bold text-emerald-700 tracking-tight">
            {summary.attendingPax} <span className="text-xs font-sans font-normal text-charcoal-400">orang</span>
          </div>
          <p className="text-[11px] text-charcoal-400 mt-0.5">
            Konfirmasi hadir
          </p>
        </div>
      </div>

      {/* 3. Belum Konfirmasi (Pending Pax) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-beige shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-card hover:border-beige-300">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-xs uppercase font-bold text-amber-700 tracking-wider flex items-center gap-1.5">
            Belum Konfirmasi
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="font-sans text-2xl sm:text-3xl font-bold text-amber-700 tracking-tight">
            {summary.pendingPax} <span className="text-xs font-sans font-normal text-charcoal-400">orang</span>
          </div>
          <p className="text-[11px] text-charcoal-400 mt-0.5">
            Menunggu konfirmasi
          </p>
        </div>
      </div>

      {/* 4. Belum Diundang (Not Invited Pax) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-beige shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-card hover:border-beige-300">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-xs uppercase font-bold text-charcoal-500 tracking-wider flex items-center gap-1.5">
            Belum Diundang
          </span>
          <div className="w-8 h-8 rounded-xl bg-ivory-100 border border-beige flex items-center justify-center text-charcoal-400 shrink-0">
            <Mail className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="font-sans text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
            {summary.notInvitedPax} <span className="text-xs font-sans font-normal text-charcoal-400">orang</span>
          </div>
          <p className="text-[11px] text-charcoal-400 mt-0.5">
            Belum kirim undangan
          </p>
        </div>
      </div>
    </div>
  );
};
