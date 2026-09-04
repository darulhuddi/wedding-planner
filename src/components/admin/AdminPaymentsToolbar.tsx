import React from 'react';
import { Search, X, Calendar } from 'lucide-react';
import {
  AdminPaymentsFilterState,
  AdminPaymentsStatusFilter,
  AdminDateRangeFilter,
} from '../../types/admin';

interface AdminPaymentsToolbarProps {
  filters: AdminPaymentsFilterState;
  onFilterChange: (filters: AdminPaymentsFilterState) => void;
  totalFiltered: number;
  totalAll: number;
}

const STATUS_OPTIONS: Array<{ label: string; value: AdminPaymentsStatusFilter }> = [
  { label: 'Semua', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Failed', value: 'failed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Expired', value: 'expired' },
];

const DATE_RANGE_OPTIONS: Array<{ label: string; value: AdminDateRangeFilter }> = [
  { label: 'Semua Waktu', value: 'all' },
  { label: 'Hari Ini', value: 'today' },
  { label: '7 Hari Terakhir', value: 'last_7_days' },
  { label: '30 Hari Terakhir', value: 'last_30_days' },
];

export function AdminPaymentsToolbar({
  filters,
  onFilterChange,
  totalFiltered,
  totalAll,
}: AdminPaymentsToolbarProps) {
  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.status !== 'all' ||
    (filters.dateRange && filters.dateRange !== 'all');

  const handleReset = () => {
    onFilterChange({
      search: '',
      status: 'all',
      dateRange: 'all',
    });
  };

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-lg border border-beige-200/80 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            placeholder="Cari nomor pesanan, pasangan, atau email..."
            className="w-full pl-9 pr-8 py-2 bg-ivory-50/70 border border-beige-300 rounded-md text-xs text-charcoal-900 placeholder:text-charcoal-400 focus:outline-hidden focus:ring-1 focus:ring-burgundy-700 focus:border-burgundy-700"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ ...filters, search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600 p-0.5 cursor-pointer"
              aria-label="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Results Counter & Reset */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-charcoal-500">
          <span>
            Menampilkan <strong className="font-mono text-charcoal-900">{totalFiltered}</strong> dari{' '}
            <strong className="font-mono text-charcoal-900">{totalAll}</strong> pesanan
          </span>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-burgundy-800 hover:text-burgundy-900 font-semibold cursor-pointer text-xs"
            >
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1 border-t border-beige-100 text-xs">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <span className="text-charcoal-400 font-medium mr-1 text-[11px] shrink-0">Status:</span>
          {STATUS_OPTIONS.map((opt) => {
            const isActive = (filters.status || 'all') === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onFilterChange({ ...filters, status: opt.value })}
                className={`px-2.5 py-1 rounded-md font-medium border text-xs whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-burgundy-800 text-white border-burgundy-900 shadow-2xs'
                    : 'bg-ivory-50 hover:bg-ivory-100 text-charcoal-700 border-beige-200/80'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Date Range Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar sm:border-l sm:border-beige-200 sm:pl-3">
          <Calendar className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
          <span className="text-charcoal-400 font-medium mr-1 text-[11px] shrink-0">Rentang Waktu:</span>
          {DATE_RANGE_OPTIONS.map((opt) => {
            const isActive = (filters.dateRange || 'all') === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onFilterChange({ ...filters, dateRange: opt.value })}
                className={`px-2.5 py-1 rounded-md font-medium border text-xs whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-burgundy-800 text-white border-burgundy-900 shadow-2xs'
                    : 'bg-ivory-50 hover:bg-ivory-100 text-charcoal-700 border-beige-200/80'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

