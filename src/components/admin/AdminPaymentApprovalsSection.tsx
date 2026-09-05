import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getManualPaymentApprovals,
  approveManualPayment,
  rejectManualPayment,
} from '../../repositories/adminRepository';
import {
  ManualPaymentApprovalItem,
  ManualPaymentApprovalStatus,
  ManualPaymentApprovalsFilterState,
} from '../../types/admin';
import { formatIndonesianDate } from '../../domain/workspaceSelectors';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Eye,
  Check,
  X,
  ShieldCheck,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

interface AdminPaymentApprovalsSectionProps {
  onSelectOrder?: (orderId: string) => void;
  onNavigateToCouple?: (workspaceId: string) => void;
}

export function AdminPaymentApprovalsSection({
  onSelectOrder,
  onNavigateToCouple,
}: AdminPaymentApprovalsSectionProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<ManualPaymentApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<ManualPaymentApprovalStatus>('awaiting_approval');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal States
  const [approvingItem, setApprovingItem] = useState<ManualPaymentApprovalItem | null>(null);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [approveNotes, setApproveNotes] = useState<string>('');

  const [rejectingItem, setRejectingItem] = useState<ManualPaymentApprovalItem | null>(null);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectNotes, setRejectNotes] = useState<string>('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getManualPaymentApprovals();
      setItems(data);
    } catch (err: any) {
      console.error('[AdminPaymentApprovals] Error loading approvals:', err);
      setError(err.message || 'Gagal memuat daftar pembayaran manual.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  // Tab counts
  const counts = useMemo(() => {
    const awaiting = items.filter((i) => i.manualPaymentStatus === 'awaiting_approval').length;
    const approved = items.filter((i) => i.manualPaymentStatus === 'approved').length;
    const rejected = items.filter((i) => i.manualPaymentStatus === 'rejected').length;
    const all = items.length;
    return { awaiting, approved, rejected, all };
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (activeTab !== 'all' && item.manualPaymentStatus !== activeTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesOrder = item.orderNumber.toLowerCase().includes(q);
        const matchesCouple = item.coupleName.toLowerCase().includes(q);
        const matchesEmail = item.customerEmail?.toLowerCase().includes(q);
        return matchesOrder || matchesCouple || matchesEmail;
      }
      return true;
    });
  }, [items, activeTab, searchQuery]);

  // Handle Approve
  const handleConfirmApprove = async () => {
    if (!approvingItem || isApproving) return;

    setIsApproving(true);
    try {
      const actorId = user?.email || user?.id || 'admin';
      await approveManualPayment({
        orderId: approvingItem.id,
        adminNotes: approveNotes.trim() || undefined,
        actorId,
      });

      setApprovingItem(null);
      setApproveNotes('');
      setSuccessToast('Pembayaran berhasil disetujui. Akses customer telah diaktifkan.');
      setTimeout(() => setSuccessToast(null), 5000);
      await loadApprovals();
    } catch (err: any) {
      console.error('[AdminPaymentApprovals] Error approving payment:', err);
      setError(err.message || 'Gagal menyetujui pembayaran.');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Reject
  const handleConfirmReject = async () => {
    if (!rejectingItem || isRejecting) return;

    const cleanReason = rejectionReason.trim();
    if (!cleanReason) {
      setRejectError('Alasan penolakan wajib diisi.');
      return;
    }

    setIsRejecting(true);
    setRejectError(null);
    try {
      const actorId = user?.email || user?.id || 'admin';
      await rejectManualPayment({
        orderId: rejectingItem.id,
        reason: cleanReason,
        adminNotes: rejectNotes.trim() || undefined,
        actorId,
      });

      setRejectingItem(null);
      setRejectionReason('');
      setRejectNotes('');
      setSuccessToast('Pembayaran manual telah ditolak.');
      setTimeout(() => setSuccessToast(null), 4000);
      await loadApprovals();
    } catch (err: any) {
      console.error('[AdminPaymentApprovals] Error rejecting payment:', err);
      setRejectError(err.message || 'Gagal menolak pembayaran.');
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadApprovals}
            className="text-xs font-semibold text-rose-800 hover:text-rose-950 underline cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Toolbar & Filter Tabs */}
      <div className="bg-white border border-beige-300 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('awaiting_approval')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'awaiting_approval'
                  ? 'bg-amber-100/90 text-amber-900 border border-amber-300 shadow-2xs'
                  : 'text-charcoal-500 hover:text-charcoal hover:bg-ivory-100'
              }`}
            >
              <span>Menunggu Persetujuan</span>
              {counts.awaiting > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-600 text-white rounded-full text-[10px] font-bold">
                  {counts.awaiting}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('approved')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'approved'
                  ? 'bg-emerald-100/90 text-emerald-900 border border-emerald-300 shadow-2xs'
                  : 'text-charcoal-500 hover:text-charcoal hover:bg-ivory-100'
              }`}
            >
              <span>Disetujui</span>
              <span className="px-1.5 py-0.2 bg-charcoal-200 text-charcoal-700 rounded-full text-[10px]">
                {counts.approved}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rejected')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'rejected'
                  ? 'bg-rose-100/90 text-rose-900 border border-rose-300 shadow-2xs'
                  : 'text-charcoal-500 hover:text-charcoal hover:bg-ivory-100'
              }`}
            >
              <span>Ditolak</span>
              <span className="px-1.5 py-0.2 bg-charcoal-200 text-charcoal-700 rounded-full text-[10px]">
                {counts.rejected}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-charcoal-800 text-white shadow-2xs'
                  : 'text-charcoal-500 hover:text-charcoal hover:bg-ivory-100'
              }`}
            >
              <span>Semua</span>
              <span className="px-1.5 py-0.2 bg-charcoal-600 text-white rounded-full text-[10px]">
                {counts.all}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari order, nama, email..."
              className="w-full pl-9 pr-4 py-2 bg-ivory-50 border border-beige-300 rounded-xl text-xs text-charcoal focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-burgundy/20 focus:border-burgundy"
            />
          </div>
        </div>
      </div>

      {/* Approvals Table / Card List */}
      <div className="bg-white border border-beige-300 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-burgundy animate-spin mx-auto" />
            <p className="text-sm text-charcoal-500">Memuat data verifikasi pembayaran manual...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Clock className="w-10 h-10 text-charcoal-300 mx-auto" />
            <h4 className="font-serif text-base font-bold text-charcoal">Tidak Ada Data Pembayaran</h4>
            <p className="text-xs text-charcoal-500">
              {searchQuery
                ? `Tidak ditemukan pembayaran yang cocok dengan "${searchQuery}".`
                : activeTab === 'awaiting_approval'
                ? 'Tidak ada pembayaran manual yang sedang menunggu persetujuan.'
                : 'Belum ada data pembayaran untuk filter ini.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-ivory-50/80 border-b border-beige-200 text-charcoal-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Paket</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Metode</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-beige-200">
                {filteredItems.map((item) => {
                  const isAwaiting = item.manualPaymentStatus === 'awaiting_approval';
                  const isApproved = item.manualPaymentStatus === 'approved';
                  const isRejected = item.manualPaymentStatus === 'rejected';

                  return (
                    <tr key={item.id} className="hover:bg-ivory-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-charcoal">
                        {item.orderNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-charcoal">
                          {onNavigateToCouple ? (
                            <button
                              type="button"
                              onClick={() => onNavigateToCouple(item.workspaceId)}
                              className="hover:text-burgundy hover:underline text-left cursor-pointer"
                            >
                              {item.coupleName}
                            </button>
                          ) : (
                            item.coupleName
                          )}
                        </div>
                        {item.customerEmail && (
                          <div className="text-[11px] text-charcoal-400 truncate max-w-[180px]">
                            {item.customerEmail}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-charcoal-700">
                        {item.productName}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-charcoal">
                        Rp{item.amount.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-charcoal-600">
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          <span>Manual / WA</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isAwaiting ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Menunggu Persetujuan
                          </span>
                        ) : isApproved ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Disetujui
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            <X className="w-3 h-3 text-rose-600" />
                            Ditolak
                          </span>
                        ) : (
                          <span className="text-[11px] text-charcoal-400">
                            {item.manualPaymentStatus}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-charcoal-400 text-[11px]">
                        {formatIndonesianDate(item.createdAt.split('T')[0])}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Detail Button */}
                          <button
                            type="button"
                            onClick={() => onSelectOrder?.(item.id)}
                            className="px-2.5 py-1 text-[11px] font-medium text-charcoal-600 bg-ivory-100 hover:bg-beige-200 border border-beige-300 rounded-lg transition-colors cursor-pointer"
                          >
                            Detail
                          </button>

                          {/* Actions only when awaiting approval */}
                          {isAwaiting && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingItem(item);
                                  setRejectionReason('');
                                  setRejectNotes('');
                                  setRejectError(null);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                              >
                                Tolak
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setApprovingItem(item);
                                  setApproveNotes('');
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
                              >
                                Approve
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* APPROVE CONFIRMATION MODAL */}
      {approvingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs">
          <div
            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <button
                  type="button"
                  onClick={() => setApprovingItem(null)}
                  disabled={isApproving}
                  className="p-1.5 text-charcoal-400 hover:text-charcoal bg-ivory-100 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <h3 className="font-serif text-xl font-bold text-charcoal">
                  Approve pembayaran?
                </h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Pastikan pembayaran sebesar{' '}
                  <strong className="text-burgundy">
                    Rp{approvingItem.amount.toLocaleString('id-ID')}
                  </strong>{' '}
                  untuk pesanan <strong>{approvingItem.orderNumber}</strong> ({approvingItem.coupleName}) sudah benar-benar diterima di rekening bank tujuan.
                </p>
              </div>

              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-semibold text-charcoal-600">
                  Catatan Admin (Opsional)
                </label>
                <input
                  type="text"
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  placeholder="Contoh: Bukti transfer BCA via WA terverifikasi"
                  className="w-full px-3 py-2 bg-ivory-50 border border-beige-300 rounded-xl text-xs text-charcoal focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setApprovingItem(null)}
                  disabled={isApproving}
                  className="px-4 py-2.5 text-xs font-semibold text-charcoal-600 bg-ivory-100 hover:bg-beige-200 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  disabled={isApproving}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isApproving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{isApproving ? 'Memproses...' : 'Ya, Approve Pembayaran'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECT CONFIRMATION MODAL */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs">
          <div
            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <button
                  type="button"
                  onClick={() => setRejectingItem(null)}
                  disabled={isRejecting}
                  className="p-1.5 text-charcoal-400 hover:text-charcoal bg-ivory-100 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <h3 className="font-serif text-xl font-bold text-charcoal">
                  Tolak Pembayaran
                </h3>
                <p className="text-xs text-charcoal-500">
                  Pesanan <strong>{rejectingItem.orderNumber}</strong> ({rejectingItem.coupleName}). Alasan penolakan akan ditampilkan kepada pelanggan.
                </p>
              </div>

              {rejectError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{rejectError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-charcoal-700">
                  Alasan Penolakan <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Bukti transfer tidak terbaca / nominal tidak sesuai"
                  className="w-full p-3 bg-ivory-50 border border-beige-300 rounded-xl text-xs text-charcoal focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-charcoal-600">
                  Catatan Internal Admin (Opsional)
                </label>
                <input
                  type="text"
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Catatan tambahan untuk tim admin"
                  className="w-full px-3 py-2 bg-ivory-50 border border-beige-300 rounded-xl text-xs text-charcoal focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-charcoal/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setRejectingItem(null)}
                  disabled={isRejecting}
                  className="px-4 py-2.5 text-xs font-semibold text-charcoal-600 bg-ivory-100 hover:bg-beige-200 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={isRejecting}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isRejecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  <span>{isRejecting ? 'Menolak...' : 'Tolak Pembayaran'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
