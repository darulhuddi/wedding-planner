import {
  AdminCoupleSummary,
  AdminOverviewData,
  AdminAccessConfig,
  AdminCoupleDetail,
  CustomerEntitlement,
  CustomerAccessHistoryItem,
  ExtendTrialPayload,
  GrantWeddingPassPayload,
  CommercialProduct,
  AdminOrderSummary,
  AdminOrderDetail,
  AdminPaymentSummary,
  ProcessRefundPayload,
  PaginatedAdminOrders,
  AdminPaginationParams,
  AdminPaymentsFilterState,
  AdminMarkPaidPayload,
  AdminCancelOrderPayload,
  PaymentSettingsConfig,
  ApproveManualPaymentPayload,
  RejectManualPaymentPayload,
  ManualPaymentApprovalItem,
  ManualPaymentApprovalsFilterState,
} from '../types/admin';
import {
  fetchAdminCouples,
  fetchAdminOverviewData,
  fetchAccessConfig,
  saveAccessConfig,
  fetchAdminCoupleDetail,
  fetchCustomerEntitlement,
  fetchCustomerAccessHistory,
  extendCustomerTrialInDb,
  grantComplimentaryWeddingPassInDb,
  fetchAdminOrders,
  fetchPaginatedAdminOrders,
  fetchAdminOrderDetail,
  createOrderInDb,
  completePaidOrderInDb,
  processRefundedOrderInDb,
  adminMarkOrderPaidInDb,
  adminCancelOrderInDb,
  fetchPaymentSettingsFromDb,
  savePaymentSettingsInDb,
  approveManualPaymentInDb,
  rejectManualPaymentInDb,
  fetchManualPaymentApprovalsFromDb,
} from './supabaseAdminAdapter';
import { syncOrderPaymentStatus } from './paymentRepository';
import { authService } from '../auth/authService';

/**
 * Returns complete Admin Overview statistics and recent couples list.
 */
export async function getAdminOverview(): Promise<AdminOverviewData> {
  return fetchAdminOverviewData();
}

/**
 * Returns list of all registered couples with progress and status.
 */
export async function getAdminCouples(): Promise<AdminCoupleSummary[]> {
  return fetchAdminCouples();
}

/**
 * Returns the current platform commercial access and monetization rules.
 */
export async function getAccessConfig(): Promise<AdminAccessConfig> {
  return fetchAccessConfig();
}

/**
 * Persists updated platform commercial access and monetization rules.
 */
export async function updateAccessConfig(
  config: AdminAccessConfig
): Promise<AdminAccessConfig> {
  return saveAccessConfig(config);
}

/**
 * Returns detailed operational customer state for a single couple workspace.
 */
export async function getAdminCoupleDetail(
  workspaceId: string
): Promise<AdminCoupleDetail | null> {
  return fetchAdminCoupleDetail(workspaceId);
}

/**
 * Returns customer entitlement state for a specific workspace.
 */
export async function getCustomerEntitlement(
  workspaceId: string
): Promise<CustomerEntitlement | null> {
  return fetchCustomerEntitlement(workspaceId);
}

/**
 * Returns audit history logs of access changes for a specific workspace.
 */
export async function getCustomerAccessHistory(
  workspaceId: string
): Promise<CustomerAccessHistoryItem[]> {
  return fetchCustomerAccessHistory(workspaceId);
}

/**
 * Extends trial access for a customer.
 */
export async function extendCustomerTrial(
  workspaceId: string,
  payload: ExtendTrialPayload
): Promise<CustomerEntitlement> {
  return extendCustomerTrialInDb(workspaceId, payload);
}

/**
 * Grants a complimentary Wedding Pass to a customer.
 */
export async function grantComplimentaryWeddingPass(
  workspaceId: string,
  payload: GrantWeddingPassPayload
): Promise<CustomerEntitlement> {
  return grantComplimentaryWeddingPassInDb(workspaceId, payload);
}

/**
 * Returns all customer orders and payment records.
 */
