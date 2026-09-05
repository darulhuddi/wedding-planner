import React, { useState, useEffect, useCallback } from 'react';
import { WorkspaceViewModel } from '../../types/workspace';
import { RoutePath } from '../../App';
import { useCustomerEntitlement } from '../../hooks/useCustomerEntitlement';
import { useSnapScript } from './useSnapScript';
import {
  fetchCommercialPricing,
  getOrCreatePendingOrder,
  createPaymentSession,
} from '../../repositories/paymentRepository';
import { AdminAccessConfig, AdminOrderSummary } from '../../types/admin';
import { useAuth } from '../../auth/AuthContext';
import { formatIndonesianDate } from '../../domain/workspaceSelectors';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Lock,
  AlertCircle,
  Clock,
  Check,
  RefreshCw,
  CreditCard,
  Shield,
  Users,
} from 'lucide-react';

export interface CheckoutPageProps {
  workspace: WorkspaceViewModel;
  onNavigate: (route: RoutePath) => void;
  initialStep?: 'paywall' | 'checkout';
}

export interface PaymentFeedbackState {
  type: 'processing' | 'pending' | 'error' | 'info';
  message: string;
}

/**
 * Access Guard Evaluator:
 * Determines whether the workspace already possesses active purchased or complimentary access.
 */
export function evaluateCheckoutAccessGuard(
  isPaid: boolean,
  isComplimentary: boolean
): boolean {
  return isPaid || isComplimentary;
}

/**
 * Price Reconciliation:
 * Compares authoritative order price with display price. If mismatched, returns updated price and review notice.
 */
export function reconcileCheckoutPrice(
  displayedPrice: number | null,
  authoritativeOrderPrice: number
): { isMatch: boolean; authoritativePrice: number; notice: string | null } {
  if (displayedPrice !== null && displayedPrice !== authoritativeOrderPrice) {
    return {
      isMatch: false,
      authoritativePrice: authoritativeOrderPrice,
      notice: `Terdapat pembaruan informasi harga menjadi Rp${authoritativeOrderPrice.toLocaleString('id-ID')}. Silakan tinjau kembali total tagihan sebelum melanjutkan pembayaran.`,
    };
  }
  return {
    isMatch: true,
    authoritativePrice: authoritativeOrderPrice,
    notice: null,
  };
}

/**
 * Evaluates payment callback state for UI presentation.
 * Notice: Success callback displays verification feedback, NEVER fake client-side success proof.
 */
export function getPaymentCallbackFeedback(
  callbackType: 'success' | 'pending' | 'error' | 'close'
): PaymentFeedbackState | null {
  switch (callbackType) {
    case 'success':
      return {
        type: 'processing',
        message: 'Pembayaran sedang diverifikasi oleh sistem. Status aksesmu akan diperbarui secara otomatis.',
      };
    case 'pending':
      return {
        type: 'pending',
        message: 'Menunggu penyelesaian pembayaran. Silakan ikuti instruksi pembayaran yang tertera pada panduan Midtrans.',
      };
    case 'error':
      return {
        type: 'error',
        message: 'Pembayaran belum berhasil diproses. Silakan coba kembali atau gunakan metode pembayaran lain.',
      };
    case 'close':
    default:
      return null;
  }
}

/**
 * Derives duration description strictly from authoritative domain configuration.
 */
