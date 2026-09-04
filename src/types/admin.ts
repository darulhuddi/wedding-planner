/**
 * WedFlow Admin Console - Data Contracts & Types
 *
 * Defines the domain models and interfaces for the Admin Console,
 * ensuring clean separation between database representations and UI consumers.
 */

export type AdminAccessTier = 'Trial' | 'Paid' | 'Expired' | 'Free' | 'Unknown';

export interface AdminOverviewMetrics {
  totalCouples: number;
  activeWeddings: number;
  activeTrial: number;
  paid: number;
  expiringSoon: number;
}

export type AdminAttentionSeverity = 'info' | 'warning' | 'urgent';
export type AdminAttentionType =
  | 'trial_expiring'
  | 'payment_problem'
  | 'access_problem'
  | 'wedding_approaching'
  | 'support_issue';

export interface AdminAttentionItem {
  id: string;
  type: AdminAttentionType;
  title: string;
  description: string;
  count?: number;
  severity: AdminAttentionSeverity;
  ctaLabel: string;
  ctaRoute: string;
}

export interface AdminCoupleSummary {
  id: string;
  userId: string;
  coupleName: string;
  weddingDate: string | null;
  accessTier: AdminAccessTier;
  progressPercentage: number;
  totalTasks: number;
  completedTasks: number;
  lastActive: string; // ISO date string
  createdAt: string;  // ISO date string
  daysToWedding: number | null;
}

export interface AdminOverviewData {
  metrics: AdminOverviewMetrics;
  attentionItems: AdminAttentionItem[];
  recentCouples: AdminCoupleSummary[];
}

export type AdminNavRoute =
  | 'admin'
  | 'admin/overview'
  | 'admin/couples'
  | 'admin/weddings'
  | 'admin/access'
  | 'admin/payments'
  | 'admin/system'
  | 'admin/settings';

export type AdminAccessFilter = 'all' | 'Trial' | 'Paid' | 'Expired';
export type AdminWeddingFilter = 'all' | 'lte_7' | 'lte_14' | 'lte_30' | 'gt_30';
export type AdminActivityFilter = 'all' | 'today' | 'last_7_days' | 'inactive_gt_7';

export interface AdminCouplesFilterState {
  search: string;
  access: AdminAccessFilter;
  wedding: AdminWeddingFilter;
  activity: AdminActivityFilter;
}

export type TrialStartTrigger = 'account_created' | 'wedding_setup_completed';
export type AccessDurationRule = 'unlimited' | 'until_wedding_day' | 'fixed_duration';

export interface AdminAccessConfig {
  // Section 1: Free Trial
  trialEnabled: boolean;
  trialDurationDays: number;
  trialStartTrigger: TrialStartTrigger;
  trialGracePeriodDays: number;

  // Section 2: Wedding Pass
  weddingPassEnabled: boolean;
  price: number;
  currency: string;
  accessDurationRule: AccessDurationRule;
  maxDurationMonths: number;
  postWeddingGracePeriodDays: number;

  updatedAt?: string;
}

export const DEFAULT_ADMIN_ACCESS_CONFIG: AdminAccessConfig = {
  trialEnabled: true,
  trialDurationDays: 14,
  trialStartTrigger: 'account_created',
  trialGracePeriodDays: 0,

  weddingPassEnabled: true,
  price: 199000,
  currency: 'IDR',
  accessDurationRule: 'unlimited',
  maxDurationMonths: 18,
  postWeddingGracePeriodDays: 30,
};

export interface AccessConfigValidationResult {
  isValid: boolean;
  errors: Partial<Record<keyof AdminAccessConfig, string>>;
}

export interface AdminCoupleAccessDetail {
  tier: AdminAccessTier;
  startDate: string;        // ISO string
  endDate: string | null;   // ISO string or null for unlimited
  remainingDays: number | null; // integer >= 0, or null for unlimited
  isExpired: boolean;
  gracePeriodDays: number;
}

export interface AdminActivityItem {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type: 'task_completed' | 'task_created' | 'workspace_updated';
}

export interface AdminCoupleDetail {
  id: string;
  userId: string;
  coupleName: string;
  weddingDate: string | null;
  daysToWedding: number | null;
  estimatedBudget: number;
  spentBudget: number;
  allocatedBudget: number;
  estimatedGuestCount: number;
  actualGuestCount: number;
  createdAt: string;
  updatedAt: string;

  // Task Progress (Distinct from module completion)
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;

