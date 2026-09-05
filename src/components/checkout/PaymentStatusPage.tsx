/**
 * WedFlow Payment Status & Verification Component — PaymentStatusPage
 *
 * Authoritatively verifies and renders the official payment result from the backend.
 * Never treats Midtrans client callbacks as payment proof.
 *
 * Core Guarantees:
 * - Verifies order ownership against the currently authenticated workspace.
 * - Executes initial sync and bounded polling (max 5 attempts) against midtrans-sync.
 * - Handles webhook-before-sync and sync-before-webhook race conditions cleanly.
 * - Refreshes customer entitlement authoritatively upon verified PAID status.
 * - Safe against browser refresh / direct URL access (/payment/status?order=...).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WorkspaceViewModel } from '../../types/workspace';
import { RoutePath } from '../../App';
import { useCustomerEntitlement } from '../../hooks/useCustomerEntitlement';
import { verifyAndSyncOrderPayment } from '../../repositories/paymentRepository';
import { AdminOrderSummary } from '../../types/admin';
import { formatIndonesianDate } from '../../domain/workspaceSelectors';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Lock,
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
  isPaid?: boolean
): PaymentVerificationStatus {
  if (isPaid || status === 'paid') return 'paid';
  if (status === 'pending') return 'pending';
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
  const { refresh: refreshEntitlement } = useCustomerEntitlement(workspace.id);

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
      }

      try {
        const result = await verifyAndSyncOrderPayment(effectiveOrderNumber, workspace.id);

        if (!isMountedRef.current) return;

        setOrder(result.order);
        const nextStatus = mapDomainStatusToVerificationStatus(result.status, result.isPaid);

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
          // Terminal non-success state (failed, cancelled, expired, error)
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

  // Formatted display values
  const formattedOrderAmount = order?.amount
    ? `Rp${Math.round(Number(order.amount)).toLocaleString('id-ID')}`
    : null;

  const formattedPaidAt = order?.paidAt
    ? formatIndonesianDate(order.paidAt.split('T')[0])
    : null;

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

  // 3. STATE: PENDING
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

        {/* Centered Main Content Composition (600–680px max width) */}
        <main className="w-full max-w-[620px] mx-auto my-auto space-y-6 sm:space-y-8">
          {/* Refined Status Icon */}
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-burgundy-50 border border-burgundy-100 flex items-center justify-center text-burgundy mx-auto shadow-2xs">
            <RefreshCw className={`w-5 h-5 text-burgundy ${isManualChecking || !isPollingTimeout ? 'animate-spin' : ''}`} />
          </div>

          {/* Eyebrow, Heading & Supporting Copy */}
          <div className="space-y-2 text-center">
            <p className="text-[11px] sm:text-xs font-semibold tracking-widest text-burgundy uppercase">
              PEMBAYARAN WEDDING PASS
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
              Pembayaran Diproses
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-500 max-w-md mx-auto leading-relaxed pt-1">
              Pembayaranmu sedang menunggu konfirmasi. Status akan diperbarui otomatis setelah pembayaran dikonfirmasi oleh sistem.
            </p>
          </div>

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
                <span className="text-sm sm:text-base font-semibold text-charcoal-800">
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
                Menunggu konfirmasi
              </span>
            </div>
          </div>

          {/* Status Information Note */}
          <p className="text-xs sm:text-sm text-charcoal-400 text-center leading-relaxed max-w-lg mx-auto">
            Status pembayaran akan diperbarui otomatis setelah sistem menerima konfirmasi pembayaran.
          </p>

          {/* Primary CTA & Secondary Action */}
          <div className="space-y-3 pt-2 text-center">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => executeVerification(true)}
              disabled={isManualChecking}
              className="w-full sm:w-auto sm:min-w-[240px] min-h-[44px] text-sm font-semibold shadow-sm mx-auto flex items-center justify-center gap-2 rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 ${isManualChecking ? 'animate-spin' : ''}`} />
              <span>{isManualChecking ? 'Memeriksa Status...' : 'Cek Status Pembayaran'}</span>
            </Button>

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
      </div>
    );
  }

  // 4. STATE: FAILED / DENIED
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
              onClick={() => onNavigate('checkout')}
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

  // 5. STATE: CANCELLED / EXPIRED
  if (verificationStatus === 'cancelled' || verificationStatus === 'expired') {
    const isExpired = verificationStatus === 'expired';

    return (
      <div className="min-h-screen bg-ivory text-charcoal py-8 sm:py-12 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-lg w-full bg-white border border-beige-300 rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-beige-200/80 border border-beige-300 rounded-2xl flex items-center justify-center text-charcoal-500 mx-auto">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <Badge variant="beige" size="sm" className="bg-beige-200 text-charcoal-700 border-beige-300 mx-auto">
              {isExpired ? 'Sesi Kedaluwarsa' : 'Pesanan Dibatalkan'}
            </Badge>
            <h1 className="font-serif text-2xl font-bold text-charcoal">
              {isExpired ? 'Sesi Pembayaran Telah Berakhir' : 'Pesanan Telah Dibatalkan'}
            </h1>
            <p className="text-sm text-charcoal-500 max-w-md mx-auto">
              {isExpired
                ? `Batas waktu pembayaran untuk pesanan ${effectiveOrderNumber} telah kedaluwarsa. Silakan buat sesi baru untuk melanjutkan.`
                : `Sesi pembayaran untuk pesanan ${effectiveOrderNumber} telah dibatalkan.`}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => onNavigate('checkout')}
              className="w-full min-h-[44px]"
            >
              Buka Ulang Checkout
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

  // 6. STATE: UNKNOWN / ERROR
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
