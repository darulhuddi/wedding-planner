/**
 * WedFlow Admin Console - Domain Selectors & Business Logic
 *
 * Pure business logic for metrics computation, attention item evaluation,
 * date formatting, progress calculation, and operational filtering.
 */

import {
  AdminCoupleSummary,
  AdminOverviewMetrics,
  AdminAttentionItem,
  AdminAccessTier,
  AdminCouplesFilterState,
  AdminAccessConfig,
  AccessConfigValidationResult,
  AdminCoupleAccessDetail,
  AdminActivityItem,
  CommercialProduct,
  AdminOrderSummary,
  AdminPaymentsMetrics,
  AdminPaymentsFilterState,
  AdminPaymentsStatusFilter,
  AdminDateRangeFilter,
  PaginatedAdminOrders,
  EntitlementMismatchEvaluation,
  OrderStatus,
  DEFAULT_ADMIN_ACCESS_CONFIG,
  AccessDurationRule,
} from '../types/admin';

import { TaskItem } from '../types/checklist';

/**
 * Cleanly derives the access tier for a couple based on creation date and explicit tier.
 * Implements the lifecycle: Trial (<= 7 days) -> Expired (> 7 days) -> Paid.
 */
export function deriveAccessTier(
  createdAtStr: string,
  explicitTier?: string | null,
  now: Date = new Date(),
  trialDurationDays = 14
): AdminAccessTier {
  if (explicitTier === 'Paid') return 'Paid';
  if (explicitTier === 'Expired') return 'Expired';
  if (explicitTier === 'Free') return 'Free';

  try {
    const createdTime = new Date(createdAtStr).getTime();
    if (!isNaN(createdTime)) {
      const trialDurationMs = (trialDurationDays || 14) * 24 * 60 * 60 * 1000;
      const isPastTrial = now.getTime() > createdTime + trialDurationMs;
      if (isPastTrial) {
        return 'Expired';
      }
    }
  } catch {
    // fallback
  }

  return 'Trial';
}

/**
 * Formats an ISO date or YYYY-MM-DD into Indonesian localized date string (e.g., "30 Sep 2026").
 */
export function formatAdminDate(dateStr: string | null): string {
  if (!dateStr) return 'Belum diatur';

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Belum diatur';

    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  } catch {
    return 'Belum diatur';
  }
}

/**
 * Formats a timestamp into human-readable relative time in Indonesian.
 * (e.g., "Hari ini", "Kemarin", "3 hari lalu", "24 Agu 2026")
 */
export function formatAdminRelativeTime(
  isoDateStr: string,
  now: Date = new Date()
): string {
  if (!isoDateStr) return '-';

  try {
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) return '-';

    // Normalize both to start of day for accurate calendar day difference
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const diffDays = Math.round((startOfToday - startOfTarget) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hari ini';
    if (diffDays === 1) return 'Kemarin';
    if (diffDays > 1 && diffDays <= 7) return `${diffDays} hari lalu`;

    return formatAdminDate(isoDateStr);
  } catch {
    return '-';
  }
}

/**
 * Calculates remaining days until the wedding date.
 * Returns null if date is not specified.
 */
