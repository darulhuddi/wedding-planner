import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminLayout } from './AdminLayout';
import { AdminHeader } from './AdminHeader';
import { AdminPaymentsKpiGrid } from './AdminPaymentsKpiGrid';
import { AdminPaymentsToolbar } from './AdminPaymentsToolbar';
import { AdminPaymentsTable } from './AdminPaymentsTable';
import { AdminPaymentDetailDrawer } from './AdminPaymentDetailDrawer';
import { getAdminOrders } from '../../repositories/adminRepository';
import {
  AdminOrderSummary,
  AdminPaymentsFilterState,
  AdminPaymentsMetrics,
} from '../../types/admin';
import {
  computePaymentMetrics,
  filterOrders,
  paginateOrders,
} from '../../domain/adminSelectors';
import { AlertCircle } from 'lucide-react';

interface AdminPaymentsPageProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export function AdminPaymentsPage({
  currentRoute,
  onNavigate,
}: AdminPaymentsPageProps) {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Pagination State
  const [filters, setFilters] = useState<AdminPaymentsFilterState>({
    search: '',
    status: 'all',
    dateRange: 'all',
  });
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminOrders();
      setOrders(data);
    } catch (err: any) {
      console.error('[WedFlow Admin] Error loading admin orders:', err);
      setError(err.message || 'Gagal memuat data pesanan dan pembayaran.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (newFilters: AdminPaymentsFilterState) => {
    setFilters(newFilters);
    setPage(1); // Reset to page 1 on filter change
  };

  // Compute metrics from all loaded orders
  const metrics: AdminPaymentsMetrics = useMemo(() => {
    return computePaymentMetrics(orders);
  }, [orders]);

  // Filter orders according to user selection
  const filteredOrders = useMemo(() => {
    return filterOrders(orders, filters);
  }, [orders, filters]);

  // Paginate filtered orders
  const paginatedResult = useMemo(() => {
    return paginateOrders(filteredOrders, page, pageSize);
  }, [filteredOrders, page, pageSize]);

  const isFiltered =
    filters.search.trim() !== '' ||
    filters.status !== 'all' ||
    filters.dateRange !== 'all';

  return (
    <AdminLayout currentRoute={currentRoute} onNavigate={onNavigate}>
      {(openMobileNav) => (
        <div className="flex-1 flex flex-col pb-16 sm:pb-8">
          {/* Header */}
          <AdminHeader
            title="Payments"
            subtitle="Pantau pesanan dan pembayaran Wedding Pass WedFlow."
            onRefresh={loadData}
            isLoading={isLoading}
            onOpenMobileNav={openMobileNav}
          />

          {/* Main Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {/* Error Banner */}
            {error && (
              <div
                role="alert"
                className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between text-xs sm:text-sm animate-fadeIn"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={loadData}
                  className="px-2.5 py-1 bg-white border border-rose-300 text-rose-800 rounded font-semibold text-xs hover:bg-rose-100 cursor-pointer"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {/* Operational KPI Summary */}
            <AdminPaymentsKpiGrid metrics={metrics} isLoading={isLoading} />

            {/* Search & Filter Toolbar */}
            <AdminPaymentsToolbar
              filters={filters}
              onFilterChange={handleFilterChange}
              totalFiltered={filteredOrders.length}
              totalAll={orders.length}
            />

            {/* Orders & Payments Table / Cards with Pagination */}
            <AdminPaymentsTable
              orders={paginatedResult.orders}
              isFiltered={isFiltered}
              page={paginatedResult.page}
              totalPages={paginatedResult.totalPages}
              totalCount={paginatedResult.totalCount}
              pageSize={paginatedResult.pageSize}
              onPageChange={(newPage) => setPage(newPage)}
              onSelectOrder={(orderId) => setSelectedOrderId(orderId)}
              onNavigateToCouple={(workspaceId) => {
                onNavigate(`admin/couples/${workspaceId}`);
              }}
            />
          </main>

          {/* Inspection & Control Drawer */}
          {selectedOrderId && (
            <AdminPaymentDetailDrawer
              orderId={selectedOrderId}
              onClose={() => setSelectedOrderId(null)}
              onNavigateToCouple={(workspaceId) => {
                setSelectedOrderId(null);
                onNavigate(`admin/couples/${workspaceId}`);
              }}
              onNavigateToAccess={(workspaceId) => {
                setSelectedOrderId(null);
                onNavigate(`admin/couples/${workspaceId}/access`);
              }}
            />
          )}
        </div>
      )}
    </AdminLayout>
  );
}
