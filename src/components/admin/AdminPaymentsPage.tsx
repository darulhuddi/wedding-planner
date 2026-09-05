import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminLayout } from './AdminLayout';
import { AdminHeader } from './AdminHeader';
import { AdminPaymentsKpiGrid } from './AdminPaymentsKpiGrid';
import { AdminPaymentsToolbar } from './AdminPaymentsToolbar';
import { AdminPaymentsTable } from './AdminPaymentsTable';
import { AdminPaymentDetailDrawer } from './AdminPaymentDetailDrawer';
import { AdminPaymentApprovalsSection } from './AdminPaymentApprovalsSection';
import { AdminPaymentSettingsSection } from './AdminPaymentSettingsSection';
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
import {
  AlertCircle,
  CreditCard,
  CheckSquare,
  Settings,
  Receipt,
} from 'lucide-react';

export type AdminPaymentSubTab = 'orders' | 'approvals' | 'settings';

interface AdminPaymentsPageProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export function AdminPaymentsPage({
  currentRoute,
  onNavigate,
}: AdminPaymentsPageProps) {
  // Determine active tab from route
  const getInitialTab = (): AdminPaymentSubTab => {
    if (currentRoute === 'admin/payments/settings') return 'settings';
    if (currentRoute === 'admin/payments/approvals') return 'approvals';
    return 'approvals'; // Default to approvals for swift actioning
  };

  const [activeTab, setActiveTab] = useState<AdminPaymentSubTab>(getInitialTab);

  useEffect(() => {
    if (currentRoute === 'admin/payments/settings') {
      setActiveTab('settings');
    } else if (currentRoute === 'admin/payments/approvals') {
      setActiveTab('approvals');
    } else if (currentRoute === 'admin/payments' || currentRoute === 'admin/payments/orders') {
      // Keep existing active tab or default to approvals
    }
  }, [currentRoute]);

  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Pagination State for Orders Table
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
    setPage(1);
  };

  const handleTabChange = (tab: AdminPaymentSubTab) => {
    setActiveTab(tab);
    if (tab === 'settings') {
      onNavigate('admin/payments/settings');
    } else if (tab === 'approvals') {
      onNavigate('admin/payments/approvals');
    } else {
      onNavigate('admin/payments');
    }
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

  // Count pending manual payments
  const pendingApprovalsCount = useMemo(() => {
    return orders.filter((o) => {
      const isManual =
        o.paymentMethod === 'manual' ||
        o.provider === 'manual_whatsapp' ||
        o.metadata?.paymentMethod === 'manual' ||
        o.metadata?.manual_payment_status === 'awaiting_approval';
      return isManual && o.status === 'pending' && o.metadata?.manual_payment_status !== 'rejected';
    }).length;
  }, [orders]);

  return (
    <AdminLayout currentRoute={currentRoute} onNavigate={onNavigate}>
      {(openMobileNav) => (
        <div className="flex-1 flex flex-col pb-16 sm:pb-8">
          {/* Header */}
          <AdminHeader
            title="Payments"
            subtitle="Kelola konfigurasi pembayaran, persetujuan manual WhatsApp, dan transaksi pesanan."
            onRefresh={loadData}
            isLoading={isLoading}
            onOpenMobileNav={openMobileNav}
          />

          {/* Sub Navigation Bar */}
          <div className="bg-white border-b border-beige-200 sticky top-16 z-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => handleTabChange('approvals')}
                className={`py-3.5 px-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'approvals'
                    ? 'border-burgundy text-burgundy font-bold'
                    : 'border-transparent text-charcoal-500 hover:text-charcoal hover:border-beige-300'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                <span>Payment Approvals</span>
                {pendingApprovalsCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-600 text-white rounded-full text-[10px] font-bold">
                    {pendingApprovalsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('orders')}
                className={`py-3.5 px-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'orders'
                    ? 'border-burgundy text-burgundy font-bold'
                    : 'border-transparent text-charcoal-500 hover:text-charcoal hover:border-beige-300'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Semua Transaksi</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('settings')}
                className={`py-3.5 px-3.5 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'settings'
                    ? 'border-burgundy text-burgundy font-bold'
                    : 'border-transparent text-charcoal-500 hover:text-charcoal hover:border-beige-300'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Payment Settings</span>
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {/* Global Error Banner */}
            {error && (
              <div
                role="alert"
                className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between text-xs sm:text-sm animate-fadeIn"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={loadData}
                  className="px-2.5 py-1 bg-white border border-rose-300 text-rose-800 rounded font-semibold text-xs hover:bg-rose-100 cursor-pointer"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {/* TAB 1: PAYMENT APPROVALS */}
            {activeTab === 'approvals' && (
              <AdminPaymentApprovalsSection
                onSelectOrder={(orderId) => setSelectedOrderId(orderId)}
                onNavigateToCouple={(workspaceId) => {
                  onNavigate(`admin/couples/${workspaceId}`);
                }}
              />
            )}

            {/* TAB 2: ORDERS & TRANSACTIONS */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
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
              </div>
            )}

            {/* TAB 3: PAYMENT SETTINGS */}
            {activeTab === 'settings' && (
              <AdminPaymentSettingsSection onSettingsSaved={() => loadData()} />
            )}
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
