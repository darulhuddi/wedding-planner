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
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-beige shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-charcoal-400 mb-2">
          <span className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
            <Users className="w-4 h-4 text-burgundy shrink-0" />
            Total Tamu
          </span>
        </div>
        <div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
            {summary.totalPax} <span className="text-xs font-sans font-normal text-charcoal-400">orang</span>
          </div>
          <p className="text-[11px] text-charcoal-400 mt-0.5">
            Dari {summary.totalGuestsCount} catatan tamu
          </p>
        </div>
      </div>

      {/* 2. Hadir (Attending Pax) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-beige shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-charcoal-400 mb-2">
          <span className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            Hadir
          </span>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            RSVP
          </span>
        </div>
        <div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-emerald-700 tracking-tight">
            {summary.attendingPax} <span className="text-xs font-sans font-normal text-charcoal-400">orang</span>
          </div>
          <p className="text-[11px] text-charcoal-400 mt-0.5">
            Konfirmasi hadir
          </p>
        </div>
      </div>

      {/* 3. Belum Konfirmasi (Pending Pax) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-beige shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-charcoal-400 mb-2">
          <span className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            Belum Konfirmasi
          </span>
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
            RSVP
          </span>
        </div>
        <div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-amber-700 tracking-tight">
            {summary.pendingPax} <span className="text-xs font-sans font-normal text-charcoal-400">orang</span>
          </div>
          <p className="text-[11px] text-charcoal-400 mt-0.5">
            Menunggu konfirmasi
          </p>
        </div>
      </div>

      {/* 4. Belum Diundang (Not Invited Pax) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-beige shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-charcoal-400 mb-2">
          <span className="text-xs font-semibold text-charcoal flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-charcoal-400 shrink-0" />
            Belum Diundang
          </span>
          <span className="text-[10px] font-bold text-charcoal-500 bg-ivory-200 px-2 py-0.5 rounded-full border border-beige">
            Undangan
          </span>
        </div>
        <div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
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
