import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WorkspaceViewModel } from '../../types/workspace';
import { RoutePath } from '../../App';
import { useCustomerEntitlement } from '../../hooks/useCustomerEntitlement';
import { useAuth } from '../../auth/AuthContext';
import {
  verifyAndSyncOrderPayment,
  cancelPaymentAttempt,
  createPaymentSession,
  getActivePaymentAttempt,
} from '../../repositories/paymentRepository';
import { AdminOrderSummary } from '../../types/admin';
import { formatIndonesianDate } from '../../domain/workspaceSelectors';
import { useSnapScript } from './useSnapScript';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Lock,
  X,
  CreditCard,
  RotateCcw,
} from 'lucide-react';

export type PaymentVerificationStatus =
  | 'verifying'
  | 'paid'
  | 'pending'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'error';

export interface PaymentStatusPageProps {
  workspace: WorkspaceViewModel;
  onNavigate: (route: RoutePath) => void;
  initialOrderNumber?: string | null;
}

const MAX_POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 3500;

export function getOrderNumberFromUrl(): string | null {
  if (typeof window === 'undefined' || !window.location.search) {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get('order') || params.get('order_id') || params.get('orderNumber');
}

/**
 * Normalizes order status into canonical UI verification status.
 */
export function mapDomainStatusToVerificationStatus(
  status?: string,
  isPaid?: boolean,
  activeAttempt?: any
): PaymentVerificationStatus {
  if (isPaid || status === 'paid') return 'paid';
  if (status === 'pending') {
    // If order is pending but active attempt was cancelled or expired, reflect in UI state
    if (activeAttempt === null) {
      return 'cancelled';
    }
    return 'pending';
  }
  if (status === 'failed' || status === 'deny' || status === 'denied') return 'failed';
  if (status === 'cancelled' || status === 'cancel') return 'cancelled';
  if (status === 'expired' || status === 'expire') return 'expired';
  return 'error';
}

export const PaymentStatusPage: React.FC<PaymentStatusPageProps> = ({
  workspace,
  onNavigate,
  initialOrderNumber,
}) => {
  const { user } = useAuth();
  const { refresh: refreshEntitlement } = useCustomerEntitlement(workspace.id);
  const { isLoaded: isSnapLoaded } = useSnapScript();

  // Determine effective order number from prop or URL
  const effectiveOrderNumber = (
    initialOrderNumber ||
    getOrderNumberFromUrl() ||
    ''
  ).trim();

  // Component States
  const [verificationStatus, setVerificationStatus] = useState<PaymentVerificationStatus>('verifying');
  const [order, setOrder] = useState<AdminOrderSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState<number>(0);
  const [isPollingTimeout, setIsPollingTimeout] = useState<boolean>(false);
  const [isManualChecking, setIsManualChecking] = useState<boolean>(false);

  // Modal / Interaction States
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [isPaymentActionLoading, setIsPaymentActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Polling timer reference
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const clearTimer = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  // Perform single verification and synchronization step
  const executeVerification = useCallback(
    async (isManual: boolean = false) => {
      if (!effectiveOrderNumber) {
        setVerificationStatus('error');
        setErrorMessage('Nomor pesanan tidak ditemukan pada tautan.');
        return;
      }

      if (!workspace.id) {
        setVerificationStatus('error');
        setErrorMessage('Workspace aktif tidak ditemukan.');
        return;
      }

      if (isManual) {
        setIsManualChecking(true);
        setErrorMessage(null);
        setActionError(null);
      }

      try {
        const result = await verifyAndSyncOrderPayment(effectiveOrderNumber, workspace.id);

        if (!isMountedRef.current) return;

        setOrder(result.order);
        const activeAttempt = getActivePaymentAttempt(result.order);
        const nextStatus = mapDomainStatusToVerificationStatus(result.status, result.isPaid, activeAttempt);

        if (nextStatus === 'paid') {
          setVerificationStatus('paid');
          clearTimer();
          // Authoritative entitlement refresh
          await refreshEntitlement();
        } else if (nextStatus === 'pending') {
          setVerificationStatus('pending');
          // Check bounded polling
          setPollCount((prevCount) => {
            const newCount = prevCount + 1;
            if (newCount >= MAX_POLL_ATTEMPTS) {
              setIsPollingTimeout(true);
              clearTimer();
            } else {
              // Schedule next poll attempt
              clearTimer();
              pollTimerRef.current = setTimeout(() => {
                if (isMountedRef.current) {
                  executeVerification(false);
                }
              }, POLL_INTERVAL_MS);
            }
            return newCount;
          });
        } else {
          // Terminal or cancelled/expired attempt state
          setVerificationStatus(nextStatus);
          clearTimer();
        }
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        console.error('[PaymentStatusPage] Error during payment verification:', err);
        setVerificationStatus('error');
        setErrorMessage(
          err instanceof Error ? err.message : 'Terjadi kendala saat memverifikasi status pembayaran.'
        );
        clearTimer();
      } finally {
        if (isMountedRef.current) {
          setIsManualChecking(false);
        }
      }
    },
    [effectiveOrderNumber, workspace.id, refreshEntitlement]
  );

  // Mount effect: execute initial sync
  useEffect(() => {
    isMountedRef.current = true;
    executeVerification(false);

    return () => {
      isMountedRef.current = false;
      clearTimer();
    };
  }, [executeVerification]);

  // Handler: "Lanjutkan Pembayaran" (Resumes existing active attempt)
  const handleContinuePayment = async () => {
    if (!order) return;
    const activeAttempt = getActivePaymentAttempt(order);
    if (!activeAttempt) {
      setActionError('Sesi pembayaran ini telah berakhir atau dibatalkan. Silakan buat sesi pembayaran baru.');
      setVerificationStatus('cancelled');
      return;
    }

    if (typeof window === 'undefined' || !window.snap || typeof window.snap.pay !== 'function') {
      setActionError('Skrip pembayaran Midtrans belum siap. Silakan coba beberapa saat lagi.');
      return;
    }

    setIsPaymentActionLoading(true);
    setActionError(null);

    try {
      window.snap.pay(activeAttempt.token, {
        onSuccess: async () => {
          setIsPaymentActionLoading(false);
          await executeVerification(true);
        },
        onPending: async () => {
          setIsPaymentActionLoading(false);
          await executeVerification(true);
        },
        onError: () => {
          setIsPaymentActionLoading(false);
          setActionError('Pembayaran belum berhasil diproses. Kamu dapat melanjutkan atau membatalkan pembayaran.');
        },
        onClose: () => {
          setIsPaymentActionLoading(false);
          executeVerification(true);
        },
      });
    } catch (err: unknown) {
      console.error('[PaymentStatusPage] Error resuming Snap payment:', err);
      setIsPaymentActionLoading(false);
      setActionError('Gagal membuka jendela pembayaran Midtrans.');
    }
  };

  // Handler: "Batalkan Pembayaran" (Cancels only the active attempt via PostgreSQL RPC)
  const handleConfirmCancelAttempt = async () => {
    if (!order) return;
    const activeAttempt = getActivePaymentAttempt(order);
    const midtransOrderIdToCancel = activeAttempt?.midtransOrderId || order.metadata?.midtransSession?.midtransOrderId || order.orderNumber;

    setIsCancelling(true);
    setActionError(null);

    try {
      await cancelPaymentAttempt(order.id, midtransOrderIdToCancel);
      setIsCancelModalOpen(false);
      setVerificationStatus('cancelled');
      // Re-fetch order state to synchronize metadata
      await executeVerification(true);
    } catch (err: unknown) {
      console.error('[PaymentStatusPage] Error cancelling attempt:', err);
      setActionError(err instanceof Error ? err.message : 'Gagal membatalkan sesi pembayaran.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Handler: "Bayar Lagi" (Explicitly creates a new payment attempt with forceNew: true)
  const handlePayAgain = async () => {
    if (!order) return;
    setIsPaymentActionLoading(true);
    setActionError(null);

    try {
      const customerEmail = user?.email || undefined;
      const session = await createPaymentSession(order.id, customerEmail, { forceNew: true });

      if (!session.token) {
        throw new Error('Gagal mendapatkan token pembayaran baru.');
      }

      if (typeof window === 'undefined' || !window.snap || typeof window.snap.pay !== 'function') {
        throw new Error('Skrip pembayaran Midtrans belum siap.');
      }

      setVerificationStatus('pending');

      window.snap.pay(session.token, {
        onSuccess: async () => {
          setIsPaymentActionLoading(false);
          await executeVerification(true);
        },
        onPending: async () => {
          setIsPaymentActionLoading(false);
          await executeVerification(true);
        },
        onError: () => {
          setIsPaymentActionLoading(false);
          setActionError('Pembayaran belum berhasil diproses.');
        },
        onClose: () => {
          setIsPaymentActionLoading(false);
          executeVerification(true);
        },
      });
    } catch (err: unknown) {
      console.error('[PaymentStatusPage] Error creating new payment attempt:', err);
      setIsPaymentActionLoading(false);
      setActionError(err instanceof Error ? err.message : 'Terjadi kendala saat membuat pembayaran baru.');
    }
  };

  // Formatted display values
  const formattedOrderAmount = order?.amount
    ? `Rp${Math.round(Number(order.amount)).toLocaleString('id-ID')}`
    : null;

  const formattedPaidAt = order?.paidAt
    ? formatIndonesianDate(order.paidAt.split('T')[0])
    : null;

  // Active attempt helper
  const activeAttempt = order ? getActivePaymentAttempt(order) : null;

  // 1. STATE: VERIFYING
  if (verificationStatus === 'verifying') {
    return (
      <div className="min-h-screen bg-ivory text-charcoal py-12 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white border border-beige-300 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy mx-auto">
            <RefreshCw className="w-6 h-6 animate-spin text-burgundy" />
          </div>

          <div className="space-y-2">
            <Badge variant="gold" size="sm" className="mx-auto">
              Sinkronisasi Gateway
            </Badge>
            <h1 className="font-serif text-2xl font-bold text-charcoal">
              Memverifikasi Pembayaran
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-500">
              WedSiap sedang mengonfirmasi status resmi pembayaran dari gateway. Mohon tunggu beberapa saat...
            </p>
          </div>

          <div className="pt-2 text-[11px] text-charcoal-400 flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-charcoal-400" />
            <span>Pembayaran aman via Midtrans</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. STATE: PAID / VERIFIED SUCCESS
  if (verificationStatus === 'paid') {
    return (
      <div className="min-h-screen bg-ivory text-charcoal py-8 sm:py-12 px-4 sm:px-6 selection:bg-burgundy-100 selection:text-burgundy-900 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white border border-emerald-200 rounded-2xl p-6 sm:p-8 shadow-soft text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 border border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-700 mx-auto">
            <ShieldCheck className="w-8 h-8 text-emerald-700" />
          </div>

          <div className="space-y-2">
            <Badge variant="success" size="sm" dot className="mx-auto">
              Akses Penuh Aktif
            </Badge>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal">
              Pembayaran Berhasil!
            </h1>
            <p className="text-sm text-charcoal-600 max-w-md mx-auto">
              Wedding Pass untuk workspace <strong>{workspace.coupleName}</strong> telah aktif. Seluruh modul dan fitur persiapan pernikahanmu kini terbuka penuh tanpa batas waktu.
            </p>
          </div>

          {/* Authoritative Order Summary Box */}
          <div className="bg-ivory-50 border border-beige-300 rounded-xl p-4 text-xs text-left space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-beige">
              <span className="text-charcoal-400">Nomor Pesanan</span>
              <span className="font-mono font-semibold text-charcoal">{effectiveOrderNumber}</span>
            </div>
            {formattedOrderAmount && (
              <div className="flex justify-between items-center pb-2 border-b border-beige">
                <span className="text-charcoal-400">Total Pembayaran</span>
                <span className="font-semibold text-burgundy">{formattedOrderAmount}</span>
              </div>
            )}
            {formattedPaidAt && (
              <div className="flex justify-between items-center">
                <span className="text-charcoal-400">Waktu Verifikasi</span>
                <span className="text-charcoal-600">{formattedPaidAt}</span>
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          <div className="pt-2">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => onNavigate('dashboard')}
              className="w-full min-h-[48px] text-base font-semibold shadow-md flex items-center justify-center gap-2"
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              Buka Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. STATE: PENDING (Active Attempt Available -> Lanjutkan vs Batalkan)
  if (verificationStatus === 'pending') {
    return (
      <div className="min-h-screen bg-ivory text-charcoal py-8 sm:py-12 px-5 sm:px-6 flex flex-col justify-between selection:bg-burgundy-100 selection:text-burgundy-900">
        {/* Brand Header */}
        <header className="w-full max-w-[620px] mx-auto flex items-center justify-between pb-6 pt-2">
          <span className="font-serif text-xl sm:text-2xl font-bold text-charcoal tracking-tight">
            WedSiap
          </span>
          <span className="text-xs sm:text-sm font-medium text-charcoal-500">
            Wedding Pass
          </span>
        </header>

        {/* Centered Main Content Composition */}
        <main className="w-full max-w-[620px] mx-auto my-auto space-y-6 sm:space-y-8">
          {/* Status Icon */}
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mx-auto shadow-2xs">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>

          {/* Eyebrow, Heading & Supporting Copy */}
          <div className="space-y-2 text-center">
            <p className="text-[11px] sm:text-xs font-semibold tracking-widest text-burgundy uppercase">
              STATUS PEMBAYARAN
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
              Pembayaran Belum Selesai
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-500 max-w-md mx-auto leading-relaxed pt-1">
              Sesi pembayaran sebelumnya masih tersedia. Kamu dapat melanjutkan pembayaran yang sudah dipilih atau membatalkannya untuk mengganti metode pembayaran.
            </p>
          </div>

          {actionError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-700 text-center flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Order Summary Card */}
          <div className="bg-white border border-beige-200 rounded-2xl p-5 sm:p-6 shadow-soft text-left space-y-4">
            {/* Header: Pesanan & Order ID */}
            <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-beige-100">
              <span className="text-[11px] sm:text-xs font-semibold tracking-wider text-charcoal-400 uppercase">
                PESANAN
              </span>
              {effectiveOrderNumber && (
                <span className="font-mono text-xs sm:text-sm font-medium text-charcoal-700 bg-ivory-100 px-2.5 py-1 rounded-md border border-beige-200">
                  {effectiveOrderNumber}
                </span>
              )}
            </div>

            {/* Product & Authoritative Price */}
            <div className="flex items-center justify-between gap-3 py-1">
              <div>
                <p className="text-sm sm:text-base font-semibold text-charcoal">
                  Wedding Pass
                </p>
                <p className="text-xs text-charcoal-400">
                  Akses Penuh Selamanya
                </p>
              </div>
              {formattedOrderAmount && (
                <span className="text-sm sm:text-base font-bold text-burgundy">
                  {formattedOrderAmount}
                </span>
              )}
            </div>

            {/* Status Pembayaran */}
            <div className="flex items-center justify-between gap-3 pt-3.5 border-t border-beige-100">
              <span className="text-xs sm:text-sm text-charcoal-500">
                Status Pembayaran
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50/90 border border-amber-200/80 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Menunggu Pembayaran
              </span>
            </div>
          </div>

          {/* Primary Action Buttons (Lanjutkan vs Batalkan) */}
          <div className="space-y-3 pt-2 text-center">
            {activeAttempt && (
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleContinuePayment}
                disabled={isPaymentActionLoading}
                className="w-full min-h-[48px] text-sm font-semibold shadow-md flex items-center justify-center gap-2 rounded-xl"
              >
                <CreditCard className="w-4 h-4" />
                <span>{isPaymentActionLoading ? 'Membuka Pembayaran...' : 'Lanjutkan Pembayaran'}</span>
              </Button>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => executeVerification(true)}
                disabled={isManualChecking}
                className="w-full sm:w-1/2 min-h-[44px] text-xs font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isManualChecking ? 'animate-spin' : ''}`} />
                <span>{isManualChecking ? 'Memeriksa...' : 'Cek Status'}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsCancelModalOpen(true)}
                disabled={isCancelling}
                className="w-full sm:w-1/2 min-h-[44px] text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200 rounded-xl"
              >
                Batalkan Pembayaran
              </Button>
            </div>

            <div>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="text-xs sm:text-sm text-charcoal-500 hover:text-charcoal font-medium transition-colors py-1.5 inline-flex items-center justify-center gap-1 focus:outline-hidden"
              >
                Kembali ke Dashboard
              </button>
            </div>
          </div>
        </main>

        {/* Security / Trust Footer */}
        <footer className="w-full max-w-[620px] mx-auto pt-6 text-center">
          <p className="text-[11px] sm:text-xs text-charcoal-400 flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-charcoal-400" />
            <span>Pembayaran aman via Midtrans</span>
          </p>
        </footer>

        {/* Confirmation Modal for Cancelling Attempt */}
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-xs">
            <div
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="cancel-attempt-title"
              aria-describedby="cancel-attempt-desc"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(false)}
                    className="p-2 text-charcoal-400 hover:text-charcoal bg-ivory-100 hover:bg-beige-200 rounded-full transition-colors cursor-pointer"
                    aria-label="Tutup dialog"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h3 id="cancel-attempt-title" className="font-serif text-xl font-bold text-charcoal mb-2">
                  Batalkan pembayaran?
                </h3>

                <p id="cancel-attempt-desc" className="text-sm text-charcoal-500 leading-relaxed">
                  Pembayaran yang sedang diproses akan dihentikan. Kamu dapat membuat pembayaran baru dengan metode pembayaran lain.
                </p>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(false)}
                    disabled={isCancelling}
                    className="px-4 py-2.5 text-xs font-semibold text-charcoal-600 bg-ivory-100 hover:bg-beige-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCancelAttempt}
                    disabled={isCancelling}
                    className="px-4 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {isCancelling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>{isCancelling ? 'Membatalkan...' : 'Batalkan Pembayaran'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. STATE: CANCELLED ATTEMPT / NO ACTIVE ATTEMPT (Allows "Bayar Lagi")
  if (verificationStatus === 'cancelled') {
    return (
      <div className="min-h-screen bg-ivory text-charcoal py-8 sm:py-12 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white border border-beige-300 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-beige-200/80 border border-beige-300 rounded-2xl flex items-center justify-center text-charcoal-500 mx-auto">
            <RotateCcw className="w-8 h-8 text-charcoal-600" />
          </div>

          <div className="space-y-2">
            <Badge variant="beige" size="sm" className="bg-beige-200 text-charcoal-700 border-beige-300 mx-auto">
              Pembayaran Dibatalkan
            </Badge>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal">
              Pembayaran Dibatalkan
            </h1>
            <p className="text-sm text-charcoal-600 max-w-md mx-auto leading-relaxed">
              Kamu dapat membuat pembayaran baru dengan metode pembayaran yang berbeda.
            </p>
          </div>

          {actionError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-700 text-center flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {formattedOrderAmount && (
            <div className="bg-ivory-50 border border-beige-200 rounded-xl p-4 text-xs text-left space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-charcoal-400">Nomor Pesanan</span>
                <span className="font-mono font-semibold text-charcoal">{effectiveOrderNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-charcoal-400">Total Tagihan</span>
                <span className="font-bold text-burgundy">{formattedOrderAmount}</span>
              </div>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handlePayAgain}
              disabled={isPaymentActionLoading}
              className="w-full min-h-[48px] text-sm font-semibold shadow-md flex items-center justify-center gap-2 rounded-xl"
            >
              <CreditCard className="w-4 h-4" />
              <span>{isPaymentActionLoading ? 'Menyiapkan Pembayaran...' : 'Bayar Lagi'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => onNavigate('dashboard')}
              className="w-full min-h-[44px]"
            >
              Kembali ke Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 5. STATE: EXPIRED
  if (verificationStatus === 'expired') {
    return (
      <div className="min-h-screen bg-ivory text-charcoal py-8 sm:py-12 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white border border-beige-300 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-beige-200/80 border border-beige-300 rounded-2xl flex items-center justify-center text-charcoal-500 mx-auto">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <Badge variant="beige" size="sm" className="bg-beige-200 text-charcoal-700 border-beige-300 mx-auto">
              Sesi Kedaluwarsa
            </Badge>
            <h1 className="font-serif text-2xl font-bold text-charcoal">
              Sesi Pembayaran Telah Kedaluwarsa
            </h1>
            <p className="text-sm text-charcoal-500 max-w-md mx-auto leading-relaxed">
              Batas waktu pembayaran untuk pesanan {effectiveOrderNumber} telah kedaluwarsa. Silakan buat sesi baru untuk melanjutkan.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handlePayAgain}
              disabled={isPaymentActionLoading}
              className="w-full min-h-[48px] text-sm font-semibold shadow-md flex items-center justify-center gap-2 rounded-xl"
            >
              <CreditCard className="w-4 h-4" />
              <span>{isPaymentActionLoading ? 'Menyiapkan Pembayaran...' : 'Bayar Lagi'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => onNavigate('dashboard')}
              className="w-full min-h-[44px]"
            >
              Kembali ke Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 6. STATE: FAILED / DENIED
  if (verificationStatus === 'failed') {
    return (
      <div className="min-h-screen bg-ivory text-charcoal py-8 sm:py-12 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white border border-rose-200 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-rose-100 border border-rose-200 rounded-2xl flex items-center justify-center text-rose-700 mx-auto">
            <XCircle className="w-8 h-8 text-rose-700" />
          </div>

          <div className="space-y-2">
            <Badge variant="neutral" size="sm" className="bg-rose-100 text-rose-800 border-rose-200 mx-auto">
              Pembayaran Gagal
            </Badge>
            <h1 className="font-serif text-2xl font-bold text-charcoal">
              Pembayaran Tidak Berhasil
            </h1>
            <p className="text-sm text-charcoal-600 max-w-md mx-auto">
              Transaksi untuk pesanan <strong>{effectiveOrderNumber}</strong> tidak dapat diselesaikan atau ditolak oleh pihak penyedia pembayaran.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handlePayAgain}
              className="w-full min-h-[44px]"
            >
              Coba Pembayaran Lagi
            </Button>

            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => onNavigate('dashboard')}
              className="w-full min-h-[44px]"
            >
              Kembali ke Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 7. STATE: UNKNOWN / ERROR
  return (
    <div className="min-h-screen bg-ivory text-charcoal py-8 sm:py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-lg w-full bg-white border border-rose-200 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 bg-rose-100 border border-rose-200 rounded-2xl flex items-center justify-center text-rose-700 mx-auto">
          <AlertCircle className="w-8 h-8 text-rose-700" />
        </div>

        <div className="space-y-2">
          <Badge variant="neutral" size="sm" className="bg-rose-100 text-rose-800 border-rose-200 mx-auto">
            Kendala Verifikasi
          </Badge>
          <h1 className="font-serif text-2xl font-bold text-charcoal">
            Status Tidak Dapat Diverifikasi
          </h1>
          <p className="text-sm text-charcoal-600 max-w-md mx-auto">
            {errorMessage || 'Terjadi kendala saat memeriksa status pesanan ke server.'}
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => executeVerification(true)}
            disabled={isManualChecking}
            className="w-full min-h-[44px] flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isManualChecking ? 'animate-spin' : ''}`} />
            <span>{isManualChecking ? 'Memeriksa...' : 'Coba Verifikasi Lagi'}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => onNavigate('dashboard')}
            className="w-full min-h-[44px]"
          >
            Kembali ke Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

