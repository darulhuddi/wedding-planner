import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminHeader } from './AdminHeader';
import { AdminCouplesToolbar } from './AdminCouplesToolbar';
import { AdminCouplesTable } from './AdminCouplesTable';
import { AdminLayout } from './AdminLayout';
import { getAdminCouples } from '../../repositories/adminRepository';
import {
  AdminCoupleSummary,
  AdminCouplesFilterState,
} from '../../types/admin';
import { filterCouples } from '../../domain/adminSelectors';
import { AlertCircle } from 'lucide-react';

interface AdminCouplesPageProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onSelectCouple?: (workspaceId: string) => void;
}

const DEFAULT_FILTERS: AdminCouplesFilterState = {
  search: '',
  access: 'all',
  wedding: 'all',
  activity: 'all',
};

export function AdminCouplesPage({
  currentRoute,
  onNavigate,
  onSelectCouple,
}: AdminCouplesPageProps) {
  const isWeddingsRoute = currentRoute === 'admin/weddings';

  const [couples, setCouples] = useState<AdminCoupleSummary[]>([]);
  const [filters, setFilters] = useState<AdminCouplesFilterState>(() => ({
    ...DEFAULT_FILTERS,
    wedding: isWeddingsRoute ? 'lte_14' : 'all',
  }));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Synchronize wedding filter when route changes between /admin/couples and /admin/weddings
  useEffect(() => {
    if (isWeddingsRoute) {
      setFilters((prev) => ({ ...prev, wedding: 'lte_14' }));
    } else {
      setFilters((prev) => (prev.wedding === 'lte_14' ? { ...prev, wedding: 'all' } : prev));
    }
  }, [isWeddingsRoute]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminCouples();
      setCouples(data);
    } catch (err: unknown) {
      console.error('[WedFlow Admin] Error loading couples data:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat data pasangan. Silakan coba lagi.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pure filtering applied through domain selector
  const filteredCouples = useMemo(() => {
    return filterCouples(couples, filters);
  }, [couples, filters]);

  const handleResetFilters = useCallback(() => {
    setFilters({
      ...DEFAULT_FILTERS,
      wedding: isWeddingsRoute ? 'lte_14' : 'all',
    });
  }, [isWeddingsRoute]);

  const isFiltered =
    filters.search.trim() !== '' ||
    filters.access !== 'all' ||
    filters.wedding !== (isWeddingsRoute ? 'lte_14' : 'all') ||
    filters.activity !== 'all';

  return (
    <AdminLayout currentRoute={currentRoute} onNavigate={onNavigate}>
      {(openMobileNav) => (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <AdminHeader
            title={isWeddingsRoute ? 'Weddings' : 'Couples'}
            subtitle={
              isWeddingsRoute
                ? 'Pantau jadwal pernikahan terdekat pasangan WedSiap (H-14).'
                : 'Kelola dan pantau pasangan yang menggunakan WedSiap.'
            }
            onRefresh={loadData}
            isLoading={isLoading}
            onOpenMobileNav={openMobileNav}
          />

          {/* Main Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {/* Error Banner */}
            {error && (
              <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={loadData}
                  className="font-semibold underline hover:text-rose-900 flex-shrink-0"
                >
                  Coba lagi
                </button>
              </div>
            )}

            {/* Filter Toolbar */}
            <AdminCouplesToolbar
              filters={filters}
              onFilterChange={setFilters}
              onResetFilters={handleResetFilters}
              totalResults={filteredCouples.length}
            />

            {/* Couples List / Table */}
            <AdminCouplesTable
              couples={filteredCouples}
              onSelectCouple={(workspaceId) => {
                if (onSelectCouple) {
                  onSelectCouple(workspaceId);
                } else {
                  onNavigate(`admin/couples/${workspaceId}`);
                }
              }}
              isLoading={isLoading}
              onResetFilters={handleResetFilters}
              isFiltered={isFiltered}
            />
          </main>
        </div>
      )}
    </AdminLayout>
  );
}