export function calculateDaysToWedding(
  weddingDateStr: string | null,
  now: Date = new Date()
): number | null {
  if (!weddingDateStr) return null;

  try {
    const weddingDate = new Date(weddingDateStr);
    if (isNaN(weddingDate.getTime())) return null;

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWedding = new Date(weddingDate.getFullYear(), weddingDate.getMonth(), weddingDate.getDate()).getTime();

    return Math.round((startOfWedding - startOfToday) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/**
 * Calculates progress percentage from completed and total tasks.
 */
export function calculateProgressPercentage(completedTasks: number, totalTasks: number): number {
  if (totalTasks <= 0) return 0;
  const percentage = Math.round((completedTasks / totalTasks) * 100);
  return Math.min(100, Math.max(0, percentage));
}

/**
 * Computes business KPI metrics from the list of couples.
 */
export function computeOverviewMetrics(
  couples: AdminCoupleSummary[],
  now: Date = new Date(),
  trialDurationDays = 14
): AdminOverviewMetrics {
  const totalCouples = couples.length;

  let activeWeddings = 0;
  let activeTrial = 0;
  let paid = 0;
  let expiringSoon = 0;

  for (const couple of couples) {
    // Active weddings: wedding date is in the future or today, or not yet set
    if (couple.daysToWedding === null || couple.daysToWedding >= 0) {
      activeWeddings += 1;
    }

    if (couple.accessTier === 'Paid') {
      paid += 1;
    } else if (couple.accessTier === 'Trial') {
      activeTrial += 1;
      // In trial: check if trial period is expiring within 3 days
      try {
        const createdTime = new Date(couple.createdAt).getTime();
        if (!isNaN(createdTime)) {
          const trialEnd = createdTime + (trialDurationDays || 14) * 24 * 60 * 60 * 1000;
          const remainingTrialDays = Math.ceil((trialEnd - now.getTime()) / (1000 * 60 * 60 * 24));
          if (remainingTrialDays > 0 && remainingTrialDays <= 3) {
            expiringSoon += 1;
          }
        }
      } catch {
        // Safe fallback
      }
    }
  }

  return {
    totalCouples,
    activeWeddings,
    activeTrial,
    paid,
    expiringSoon,
  };
}

/**
 * Evaluates operational attention items based on actual application data.
 * Does NOT generate fake or hardcoded values.
 */
export function evaluateAttentionItems(
  couples: AdminCoupleSummary[],
  now: Date = new Date(),
  trialDurationDays = 14
): AdminAttentionItem[] {
  const items: AdminAttentionItem[] = [];

  // 1. Check for expiring trials
  const expiringCouples = couples.filter((couple) => {
    if (couple.accessTier !== 'Trial') return false;
    try {
      const createdTime = new Date(couple.createdAt).getTime();
      if (isNaN(createdTime)) return false;
      const trialEnd = createdTime + (trialDurationDays || 14) * 24 * 60 * 60 * 1000;
      const remainingTrialDays = Math.ceil((trialEnd - now.getTime()) / (1000 * 60 * 60 * 24));
      return remainingTrialDays > 0 && remainingTrialDays <= 3;
    } catch {
      return false;
    }
  });

  if (expiringCouples.length > 0) {
    items.push({
      id: 'attention-trial-expiring',
      type: 'trial_expiring',
      title: 'Trial akan berakhir',
      description: `${expiringCouples.length} pasangan akan kehilangan akses penuh dalam 3 hari.`,
      count: expiringCouples.length,
      severity: 'warning',
      ctaLabel: 'Lihat Trial →',
      ctaRoute: 'admin/access',
    });
  }

  // 2. Check for upcoming weddings requiring operational readiness (within 14 days)
  const imminentWeddings = couples.filter((c) => c.daysToWedding !== null && c.daysToWedding >= 0 && c.daysToWedding <= 14);
  if (imminentWeddings.length > 0) {
    items.push({
      id: 'attention-wedding-approaching',
      type: 'wedding_approaching',
      title: 'Pernikahan dalam 14 hari',
      description: `${imminentWeddings.length} pasangan memiliki jadwal pernikahan dalam kurun 14 hari ke depan.`,
      count: imminentWeddings.length,
      severity: 'info',
      ctaLabel: 'Lihat Pernikahan →',
      ctaRoute: 'admin/weddings',
    });
  }

  return items;
}

/**
 * Filters and searches couples based on the composite filter state.
 * All criteria are composed with logical AND.
 */
export function filterCouples(
  couples: AdminCoupleSummary[],
  filters: AdminCouplesFilterState,
  now: Date = new Date()
): AdminCoupleSummary[] {
  const searchTerm = filters.search.trim().toLowerCase();

  return couples.filter((couple) => {
    // 1. Search Query Filter (matches coupleName)
    if (searchTerm) {
      const nameMatch = couple.coupleName.toLowerCase().includes(searchTerm);
      if (!nameMatch) return false;
    }

    // 2. Access Status Filter ('all' | 'Trial' | 'Paid' | 'Expired')
    if (filters.access !== 'all') {
      if (couple.accessTier !== filters.access) {
        return false;
      }
    }

    // 3. Wedding Date Filter ('all' | 'lte_7' | 'lte_14' | 'lte_30' | 'gt_30')
    if (filters.wedding !== 'all') {
      const days = couple.daysToWedding;
      if (days === null) {
        // Couples without a wedding date set do not match specific relative intervals
        return false;
      }

      if (filters.wedding === 'lte_7') {
        if (days < 0 || days > 7) return false;
      } else if (filters.wedding === 'lte_14') {
        if (days < 0 || days > 14) return false;
      } else if (filters.wedding === 'lte_30') {
        if (days < 0 || days > 30) return false;
      } else if (filters.wedding === 'gt_30') {
        if (days <= 30) return false;
      }
    }

    // 4. Activity Filter ('all' | 'today' | 'last_7_days' | 'inactive_gt_7')
    if (filters.activity !== 'all') {
      const lastActiveTime = new Date(couple.lastActive).getTime();
      if (isNaN(lastActiveTime)) return false;

      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfLastActive = new Date(
        new Date(couple.lastActive).getFullYear(),
        new Date(couple.lastActive).getMonth(),
        new Date(couple.lastActive).getDate()
      ).getTime();

      const diffDays = Math.round((startOfToday - startOfLastActive) / (1000 * 60 * 60 * 24));

      if (filters.activity === 'today') {
        if (diffDays !== 0) return false;
      } else if (filters.activity === 'last_7_days') {
        if (diffDays < 0 || diffDays > 7) return false;
      } else if (filters.activity === 'inactive_gt_7') {
        if (diffDays <= 7) return false;
      }
    }

    return true;
  });
}

/**
 * Formats a monetary amount into localized currency (e.g., "Rp199.000").
 */
export function formatAdminPrice(amount: number, currency = 'IDR'): string {
  if (isNaN(amount) || amount < 0) return 'Rp0';
  const formattedNumber = new Intl.NumberFormat('id-ID').format(amount);
  if (currency.toUpperCase() === 'IDR') {
    return `Rp${formattedNumber}`;
  }
  return `${currency} ${formattedNumber}`;
}

/**
 * Validates the commercial access configuration rules.
 */
export function validateAccessConfig(
  config: AdminAccessConfig
): AccessConfigValidationResult {
  const errors: Partial<Record<keyof AdminAccessConfig, string>> = {};

  if (!Number.isInteger(config.trialDurationDays) || config.trialDurationDays <= 0) {
    errors.trialDurationDays = 'Durasi trial harus berupa angka bulat lebih dari 0 hari.';
  }

  if (
    config.trialGracePeriodDays < 0 ||
    !Number.isInteger(config.trialGracePeriodDays)
  ) {
    errors.trialGracePeriodDays = 'Grace period trial tidak boleh negatif.';
  }

  if (typeof config.price !== 'number' || isNaN(config.price) || config.price < 0) {
    errors.price = 'Harga Wedding Pass tidak boleh negatif.';
  }

  if (!config.currency || config.currency.trim() === '') {
    errors.currency = 'Mata uang wajib diisi (misal IDR).';
  }

  if (
    !Number.isInteger(config.maxDurationMonths) ||
    config.maxDurationMonths <= 0
  ) {
    errors.maxDurationMonths = 'Durasi maksimal akses harus lebih dari 0 bulan.';
  }

  if (
    config.postWeddingGracePeriodDays < 0 ||
    !Number.isInteger(config.postWeddingGracePeriodDays)
  ) {
    errors.postWeddingGracePeriodDays = 'Grace period pasca-pernikahan tidak boleh negatif.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Returns a human-friendly duration description for the Wedding Pass.
 */
export function getWeddingPassDurationDescription(
  config: AdminAccessConfig = DEFAULT_ADMIN_ACCESS_CONFIG
): string {
  if (config.accessDurationRule === 'unlimited') {
    return 'Akses penuh tanpa batas waktu';
  }
  if (config.accessDurationRule === 'until_wedding_day') {
    if (config.postWeddingGracePeriodDays > 0) {
      return `Akses penuh sampai hari-H (+ ${config.postWeddingGracePeriodDays} hari)`;
    }
    return 'Akses penuh sampai hari-H';
  }
  if (config.maxDurationMonths) {
    return `Akses penuh selama ${config.maxDurationMonths} bulan`;
  }
  return 'Akses penuh tanpa batas waktu';
}

/**
 * Formats an ISO date into full Indonesian localized date string (e.g. "30 September 2026").
 */
export function formatAdminFullDate(dateStr: string | null): string {
  if (!dateStr) return 'Belum ditentukan';

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Belum ditentukan';

    const fullMonths = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const day = date.getDate();
    const month = fullMonths[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  } catch {
    return 'Belum ditentukan';
  }
}

/**
 * Formats the days to wedding into an operational label (e.g. "27 hari menuju hari-H").
 */
export function formatDaysToWeddingLabel(days: number | null): string {
  if (days === null) return 'Tanggal belum diatur';
  if (days > 0) return `${days} hari menuju hari-H`;
  if (days === 0) return 'Hari-H pernikahan hari ini';
  return 'Pernikahan telah terlaksana';
}

/**
 * Derives comprehensive customer access details based on registration timestamp
 * and commercial access configuration rules.
 */
export function deriveCustomerAccessDetail(
  workspaceCreatedAt: string,
  config: AdminAccessConfig = DEFAULT_ADMIN_ACCESS_CONFIG,
  explicitTier?: AdminAccessTier | null,
  now: Date = new Date()
): AdminCoupleAccessDetail {
  const trialDays = config.trialDurationDays || 14;
  const tier = deriveAccessTier(workspaceCreatedAt, explicitTier, now, trialDays);

  if (tier === 'Paid') {
    return {
      tier: 'Paid',
      startDate: workspaceCreatedAt,
      endDate: null,
      remainingDays: null,
      isExpired: false,
      gracePeriodDays: 0,
    };
  }

  const createdTime = new Date(workspaceCreatedAt).getTime();
  const trialDurationMs = trialDays * 24 * 60 * 60 * 1000;
  const trialEndTime = !isNaN(createdTime)
    ? createdTime + trialDurationMs
    : now.getTime();

  const trialEndDate = new Date(trialEndTime).toISOString();
  const remainingDays = !isNaN(createdTime)
    ? Math.max(0, Math.ceil((trialEndTime - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    tier,
    startDate: workspaceCreatedAt,
    endDate: trialEndDate,
    remainingDays,
    isExpired: tier === 'Expired',
    gracePeriodDays: config.trialGracePeriodDays || 0,
  };
}

/**
 * Derives operational recent activity items from existing persisted task data.
 * Does NOT invent fake activities. If tasks have completion or update timestamps,
 * sorts and formats them into clean activity items.
 */
export function deriveRecentActivities(
  tasks: TaskItem[],
  limit = 5
): AdminActivityItem[] {
  if (!tasks || tasks.length === 0) return [];

  const activities: AdminActivityItem[] = [];

  // Filter tasks with completedAt or updatedAt timestamps
  const completedTasks = tasks
    .filter((t) => t.status === 'completed' && t.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  for (const task of completedTasks.slice(0, limit)) {
    activities.push({
      id: `act-comp-${task.id}`,
      timestamp: task.completedAt!,
      title: 'Tugas Selesai',
      description: `Menyelesaikan tugas: ${task.title}`,
      type: 'task_completed',
    });
  }

  // If no completed tasks, check recently updated tasks
  if (activities.length === 0) {
    const recentlyUpdated = tasks
      .filter((t) => t.updatedAt && t.updatedAt !== t.createdAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    for (const task of recentlyUpdated.slice(0, limit)) {
      activities.push({
        id: `act-upd-${task.id}`,
        timestamp: task.updatedAt,
        title: 'Perubahan Tugas',
        description: `Memperbarui tugas: ${task.title}`,
        type: 'workspace_updated',
      });
    }
  }

  return activities;
}

/**
 * Calculates the extended expiration timestamp when adding trial days.
 * Ensures that if a user has remaining days, the extension is appended to their existing
 * expiration date instead of penalizing them by extending from today.
 */
export function calculateExtendedExpiryDate(
  currentExpiryStr: string | null,
  daysToAdd: number,
  fromDate: Date = new Date()
): string {
  if (daysToAdd <= 0) {
    return currentExpiryStr || fromDate.toISOString();
  }

  let baseTime = fromDate.getTime();

  if (currentExpiryStr) {
    const currentExpiryTime = new Date(currentExpiryStr).getTime();
    if (!isNaN(currentExpiryTime) && currentExpiryTime > baseTime) {
      baseTime = currentExpiryTime;
    }
  }

  const addedMs = daysToAdd * 24 * 60 * 60 * 1000;
  return new Date(baseTime + addedMs).toISOString();
}

/**
 * Calculates the expiration date for a Wedding Pass grant based on wedding date and rules.
 * For Wedding Pass (unlimited), access has no expiration date (returns null).
 */
export function calculateWeddingPassExpiryDate(
  weddingDateStr?: string | null,
  postWeddingGraceDays = 30,
  accessDurationRule: AccessDurationRule = 'unlimited',
  maxDurationMonths = 18,
  fromDate: Date = new Date()
): string | null {
  if (accessDurationRule === 'unlimited') {
    return null;
  }

  if (accessDurationRule === 'until_wedding_day') {
    if (weddingDateStr) {
      const weddingDate = new Date(weddingDateStr);
      if (!isNaN(weddingDate.getTime())) {
        const graceMs = postWeddingGraceDays * 24 * 60 * 60 * 1000;
        return new Date(weddingDate.getTime() + graceMs).toISOString();
      }
    }
  }

  if (accessDurationRule === 'fixed_duration') {
    const expiry = new Date(fromDate);
    expiry.setMonth(expiry.getMonth() + maxDurationMonths);
    return expiry.toISOString();
  }

  return null;
}

/**
 * Formats a customer access source into an Indonesian label with context.
 */
export function formatAccessSourceLabel(source: string): string {
  switch (source) {
    case 'complimentary':
      return 'Wedding Pass (Complimentary)';
    case 'purchased':
      return 'Wedding Pass (Pembelian)';
    case 'trial':
      return 'Free Trial (Sistem)';
    case 'system':
      return 'Sistem Otomatis';
    default:
      return source;
  }
}

/**
 * Formats an access history item into human-readable Indonesian title and description.
 */
export function formatAccessEventDescription(
  eventType: string,
  metadata: Record<string, any> = {}
): { title: string; description: string } {
  switch (eventType) {
    case 'trial_extended': {
      const days = metadata.daysAdded || 0;
      const reason = metadata.reason ? ` Alasan: "${metadata.reason}"` : '';
      return {
        title: `Perpanjangan Trial (+${days} Hari)`,
        description: `Masa trial diperpanjang ${days} hari sampai ${formatAdminDate(metadata.newExpiresAt)}.${reason}`,
      };
    }
    case 'wedding_pass_purchased': {
      const expStr = metadata.newExpiresAt ? ` sampai ${formatAdminDate(metadata.newExpiresAt)}` : ' (Akses Penuh)';
      const orderStr = metadata.orderNumber ? ` (Order ${metadata.orderNumber})` : '';
      return {
        title: 'Wedding Pass (Pembelian)',
        description: `Pembelian Wedding Pass berhasil${orderStr}. Hak akses penuh aktif${expStr}.`,
      };
    }
    case 'wedding_pass_granted_complimentary': {
      const reason = metadata.reason ? ` Alasan: "${metadata.reason}"` : '';
      const expStr = metadata.newExpiresAt ? ` sampai ${formatAdminDate(metadata.newExpiresAt)}` : ' (Akses Penuh)';
      return {
        title: 'Wedding Pass Diberikan (Complimentary)',
        description: `Hak akses penuh Wedding Pass diberikan oleh Admin${expStr}.${reason}`,
      };
    }
    case 'wedding_pass_granted': {
      // Legacy backward-compatibility check: inspect metadata.source
      if (metadata.source === 'purchased') {
        const expStr = metadata.newExpiresAt ? ` sampai ${formatAdminDate(metadata.newExpiresAt)}` : ' (Akses Penuh)';
        const orderStr = metadata.orderNumber ? ` (Order ${metadata.orderNumber})` : '';
        return {
          title: 'Wedding Pass (Pembelian)',
          description: `Pembelian Wedding Pass berhasil${orderStr}. Hak akses penuh aktif${expStr}.`,
        };
      }
      const reason = metadata.reason ? ` Alasan: "${metadata.reason}"` : '';
      const expStr = metadata.newExpiresAt ? ` sampai ${formatAdminDate(metadata.newExpiresAt)}` : ' (Akses Penuh)';
      return {
        title: 'Wedding Pass Diberikan (Complimentary)',
        description: `Hak akses penuh Wedding Pass diberikan oleh Admin${expStr}.${reason}`,
      };
    }

    case 'trial_started': {
      return {
        title: 'Trial Dimulai',
        description: `Masa trial aktif saat pendaftaran akun hingga ${formatAdminDate(metadata.newExpiresAt)}.`,
      };
    }
    case 'access_revoked': {
      return {
        title: 'Akses Disesuaikan / Dicabut',
        description: metadata.reason || 'Status akses diubah oleh admin.',
      };
    }
    default:
      return {
        title: 'Perubahan Akses',
        description: metadata.reason || 'Aktivitas hak akses diperbarui.',
      };
  }
}

/**
 * Derives the CommercialProduct object for Wedding Pass from the global platform config.
 * Encapsulates the current dynamic price and duration rules.
 */
export function getWeddingPassProduct(
  config: AdminAccessConfig = DEFAULT_ADMIN_ACCESS_CONFIG
): CommercialProduct {
  return {
    id: 'prod_wedding_pass',
    productType: 'wedding_pass',
    name: 'Wedding Pass',
    isActive: config.weddingPassEnabled,
    price: config.price,
    currency: config.currency || 'IDR',
    accessDurationRule: config.accessDurationRule,
    maxDurationMonths: config.maxDurationMonths,
    postWeddingGracePeriodDays: config.postWeddingGracePeriodDays,
  };
}

/**
 * Generates an operational order number format (e.g. WF-20260904-8392).
 */
export function generateOrderNumber(date: Date = new Date(), suffix?: string): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const random = suffix || Math.floor(1000 + Math.random() * 9000).toString();
  return `WF-${yyyy}${mm}${dd}-${random}`;
}

/**
 * Computes business metrics for orders & payments strictly from real data.
 */
export function computePaymentMetrics(
  orders: AdminOrderSummary[]
): AdminPaymentsMetrics {
  let pendingCount = 0;
  let paidCount = 0;
  let failedCount = 0;
  let totalRevenue = 0;

  for (const order of orders) {
    if (order.status === 'paid') {
      paidCount += 1;
      totalRevenue += Number(order.amount) || 0;
    } else if (order.status === 'pending') {
      pendingCount += 1;
    } else if (order.status === 'failed' || order.status === 'cancelled' || order.status === 'expired') {
      failedCount += 1;
    }
  }

  return {
    totalOrders: orders.length,
    pendingCount,
    paidCount,
    failedCount,
    totalRevenue,
  };
}

/**
 * Filters and searches orders based on search query (couple name, order number, or email), status, and date range.
 */
export function filterOrders(
  orders: AdminOrderSummary[],
  filters: Partial<AdminPaymentsFilterState> | { query?: string; search?: string; status?: AdminPaymentsStatusFilter; dateRange?: AdminDateRangeFilter },
  now: Date = new Date()
): AdminOrderSummary[] {
  const rawSearch = (filters as any)?.search ?? (filters as any)?.query ?? '';
  const query = typeof rawSearch === 'string' ? rawSearch.trim().toLowerCase() : '';
  const dateRange = filters?.dateRange || 'all';

  return orders.filter((order) => {
    // 1. Search Query Filter (matches coupleName, orderNumber, or customerEmail in metadata)
    if (query) {
      const matchName = (order.coupleName || '').toLowerCase().includes(query);
      const matchNumber = (order.orderNumber || '').toLowerCase().includes(query);
      const matchEmail = String(order.metadata?.customerEmail || '').toLowerCase().includes(query);
      if (!matchName && !matchNumber && !matchEmail) {
        return false;
      }
    }

    // 2. Status Filter
    if (filters?.status && filters.status !== 'all') {
      if (order.status !== filters.status) {
        return false;
      }
    }

    // 3. Date Range Filter
    if (dateRange !== 'all') {
      try {
        const orderTime = new Date(order.createdAt).getTime();
        if (isNaN(orderTime)) return true;

        if (dateRange === 'today') {
          const orderDate = new Date(order.createdAt);
          const isToday =
            orderDate.getFullYear() === now.getFullYear() &&
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getDate() === now.getDate();
          if (!isToday) return false;
        } else if (dateRange === 'last_7_days') {
          const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
          if (orderTime < sevenDaysAgo) return false;
        } else if (dateRange === 'last_30_days') {
          const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
          if (orderTime < thirtyDaysAgo) return false;
        }
      } catch {
        // Fallback
      }
    }

    return true;
  });
}

/**
 * Paginates an array of orders cleanly in-memory when client-side fallback is needed.
 */
export function paginateOrders(
  orders: AdminOrderSummary[],
  page = 1,
  pageSize = 25
): PaginatedAdminOrders & { items: AdminOrderSummary[] } {
  const totalCount = orders.length;
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize;
  const paginatedOrders = orders.slice(from, to);

  return {
    orders: paginatedOrders,
    items: paginatedOrders,
    totalCount,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}

/**
 * Evaluates operational consistency between Order truth, Payment truth, and Access Entitlement truth.
 * Returns actionable diagnostic health alerts and highlights critical discrepancies.
 */
export function evaluateEntitlementMismatch(
  orderStatus: OrderStatus,
  entitlement?: {
    tier: AdminAccessTier;
    expiresAt: string | null;
    isExpired: boolean;
  } | null
): EntitlementMismatchEvaluation {
  // Case 1: Order is Paid
  if (orderStatus === 'paid') {
    if (!entitlement) {
      return {
        hasMismatch: true,
        severity: 'warning',
        title: 'Mismatch: Entitlement Tidak Ditemukan',
        message: 'Pesanan telah berstatus Paid, namun data entitlement pasangan belum tercatat pada database. Lakukan Sync Status atau intervensi admin.',
      };
    }

    if (entitlement.tier !== 'Paid') {
      return {
        hasMismatch: true,
        severity: 'warning',
        title: 'Mismatch: Hak Akses Pasangan Bukan Paid',
        message: `Pesanan telah lunas (Paid), namun hak akses pasangan saat ini berstatus ${entitlement.tier}. Sinkronisasikan status untuk mengaktifkan akses.`,
      };
    }

    if (entitlement.tier === 'Paid' && entitlement.expiresAt !== null) {
      return {
        hasMismatch: true,
        severity: 'warning',
        title: 'Mismatch: Durasi Akses Paid Memiliki Batas Waktu',
        message: 'Wedding Pass menganut prinsip akses tanpa batas waktu (expires_at = null), namun entitlement saat ini memiliki tanggal kedaluwarsa.',
      };
    }

    return {
      hasMismatch: false,
      severity: 'healthy',
      title: 'Status Selaras (Healthy)',
      message: 'Pesanan lunas dan entitlement pasangan aktif tanpa batas waktu.',
    };
  }

  // Case 2: Order is Cancelled / Refunded / Failed / Expired
  if (orderStatus === 'cancelled' || orderStatus === 'failed' || orderStatus === 'expired') {
    if (entitlement?.tier === 'Paid') {
      return {
        hasMismatch: true,
        severity: 'critical',
        title: 'KRITIS: Akses Paid Masih Aktif pada Pesanan Tidak Valid',
        message: `Pesanan ini berstatus ${orderStatus}, namun entitlement pasangan saat ini masih tercatat sebagai Paid. Periksa riwayat refund atau sesuaikan hak akses.`,
      };
    }

    return {
      hasMismatch: false,
      severity: 'healthy',
      title: 'Status Selaras',
      message: `Pesanan ${orderStatus} dan hak akses pasangan tidak aktif sebagai Paid.`,
    };
  }

  // Case 3: Order is Pending
  if (entitlement?.tier === 'Paid') {
    return {
      hasMismatch: false,
      severity: 'healthy',
      title: 'Informasi: Pasangan Sudah Memiliki Akses Paid',
      message: 'Pesanan ini masih pending, namun pasangan telah memiliki hak akses Paid aktif (misal dari pesanan lain atau complimentary).',
    };
  }

  return {
    hasMismatch: false,
    severity: 'healthy',
    title: 'Menunggu Pembayaran',
    message: 'Pesanan menunggu penyelesaian pembayaran dari customer.',
  };
}

/**
 * Formats an order status into Indonesian label.
 */
export function formatOrderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    case 'expired':
      return 'Expired';
    default:
      return status;
  }
}

/**
 * Returns badge styling and localized label for an order status.
 */
export function formatOrderStatusBadge(status: OrderStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'paid':
      return {
        label: 'Paid',
        className: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      };
    case 'pending':
      return {
        label: 'Pending',
        className: 'bg-amber-50 text-amber-800 border-amber-300',
      };
    case 'failed':
      return {
        label: 'Failed',
        className: 'bg-rose-50 text-rose-800 border-rose-300',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        className: 'bg-charcoal-50 text-charcoal-700 border-charcoal-200',
      };
    case 'expired':
      return {
        label: 'Expired',
        className: 'bg-rose-50 text-rose-800 border-rose-300',
      };
    default:
      return {
        label: status,
        className: 'bg-ivory-100 text-charcoal-700 border-beige-200',
      };
  }
}




