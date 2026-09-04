import React from 'react';
import { Users, ArrowRight } from 'lucide-react';

interface AdminCustomerAccessEntryProps {
  onNavigate: (route: string) => void;
}

export function AdminCustomerAccessEntry({
  onNavigate,
}: AdminCustomerAccessEntryProps) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-lg border border-beige-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy-700 flex-shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-charcoal-900">
            Kelola Akses Pasangan
          </h2>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Perpanjang trial manual, berikan wedding pass, atau pantau status akses pasangan secara individual.
          </p>
        </div>
      </div>

      <button
        onClick={() => onNavigate('admin/couples')}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-ivory-100 hover:bg-ivory-200 text-burgundy-800 border border-beige-200 rounded-md text-xs font-semibold shadow-2xs hover:shadow-xs transition-all flex-shrink-0"
      >
        <span>Lihat Couples</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
