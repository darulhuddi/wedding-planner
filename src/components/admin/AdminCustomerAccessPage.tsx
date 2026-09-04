import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from './AdminLayout';
import { AdminCustomerAccessHeader } from './AdminCustomerAccessHeader';
import { AdminCustomerCurrentAccess } from './AdminCustomerCurrentAccess';
import { AdminCustomerTrialManagement } from './AdminCustomerTrialManagement';
import { AdminCustomerWeddingPassGrant } from './AdminCustomerWeddingPassGrant';
import { AdminCustomerAccessHistory } from './AdminCustomerAccessHistory';
import {
  getCustomerEntitlement,
  getCustomerAccessHistory,
  extendCustomerTrial,
  grantComplimentaryWeddingPass,
} from '../../repositories/adminRepository';
import {
  CustomerEntitlement,
  CustomerAccessHistoryItem,
  ExtendTrialPayload,
  GrantWeddingPassPayload,
} from '../../types/admin';
import { AlertCircle, CheckCircle, RefreshCw, KeyRound } from 'lucide-react';

interface AdminCustomerAccessPageProps {
  workspaceId: string;
  onNavigate: (route: string) => void;
}

export function AdminCustomerAccessPage({
  workspaceId,
  onNavigate,
}: AdminCustomerAccessPageProps) {
  const [entitlement, setEntitlement] = useState<CustomerEntitlement | null>(null);
  const [history, setHistory] = useState<CustomerAccessHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  const loadCustomerAccessData = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [entData, histData] = await Promise.all([
        getCustomerEntitlement(workspaceId),
        getCustomerAccessHistory(workspaceId),
      ]);

      if (!entData) {
        setErrorMessage('Data pasangan tidak ditemukan atau telah dihapus.');
      } else {
        setEntitlement(entData);
        setHistory(histData);
      }
    } catch (err: any) {
      console.error('[WedFlow Admin] Error loading customer access data:', err);
      setErrorMessage(err.message || 'Gagal memuat data akses pasangan.');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadCustomerAccessData();
  }, [loadCustomerAccessData]);

  const handleExtendTrial = async (payload: ExtendTrialPayload) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessFeedback(null);

    try {
      const updated = await extendCustomerTrial(workspaceId, payload);
      setEntitlement(updated);
      const freshHistory = await getCustomerAccessHistory(workspaceId);
      setHistory(freshHistory);
      setSuccessFeedback(`Masa trial berhasil diperpanjang (+${payload.daysToAdd} hari).`);

      // Auto-clear success banner after 5s
      setTimeout(() => setSuccessFeedback(null), 5000);
    } catch (err: any) {
      console.error('[WedFlow Admin] Error extending trial:', err);
      setErrorMessage(err.message || 'Gagal memperpanjang masa trial.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleGrantWeddingPass = async (payload: GrantWeddingPassPayload) => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessFeedback(null);

    try {
      const updated = await grantComplimentaryWeddingPass(workspaceId, payload);
      setEntitlement(updated);
      const freshHistory = await getCustomerAccessHistory(workspaceId);
      setHistory(freshHistory);
      setSuccessFeedback('Hak akses Wedding Pass (Complimentary) berhasil diberikan.');

      // Auto-clear success banner after 5s
      setTimeout(() => setSuccessFeedback(null), 5000);
    } catch (err: any) {
      console.error('[WedFlow Admin] Error granting wedding pass:', err);
      setErrorMessage(err.message || 'Gagal memberikan Wedding Pass.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout currentRoute="admin/couples" onNavigate={onNavigate}>
      {(openMobileNav) => (
        <div className="flex-1 flex flex-col pb-16 sm:pb-8">
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {/* Loading State */}
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-charcoal-400">
                <RefreshCw className="w-6 h-6 animate-spin text-burgundy-700" />
                <p className="text-xs font-medium">Memuat data akses pasangan...</p>
              </div>
            ) : errorMessage && !entitlement ? (
              /* Error State when data completely failed to load */
              <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                <div>
                  <p className="text-sm font-semibold text-rose-900">Gagal Memuat Data Akses</p>
                  <p className="text-xs text-rose-700 mt-1">{errorMessage}</p>
                </div>
                <button
                  onClick={() => onNavigate('admin/couples')}
                  className="px-4 py-2 bg-white border border-rose-300 text-rose-800 rounded text-xs font-semibold hover:bg-rose-100 cursor-pointer"
                >
                  Kembali ke Daftar Couples
                </button>
              </div>
            ) : entitlement ? (
              /* Main Content */
              <>
                <AdminCustomerAccessHeader
                  entitlement={entitlement}
                  onBack={() => onNavigate(`admin/couples/${workspaceId}`)}
                />

                {/* Feedback Alerts */}
                {successFeedback && (
                  <div
                    role="status"
                    className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between animate-fadeIn"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">{successFeedback}</span>
                    </div>
                    <button
                      onClick={() => setSuccessFeedback(null)}
                      className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {errorMessage && (
                  <div
                    role="alert"
                    className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between animate-fadeIn"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                    <button
                      onClick={() => setErrorMessage(null)}
                      className="text-rose-700 hover:text-rose-900 font-bold ml-2 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Current Access Card */}
                <AdminCustomerCurrentAccess entitlement={entitlement} />

                {/* Management Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <AdminCustomerTrialManagement
                    entitlement={entitlement}
                    isSaving={isSaving}
                    onExtendTrial={handleExtendTrial}
                  />

                  <AdminCustomerWeddingPassGrant
                    entitlement={entitlement}
                    isSaving={isSaving}
                    onGrantWeddingPass={handleGrantWeddingPass}
                  />
                </div>

                {/* Audit History Timeline */}
                <AdminCustomerAccessHistory history={history} />
              </>
            ) : null}
          </main>
        </div>
      )}
    </AdminLayout>
  );
}