  // Module Progress (6 canonical modules)
  completedModulesCount: number;
  totalModulesCount: number;
  modules: Array<{
    category: string;
    label: string;
    totalTasks: number;
    completedTasks: number;
    status: string;
    semanticStatusLabel: string;
    progressPercentage: number;
  }>;

  // Access status & dates
  access: AdminCoupleAccessDetail;

  // Recent activity (derived from real task completion / modification)
  recentActivities: AdminActivityItem[];
}

export type CustomerAccessSource = 'trial' | 'purchased' | 'complimentary' | 'system';

export type CustomerAccessEventType =
  | 'trial_started'
  | 'trial_extended'
  | 'wedding_pass_granted'
  | 'wedding_pass_granted_complimentary'
  | 'wedding_pass_purchased'
  | 'access_revoked';


export interface CustomerEntitlement {
  workspaceId: string;
  coupleName?: string;
  weddingDate?: string | null;
  tier: AdminAccessTier;
  source: CustomerAccessSource;
  startedAt: string;        // ISO string
  expiresAt: string | null; // ISO string or null for lifetime/unrestricted
  remainingDays: number | null; // integer >= 0 or null for lifetime/unrestricted
  isExpired: boolean;
  grantedBy?: string | null;
  notes?: string | null;
  updatedAt: string;
}

export interface CustomerAccessHistoryItem {
  id: string;
  workspaceId: string;
  eventType: CustomerAccessEventType;
  source: string;
  actorId?: string | null;
  metadata: {
    daysAdded?: number;
    previousExpiresAt?: string | null;
    newExpiresAt?: string | null;
    reason?: string;
    grantedBy?: string;
    accessDurationRule?: string;
    [key: string]: any;
  };
  createdAt: string; // ISO string
}

export interface ExtendTrialPayload {
  daysToAdd: number;
  reason?: string;
  actorId?: string;
}

export interface GrantWeddingPassPayload {
  accessDurationRule?: AccessDurationRule;
  customExpiresAt?: string | null;
  reason?: string;
  actorId?: string;
}

// Payment Architecture & Orders Contracts
export type ProductType = 'wedding_pass';

export interface CommercialProduct {
  id: string;
  productType: ProductType;
  name: string;
  isActive: boolean;
  price: number;       // integer IDR amount
  currency: string;    // 'IDR'
  accessDurationRule: AccessDurationRule;
  maxDurationMonths: number;
  postWeddingGracePeriodDays: number;
}

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';

export interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  workspaceId: string;
  coupleName: string;
  productType: ProductType;
  productName: string;
  amount: number;       // Price snapshot integer (e.g. 199000)
  currency: string;    // 'IDR'
  status: OrderStatus;
  createdAt: string;   // ISO string
  updatedAt: string;   // ISO string
  paidAt?: string | null;
  paymentMethod?: string | null;
  provider?: string | null;
  providerReference?: string | null;
  metadata?: Record<string, any>;
}

export interface AdminPaymentSummary {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod?: string | null;
  provider?: string | null;
  providerReference?: string | null;
  createdAt: string;
  paidAt?: string | null;
  metadata?: Record<string, any>;
}

export interface AdminPaymentsMetrics {
  totalOrders: number;
  pendingCount: number;
  paidCount: number;
  failedCount: number;
  totalRevenue: number;
}

export type AdminPaymentsStatusFilter = 'all' | OrderStatus;
export type AdminDateRangeFilter = 'all' | 'today' | 'last_7_days' | 'last_30_days';

export interface AdminPaymentsFilterState {
  search: string;
  status: AdminPaymentsStatusFilter;
  dateRange?: AdminDateRangeFilter;
}

export interface AdminPaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedAdminOrders {
  orders: AdminOrderSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminOrderDetail extends AdminOrderSummary {
  weddingDate?: string | null;
  customerEmail?: string | null;
  entitlement?: {
    tier: AdminAccessTier;
    source: CustomerAccessSource;
    expiresAt: string | null;
    isExpired: boolean;
    notes?: string | null;
  } | null;
  rawPayment?: AdminPaymentSummary | null;
  recentAccessEvents?: CustomerAccessHistoryItem[];
}

export interface ProcessRefundPayload {
  reason?: string;
  provider?: string;
  providerReference?: string;
  metadata?: Record<string, any>;
}

export interface AdminMarkPaidPayload {
  orderId: string;
  reason: string;
  adminNotes?: string;
  actorId?: string;
}

export interface AdminCancelOrderPayload {
  orderId: string;
  reason: string;
  actorId?: string;
}

export interface EntitlementMismatchEvaluation {
  hasMismatch: boolean;
  severity: 'healthy' | 'warning' | 'critical';
  title: string;
  message: string;
}

