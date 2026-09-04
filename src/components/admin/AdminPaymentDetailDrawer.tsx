import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  ShoppingBag,
  User,
  CreditCard,
  ShieldCheck,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  Ban,
} from 'lucide-react';
import { AdminOrderDetail } from '../../types/admin';
import {
  getAdminOrderDetail,
  adminMarkOrderPaid,
  adminCancelOrder,
  syncAdminPaymentStatus,
} from '../../repositories/adminRepository';
import {
  formatAdminDate,
  formatAdminPrice,
  formatOrderStatusBadge,
  evaluateEntitlementMismatch,
} from '../../domain/adminSelectors';

interface AdminPaymentDetailDrawerProps {
  orderId: string | null;
  onClose: () => void;
  onNavigateToCouple?: (workspaceId: string) => void;
  onNavigateToAccess?: (workspaceId: string) => void;
}

export function sanitizeMetadata(meta: Record<string, any> = {}): Record<string, any> {
  const sanitized: Record<string, any> = {};
  const forbiddenSubstrings = ['secret', 'key', 'token', 'jwt', 'auth', 'pass'];

  for (const [k, v] of Object.entries(meta)) {
    const isForbidden = forbiddenSubstrings.some((sub) => k.toLowerCase().includes(sub));
    if (isForbidden) {
      sanitized[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      sanitized[k] = sanitizeMetadata(v);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

export function AdminPaymentDetailDrawer({
  orderId,
  onClose,
  onNavigateToCouple,
  onNavigateToAccess,
}: AdminPaymentDetailDrawerProps) {
  const [detail, setDetail] = useState<AdminOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRawOpen, setIsRawOpen] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Operational Action State
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Mark as Paid Modal State
  const [showMarkPaidModal, setShowMarkPaidModal] = useState<boolean>(false);
  const [markPaidReason, setMarkPaidReason] = useState<string>('');
  const [markPaidNotes, setMarkPaidNotes] = useState<string>('');
  const [isMarkingPaid, setIsMarkingPaid] = useState<boolean>(false);
  const [markPaidError, setMarkPaidError] = useState<string | null>(null);

  // Cancel Order Modal State
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!orderId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminOrderDetail(orderId);
      if (!data) {
        setError('Data pesanan tidak ditemukan.');
      } else {
        setDetail(data);
      }
    } catch (err: unknown) {
      console.error('[AdminPaymentDetailDrawer] Error loading order detail:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat detail pesanan.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Handle ESC key to close drawer (when modals are not open)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMarkPaidModal) {
          setShowMarkPaidModal(false);
        } else if (showCancelModal) {
          setShowCancelModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showMarkPaidModal, showCancelModal]);

  if (!orderId) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Operational Handler: Sync Payment Status with Midtrans
  const handleSyncStatus = async () => {
    if (!detail) return;
    setIsSyncing(true);
    setActionFeedback(null);
    try {
      const syncResult = await syncAdminPaymentStatus(detail.orderNumber);
      const newStatus = syncResult.status || syncResult.order?.status || 'disinkronkan';
      setActionFeedback({
        type: 'success',
        text: `Status berhasil disinkronkan dengan Midtrans (Status saat ini: ${newStatus}).`,
      });
      await loadDetail();
    } catch (err: any) {
      console.error('[AdminPaymentDetailDrawer] Sync error:', err);
      setActionFeedback({
        type: 'error',
        text: err.message || 'Gagal menyinkronkan status dengan Midtrans.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Operational Handler: Submit Administrative Mark as Paid
  const handleMarkPaidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    const cleanReason = markPaidReason.trim();
    if (!cleanReason) {
      setMarkPaidError('Alasan intervensi administratif wajib diisi.');
      return;
    }

    setIsMarkingPaid(true);
    setMarkPaidError(null);
    try {
      await adminMarkOrderPaid({
        orderId: detail.id,
        reason: cleanReason,
        adminNotes: markPaidNotes.trim() || undefined,
        actorId: 'admin',
      });
      setShowMarkPaidModal(false);
      setMarkPaidReason('');
      setMarkPaidNotes('');
      setActionFeedback({
        type: 'success',
        text: `Pesanan ${detail.orderNumber} berhasil diubah menjadi Paid dan Wedding Pass aktif tanpa batas waktu.`,
      });
      await loadDetail();
    } catch (err: any) {
      console.error('[AdminPaymentDetailDrawer] Mark Paid error:', err);
      setMarkPaidError(err.message || 'Gagal memproses intervensi pembayaran.');
    } finally {
      setIsMarkingPaid(false);
    }
  };

  // Operational Handler: Submit Administrative Cancel Order
  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    const cleanReason = cancelReason.trim();
    if (!cleanReason) {
      setCancelError('Alasan pembatalan pesanan wajib diisi.');
      return;
    }

    setIsCancelling(true);
    setCancelError(null);
    try {
      await adminCancelOrder({
        orderId: detail.id,
        reason: cleanReason,
        actorId: 'admin',
      });
      setShowCancelModal(false);
      setCancelReason('');
      setActionFeedback({
        type: 'success',
        text: `Pesanan ${detail.orderNumber} berhasil dibatalkan.`,
      });
      await loadDetail();
    } catch (err: any) {
      console.error('[AdminPaymentDetailDrawer] Cancel error:', err);
      setCancelError(err.message || 'Gagal membatalkan pesanan.');
    } finally {
      setIsCancelling(false);
    }
  };

  const badge = detail ? formatOrderStatusBadge(detail.status) : null;
  const mismatchEval = detail ? evaluateEntitlementMismatch(detail.status, detail.entitlement) : null;

  const isRefunded =
    detail?.status === 'cancelled' &&
    Boolean(detail.metadata?.refunded_at || detail.rawPayment?.status === 'refunded');

  const canMarkPaid =
    detail &&
    !isRefunded &&
    (detail.status === 'pending' || detail.status === 'failed' || detail.status === 'expired');

  const canCancel = detail && detail.status === 'pending';
  const canSync = detail && !isRefunded;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-charcoal-900/40 backdrop-blur-2xs animate-fadeIn">
      {/* Backdrop click listener */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Slide-over Drawer Panel */}
      <aside
        className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col z-10 border-l border-beige-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Detail Transaksi Pesanan"
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 bg-ivory-50 border-b border-beige-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-ivory-200 flex items-center justify-center text-charcoal-700">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-charcoal-900">
                  {detail ? detail.orderNumber : 'Memuat Pesanan...'}
                </span>
                {badge && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-charcoal-500">ID: {orderId}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={loadDetail}
              disabled={isLoading || isSyncing}
              className="p-1.5 text-charcoal-500 hover:text-charcoal-800 hover:bg-beige-100 rounded-md transition-colors cursor-pointer"
              aria-label="Segarkan detail"
              title="Segarkan data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-charcoal-500 hover:text-charcoal-800 hover:bg-beige-100 rounded-md transition-colors cursor-pointer"
              aria-label="Tutup panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Loading Skeleton */}
          {isLoading && !detail && (
            <div className="space-y-4 animate-pulse">
              <div className="h-20 bg-ivory-100 rounded-lg" />
              <div className="h-28 bg-ivory-100 rounded-lg" />
              <div className="h-28 bg-ivory-100 rounded-lg" />
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={loadDetail}
                className="px-2 py-1 bg-white border border-rose-300 text-rose-800 rounded font-semibold text-[11px] cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div
              role="alert"
              className={`p-3.5 rounded-lg border text-xs flex items-start justify-between gap-2 animate-fadeIn ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <div className="flex items-start gap-2">
                {actionFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{actionFeedback.text}</span>
              </div>
              <button
                onClick={() => setActionFeedback(null)}
                className="text-charcoal-400 hover:text-charcoal-600 cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {detail && (
            <>
              {/* OPERATIONAL CONTROL CENTER ACTIONS */}
              <section className="bg-ivory-100/70 p-3.5 rounded-lg border border-beige-300/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-charcoal-900 text-xs flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-burgundy-800" />
                    <span>Pusat Tindakan Operasional</span>
                  </span>
                  {isRefunded && (
                    <span className="text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Refunded (Hanya Inspeksi)
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Sync Status Action */}
                  {canSync && (
                    <button
                      onClick={handleSyncStatus}
                      disabled={isSyncing}
                      className="px-3 py-1.5 bg-white hover:bg-ivory-50 border border-beige-300 rounded font-semibold text-charcoal-800 hover:text-charcoal-900 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-2xs"
                      title="Periksa status transaksi terkini dari Midtrans"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-burgundy-700 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Sinkronisasi...' : 'Sync Status'}</span>
                    </button>
                  )}

                  {/* Mark as Paid Action */}
                  {canMarkPaid && (
                    <button
                      onClick={() => {
                        setShowMarkPaidModal(true);
                        setMarkPaidReason('');
                        setMarkPaidNotes('');
                        setMarkPaidError(null);
                      }}
                      className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      title="Tindakan administratif untuk menetapkan pesanan menjadi Paid"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark as Paid</span>
                    </button>
                  )}

                  {/* Cancel Order Action */}
                  {canCancel && (
                    <button
                      onClick={() => {
                        setShowCancelModal(true);
                        setCancelReason('');
                        setCancelError(null);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-rose-300 text-rose-800 hover:text-rose-900 rounded font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      title="Batalkan pesanan pending ini"
                    >
                      <Ban className="w-3.5 h-3.5 text-rose-600" />
                      <span>Cancel Order</span>
                    </button>
                  )}
                </div>
              </section>

              {/* DIAGNOSTIC ENTITLEMENT HEALTH / MISMATCH BANNER */}
              {mismatchEval && mismatchEval.hasMismatch && (
                <div
                  role="alert"
                  className={`p-3.5 rounded-lg border text-xs space-y-1 ${
                    mismatchEval.severity === 'critical'
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle
                      className={`w-4 h-4 shrink-0 ${
                        mismatchEval.severity === 'critical' ? 'text-rose-600' : 'text-amber-600'
                      }`}
                    />
                    <span>{mismatchEval.title}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed pl-6">{mismatchEval.message}</p>
                </div>
              )}

              {/* SECTION 1: RINGKASAN PESANAN */}
              <section className="bg-ivory-50/70 p-4 rounded-lg border border-beige-200/80 space-y-2.5">
                <h4 className="font-serif font-bold text-xs text-charcoal-900 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-burgundy-700" />
                  <span>Ringkasan Pesanan</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[11px] text-charcoal-400 block">Nomor Pesanan</span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-charcoal-900">
                      <span>{detail.orderNumber}</span>
                      <button
                        onClick={() => handleCopy(detail.orderNumber, 'orderNumber')}
                        className="p-1 hover:text-burgundy-800 cursor-pointer"
                        title="Salin Nomor Pesanan"
                      >
                        {copiedField === 'orderNumber' ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-charcoal-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-charcoal-400 block">Total Nominal</span>
                    <span className="font-mono font-bold text-sm text-charcoal-900">
                      {formatAdminPrice(detail.amount, detail.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-charcoal-400 block">Produk</span>
                    <span className="font-medium text-charcoal-800">{detail.productName}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-charcoal-400 block">Waktu Dibuat</span>
                    <span className="font-mono text-charcoal-700">{formatAdminDate(detail.createdAt)}</span>
                  </div>
                  {detail.paidAt && (
                    <div className="col-span-2">
                      <span className="text-[11px] text-charcoal-400 block">Waktu Pembayaran Lunas</span>
                      <span className="font-mono text-emerald-700 font-semibold">{formatAdminDate(detail.paidAt)}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* SECTION 2: KONTEKS PASANGAN & WORKSPACE */}
              <section className="bg-ivory-50/70 p-4 rounded-lg border border-beige-200/80 space-y-2.5">
                <h4 className="font-serif font-bold text-xs text-charcoal-900 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-burgundy-700" />
                  <span>Konteks Pasangan & Pernikahan</span>
                </h4>
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-charcoal-500">Nama Pasangan:</span>
                    <span className="font-semibold text-charcoal-900">{detail.coupleName}</span>
                  </div>
                  {detail.customerEmail && (
                    <div className="flex items-center justify-between">
                      <span className="text-charcoal-500">Email Akun:</span>
                      <span className="font-mono text-charcoal-800">{detail.customerEmail}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-charcoal-500">Tanggal Pernikahan:</span>
                    <span className="font-mono text-charcoal-800">{formatAdminDate(detail.weddingDate || null)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-charcoal-500">Workspace ID:</span>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-charcoal-600">
                      <span>{detail.workspaceId}</span>
                      <button
                        onClick={() => handleCopy(detail.workspaceId, 'workspaceId')}
                        className="p-1 hover:text-burgundy-800 cursor-pointer"
                        title="Salin Workspace ID"
                      >
                        {copiedField === 'workspaceId' ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-charcoal-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Deep link buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-beige-200/60">
                    {onNavigateToCouple && (
                      <button
                        onClick={() => onNavigateToCouple(detail.workspaceId)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-burgundy-800 hover:text-burgundy-900 hover:underline cursor-pointer"
                      >
                        <span>Buka Profil Pasangan</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                    {onNavigateToAccess && (
                      <button
                        onClick={() => onNavigateToAccess(detail.workspaceId)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-charcoal-600 hover:text-charcoal-900 hover:underline cursor-pointer ml-auto"
                      >
                        <span>Kelola Hak Akses</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* SECTION 3: DETAIL PEMBAYARAN & GATEWAY */}
              <section className="bg-ivory-50/70 p-4 rounded-lg border border-beige-200/80 space-y-2.5">
                <h4 className="font-serif font-bold text-xs text-charcoal-900 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-burgundy-700" />
                  <span>Detail Gateway Pembayaran</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[11px] text-charcoal-400 block">Metode Pembayaran</span>
                    <span className="font-mono font-medium text-charcoal-800 uppercase">
                      {detail.paymentMethod || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-charcoal-400 block">Penyedia / Gateway</span>
                    <span className="font-mono font-medium text-charcoal-800">
                      {detail.provider === 'manual_admin' ? 'Manual Admin (Intervensi)' : detail.provider || 'Midtrans'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] text-charcoal-400 block">ID Transaksi / Provider Ref</span>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-charcoal-900">
                      <span className="break-all">{detail.providerReference || '-'}</span>
                      {detail.providerReference && (
                        <button
                          onClick={() => handleCopy(detail.providerReference!, 'providerRef')}
                          className="p-1 hover:text-burgundy-800 cursor-pointer"
                          title="Salin ID Transaksi"
                        >
                          {copiedField === 'providerRef' ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-charcoal-400" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* SECTION 4: STATUS HAK AKSES WEDDING PASS */}
              <section className="bg-ivory-50/70 p-4 rounded-lg border border-beige-200/80 space-y-2.5">
                <h4 className="font-serif font-bold text-xs text-charcoal-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-burgundy-700" />
                  <span>Status Hak Akses Wedding Pass</span>
                </h4>
                {detail.entitlement ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-charcoal-500">Tier Akses:</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                          detail.entitlement.tier === 'Paid'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : detail.entitlement.tier === 'Trial'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}
                      >
                        {detail.entitlement.tier === 'Paid'
                          ? 'Paid · Unlimited'
                          : detail.entitlement.tier === 'Trial'
                          ? 'Free Trial'
                          : 'Expired / Dicabut'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-charcoal-500">Masa Berlaku:</span>
                      <span className="font-mono font-medium text-charcoal-900">
                        {detail.entitlement.tier === 'Paid'
                          ? 'Tanpa batas waktu'
                          : detail.entitlement.expiresAt
                          ? formatAdminDate(detail.entitlement.expiresAt)
                          : 'Kedaluwarsa'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-charcoal-400 text-xs italic">Belum ada catatan hak akses tersimpan.</p>
                )}
              </section>

              {/* SECTION 5: DIAGNOSTIK & METADATA */}
              {(detail.metadata?.expired_reason ||
                detail.metadata?.refund_reason ||
                detail.metadata?.admin_reason ||
                detail.metadata?.cancellation_reason ||
                detail.metadata?.status_message ||
                detail.metadata?.partialRefundNotice) && (
                <section className="bg-amber-50/60 p-4 rounded-lg border border-amber-200 text-amber-900 space-y-2">
                  <h4 className="font-semibold text-xs flex items-center gap-1.5 text-amber-950">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                    <span>Catatan Diagnostik Transaksi</span>
                  </h4>
                  {detail.metadata?.admin_reason && (
                    <p className="text-xs">
                      <strong>Alasan Intervensi Admin:</strong> {detail.metadata.admin_reason}
                    </p>
                  )}
                  {detail.metadata?.admin_notes && (
                    <p className="text-xs">
                      <strong>Catatan Tambahan Admin:</strong> {detail.metadata.admin_notes}
                    </p>
                  )}
                  {detail.metadata?.cancellation_reason && (
                    <p className="text-xs">
                      <strong>Alasan Pembatalan:</strong> {detail.metadata.cancellation_reason}
                    </p>
                  )}
                  {detail.metadata?.expired_reason && (
                    <p className="text-xs">
                      <strong>Alasan Kedaluwarsa:</strong> {detail.metadata.expired_reason}
                    </p>
                  )}
                  {detail.metadata?.refund_reason && (
                    <p className="text-xs">
                      <strong>Alasan Refund:</strong> {detail.metadata.refund_reason}
                    </p>
                  )}
                </section>
              )}

              {/* COLLAPSIBLE RAW METADATA */}
              <section className="border border-beige-200 rounded-lg overflow-hidden bg-white">
                <button
                  onClick={() => setIsRawOpen(!isRawOpen)}
                  className="w-full px-4 py-2.5 bg-ivory-50 flex items-center justify-between text-charcoal-700 hover:bg-ivory-100 transition-colors cursor-pointer text-xs font-medium"
                >
                  <span>Metadata Teknis (Sanitized)</span>
                  {isRawOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                {isRawOpen && (
                  <div className="p-3 bg-charcoal-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-60">
                    <pre>{JSON.stringify(sanitizeMetadata(detail.metadata), null, 2)}</pre>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* MODAL 1: MARK AS PAID CONFIRMATION */}
        {showMarkPaidModal && detail && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-2xs animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-beige-200 overflow-hidden space-y-4 p-5">
              <div className="flex items-center justify-between border-b border-beige-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-emerald-100 flex items-center justify-center text-emerald-800">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h3 className="font-serif font-bold text-sm text-charcoal-900">
                    Intervensi Manual: Mark as Paid
                  </h3>
                </div>
                <button
                  onClick={() => setShowMarkPaidModal(false)}
                  className="text-charcoal-400 hover:text-charcoal-600 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1">
                <p className="font-bold">Perhatian: Tindakan Administratif</p>
                <p className="text-[11px] leading-relaxed">
                  Tindakan ini akan menetapkan pesanan <strong>{detail.orderNumber}</strong> menjadi Paid dan mengaktifkan hak akses Wedding Pass tanpa batas waktu untuk pasangan <strong>{detail.coupleName}</strong>.
                </p>
              </div>

              {markPaidError && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {markPaidError}
                </div>
              )}

              <form onSubmit={handleMarkPaidSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                    Alasan Intervensi <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={markPaidReason}
                    onChange={(e) => setMarkPaidReason(e.target.value)}
                    placeholder="Contoh: Pembayaran manual via transfer bank verifikasi manual WhatsApp CS..."
                    className="w-full p-2.5 bg-ivory-50 border border-beige-300 rounded-md text-xs text-charcoal-900 placeholder:text-charcoal-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-700"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                    Catatan Internal Admin (Opsional)
                  </label>
                  <input
                    type="text"
                    value={markPaidNotes}
                    onChange={(e) => setMarkPaidNotes(e.target.value)}
                    placeholder="Nomor referensi bukti transfer / tiket..."
                    className="w-full p-2 bg-ivory-50 border border-beige-300 rounded-md text-xs text-charcoal-900 placeholder:text-charcoal-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-700"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-beige-100">
                  <button
                    type="button"
                    onClick={() => setShowMarkPaidModal(false)}
                    disabled={isMarkingPaid}
                    className="px-3.5 py-1.5 bg-ivory-100 hover:bg-ivory-200 text-charcoal-700 rounded-md text-xs font-medium cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isMarkingPaid || !markPaidReason.trim()}
                    className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-md text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5 shadow-2xs"
                  >
                    {isMarkingPaid ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <span>Konfirmasi Mark as Paid</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: CANCEL ORDER CONFIRMATION */}
        {showCancelModal && detail && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-2xs animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-beige-200 overflow-hidden space-y-4 p-5">
              <div className="flex items-center justify-between border-b border-beige-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-rose-100 flex items-center justify-center text-rose-800">
                    <Ban className="w-4 h-4" />
                  </div>
                  <h3 className="font-serif font-bold text-sm text-charcoal-900">
                    Batalkan Pesanan Pending
                  </h3>
                </div>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="text-charcoal-400 hover:text-charcoal-600 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
                <p className="font-bold">Konfirmasi Pembatalan</p>
                <p className="text-[11px] leading-relaxed">
                  Tindakan ini akan membatalkan pesanan pending <strong>{detail.orderNumber}</strong> secara permanen.
                </p>
              </div>

              {cancelError && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {cancelError}
                </div>
              )}

              <form onSubmit={handleCancelSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-charcoal-800 mb-1">
                    Alasan Pembatalan <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Contoh: Permintaan customer, pesanan duplikat, batas waktu habis..."
                    className="w-full p-2.5 bg-ivory-50 border border-beige-300 rounded-md text-xs text-charcoal-900 placeholder:text-charcoal-400 focus:outline-hidden focus:ring-1 focus:ring-rose-700"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-beige-100">
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    disabled={isCancelling}
                    className="px-3.5 py-1.5 bg-ivory-100 hover:bg-ivory-200 text-charcoal-700 rounded-md text-xs font-medium cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isCancelling || !cancelReason.trim()}
                    className="px-4 py-1.5 bg-rose-800 hover:bg-rose-900 text-white rounded-md text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5 shadow-2xs"
                  >
                    {isCancelling ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Membatalkan...</span>
                      </>
                    ) : (
                      <span>Konfirmasi Batalkan Pesanan</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
