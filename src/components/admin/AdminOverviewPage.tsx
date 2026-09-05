import React, { useState, useEffect, useCallback } from 'react';
import { AdminHeader } from './AdminHeader';
import { AdminKpiGrid } from './AdminKpiGrid';
import { AdminAttentionSection } from './AdminAttentionSection';
import { AdminRecentCouplesTable } from './AdminRecentCouplesTable';
import { AdminLayout } from './AdminLayout';
import { getAdminOverview } from '../../repositories/adminRepository';
import { AdminOverviewData, AdminCoupleSummary } from '../../types/admin';
import { AlertCircle } from 'lucide-react';

interface AdminOverviewPageProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onSelectCouple?: (couple: AdminCoupleSummary) => void;
}

export function AdminOverviewPage({
  currentRoute,
  onNavigate,
  onSelectCouple,
}: AdminOverviewPageProps) {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const overviewData = await getAdminOverview();
      setData(overviewData);
    } catch (err: unknown) {
      console.error('[WedFlow Admin] Error loading overview data:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat data Admin Overview. Silakan coba lagi.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const defaultMetrics = {
    totalCouples: 0,
    activeWeddings: 0,
    activeTrial: 0,
    paid: 0,
    expiringSoon: 0,
  };

  const metrics = data?.metrics || defaultMetrics;
  const attentionItems = data?.attentionItems || [];
  const recentCouples = data?.recentCouples || [];

  return (
    <AdminLayout currentRoute={currentRoute} onNavigate={onNavigate}>
      {(openMobileNav) => (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <AdminHeader
            title="Overview"
            subtitle="Pantau kesehatan dan aktivitas WedSiap."
            onRefresh={loadData}
            isLoading={isLoading}
            onOpenMobileNav={openMobileNav}
          />

          {/* Main Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8">
            {/* Error Notification */}
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
                  Coba Lagi
                </button>
              </div>
            )}

            {/* Section 1: Business Overview (KPI Grid) */}
            <AdminKpiGrid metrics={metrics} isLoading={isLoading} />

            {/* Section 2: Attention Needed */}
            <AdminAttentionSection
              items={attentionItems}
              isLoading={isLoading}
              onActionClick={(route) => onNavigate(route)}
            />

            {/* Section 3: Recent Couples */}
            <AdminRecentCouplesTable
              couples={recentCouples}
              isLoading={isLoading}
              onSelectCouple={
                onSelectCouple ||
                ((couple) => onNavigate(`admin/couples/${couple.id}`))
              }
            />
          </main>
        </div>
      )}
    </AdminLayout>
  );
}
