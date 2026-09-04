import React from 'react';
import { Search, Filter, X, RotateCcw } from 'lucide-react';
import {
  AdminCouplesFilterState,
  AdminAccessFilter,
  AdminWeddingFilter,
  AdminActivityFilter,
} from '../../types/admin';

interface AdminCouplesToolbarProps {
  filters: AdminCouplesFilterState;
  onFilterChange: (newFilters: AdminCouplesFilterState) => void;
  onResetFilters: () => void;
  totalResults: number;
}

export function AdminCouplesToolbar({
  filters,
  onFilterChange,
  onResetFilters,
  totalResults,
}: AdminCouplesToolbarProps) {
  const isFiltered =
    filters.search.trim() !== '' ||
    filters.access !== 'all' ||
    filters.wedding !== 'all' ||
    filters.activity !== 'all';

  const accessOptions: { id: AdminAccessFilter; label: string }[] = [
    { id: 'all', label: 'Semua Akses' },
    { id: 'Trial', label: 'Trial' },
    { id: 'Paid', label: 'Paid' },
    { id: 'Expired', label: 'Expired' },
  ];

  const weddingOptions: { id: AdminWeddingFilter; label: string }[] = [
    { id: 'all', label: 'Semua Wedding' },
    { id: 'lte_7', label: '≤ 7 hari' },
    { id: 'lte_14', label: '≤ 14 hari' },
    { id: 'lte_30', label: '≤ 30 hari' },
    { id: 'gt_30', label: '> 30 hari' },
  ];

  const activityOptions: { id: AdminActivityFilter; label: string }[] = [
    { id: 'all', label: 'Semua Aktivitas' },
    { id: 'today', label: 'Aktif hari ini' },
    { id: 'last_7_days', label: 'Aktif 7 hari terakhir' },
    { id: 'inactive_gt_7', label: 'Tidak aktif > 7 hari' },
  ];

  return (
    <div className="space-y-3 bg-white p-4 rounded-lg border border-beige-200/80 shadow-xs">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            placeholder="Cari pasangan..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-ivory-50 border border-beige-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-burgundy-600 focus:border-burgundy-600 transition-colors placeholder:text-charcoal-400"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange({ ...filters, search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-charcoal-400 hover:text-charcoal-700 rounded transition-colors"
              aria-label="Hapus pencarian"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Result summary */}
        <div className="flex items-center justify-between md:justify-end gap-3 text-xs text-charcoal-500 font-mono">
          <span className="font-semibold text-charcoal-800">
            {totalResults.toLocaleString('id-ID')} pasangan
          </span>
          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-burgundy-700 hover:text-burgundy-900 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Selectors Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-beige-100">
        {/* Access Filter */}
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-charcoal-400 font-semibold mb-1">
            Access
          </label>
          <select
            value={filters.access}
            onChange={(e) =>
              onFilterChange({ ...filters, access: e.target.value as AdminAccessFilter })
            }
            className="w-full text-xs bg-ivory-50 border border-beige-200 rounded-md px-2.5 py-1.5 text-charcoal-800 focus:outline-hidden focus:ring-1 focus:ring-burgundy-600 focus:border-burgundy-600 transition-colors"
          >
            {accessOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Wedding Date Filter */}
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-charcoal-400 font-semibold mb-1">
            Wedding
          </label>
          <select
            value={filters.wedding}
            onChange={(e) =>
              onFilterChange({ ...filters, wedding: e.target.value as AdminWeddingFilter })
            }
            className="w-full text-xs bg-ivory-50 border border-beige-200 rounded-md px-2.5 py-1.5 text-charcoal-800 focus:outline-hidden focus:ring-1 focus:ring-burgundy-600 focus:border-burgundy-600 transition-colors"
          >
            {weddingOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Activity Filter */}
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-charcoal-400 font-semibold mb-1">
            Activity
          </label>
          <select
            value={filters.activity}
            onChange={(e) =>
              onFilterChange({ ...filters, activity: e.target.value as AdminActivityFilter })
            }
            className="w-full text-xs bg-ivory-50 border border-beige-200 rounded-md px-2.5 py-1.5 text-charcoal-800 focus:outline-hidden focus:ring-1 focus:ring-burgundy-600 focus:border-burgundy-600 transition-colors"
          >
            {activityOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
