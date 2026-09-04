import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from './AdminLayout';
import { AdminCoupleHeader } from './AdminCoupleHeader';
import { AdminCouplePreparationSummary } from './AdminCouplePreparationSummary';
import { AdminCoupleMetrics } from './AdminCoupleMetrics';
import { AdminCoupleModuleProgress } from './AdminCoupleModuleProgress';
import { AdminCoupleActivity } from './AdminCoupleActivity';
import { AdminCoupleAccessCard } from './AdminCoupleAccessCard';
import { getAdminCoupleDetail } from '../../repositories/adminRepository';
import { AdminCoupleDetail } from '../../types/admin';
import { ArrowLeft, AlertCircle, Users } from 'lucide-react';

interface AdminCoupleDetailPageProps {
  workspaceId: string;
  onNavigate: (route: string) => void;
}

export function AdminCoupleDetailPage({
  workspaceId,
  onNavigate,
}: AdminCoupleDetailPageProps) {
  const [couple, setCouple] = useState<AdminCoupleDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminCoupleDetail(workspaceId);
      setCouple(data);
    } catch (err: unknown) {
      console.error('[WedFlow Admin] Error loading couple detail:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat data pasangan. Silakan coba lagi.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBackToCouples = () => {
    onNavigate('admin/couples');
  };

  const handleNavigateToAccess = () => {
    onNavigate(`admin/couples/${workspaceId}/access`);
  };


  return (
    <AdminLayout currentRoute="admin/couples" onNavigate={onNavigate}>
      {() => (
        <div className="flex-1 flex flex-col pb-16 sm:pb-8">
          {isLoading ? (
            /* Loading Skeleton State */
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
              <div className="h-6 w-36 bg-beige-100 animate-pulse rounded" />
              <div className="p-6 bg-white rounded-lg border border-beige-200 animate-pulse space-y-4">
                <div className="h-8 bg-beige-100 rounded w-1/3" />
                <div className="h-4 bg-beige-100 rounded w-1/4" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="h-40 bg-white rounded-lg border border-beige-200 animate-pulse p-6" />
                  <div className="h-64 bg-white rounded-lg border border-beige-200 animate-pulse p-6" />
                </div>
                <div className="space-y-6">
                  <div className="h-48 bg-white rounded-lg border border-beige-200 animate-pulse p-6" />
                  <div className="h-48 bg-white rounded-lg border border-beige-200 animate-pulse p-6" />
                </div>
              </div>
            </div>
          ) : error ? (
            /* Error State */
            <div className="p-4 sm:p-6 lg:p-8 max-w-2xl w-full mx-auto my-auto space-y-4 text-center">
              <div className="p-6 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 space-y-3 shadow-xs">
                <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                <h2 className="text-base font-semibold text-rose-900">
                  Gagal Memuat Data Pasangan
                </h2>
                <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={loadData}
                    className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Coba Lagi
                  </button>
                  <button
                    onClick={handleBackToCouples}
                    className="px-4 py-2 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Kembali ke Couples
                  </button>
                </div>
              </div>
            </div>
          ) : !couple ? (
            /* Workspace Not Found State */
            <div className="p-4 sm:p-6 lg:p-8 max-w-md w-full mx-auto my-auto text-center space-y-4">
              <div className="p-8 rounded-lg bg-white border border-beige-200 shadow-xs space-y-4">
                <Users className="w-12 h-12 text-charcoal-300 mx-auto" />
                <div className="space-y-1">
                  <h2 className="text-lg font-serif font-bold text-charcoal-900">
                    Pasangan tidak ditemukan
                  </h2>
                  <p className="text-xs text-charcoal-500">
                    Workspace yang Anda cari tidak ditemukan atau telah dihapus.
                  </p>
                </div>
                <button
                  onClick={handleBackToCouples}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-burgundy-700 hover:bg-burgundy-800 text-white rounded-md text-xs font-semibold shadow-xs transition-all cursor-pointer w-full"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke Couples</span>
                </button>
              </div>
            </div>
          ) : (
            /* Couple Detail View */
            <>
              {/* Header */}
              <AdminCoupleHeader
                couple={couple}
                onBack={handleBackToCouples}
                onRefresh={loadData}
                isLoading={isLoading}
              />

              {/* Main Content Container */}
              <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
                {/* 2-Column Responsive Layout on Desktop/Tablet */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Left Column (Main Preparation Progress) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Section 1: Preparation Overview (Task Progress) */}
                    <AdminCouplePreparationSummary couple={couple} />

                    {/* Section 2: Summary Metrics (Modules, Budget, Guests) */}
                    <AdminCoupleMetrics couple={couple} />

                    {/* Section 3: Module Progress Breakdown */}
                    <AdminCoupleModuleProgress couple={couple} />
                  </div>

                  {/* Right Column (Access & Activity Sidecards) */}
                  <div className="space-y-6">
                    {/* Section 5: Access Summary Card */}
                    <AdminCoupleAccessCard
                      couple={couple}
                      onNavigateToAccess={handleNavigateToAccess}
                    />

                    {/* Section 4: Recent Activity */}
                    <AdminCoupleActivity couple={couple} />
                  </div>
                </div>
              </main>
            </>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