export function getCheckoutDurationDescription(
  pricingConfig?: AdminAccessConfig | null
): string {
  if (!pricingConfig) {
    return 'Akses penuh persiapan pernikahan';
  }
  if (pricingConfig.accessDurationRule === 'unlimited') {
    return 'Akses penuh tanpa batas waktu';
  }
  if (pricingConfig.accessDurationRule === 'until_wedding_day') {
    return 'Akses penuh aktif hingga Hari-H pernikahanmu';
  }
  if (pricingConfig.maxDurationMonths) {
    return `Akses aktif selama ${pricingConfig.maxDurationMonths} bulan`;
  }
  return 'Akses penuh persiapan pernikahan';
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  workspace,
  onNavigate,
  initialStep = 'paywall',
}) => {
  const { user } = useAuth();
  const { isPaid, isComplimentary, isLoading: isEntitlementLoading } = useCustomerEntitlement(workspace.id);
  const { isLoaded: isSnapLoaded, isLoading: isSnapLoading, error: snapScriptError } = useSnapScript();

  // Step state: 'paywall' (Screen 1) | 'checkout' (Screen 2)
  const [currentStep, setCurrentStep] = useState<'paywall' | 'checkout'>(initialStep);

  // Pricing & Order State
  const [pricingConfig, setPricingConfig] = useState<AdminAccessConfig | null>(null);
  const [isPricingLoading, setIsPricingLoading] = useState<boolean>(true);
  const [pricingError, setPricingError] = useState<string | null>(null);

  // Active Authoritative Display Price
  const [displayPrice, setDisplayPrice] = useState<number | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<string>('IDR');

  // Checkout Interaction States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [priceMismatchNotice, setPriceMismatchNotice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<PaymentFeedbackState | null>(null);

  // 1. Fetch Commercial Display Pricing on mount
  const loadPricing = useCallback(async () => {
    setIsPricingLoading(true);
    setPricingError(null);

    try {
      const config = await fetchCommercialPricing();
      setPricingConfig(config);
      setDisplayPrice(config.price);
      setDisplayCurrency(config.currency || 'IDR');

      console.log('[Checkout Pricing Debug]', {
        fetchedConfigPrice: config.price,
        initialDisplayPrice: config.price,
        pendingOrderId: null,
        pendingOrderAmount: null,
        reconciliationApplied: false,
        finalDisplayPrice: config.price,
      });
    } catch (err: unknown) {
      console.error('[CheckoutPage] Error loading commercial pricing:', err);
      setPricingError('Gagal memuat rincian harga Wedding Pass. Silakan coba lagi.');
    } finally {
      setIsPricingLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  // Formatted display values
  const formattedWeddingDate = workspace.weddingDate
    ? formatIndonesianDate(workspace.weddingDate)
    : null;

  const formattedPrice =
    displayPrice !== null
      ? `Rp${displayPrice.toLocaleString('id-ID')}`
      : '...';

  // 2. Handle Payment Flow with Midtrans Snap
  const handlePayNow = async () => {
    if (isSubmitting || !workspace.id) return;

    setIsSubmitting(true);
    setFeedback(null);
    setPriceMismatchNotice(null);

    try {
      // Step A: Retrieve or create a valid pending order
      const order: AdminOrderSummary = await getOrCreatePendingOrder(workspace.id, 'wedding_pass');

      // Step B: Authoritative Price Reconciliation
      const authoritativeOrderPrice = Math.round(Number(order.amount));
      const reconciliation = reconcileCheckoutPrice(displayPrice, authoritativeOrderPrice);

      console.log('[Checkout Pricing Debug]', {
        fetchedConfigPrice: pricingConfig?.price ?? null,
        initialDisplayPrice: displayPrice,
        pendingOrderId: order.id,
        pendingOrderAmount: authoritativeOrderPrice,
        reconciliationApplied: !reconciliation.isMatch,
        finalDisplayPrice: reconciliation.authoritativePrice,
      });

      if (!reconciliation.isMatch) {
        // Price discrepancy detected: update display state and require explicit review
        setDisplayPrice(reconciliation.authoritativePrice);
        setDisplayCurrency(order.currency || 'IDR');
        setPriceMismatchNotice(reconciliation.notice);
        setIsSubmitting(false);
        return;
      }

      // Step C: Request Snap session token from backend (reusing unexpired session if available)
      const customerEmail = user?.email || undefined;
      const session = await createPaymentSession(order.id, customerEmail, { forceNew: false });

      if (!session.token) {
        throw new Error('Token sesi pembayaran tidak valid dari gateway.');
      }

      // Step D: Ensure Snap script is ready
      if (typeof window === 'undefined' || !window.snap || typeof window.snap.pay !== 'function') {
        throw new Error('Skrip pembayaran Midtrans belum siap. Silakan muat ulang halaman.');
      }

      // Step E: Open Midtrans Snap modal
      window.snap.pay(session.token, {
        onSuccess: (_result: any) => {
          setIsSubmitting(false);
          setFeedback(getPaymentCallbackFeedback('success'));
          onNavigate(`payment/status?order=${encodeURIComponent(order.orderNumber)}`);
        },
        onPending: (_result: any) => {
          setIsSubmitting(false);
          setFeedback(getPaymentCallbackFeedback('pending'));
          onNavigate(`payment/status?order=${encodeURIComponent(order.orderNumber)}`);
        },
        onError: (_result: any) => {
          setIsSubmitting(false);
          setFeedback(getPaymentCallbackFeedback('error'));
        },
        onClose: () => {
          // User closed Snap without completing payment.
          // Retain current payment attempt and navigate to Payment Status page
          // where user can choose to "Lanjutkan Pembayaran" or "Batalkan Pembayaran".
          setIsSubmitting(false);
          onNavigate(`payment/status?order=${encodeURIComponent(order.orderNumber)}`);
        },
      });
    } catch (err: unknown) {
      console.error('[CheckoutPage] Error during payment initiation:', err);
      setIsSubmitting(false);
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Terjadi kendala saat memulai pembayaran.',
      });
    }
  };

  // --- ACCESS GUARD: Already Paid or Complimentary ---
  const isAccessBlocked = evaluateCheckoutAccessGuard(isPaid, isComplimentary);

  if (!isEntitlementLoading && isAccessBlocked) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-charcoal py-8 sm:py-12 px-4 sm:px-6 selection:bg-burgundy-100 selection:text-burgundy-900">
        <div className="max-w-xl mx-auto space-y-6">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 text-sm text-charcoal-500 hover:text-burgundy transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </button>

          <div className="bg-white border border-emerald-200 rounded-3xl p-6 sm:p-8 shadow-sm text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-700 mx-auto">
              <ShieldCheck className="w-7 h-7 text-emerald-700" />
            </div>

            <div className="space-y-1.5">
              <Badge variant="success" size="sm" dot className="mx-auto">
                {isComplimentary ? 'Akses Spesial Aktif' : 'Wedding Pass Aktif'}
              </Badge>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal pt-2">
                Akses Penuh Sudah Aktif
              </h1>
              <p className="text-sm text-charcoal-500 max-w-md mx-auto">
                Workspace pernikahan <strong>{workspace.coupleName}</strong> sudah memiliki akses penuh ke seluruh modul dan alur persiapan WedSiap.
              </p>
            </div>

            <div className="pt-4">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => onNavigate('dashboard')}
                className="w-full sm:w-auto px-8"
              >
                Lanjutkan Persiapan
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // SCREEN 1: WEDDING PASS PAYWALL (Matches Left Side of Reference Image)
  // ============================================================================
  if (currentStep === 'paywall') {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-charcoal selection:bg-burgundy-100 selection:text-burgundy-900 flex flex-col">
        {/* Minimal Header */}
        <header className="w-full border-b border-[#EBE5DA] bg-[#FAF8F5]/90 backdrop-blur-xs sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <span className="font-serif text-xl font-bold text-charcoal tracking-tight">
              WedSiap
            </span>

            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-charcoal-500 hover:text-burgundy transition-colors cursor-pointer py-1 px-2 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Kembali ke Dashboard</span>
            </button>
          </div>
        </header>

        {/* Main Paywall Content */}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* Left Column: Proposition & Feature Checklist */}
            <div className="lg:col-span-7 space-y-6 lg:pr-2">
              
              {/* Eyebrow & Main Heading */}
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-burgundy">
                  <span className="text-[9px]">◆</span> WEDDING PASS
                </span>

                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-charcoal tracking-tight leading-[1.12]">
                  Upgrade<br />
                  Workspace Kamu
                </h1>

                <p className="text-sm sm:text-base text-charcoal-500 leading-relaxed font-normal max-w-lg">
                  Dapatkan akses penuh ke semua fitur WedSiap untuk mempersiapkan hari bahagiamu, dalam satu workspace.
                </p>

                {/* Workspace Context */}
                <div className="pt-1 text-xs text-charcoal-400 flex items-center gap-1.5 flex-wrap">
                  <span>Workspace pasangan <strong>{workspace.coupleName}</strong></span>
                  {formattedWeddingDate && (
                    <>
                      <span>•</span>
                      <span>Hari-H: {formattedWeddingDate}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Six Key Benefits Vertical List */}
              <div className="space-y-4 pt-2">
                {[
                  {
                    title: 'Checklist & timeline',
                    desc: 'Tahu apa yang harus dilakukan selanjutnya',
                  },
                  {
                    title: 'Budget',
                    desc: 'Pantau anggaran dan pengeluaran dengan mudah',
                  },
                  {
                    title: 'Vendors',
                    desc: 'Simpan dan kelola vendor dalam satu tempat',
                  },
                  {
                    title: 'Tamu',
                    desc: 'Kelola daftar tamu tanpa ribet',
                  },
                  {
                    title: 'Semua dalam satu workspace',
                    desc: 'Semua data pernikahanmu tersimpan rapi',
                  },
                  {
                    title: 'Akses tanpa batas waktu',
                    desc: 'Sekali bayar, tidak ada langganan atau biaya perpanjangan',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3.5">
                    <div className="w-6 h-6 rounded-full bg-[#F3ECE6] text-burgundy flex items-center justify-center shrink-0 mt-0.5 border border-[#E9DFD6]">
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-semibold text-charcoal">
                        {item.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-charcoal-500 leading-normal">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Script / Quote Accent */}
              <div className="pt-6 sm:pt-8">
                <p className="font-serif italic text-base sm:text-lg text-charcoal-400">
                  Langkah kecil hari ini, untuk cerita selamanya ♡
                </p>
              </div>

            </div>

            {/* Right Column: Prominent Purchase Card with Wedding Photography Backdrop */}
            <div className="lg:col-span-5 w-full relative">
              
              {/* Subtle Atmospheric Wedding Photography Backdrop (Desktop) */}
              <div className="hidden lg:block absolute -top-8 -right-8 w-64 h-64 rounded-3xl overflow-hidden opacity-40 pointer-events-none -z-0">
                <img
                  src="https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=600&q=80"
                  alt="Wedding florals"
                  className="w-full h-full object-cover blur-[0.5px]"
                />
              </div>
              <div className="hidden lg:block absolute -bottom-10 -right-6 w-52 h-44 rounded-3xl overflow-hidden opacity-30 pointer-events-none -z-0">
                <img
                  src="https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=600&q=80"
                  alt="Wedding stationery and rings"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Solid Purchase Card */}
              <div className="bg-white border border-[#E5DFD5] rounded-3xl p-6 sm:p-8 shadow-sm space-y-5 relative z-10">
                
                {/* Top Pill Badge */}
                <div>
                  <span className="inline-block text-[11px] font-semibold text-amber-900 bg-[#FDF6EC] px-3 py-0.5 rounded-full border border-amber-200/80">
                    Paling Populer
                  </span>
                </div>

                {/* Product Title & Subtitle */}
                <div className="space-y-1">
                  <h2 className="font-serif text-2xl font-bold text-charcoal">
                    Wedding Pass
                  </h2>
                  <p className="text-xs text-charcoal-500">
                    Akses penuh ke seluruh fitur WedSiap.
                  </p>
                </div>

                {/* Price Display */}
                <div className="py-2 space-y-1">
                  <div className="flex items-baseline">
                    {isPricingLoading ? (
                      <div className="w-36 h-10 bg-beige-200/70 rounded-lg animate-pulse" />
                    ) : (
                      <span className="font-serif text-3xl sm:text-4xl font-bold text-charcoal tracking-tight">
                        {formattedPrice}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-charcoal-500 font-medium">
                    Sekali bayar. Akses tanpa batas waktu.
                  </p>
                </div>

                {/* Primary CTA: Navigates to Checkout */}
                <div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('checkout')}
                    disabled={isPricingLoading || !!pricingError}
                    className="w-full min-h-[48px] bg-burgundy hover:bg-[#581827] text-white font-medium text-sm sm:text-base py-3 px-5 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer group disabled:opacity-50"
                  >
                    <span>Dapatkan Wedding Pass</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </button>
                </div>

                {/* Three Trust Checkmarks */}
                <div className="space-y-2 pt-1 text-xs text-charcoal-600">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" aria-hidden="true" />
                    <span>Tidak ada langganan bulanan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" aria-hidden="true" />
                    <span>Tidak ada biaya perpanjangan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" aria-hidden="true" />
                    <span>Akses penuh tanpa batas waktu</span>
                  </div>
                </div>

                {/* Subtle Security Area */}
                <div className="pt-2">
                  <div className="w-full py-2.5 px-3 rounded-xl bg-[#FAF8F5] border border-[#EBE5DA] flex items-center justify-center gap-2 text-xs text-charcoal-500">
                    <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
                    <span>Pembayaran aman melalui Midtrans</span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </main>
      </div>
    );
  }

  // ============================================================================
  // SCREEN 2: WEDDING PASS CHECKOUT (Matches Right Side of Reference Image)
  // ============================================================================
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-charcoal selection:bg-burgundy-100 selection:text-burgundy-900 flex flex-col">
      {/* Header */}
      <header className="w-full border-b border-[#EBE5DA] bg-[#FAF8F5]/90 backdrop-blur-xs sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <span className="font-serif text-xl font-bold text-charcoal tracking-tight">
            WedSiap
          </span>

          <button
            type="button"
            onClick={() => setCurrentStep('paywall')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-charcoal-500 hover:text-burgundy transition-colors cursor-pointer py-1 px-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Kembali ke Wedding Pass</span>
          </button>
        </div>
      </header>

      {/* Main Checkout Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Heading, Product Summary, and Security Explanation */}
          <div className="lg:col-span-7 space-y-6 lg:pr-2">
            
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-burgundy">
                <span className="text-[9px]">◆</span> CHECKOUT
              </span>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-charcoal tracking-tight leading-[1.12]">
                Selesaikan<br />
                Pembayaran
              </h1>

              <p className="text-sm sm:text-base text-charcoal-500 leading-relaxed font-normal max-w-lg">
                Kamu sudah selangkah lagi untuk mengaktifkan Wedding Pass dan mendapatkan akses penuh ke WedSiap.
              </p>
            </div>

            {/* Product Summary Card with Thumbnail */}
            <div className="bg-white border border-[#E5DFD5] rounded-2xl p-4 sm:p-5 shadow-2xs flex items-start gap-4">
              <div className="w-20 h-24 rounded-xl overflow-hidden shrink-0 bg-ivory-100 border border-[#EBE5DA]">
                <img
                  src="https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=300&q=80"
                  alt="Wedding Pass"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1.5 min-w-0 flex-1">
                <h3 className="font-serif text-base sm:text-lg font-bold text-charcoal">
                  Wedding Pass
                </h3>
                <p className="text-xs text-charcoal-500">
                  Akses penuh ke seluruh fitur WedSiap.
                </p>

                <div className="space-y-1 pt-1 text-xs text-charcoal-600">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" aria-hidden="true" />
                    <span>Semua fitur pernikahan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" aria-hidden="true" />
                    <span>Sekali bayar</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" aria-hidden="true" />
                    <span>Akses tanpa batas waktu</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Explanation Box */}
            <div className="bg-[#FAF7F2] border border-[#EBE5DA] rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-xs">
              <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-0.5">
                <span className="font-semibold text-charcoal block">
                  Pembayaran aman melalui Midtrans
                </span>
                <span className="text-charcoal-500 leading-relaxed block">
                  Kamu akan diarahkan ke halaman Midtrans untuk menyelesaikan pembayaran dengan aman.
                </span>
              </div>
            </div>

          </div>

          {/* Right Column: Ringkasan Pembayaran & Action Button */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-white border border-[#E5DFD5] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
              
              <h2 className="font-serif text-lg font-bold text-charcoal">
                Ringkasan Pembayaran
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-charcoal-600">Wedding Pass</span>
                  <span className="font-medium text-charcoal">
                    {isPricingLoading ? '...' : formattedPrice}
                  </span>
                </div>

                <div className="border-t border-[#EBE5DA] pt-3 flex items-baseline justify-between">
                  <span className="text-sm font-bold text-charcoal">Total</span>
                  <span className="font-serif text-2xl font-bold text-charcoal tracking-tight">
                    {isPricingLoading ? '...' : formattedPrice}
                  </span>
                </div>
              </div>

              {/* Price Mismatch Notice (Authoritative Reconciliation) */}
              {priceMismatchNotice && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-900 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="space-y-0.5">
                    <span className="font-semibold block">Pembaruan Harga Layanan</span>
                    <span>{priceMismatchNotice}</span>
                  </div>
                </div>
              )}

              {/* Pricing Error Alert */}
              {pricingError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 text-rose-800 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
                    <span>{pricingError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={loadPricing}
                    className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline shrink-0 cursor-pointer"
                  >
                    Coba Lagi
                  </button>
                </div>
              )}

              {/* Snap Script Error Alert */}
              {snapScriptError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
                  <span>{snapScriptError}</span>
                </div>
              )}

              {/* Payment Feedback Notification Banner */}
              {feedback && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                    feedback.type === 'processing'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : feedback.type === 'pending'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {feedback.type === 'processing' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : feedback.type === 'pending' ? (
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <div className="space-y-0.5">
                    <span className="font-semibold block">
                      {feedback.type === 'processing'
                        ? 'Verifikasi Pembayaran'
                        : feedback.type === 'pending'
                        ? 'Instruksi Pembayaran'
                        : 'Kendala Pembayaran'}
                    </span>
                    <span>{feedback.message}</span>
                  </div>
                </div>
              )}

              {/* Primary Action Button */}
              <div>
                <button
                  type="button"
                  onClick={handlePayNow}
                  disabled={isSubmitting || isPricingLoading || isSnapLoading || !!pricingError}
                  className="w-full min-h-[50px] bg-burgundy hover:bg-[#581827] text-white font-semibold text-sm sm:text-base py-3.5 px-5 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer group disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Menghubungkan ke Midtrans...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" aria-hidden="true" />
                      <span>Bayar Sekarang {formattedPrice} →</span>
                    </>
                  )}
                </button>
              </div>

              {/* Three Trust Information Items */}
              <div className="space-y-2.5 pt-2 text-xs text-charcoal-500">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-charcoal-400 shrink-0" aria-hidden="true" />
                  <span>Transaksi aman dan terenkripsi</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-charcoal-400 shrink-0" aria-hidden="true" />
                  <span>Dukungan berbagai metode pembayaran</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-charcoal-400 shrink-0" aria-hidden="true" />
                  <span>Konfirmasi otomatis setelah pembayaran</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
