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
              WedFlow sedang mengonfirmasi status resmi pembayaran dari gateway. Mohon tunggu beberapa saat...
            </p>
          </div>

          <div className="pt-2 text-[11px] text-charcoal-400 flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verifikasi Resmi Midtrans Core API</span>
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
      <div className="min-h-screen bg-ivory text-charcoal py-8 sm:py-12 px-4 sm:px-6 flex flex-col justify-between selection:bg-burgundy-100 selection:text-burgundy-900">
        {/* Subtle Brand Header */}
        <div className="w-full max-w-xl mx-auto flex items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <span className="font-serif text-lg font-bold text-charcoal tracking-tight">WedFlow</span>
            <span className="text-[10px] font-semibold tracking-wider text-burgundy bg-burgundy-50 border border-burgundy-100 px-2 py-0.5 rounded-full uppercase">
              Wedding Pass
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="text-xs text-charcoal-500 hover:text-charcoal font-medium transition-colors"
          >
            Dashboard
          </button>
        </div>

        {/* Centered Content Composition (540-580px max width) */}
        <div className="w-full max-w-[560px] mx-auto my-auto text-center space-y-6 sm:space-y-7">
          {/* Status Icon Area */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-50/90 border border-amber-200/80 flex items-center justify-center text-amber-600 mx-auto shadow-xs">
            <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600" />
          </div>

          {/* Heading & Supporting Message */}
          <div className="space-y-2.5">
            <span className="inline-block text-[11px] font-semibold tracking-widest text-amber-800 uppercase">
              ◆ WEDDING PASS
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
              Menunggu Konfirmasi
            </h1>
            <div className="space-y-1 pt-1">
              <p className="text-sm sm:text-base font-medium text-charcoal-700">
                Pembayaranmu sedang diproses.
              </p>
              <p className="text-xs sm:text-sm text-charcoal-500 max-w-md mx-auto leading-relaxed">
                Kami sedang menunggu konfirmasi dari gateway pembayaran. Status pembayaran akan diperbarui secara otomatis.
              </p>
            </div>
          </div>

          {/* Order Reference */}
          {effectiveOrderNumber && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-beige-100/70 border border-beige-300/80 text-[11px] sm:text-xs font-mono text-charcoal-500">
              <span>Pesanan</span>
              <span className="font-semibold text-charcoal-700">{effectiveOrderNumber}</span>
            </div>
          )}

          {/* Compact Payment Status Information Panel */}
          <div className="bg-white border border-beige-300 rounded-xl p-4 sm:p-5 text-left space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-charcoal-400 uppercase">
                STATUS PEMBAYARAN
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {isPollingTimeout ? 'Menunggu Konfirmasi' : 'Sedang memeriksa pembayaran'}
              </span>
            </div>
            <p className="text-xs text-charcoal-500 leading-relaxed">
              Status akan diperbarui secara otomatis setelah pembayaran dikonfirmasi oleh sistem.
            </p>
          </div>

          {/* Primary CTA & Secondary Action */}
          <div className="space-y-3 pt-2">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => executeVerification(true)}
              disabled={isManualChecking}
              className="w-full min-h-[48px] text-sm sm:text-base font-semibold shadow-sm flex items-center justify-center gap-2 rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 ${isManualChecking ? 'animate-spin' : ''}`} />
              <span>{isManualChecking ? 'Memeriksa Status...' : 'Cek Status Pembayaran'}</span>
            </Button>

            <div>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="text-xs sm:text-sm text-charcoal-500 hover:text-burgundy font-medium transition-colors py-1.5 inline-flex items-center justify-center gap-1 focus:outline-hidden"
              >
                Kembali ke Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Minimal Footer Security Note */}
        <div className="w-full max-w-xl mx-auto pt-6 text-center">
          <p className="text-[11px] text-charcoal-400 flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Enkripsi 256-bit • Pembayaran Aman Midtrans</span>
          </p>
        </div>
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