export async function getAdminOrders(): Promise<AdminOrderSummary[]> {
  return fetchAdminOrders();
}

/**
 * Creates a new customer order with a fixed price snapshot.
 */
export async function createCustomerOrder(
  workspaceId: string,
  product: CommercialProduct,
  customOrderNumber?: string
): Promise<AdminOrderSummary> {
  return createOrderInDb(workspaceId, product, customOrderNumber);
}

/**
 * Completes a paid order idempotently and activates the customer entitlement.
 */
export async function completePaidOrder(
  orderId: string,
  paymentData?: Partial<AdminPaymentSummary>
): Promise<AdminOrderSummary> {
  return completePaidOrderInDb(orderId, paymentData);
}

/**
 * Returns full order and transaction details for the Admin inspection drawer.
 */
export async function getAdminOrderDetail(orderId: string): Promise<AdminOrderDetail | null> {
  return fetchAdminOrderDetail(orderId);
}

/**
 * Processes a refund / chargeback for an order, revoking access.
 */
export async function processRefundedOrder(
  orderId: string,
  payload?: ProcessRefundPayload
): Promise<AdminOrderSummary> {
  return processRefundedOrderInDb(orderId, payload);
}

/**
 * Returns paginated orders matching search/filters.
 */
export async function getPaginatedAdminOrders(
  filters?: AdminPaymentsFilterState,
  pagination?: AdminPaginationParams
): Promise<PaginatedAdminOrders> {
  return fetchPaginatedAdminOrders(filters, pagination);
}

/**
 * Performs administrative manual intervention to mark an order as Paid.
 */
export async function adminMarkOrderPaid(
  payload: AdminMarkPaidPayload
): Promise<AdminOrderSummary> {
  return adminMarkOrderPaidInDb(payload);
}

/**
 * Performs administrative cancellation of a pending order.
 */
export async function adminCancelOrder(
  payload: AdminCancelOrderPayload
): Promise<AdminOrderSummary> {
  return adminCancelOrderInDb(payload);
}

/**
 * Actively syncs an order's payment status with Midtrans via server-side Edge Function.
 */
export async function syncAdminPaymentStatus(
  orderNumber: string
): Promise<{ order: AdminOrderSummary; isPaid?: boolean; status?: string }> {
  return syncOrderPaymentStatus(orderNumber);
}

/**
 * Checks if the current authenticated user has active administrator authorization.
 */
export async function checkIsAdmin(userId?: string): Promise<boolean> {
  return authService.checkIsAdmin(userId);
}

/**
 * Provisions the initial administrator user via secure bootstrap RPC.
 */
export async function bootstrapAdmin(userId: string): Promise<boolean> {
  return authService.bootstrapFirstAdmin(userId);
}

/**
 * Returns current payment methods configuration from database.
 */
export async function getPaymentSettings(): Promise<PaymentSettingsConfig> {
  return fetchPaymentSettingsFromDb();
}

/**
 * Persists updated payment methods configuration via admin RPC.
 */
export async function updatePaymentSettings(
  settings: PaymentSettingsConfig,
  actorId?: string
): Promise<PaymentSettingsConfig> {
  return savePaymentSettingsInDb(settings, actorId);
}

/**
 * Approves a manual payment for an order and activates customer access.
 */
export async function approveManualPayment(
  payload: ApproveManualPaymentPayload
): Promise<AdminOrderSummary> {
  return approveManualPaymentInDb(payload);
}

/**
 * Rejects a manual payment with a mandatory reason.
 */
export async function rejectManualPayment(
  payload: RejectManualPaymentPayload
): Promise<AdminOrderSummary> {
  return rejectManualPaymentInDb(payload);
}

/**
 * Retrieves list of manual payment approval items for Admin.
 */
export async function getManualPaymentApprovals(
  filters?: ManualPaymentApprovalsFilterState
): Promise<ManualPaymentApprovalItem[]> {
  return fetchManualPaymentApprovalsFromDb(filters);
}



