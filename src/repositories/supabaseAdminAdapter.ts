/**
 * WedFlow Admin Supabase Adapter
 *
 * Direct interface to Supabase for admin aggregations and couple statistics.
 * Translates raw database rows into domain AdminCoupleSummary and AdminOverviewData.
 */

import { supabase } from '../lib/supabaseClient';
import {
  AdminCoupleSummary,
  AdminOverviewData,
  AdminAccessTier,
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
  DEFAULT_ADMIN_ACCESS_CONFIG,
  PaymentSettingsConfig,
  DEFAULT_PAYMENT_SETTINGS_CONFIG,
  ApproveManualPaymentPayload,
  RejectManualPaymentPayload,
  ManualPaymentApprovalItem,
  ManualPaymentApprovalsFilterState,
} from '../types/admin';
import {
  calculateDaysToWedding,
  calculateProgressPercentage,
  computeOverviewMetrics,
  evaluateAttentionItems,
  deriveAccessTier,
  deriveCustomerAccessDetail,
  deriveRecentActivities,
  calculateExtendedExpiryDate,
  calculateWeddingPassExpiryDate,
  generateOrderNumber,
  getWeddingPassProduct,
  filterOrders,
  paginateOrders,
} from '../domain/adminSelectors';

import { getAllModulesProgress } from '../domain/moduleSelectors';
import { fetchTasksByWorkspaceId } from './supabaseTaskAdapter';
import { fetchBudgetByWorkspaceId } from './supabaseBudgetAdapter';
import { fetchGuestsByWorkspaceId } from './supabaseGuestAdapter';


interface SupabaseRawWorkspace {
  id: string;
  user_id: string;
  couple_name: string;
  wedding_date: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseTaskSummary {
  workspace_id: string;
  status: string;
}

/**
 * Fetches all registered couples/workspaces and calculates their task progress
 * from actual Supabase records.
 */
export async function fetchAdminCouples(): Promise<AdminCoupleSummary[]> {
  // 1. Fetch all workspaces ordered by updated_at / created_at descending
  const { data: workspacesData, error: workspacesError } = await supabase
    .from('workspaces')
    .select('id, user_id, couple_name, wedding_date, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (workspacesError) {
    console.error('[WedFlow Admin] Failed to fetch workspaces from Supabase:', workspacesError);
    throw new Error(workspacesError.message || 'Gagal mengambil data pasangan dari database.');
  }

  const rawWorkspaces: SupabaseRawWorkspace[] = (workspacesData || []) as SupabaseRawWorkspace[];
  if (rawWorkspaces.length === 0) {
    return [];
  }

  // 2. Fetch task counts, customer access entitlements, and paid orders in parallel
  const workspaceIds = rawWorkspaces.map((w) => w.id);
  const [tasksRes, entitlementsRes, paidOrdersRes] = await Promise.all([
    (async () => {
      try {
        return await supabase
          .from('tasks')
          .select('workspace_id, status')
          .in('workspace_id', workspaceIds);
      } catch (err) {
        return { data: [], error: err };
      }
    })(),
    (async () => {
      try {
        return await supabase
          .from('customer_access_entitlements')
          .select('workspace_id, tier, source, expires_at, started_at')
          .in('workspace_id', workspaceIds);
      } catch (err) {
        return { data: [], error: err };
      }
    })(),
    (async () => {
      try {
        return await supabase
          .from('orders')
          .select('workspace_id, status')
          .in('workspace_id', workspaceIds)
          .eq('status', 'paid');
      } catch (err) {
        return { data: [], error: err };
      }
    })(),
  ]);

  if (tasksRes?.error) {
    console.warn('[WedFlow Admin] Warning fetching task summaries:', tasksRes.error);
  }
  if (entitlementsRes?.error) {
    console.warn('[WedFlow Admin] Warning fetching entitlements:', entitlementsRes.error);
  }
  if (paidOrdersRes?.error) {
    console.warn('[WedFlow Admin] Warning fetching paid orders:', paidOrdersRes.error);
  }

  const rawTasks: SupabaseTaskSummary[] = (tasksRes?.data || []) as SupabaseTaskSummary[];

  // Group tasks by workspace_id
  const taskMap = new Map<string, { total: number; completed: number }>();
  for (const t of rawTasks) {
    if (!taskMap.has(t.workspace_id)) {
      taskMap.set(t.workspace_id, { total: 0, completed: 0 });
    }
    const entry = taskMap.get(t.workspace_id)!;
    entry.total += 1;
    if (t.status === 'completed') {
      entry.completed += 1;
    }
  }

  // Group entitlements by workspace_id
  const entitlementMap = new Map<string, { tier: string; source?: string; expires_at?: string | null }>();
  if (entitlementsRes?.data && Array.isArray(entitlementsRes.data)) {
    for (const ent of entitlementsRes.data) {
      entitlementMap.set(ent.workspace_id, ent);
    }
  }

  // Set of workspaces with paid orders
  const paidOrderWorkspaces = new Set<string>();
  if (paidOrdersRes?.data && Array.isArray(paidOrdersRes.data)) {
    for (const order of paidOrdersRes.data) {
      paidOrderWorkspaces.add(order.workspace_id);
    }
  }

  const now = new Date();

  // 3. Map to domain AdminCoupleSummary
  return rawWorkspaces.map((w) => {
    const taskStats = taskMap.get(w.id) || { total: 0, completed: 0 };
    const progress = calculateProgressPercentage(taskStats.completed, taskStats.total);
    const daysToWedding = calculateDaysToWedding(w.wedding_date, now);

    // Derive actual access tier from customer_access_entitlements or paid orders
    const ent = entitlementMap.get(w.id);
    let explicitTier: AdminAccessTier | null = null;

    if (ent) {
      const normalizedTier = (ent.tier || '').toLowerCase();
      if (
        normalizedTier === 'paid' ||
        ent.source === 'complimentary' ||
        ent.source === 'purchased' ||
        ent.source === 'order_webhook'
      ) {
        explicitTier = 'Paid';
      } else if (normalizedTier === 'expired') {
        explicitTier = 'Expired';
      } else if (normalizedTier === 'trial') {
        if (ent.expires_at) {
          const expiryTime = new Date(ent.expires_at).getTime();
          explicitTier = expiryTime <= now.getTime() ? 'Expired' : 'Trial';
        } else {
          explicitTier = 'Trial';
        }
      }
    } else if (paidOrderWorkspaces.has(w.id)) {
      explicitTier = 'Paid';
    }

    const accessTier: AdminAccessTier = deriveAccessTier(w.created_at, explicitTier, now);

    return {
      id: w.id,
      userId: w.user_id,
      coupleName: w.couple_name || 'Pasangan Baru',
      weddingDate: w.wedding_date || null,
      accessTier,
      progressPercentage: progress,
      totalTasks: taskStats.total,
      completedTasks: taskStats.completed,
      lastActive: w.updated_at || w.created_at,
      createdAt: w.created_at,
      daysToWedding,
    };
  });
}

/**
 * Aggregates complete Admin Overview Data from Supabase.
 */
export async function fetchAdminOverviewData(): Promise<AdminOverviewData> {
  const couples = await fetchAdminCouples();
  const metrics = computeOverviewMetrics(couples);
  const attentionItems = evaluateAttentionItems(couples);

  return {
    metrics,
    attentionItems,
    recentCouples: couples.slice(0, 10), // Most recent 10 couples
  };
}

const COMMERCIAL_RULES_CONFIG_KEY = 'commercial_access_rules';

/**
 * Fetches the global platform access and monetization configuration from Supabase.
 * Returns DEFAULT_ADMIN_ACCESS_CONFIG if no configuration row is found or table is pending.
 */
export async function fetchAccessConfig(): Promise<AdminAccessConfig> {
  const supabaseUrl = (supabase as any)?.supabaseUrl || 'https://heavutiajotepwfhlccx.supabase.co';
  try {
    const { data, error } = await supabase
      .from('platform_configurations')
      .select('value, updated_at')
      .eq('key', COMMERCIAL_RULES_CONFIG_KEY)
      .maybeSingle();

    if (error) {
      console.warn('[WedFlow Admin] Notice fetching platform config, using defaults:', error.message);
      console.log('[Pricing Debug]', {
        supabaseUrl,
        keyQueried: COMMERCIAL_RULES_CONFIG_KEY,
        responseData: null,
        responseError: error.message,
        resolvedPrice: DEFAULT_ADMIN_ACCESS_CONFIG.price,
        fallbackUsed: true,
      });
      return DEFAULT_ADMIN_ACCESS_CONFIG;
    }

    if (!data || !data.value) {
      console.log('[Pricing Debug]', {
        supabaseUrl,
        keyQueried: COMMERCIAL_RULES_CONFIG_KEY,
        responseData: null,
        responseError: null,
        resolvedPrice: DEFAULT_ADMIN_ACCESS_CONFIG.price,
        fallbackUsed: true,
      });
      return DEFAULT_ADMIN_ACCESS_CONFIG;
    }

    const resolved = {
      ...DEFAULT_ADMIN_ACCESS_CONFIG,
      ...(data.value as Partial<AdminAccessConfig>),
      updatedAt: data.updated_at,
    };

    console.log('[Pricing Debug]', {
      supabaseUrl,
      keyQueried: COMMERCIAL_RULES_CONFIG_KEY,
      responseData: data.value,
      responseError: null,
      resolvedPrice: resolved.price,
      fallbackUsed: false,
    });

    return resolved;
  } catch (err: any) {
    console.warn('[WedFlow Admin] Fallback to default access config:', err);
    console.log('[Pricing Debug]', {
      supabaseUrl,
      keyQueried: COMMERCIAL_RULES_CONFIG_KEY,
      responseData: null,
      responseError: err?.message || String(err),
      resolvedPrice: DEFAULT_ADMIN_ACCESS_CONFIG.price,
      fallbackUsed: true,
    });
    return DEFAULT_ADMIN_ACCESS_CONFIG;
  }
}

/**
 * Persists the global platform access and monetization configuration in Supabase.
 */
export async function saveAccessConfig(
  config: AdminAccessConfig
): Promise<AdminAccessConfig> {
  const now = new Date().toISOString();
  const payload = {
    key: COMMERCIAL_RULES_CONFIG_KEY,
    value: config,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('platform_configurations')
    .upsert(payload, { onConflict: 'key' })
    .select('value, updated_at')
    .single();

  if (error) {
    console.error('[WedFlow Admin] Failed to save platform config in Supabase:', error);
    throw new Error(error.message || 'Gagal menyimpan konfigurasi akses ke database.');
  }

  return {
    ...DEFAULT_ADMIN_ACCESS_CONFIG,
    ...(data.value as Partial<AdminAccessConfig>),
    updatedAt: data.updated_at,
  };
}

/**
 * Fetches the complete operational detail for a single couple / wedding workspace.
 * Returns null if the workspace is not found.
 */
export async function fetchAdminCoupleDetail(
  workspaceId: string
): Promise<AdminCoupleDetail | null> {
  if (!workspaceId) return null;

  // 1. Fetch workspace row from Supabase
  const { data: wsData, error: wsError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .maybeSingle();

  if (wsError || !wsData) {
    if (wsError) {
      console.error('[WedFlow Admin] Error fetching workspace detail from Supabase:', wsError);
    }
    return null;
  }

  // 2. Load tasks, budget, guests, access config, and customer entitlement in parallel
  const [tasks, budget, guests, config, entitlement] = await Promise.all([
    fetchTasksByWorkspaceId(workspaceId).catch(() => []),
    fetchBudgetByWorkspaceId(workspaceId).catch(() => ({ allocations: [], expenses: [] })),
    fetchGuestsByWorkspaceId(workspaceId).catch(() => []),
    fetchAccessConfig().catch(() => DEFAULT_ADMIN_ACCESS_CONFIG),
    fetchCustomerEntitlement(workspaceId).catch(() => null),
  ]);

  const now = new Date();
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const progressPercentage = calculateProgressPercentage(completedTasks, totalTasks);
  const daysToWedding = calculateDaysToWedding(wsData.wedding_date, now);

  // Derive module progress (6 canonical modules)
  const priorityCategory = wsData.primary_planning_priority as any;
  const moduleList = getAllModulesProgress(tasks, priorityCategory);
  const completedModulesCount = moduleList.filter((m) => m.status === 'completed').length;

  // Derive customer access detail using real entitlement tier
  const explicitTier = entitlement?.tier || null;
  const access = deriveCustomerAccessDetail(wsData.created_at, config, explicitTier, now);

  // Derive recent activities from real tasks
  const recentActivities = deriveRecentActivities(tasks, 5);

  // Calculate budget metrics
  const spentBudget = (budget.expenses || []).reduce(
    (sum, exp) => sum + (Number(exp.amount) || 0),
    0
  );
  const allocatedBudget = (budget.allocations || []).reduce(
    (sum, alc) => sum + (Number(alc.amount) || 0),
    0
  );
  const estimatedBudget = Number(wsData.estimated_budget) || 100_000_000;
  const estimatedGuestCount = Number(wsData.estimated_guest_count) || 400;

  return {
    id: wsData.id,
    userId: wsData.user_id,
    coupleName: wsData.couple_name || 'Pasangan Baru',
    weddingDate: wsData.wedding_date || null,
    daysToWedding,
    estimatedBudget,
    spentBudget,
    allocatedBudget,
    estimatedGuestCount,
    actualGuestCount: (guests || []).length,
    createdAt: wsData.created_at,
    updatedAt: wsData.updated_at,
    totalTasks,
    completedTasks,
    progressPercentage,
    completedModulesCount,
    totalModulesCount: moduleList.length,
    modules: moduleList,
    access,
    recentActivities,
  };
}

/**
 * Fetches the customer entitlement for a specific workspace from Supabase.
 * If no custom entitlement is stored yet, checks for completed paid orders,
 * then falls back gracefully to deriving from the workspace creation date and platform commercial rules.
 */
export async function fetchCustomerEntitlement(
  workspaceId: string
): Promise<CustomerEntitlement | null> {
  if (!workspaceId) return null;

  // 1. Fetch workspace
  const { data: wsData, error: wsError } = await supabase
    .from('workspaces')
    .select('id, couple_name, wedding_date, created_at, updated_at')
    .eq('id', workspaceId)
    .maybeSingle();

  if (wsError || !wsData) {
    if (wsError) console.error('[WedFlow Admin] Error fetching workspace for entitlement:', wsError);
    return null;
  }

  const now = new Date();

  // 2. Fetch specific entitlement if exists
  try {
    const { data: entData, error: entError } = await supabase
      .from('customer_access_entitlements')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!entError && entData) {
      let isExpired = false;
      let remainingDays: number | null = 0;

      if (entData.tier === 'Paid') {
        remainingDays = null;
        isExpired = false;
      } else if (entData.expires_at) {
        const expiryTime = new Date(entData.expires_at).getTime();
        const diffMs = expiryTime - now.getTime();
        remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        isExpired = diffMs <= 0;
      }

      return {
        workspaceId: wsData.id,
        coupleName: wsData.couple_name || 'Pasangan Baru',
        weddingDate: wsData.wedding_date || null,
        tier: entData.tier === 'Paid' ? 'Paid' : (isExpired && entData.tier === 'Trial' ? 'Expired' : (entData.tier as AdminAccessTier)),
        source: entData.source || 'trial',
        startedAt: entData.started_at || wsData.created_at,
        expiresAt: entData.tier === 'Paid' ? null : entData.expires_at,
        remainingDays: entData.tier === 'Paid' ? null : remainingDays,
        isExpired: entData.tier === 'Paid' ? false : isExpired,
        grantedBy: entData.granted_by,
        notes: entData.notes,
        updatedAt: entData.updated_at || wsData.updated_at,
      };
    }
  } catch (err) {
    console.warn('[WedFlow Admin] Entitlements table not available yet, using fallback:', err);
  }

  // 2b. Check if workspace has a paid order in orders table
  try {
    const { data: paidOrder, error: orderError } = await supabase
      .from('orders')
      .select('id, created_at, paid_at')
      .eq('workspace_id', workspaceId)
      .eq('status', 'paid')
      .maybeSingle();

    if (!orderError && paidOrder) {
      return {
        workspaceId: wsData.id,
        coupleName: wsData.couple_name || 'Pasangan Baru',
        weddingDate: wsData.wedding_date || null,
        tier: 'Paid',
        source: 'purchased',
        startedAt: paidOrder.paid_at || paidOrder.created_at || wsData.created_at,
        expiresAt: null,
        remainingDays: null,
        isExpired: false,
        grantedBy: 'system_order',
        notes: 'Derived from paid order record',
        updatedAt: wsData.updated_at || wsData.created_at,
      };
    }
  } catch (orderErr) {
    console.warn('[WedFlow Admin] Notice checking orders for entitlement:', orderErr);
  }

  // 3. Fallback derivation
  const config = await fetchAccessConfig();
  const derivedAccess = deriveCustomerAccessDetail(wsData.created_at, config, null, now);

  return {
    workspaceId: wsData.id,
    coupleName: wsData.couple_name || 'Pasangan Baru',
    weddingDate: wsData.wedding_date || null,
    tier: derivedAccess.tier,
    source: 'trial',
    startedAt: derivedAccess.startDate,
    expiresAt: derivedAccess.tier === 'Paid' ? null : derivedAccess.endDate,
    remainingDays: derivedAccess.tier === 'Paid' ? null : derivedAccess.remainingDays,
    isExpired: derivedAccess.tier === 'Paid' ? false : derivedAccess.isExpired,
    grantedBy: null,
    notes: null,
    updatedAt: wsData.updated_at || wsData.created_at,
  };
}

/**
 * Fetches the audit history logs for a workspace.
 */
export async function fetchCustomerAccessHistory(
  workspaceId: string
): Promise<CustomerAccessHistoryItem[]> {
  if (!workspaceId) return [];

  try {
    const { data, error } = await supabase
      .from('customer_access_history')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[WedFlow Admin] Access history fetch notice:', error.message);
      return [];
    }

    return (data || []).map((item) => ({
      id: item.id,
      workspaceId: item.workspace_id,
      eventType: item.event_type,
      source: item.source || 'admin',
      actorId: item.actor_id,
      metadata: item.metadata || {},
      createdAt: item.created_at,
    }));
  } catch (err) {
    console.warn('[WedFlow Admin] Error loading access history:', err);
    return [];
  }
}

/**
 * Extends the trial for a customer by a given number of days.
 * Records the change in customer_access_entitlements and customer_access_history.
 */
export async function extendCustomerTrialInDb(
  workspaceId: string,
  payload: ExtendTrialPayload
): Promise<CustomerEntitlement> {
  const now = new Date();
  const current = await fetchCustomerEntitlement(workspaceId);
  const previousExpiresAt = current?.expiresAt || null;

  const newExpiresAt = calculateExtendedExpiryDate(previousExpiresAt, payload.daysToAdd, now);

  const entitlementPayload = {
    workspace_id: workspaceId,
    tier: 'Trial',
    source: 'trial',
    started_at: current?.startedAt || now.toISOString(),
    expires_at: newExpiresAt,
    granted_by: payload.actorId || 'admin',
    notes: payload.reason || null,
    updated_at: now.toISOString(),
  };

  // Upsert entitlement
  const { error: entError } = await supabase
    .from('customer_access_entitlements')
    .upsert(entitlementPayload, { onConflict: 'workspace_id' });

  if (entError) {
    console.error('[WedFlow Admin] Failed to save customer entitlement:', entError);
    throw new Error(entError.message || 'Gagal menyimpan perpanjangan trial.');
  }

  // Insert history audit log
  const historyPayload = {
    workspace_id: workspaceId,
    event_type: 'trial_extended',
    source: 'admin',
    actor_id: payload.actorId || 'admin',
    metadata: {
      daysAdded: payload.daysToAdd,
      previousExpiresAt,
      newExpiresAt,
      reason: payload.reason || '',
    },
    created_at: now.toISOString(),
  };

  const { error: histError } = await supabase
    .from('customer_access_history')
    .insert(historyPayload);

  if (histError) {
    console.warn('[WedFlow Admin] Warning inserting access history:', histError);
  }

  const updated = await fetchCustomerEntitlement(workspaceId);
  if (!updated) {
    throw new Error('Gagal memuat entitlement setelah perpanjangan.');
  }
  return updated;
}

/**
 * Grants a complimentary Wedding Pass to a customer.
 * Records the grant in customer_access_entitlements and customer_access_history.
 */
export async function grantComplimentaryWeddingPassInDb(
  workspaceId: string,
  payload: GrantWeddingPassPayload
): Promise<CustomerEntitlement> {
  const now = new Date();
  const current = await fetchCustomerEntitlement(workspaceId);
  const config = await fetchAccessConfig();

  const expiresAt =
    payload.customExpiresAt ||
    calculateWeddingPassExpiryDate(
      current?.weddingDate || null,
      config.postWeddingGracePeriodDays,
      payload.accessDurationRule || config.accessDurationRule,
      config.maxDurationMonths,
      now
    );

  const entitlementPayload = {
    workspace_id: workspaceId,
    tier: 'Paid',
    source: 'complimentary',
    started_at: now.toISOString(),
    expires_at: expiresAt,
    granted_by: payload.actorId || 'admin',
    notes: payload.reason || 'Complimentary Wedding Pass by Admin',
    updated_at: now.toISOString(),
  };

  // Upsert entitlement
  const { error: entError } = await supabase
    .from('customer_access_entitlements')
    .upsert(entitlementPayload, { onConflict: 'workspace_id' });

  if (entError) {
    console.error('[WedFlow Admin] Failed to grant Wedding Pass in Supabase:', entError);
    throw new Error(entError.message || 'Gagal memberikan Wedding Pass.');
  }

  // Insert history audit log
  const historyPayload = {
    workspace_id: workspaceId,
    event_type: 'wedding_pass_granted_complimentary',
    source: 'admin',
    actor_id: payload.actorId || 'admin',
    metadata: {
      source: 'complimentary',
      previousTier: current?.tier || 'Trial',
      newExpiresAt: expiresAt,
      accessDurationRule: payload.accessDurationRule || config.accessDurationRule,
      reason: payload.reason || 'Complimentary Wedding Pass',
    },
    created_at: now.toISOString(),
  };

  const { error: histError } = await supabase
    .from('customer_access_history')
    .insert(historyPayload);

  if (histError) {
    console.warn('[WedFlow Admin] Warning inserting access history:', histError);
  }

  const updated = await fetchCustomerEntitlement(workspaceId);
  if (!updated) {
    throw new Error('Gagal memuat entitlement setelah pemberian Wedding Pass.');
  }
  return updated;
}

/**
 * Fetches all customer orders and associated payment info from Supabase.
 */
export async function fetchAdminOrders(): Promise<AdminOrderSummary[]> {
  try {
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, workspace_id, product_type, product_name, amount, currency, status, created_at, updated_at, paid_at, metadata')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.warn('[WedFlow Admin] Notice fetching orders from Supabase:', ordersError.message);
      return [];
    }

    if (!ordersData || ordersData.length === 0) {
      return [];
    }

    // Load workspace couple names for the orders
    const workspaceIds = Array.from(new Set(ordersData.map((o) => o.workspace_id)));
    const { data: workspacesData } = await supabase
      .from('workspaces')
      .select('id, couple_name')
      .in('id', workspaceIds);

    const coupleMap = new Map<string, string>();
    (workspacesData || []).forEach((w) => {
      coupleMap.set(w.id, w.couple_name || 'Pasangan Baru');
    });

    // Load payment methods if present
    const orderIds = ordersData.map((o) => o.id);
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('order_id, payment_method, provider, provider_reference')
      .in('order_id', orderIds);

    const paymentMap = new Map<string, { paymentMethod?: string; provider?: string; providerReference?: string }>();
    (paymentsData || []).forEach((p) => {
      paymentMap.set(p.order_id, {
        paymentMethod: p.payment_method,
        provider: p.provider,
        providerReference: p.provider_reference,
      });
    });

    return ordersData.map((o) => {
      const paymentInfo = paymentMap.get(o.id) || {};
      return {
        id: o.id,
        orderNumber: o.order_number,
        workspaceId: o.workspace_id,
        coupleName: coupleMap.get(o.workspace_id) || 'Pasangan Baru',
        productType: o.product_type || 'wedding_pass',
        productName: o.product_name || 'Wedding Pass',
        amount: Number(o.amount) || 0, // Fixed price snapshot
        currency: o.currency || 'IDR',
        status: o.status || 'pending',
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        paidAt: o.paid_at,
        paymentMethod: paymentInfo.paymentMethod || null,
        provider: paymentInfo.provider || null,
        providerReference: paymentInfo.providerReference || null,
        metadata: o.metadata || {},
      };
    });
  } catch (err) {
    console.warn('[WedFlow Admin] Error in fetchAdminOrders:', err);
    return [];
  }
}

/**
 * Creates a customer order with a fixed price snapshot.
 * The price is determined authoritatively by server/platform config and is immutable.
 */
export async function createOrderInDb(
  workspaceId: string,
  product?: Partial<CommercialProduct>,
  customOrderNumber?: string
): Promise<AdminOrderSummary> {
  const now = new Date();
  const orderNumber = customOrderNumber || generateOrderNumber(now);
  const productType = product?.productType || 'wedding_pass';

  // 1. Try PostgreSQL trusted RPC create_order (calculates price from platform_configurations)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_order', {
      p_workspace_id: workspaceId,
      p_product_type: productType,
      p_custom_order_number: customOrderNumber || null,
    });

    if (!rpcError && rpcData) {
      return {
        id: rpcData.id,
        orderNumber: rpcData.order_number,
        workspaceId: rpcData.workspace_id,
        coupleName: rpcData.couple_name || 'Pasangan Baru',
        productType: rpcData.product_type,
        productName: rpcData.product_name,
        amount: Number(rpcData.amount),
        currency: rpcData.currency,
        status: rpcData.status || 'pending',
        createdAt: rpcData.created_at,
        updatedAt: rpcData.updated_at,
        metadata: rpcData.metadata || {},
      };
    }

    if (rpcError && rpcError.message && !rpcError.message.includes('function') && !rpcError.message.includes('not found')) {
      throw new Error(rpcError.message);
    }
  } catch (rpcErr: any) {
    if (rpcErr.message && !rpcErr.message.includes('rpc') && !rpcErr.message.includes('not a function')) {
      throw rpcErr;
    }
  }

  // Fallback execution (for test/mock environments where stored procedure is not active)
  // Authoritative price is fetched directly from platform configuration
  const config = await fetchAccessConfig();
  if (productType === 'wedding_pass' && !config.weddingPassEnabled) {
    throw new Error('Produk komersial Wedding Pass sedang dinonaktifkan.');
  }

  const authoritativePrice = productType === 'wedding_pass' ? config.price : (product?.price ?? config.price);
  const authoritativeCurrency = productType === 'wedding_pass' ? config.currency : (product?.currency ?? config.currency);
  const authoritativeName = product?.name || 'Wedding Pass';

  // Fetch couple name
  const { data: wsData } = await supabase
    .from('workspaces')
    .select('couple_name')
    .eq('id', workspaceId)
    .maybeSingle();

  const coupleName = wsData?.couple_name || 'Pasangan Baru';

  const orderPayload = {
    order_number: orderNumber,
    workspace_id: workspaceId,
    product_type: productType,
    product_name: authoritativeName,
    amount: authoritativePrice, // IMMUTABLE AUTHORITATIVE PRICE SNAPSHOT (INTEGER)
    currency: authoritativeCurrency,
    status: 'pending', // ALWAYS PENDING ON CREATION
    metadata: {
      priceSnapshot: authoritativePrice,
      currency: authoritativeCurrency,
      productName: authoritativeName,
      accessDurationRule: config.accessDurationRule,
      maxDurationMonths: config.maxDurationMonths,
    },
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  // Supersede any existing pending orders for this workspace and product before inserting
  try {
    await supabase
      .from('orders')
      .update({
        status: 'expired',
        updated_at: now.toISOString(),
        metadata: {
          expired_reason: 'superseded_by_new_order',
          superseded_at: now.toISOString(),
        },
      })
      .eq('workspace_id', workspaceId)
      .eq('product_type', productType)
      .eq('status', 'pending');
  } catch (expireErr) {
    console.warn('[WedFlow Admin] Warning expiring previous pending orders:', expireErr);
  }

  const { data: insertedOrder, error: insertError } = await supabase
    .from('orders')
    .insert(orderPayload)
    .select('*')
    .single();

  if (insertError || !insertedOrder) {
    console.error('[WedFlow Admin] Failed to create order in Supabase:', insertError);
    throw new Error(insertError?.message || 'Gagal membuat pesanan.');
  }

  return {
    id: insertedOrder.id,
    orderNumber: insertedOrder.order_number,
    workspaceId: insertedOrder.workspace_id,
    coupleName,
    productType: insertedOrder.product_type,
    productName: insertedOrder.product_name,
    amount: Number(insertedOrder.amount),
    currency: insertedOrder.currency,
    status: insertedOrder.status,
    createdAt: insertedOrder.created_at,
    updatedAt: insertedOrder.updated_at,
    paidAt: insertedOrder.paid_at,
    metadata: insertedOrder.metadata || {},
  };
}

/**
 * Completes a paid order atomically and activates the customer's entitlement.
 * Executes inside PostgreSQL transaction boundary via `complete_paid_order` RPC
 * with row-level locking, amount/currency validation, and rollback guarantees.
 */
export async function completePaidOrderInDb(
  orderId: string,
  paymentData: Partial<AdminPaymentSummary> = {}
): Promise<AdminOrderSummary> {
  const now = new Date();

  // 1. Fetch current order to validate state and amount before execution
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError || !orderData) {
    throw new Error(orderError?.message || 'Pesanan tidak ditemukan.');
  }

  // 2. Strict Status Validation: only 'pending' orders can be transitioned to 'paid'
  // Idempotency: if already 'paid', return existing order safely
  if (orderData.status === 'paid') {
    return {
      id: orderData.id,
      orderNumber: orderData.order_number,
      workspaceId: orderData.workspace_id,
      coupleName: 'Pasangan',
      productType: orderData.product_type,
      productName: orderData.product_name,
      amount: Number(orderData.amount),
      currency: orderData.currency,
      status: 'paid',
      createdAt: orderData.created_at,
      updatedAt: orderData.updated_at,
      paidAt: orderData.paid_at,
      metadata: orderData.metadata || {},
    };
  }

  if (orderData.status !== 'pending') {
    throw new Error(`Pesanan tidak dapat diselesaikan karena status saat ini: ${orderData.status}.`);
  }

  // 3. Validate Payment Amount & Currency Integrity (Anti-Fraud / Anti-Mismatch)
  if (
    paymentData.amount !== undefined &&
    paymentData.amount !== null &&
    Number(paymentData.amount) !== Number(orderData.amount)
  ) {
    throw new Error(
      `Jumlah pembayaran tidak sesuai: tagihan Rp${Number(orderData.amount).toLocaleString('id-ID')}, diterima Rp${Number(paymentData.amount).toLocaleString('id-ID')}.`
    );
  }

  if (
    paymentData.currency !== undefined &&
    paymentData.currency !== null &&
    paymentData.currency.trim().toUpperCase() !== orderData.currency.trim().toUpperCase()
  ) {
    throw new Error(
      `Mata uang pembayaran tidak sesuai: tagihan ${orderData.currency}, diterima ${paymentData.currency}.`
    );
  }

  // 4. Try PostgreSQL Atomic Transaction RPC Function
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('complete_paid_order', {
      p_order_id: orderId,
      p_amount: paymentData.amount || orderData.amount,
      p_currency: paymentData.currency || orderData.currency,
      p_payment_method: paymentData.paymentMethod || 'qris',
      p_provider: paymentData.provider || 'manual_gateway',
      p_provider_reference: paymentData.providerReference || `ref-${orderData.order_number}`,
      p_payment_metadata: paymentData.metadata || {},
    });

    if (!rpcError && rpcData) {
      return {
        id: rpcData.id,
        orderNumber: rpcData.order_number,
        workspaceId: rpcData.workspace_id,
        coupleName: rpcData.couple_name || 'Pasangan Baru',
        productType: rpcData.product_type,
        productName: rpcData.product_name,
        amount: Number(rpcData.amount),
        currency: rpcData.currency,
        status: rpcData.status,
        createdAt: rpcData.created_at,
        updatedAt: rpcData.updated_at,
        paidAt: rpcData.paid_at,
        paymentMethod: rpcData.payment_method || null,
        provider: rpcData.provider || null,
        metadata: rpcData.metadata || {},
      };
    }

    if (rpcError && rpcError.message && !rpcError.message.includes('function') && !rpcError.message.includes('not found')) {
      // Direct business error from stored procedure
      throw new Error(rpcError.message);
    }
  } catch (rpcErr: any) {
    if (rpcErr.message && !rpcErr.message.includes('rpc') && !rpcErr.message.includes('not a function')) {
      throw rpcErr;
    }
  }

  // Fallback sequential execution (for environments where stored function is being applied or mocked)
  const { data: updatedOrder, error: updateOrderError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      paid_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (updateOrderError || !updatedOrder) {
    throw new Error(updateOrderError?.message || 'Gagal memperbarui status pesanan.');
  }

  const paymentPayload = {
    order_id: orderId,
    amount: updatedOrder.amount,
    currency: updatedOrder.currency,
    status: 'paid',
    payment_method: paymentData.paymentMethod || 'qris',
    provider: paymentData.provider || 'manual_gateway',
    provider_reference: paymentData.providerReference || `ref-${orderData.order_number}`,
    metadata: paymentData.metadata || {},
    created_at: now.toISOString(),
    paid_at: now.toISOString(),
  };

  await supabase.from('payments').insert(paymentPayload);

  const config = await fetchAccessConfig();
  const { data: wsData } = await supabase
    .from('workspaces')
    .select('couple_name, wedding_date')
    .eq('id', updatedOrder.workspace_id)
    .maybeSingle();

  const expiresAt = calculateWeddingPassExpiryDate(
    wsData?.wedding_date || null,
    config.postWeddingGracePeriodDays,
    config.accessDurationRule,
    config.maxDurationMonths,
    now
  );

  const entitlementPayload = {
    workspace_id: updatedOrder.workspace_id,
    tier: 'Paid',
    source: 'purchased',
    started_at: now.toISOString(),
    expires_at: expiresAt,
    granted_by: 'system_order',
    notes: `Purchased via order ${updatedOrder.order_number}`,
    updated_at: now.toISOString(),
  };

  await supabase
    .from('customer_access_entitlements')
    .upsert(entitlementPayload, { onConflict: 'workspace_id' });

  const historyPayload = {
    workspace_id: updatedOrder.workspace_id,
    event_type: 'wedding_pass_purchased',
    source: 'customer',
    actor_id: paymentData.provider || 'payment_gateway',
    metadata: {
      source: 'purchased',
      orderNumber: updatedOrder.order_number,
      amount: updatedOrder.amount,
      currency: updatedOrder.currency,
      newExpiresAt: expiresAt,
      paymentMethod: paymentData.paymentMethod || 'qris',
    },
    created_at: now.toISOString(),
  };

  await supabase
    .from('customer_access_history')
    .insert(historyPayload);

  return {
    id: updatedOrder.id,
    orderNumber: updatedOrder.order_number,
    workspaceId: updatedOrder.workspace_id,
    coupleName: wsData?.couple_name || 'Pasangan Baru',
    productType: updatedOrder.product_type,
    productName: updatedOrder.product_name,
    amount: Number(updatedOrder.amount),
    currency: updatedOrder.currency,
    status: 'paid',
    createdAt: updatedOrder.created_at,
    updatedAt: updatedOrder.updated_at,
    paidAt: updatedOrder.paid_at,
    paymentMethod: paymentData.paymentMethod || null,
    provider: paymentData.provider || null,
    metadata: updatedOrder.metadata || {},
  };
}

/**
 * Fetches comprehensive order and transaction details for the Admin inspection drawer.
 */
export async function fetchAdminOrderDetail(
  orderId: string
): Promise<AdminOrderDetail | null> {
  try {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, workspace_id, product_type, product_name, amount, currency, status, created_at, updated_at, paid_at, metadata')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !orderData) {
      console.warn('[WedFlow Admin] Order not found for detail:', orderId);
      return null;
    }

    // 1. Fetch workspace details (couple_name, wedding_date, user_id)
    const { data: wsData } = await supabase
      .from('workspaces')
      .select('id, couple_name, wedding_date, user_id')
      .eq('id', orderData.workspace_id)
      .maybeSingle();

    // 2. Fetch customer user email if available
    let customerEmail: string | null = null;
    if (wsData?.user_id) {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', wsData.user_id)
          .maybeSingle();
        if (profileData?.email) {
          customerEmail = profileData.email;
        }
      } catch {
        // Fallback
      }
    }

    if (!customerEmail && orderData.metadata?.customerEmail) {
      customerEmail = orderData.metadata.customerEmail;
    }

    // 3. Fetch payment record
    const { data: paymentData } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. Fetch customer entitlement
    const { data: entData } = await supabase
      .from('customer_access_entitlements')
      .select('*')
      .eq('workspace_id', orderData.workspace_id)
      .maybeSingle();

    // 5. Fetch recent access history for this workspace
    const { data: historyData } = await supabase
      .from('customer_access_history')
      .select('*')
      .eq('workspace_id', orderData.workspace_id)
      .order('created_at', { ascending: false })
      .limit(5);

    const rawPayment: AdminPaymentSummary | null = paymentData
      ? {
          id: paymentData.id,
          orderId: paymentData.order_id,
          amount: Number(paymentData.amount) || Number(orderData.amount),
          currency: paymentData.currency || orderData.currency,
          status: paymentData.status as any,
          paymentMethod: paymentData.payment_method || null,
          provider: paymentData.provider || null,
          providerReference: paymentData.provider_reference || null,
          createdAt: paymentData.created_at,
          paidAt: paymentData.paid_at || null,
          metadata: paymentData.metadata || {},
        }
      : null;

    const entitlementInfo = entData
      ? {
          tier: entData.tier as any,
          source: entData.source as any,
          expiresAt: entData.tier === 'Paid' ? null : entData.expires_at,
          isExpired: entData.tier === 'Expired' || (entData.expires_at && new Date(entData.expires_at).getTime() < Date.now()),
          notes: entData.notes || null,
        }
      : null;

    return {
      id: orderData.id,
      orderNumber: orderData.order_number,
      workspaceId: orderData.workspace_id,
      coupleName: wsData?.couple_name || 'Pasangan Baru',
      weddingDate: wsData?.wedding_date || null,
      customerEmail,
      productType: orderData.product_type || 'wedding_pass',
      productName: orderData.product_name || 'Wedding Pass',
      amount: Number(orderData.amount) || 0,
      currency: orderData.currency || 'IDR',
      status: orderData.status || 'pending',
      createdAt: orderData.created_at,
      updatedAt: orderData.updated_at,
      paidAt: orderData.paid_at,
      paymentMethod: rawPayment?.paymentMethod || orderData.metadata?.paymentMethod || null,
      provider: rawPayment?.provider || 'midtrans',
      providerReference: rawPayment?.providerReference || orderData.metadata?.transactionId || null,
      metadata: orderData.metadata || {},
      rawPayment,
      entitlement: entitlementInfo,
      recentAccessEvents: historyData || [],
    };
  } catch (err) {
    console.error('[WedFlow Admin] Error in fetchAdminOrderDetail:', err);
    return null;
  }
}

/**
 * Atomically processes a refund / chargeback: cancels the order, marks payment refunded,
 * revokes active Wedding Pass entitlement, and records an access_revoked audit log.
 */
export async function processRefundedOrderInDb(
  orderId: string,
  payload: ProcessRefundPayload = {}
): Promise<AdminOrderSummary> {
  const now = new Date();
  const reason = payload.reason || 'Payment refunded or charged back';
  const provider = payload.provider || 'midtrans';
  const providerReference = payload.providerReference || `ref-${orderId}`;
  const metadata = payload.metadata || {};

  // Try PostgreSQL RPC
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('process_refunded_order', {
      p_order_id: orderId,
      p_provider: provider,
      p_provider_reference: providerReference,
      p_reason: reason,
      p_refund_metadata: metadata,
    });

    if (!rpcError && rpcData) {
      return {
        id: rpcData.id,
        orderNumber: rpcData.order_number,
        workspaceId: rpcData.workspace_id,
        coupleName: rpcData.couple_name || 'Pasangan Baru',
        productType: rpcData.product_type || 'wedding_pass',
        productName: rpcData.product_name || 'Wedding Pass',
        amount: Number(rpcData.amount) || 0,
        currency: rpcData.currency || 'IDR',
        status: 'cancelled',
        createdAt: rpcData.created_at || now.toISOString(),
        updatedAt: rpcData.updated_at || now.toISOString(),
        paidAt: null,
        paymentMethod: null,
        provider,
        providerReference,
        metadata: {
          refunded_at: now.toISOString(),
          refund_reason: reason,
          refund_metadata: metadata,
        },
      };
    }

    if (rpcError && rpcError.message && !rpcError.message.includes('function') && !rpcError.message.includes('not found')) {
      throw new Error(rpcError.message);
    }
  } catch (rpcErr: any) {
    if (rpcErr.message && !rpcErr.message.includes('rpc') && !rpcErr.message.includes('not a function')) {
      throw rpcErr;
    }
  }

  // Fallback sequential execution for test/mock environments
  const { data: orderData, error: orderLookupError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderLookupError || !orderData) {
    throw new Error(orderLookupError?.message || 'Pesanan tidak ditemukan.');
  }

  const { data: updatedOrder, error: updateOrderError } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      updated_at: now.toISOString(),
      metadata: {
        ...(orderData.metadata || {}),
        refunded_at: now.toISOString(),
        refund_reason: reason,
        provider,
        provider_reference: providerReference,
        refund_metadata: metadata,
      },
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (updateOrderError || !updatedOrder) {
    throw new Error(updateOrderError?.message || 'Gagal membatalkan status pesanan.');
  }

  // Update payment to refunded
  await supabase
    .from('payments')
    .update({
      status: 'refunded',
      metadata: {
        refunded_at: now.toISOString(),
        refund_reason: reason,
        refund_metadata: metadata,
      },
    })
    .eq('order_id', orderId);

  // Revoke entitlement
  await supabase
    .from('customer_access_entitlements')
    .upsert({
      workspace_id: updatedOrder.workspace_id,
      tier: 'Expired',
      expires_at: now.toISOString(),
      notes: `Access revoked due to payment refund for order ${updatedOrder.order_number}`,
      updated_at: now.toISOString(),
    }, { onConflict: 'workspace_id' });

  // Insert access history
  await supabase
    .from('customer_access_history')
    .insert({
      workspace_id: updatedOrder.workspace_id,
      event_type: 'access_revoked',
      source: 'payment_gateway',
      actor_id: provider,
      metadata: {
        reason,
        orderNumber: updatedOrder.order_number,
        orderId: updatedOrder.id,
        amount: updatedOrder.amount,
        currency: updatedOrder.currency,
        provider,
        providerReference,
        refundedAt: now.toISOString(),
      },
      created_at: now.toISOString(),
    });

  return {
    id: updatedOrder.id,
    orderNumber: updatedOrder.order_number,
    workspaceId: updatedOrder.workspace_id,
    coupleName: 'Pasangan Baru',
    productType: updatedOrder.product_type,
    productName: updatedOrder.product_name,
    amount: Number(updatedOrder.amount),
    currency: updatedOrder.currency,
    status: 'cancelled',
    createdAt: updatedOrder.created_at,
    updatedAt: updatedOrder.updated_at,
    paidAt: null,
    provider,
    providerReference,
    metadata: updatedOrder.metadata || {},
  };
}

/**
 * Fetches paginated orders with server-side / domain filtering.
 */
export async function fetchPaginatedAdminOrders(
  filtersOrPagination?: AdminPaymentsFilterState | AdminPaginationParams,
  optionalPagination?: AdminPaginationParams
): Promise<PaginatedAdminOrders> {
  let filters: AdminPaymentsFilterState = { search: '', status: 'all', dateRange: 'all' };
  let pagination: AdminPaginationParams = { page: 1, pageSize: 25 };

  if (filtersOrPagination) {
    if ('page' in filtersOrPagination && typeof (filtersOrPagination as any).page === 'number') {
      pagination = filtersOrPagination as AdminPaginationParams;
      if (optionalPagination && ('search' in optionalPagination || 'status' in optionalPagination)) {
        filters = optionalPagination as any;
      }
    } else {
      filters = filtersOrPagination as AdminPaymentsFilterState;
      if (optionalPagination) {
        pagination = optionalPagination;
      }
    }
  }

  const allOrders = await fetchAdminOrders();
  const filtered = filterOrders(allOrders, filters);
  return paginateOrders(filtered, pagination.page, pagination.pageSize);
}

/**
 * Performs an authorized administrative payment override/recovery for an order
 * to transition it directly to Paid, create an internal manual_admin payment record,
 * and grant an unlimited Wedding Pass without falsifying Midtrans payment confirmation.
 */
export async function adminMarkOrderPaidInDb(
  orderIdOrPayload: string | AdminMarkPaidPayload,
  optionalPayload?: Partial<AdminMarkPaidPayload> & { adminId?: string }
): Promise<AdminOrderSummary> {
  const payload: AdminMarkPaidPayload = typeof orderIdOrPayload === 'string'
    ? {
        orderId: orderIdOrPayload,
        reason: optionalPayload?.reason || '',
        adminNotes: optionalPayload?.adminNotes,
        actorId: optionalPayload?.actorId || optionalPayload?.adminId || 'admin',
      }
    : orderIdOrPayload;

  const orderId = payload.orderId;
  const reason = (payload.reason || '').trim();
  const adminNotes = payload.adminNotes;
  const actorId = payload.actorId || (payload as any).adminId || 'admin';
  const now = new Date();

  if (!reason) {
    throw new Error('Alasan intervensi administratif wajib diisi.');
  }

  // 1. Try PostgreSQL Atomic RPC
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_mark_order_paid', {
      p_order_id: orderId,
      p_reason: reason,
      p_admin_notes: adminNotes || null,
      p_actor_id: actorId,
    });

    if (!rpcError && rpcData) {
      return {
        id: rpcData.id,
        orderNumber: rpcData.order_number,
        workspaceId: rpcData.workspace_id,
        coupleName: rpcData.couple_name || 'Pasangan Baru',
        productType: rpcData.product_type || 'wedding_pass',
        productName: rpcData.product_name || 'Wedding Pass',
        amount: Number(rpcData.amount) || 0,
        currency: rpcData.currency || 'IDR',
        status: 'paid',
        createdAt: rpcData.created_at || now.toISOString(),
        updatedAt: rpcData.updated_at || now.toISOString(),
        paidAt: rpcData.paid_at || now.toISOString(),
        paymentMethod: 'manual_admin',
        provider: 'manual_admin',
        providerReference: `admin-manual-${rpcData.order_number}`,
        metadata: rpcData.metadata || {},
      };
    }

    if (rpcError && rpcError.message && !rpcError.message.includes('function') && !rpcError.message.includes('not found')) {
      throw new Error(rpcError.message);
    }
  } catch (rpcErr: any) {
    if (rpcErr.message && !rpcErr.message.includes('rpc') && !rpcErr.message.includes('not a function')) {
      throw rpcErr;
    }
  }

  // 2. Sequential fallback for test / mock environments
  const { data: orderData, error: lookupErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (lookupErr || !orderData) {
    throw new Error(lookupErr?.message || 'Pesanan tidak ditemukan.');
  }

  if (orderData.status === 'cancelled' && orderData.metadata?.refunded_at) {
    throw new Error('Pesanan yang telah direfund/chargeback tidak dapat diubah menjadi Paid.');
  }

  if (orderData.status !== 'pending' && orderData.status !== 'paid') {
    throw new Error('Hanya pesanan berstatus pending yang dapat diubah menjadi paid.');
  }

  if (orderData.status === 'paid') {
    return {
      id: orderData.id,
      orderNumber: orderData.order_number,
      workspaceId: orderData.workspace_id,
      coupleName: 'Pasangan Baru',
      productType: orderData.product_type,
      productName: orderData.product_name,
      amount: Number(orderData.amount),
      currency: orderData.currency,
      status: 'paid',
      createdAt: orderData.created_at,
      updatedAt: orderData.updated_at,
      paidAt: orderData.paid_at,
      metadata: orderData.metadata || {},
    };
  }

  const { data: updatedOrder, error: updateErr } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      paid_at: now.toISOString(),
      updated_at: now.toISOString(),
      metadata: {
        ...(orderData.metadata || {}),
        admin_intervention: true,
        intervention_type: 'manual_mark_paid',
        admin_actor_id: actorId,
        admin_reason: reason,
        admin_notes: adminNotes,
        intervened_at: now.toISOString(),
      },
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (updateErr || !updatedOrder) {
    throw new Error(updateErr?.message || 'Gagal memperbarui status pesanan.');
  }

  // Record payment
  await supabase
    .from('payments')
    .insert({
      order_id: orderId,
      amount: updatedOrder.amount,
      currency: updatedOrder.currency,
      status: 'paid',
      payment_method: 'manual_admin',
      provider: 'manual_admin',
      provider_reference: `admin-manual-${updatedOrder.order_number}`,
      metadata: {
        admin_intervention: true,
        admin_actor_id: actorId,
        admin_reason: reason,
        admin_notes: adminNotes,
        intervened_at: now.toISOString(),
      },
      created_at: now.toISOString(),
      paid_at: now.toISOString(),
    });

  // Grant unlimited Wedding Pass
  await supabase
    .from('customer_access_entitlements')
    .upsert({
      workspace_id: updatedOrder.workspace_id,
      tier: 'Paid',
      source: 'manual_admin',
      expires_at: null,
      notes: `Akses Wedding Pass diaktifkan via intervensi admin manual: ${reason}`,
      updated_at: now.toISOString(),
    }, { onConflict: 'workspace_id' });

  // Record audit history
  await supabase
    .from('customer_access_history')
    .insert({
      workspace_id: updatedOrder.workspace_id,
      event_type: 'wedding_pass_granted_admin',
      source: 'admin_manual',
      actor_id: actorId,
      metadata: {
        action: 'admin_manual_mark_paid',
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.order_number,
        amount: updatedOrder.amount,
        currency: updatedOrder.currency,
        newTier: 'Paid',
        newExpiresAt: null,
        reason,
        adminNotes,
        intervenedAt: now.toISOString(),
      },
      created_at: now.toISOString(),
    });

  return {
    id: updatedOrder.id,
    orderNumber: updatedOrder.order_number,
    workspaceId: updatedOrder.workspace_id,
    coupleName: 'Pasangan Baru',
    productType: updatedOrder.product_type,
    productName: updatedOrder.product_name,
    amount: Number(updatedOrder.amount),
    currency: updatedOrder.currency,
    status: 'paid',
    createdAt: updatedOrder.created_at,
    updatedAt: updatedOrder.updated_at,
    paidAt: updatedOrder.paid_at,
    paymentMethod: 'manual_admin',
    provider: 'manual_admin',
    providerReference: `admin-manual-${updatedOrder.order_number}`,
    metadata: updatedOrder.metadata || {},
  };
}

/**
 * Performs an authorized administrative cancellation of a pending or eligible order.
 */
export async function adminCancelOrderInDb(
  orderIdOrPayload: string | AdminCancelOrderPayload,
  optionalPayload?: Partial<AdminCancelOrderPayload> & { adminId?: string }
): Promise<AdminOrderSummary> {
  const payload: AdminCancelOrderPayload = typeof orderIdOrPayload === 'string'
    ? {
        orderId: orderIdOrPayload,
        reason: optionalPayload?.reason || '',
        actorId: optionalPayload?.actorId || optionalPayload?.adminId || 'admin',
      }
    : orderIdOrPayload;

  const orderId = payload.orderId;
  const reason = (payload.reason || '').trim();
  const actorId = payload.actorId || (payload as any).adminId || 'admin';
  const now = new Date();

  if (!reason) {
    throw new Error('Alasan pembatalan pesanan wajib diisi.');
  }

  // 1. Try PostgreSQL Atomic RPC
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_cancel_order', {
      p_order_id: orderId,
      p_reason: reason,
      p_actor_id: actorId,
    });

    if (!rpcError && rpcData) {
      return {
        id: rpcData.id,
        orderNumber: rpcData.order_number,
        workspaceId: rpcData.workspace_id,
        coupleName: rpcData.couple_name || 'Pasangan Baru',
        productType: rpcData.product_type || 'wedding_pass',
        productName: rpcData.product_name || 'Wedding Pass',
        amount: Number(rpcData.amount) || 0,
        currency: rpcData.currency || 'IDR',
        status: 'cancelled',
        createdAt: rpcData.created_at || now.toISOString(),
        updatedAt: rpcData.updated_at || now.toISOString(),
        paidAt: null,
        metadata: rpcData.metadata || {},
      };
    }

    if (rpcError && rpcError.message && !rpcError.message.includes('function') && !rpcError.message.includes('not found')) {
      throw new Error(rpcError.message);
    }
  } catch (rpcErr: any) {
    if (rpcErr.message && !rpcErr.message.includes('rpc') && !rpcErr.message.includes('not a function')) {
      throw rpcErr;
    }
  }

  // 2. Sequential fallback for test / mock environments
  const { data: orderData, error: lookupErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (lookupErr || !orderData) {
    throw new Error(lookupErr?.message || 'Pesanan tidak ditemukan.');
  }

  if (orderData.status === 'paid') {
    throw new Error('Pesanan yang telah berstatus Paid tidak dapat dibatalkan melalui aksi cancel biasa. Gunakan proses refund.');
  }

  if (orderData.status !== 'pending' && orderData.status !== 'cancelled') {
    throw new Error('Hanya pesanan berstatus pending yang dapat dibatalkan.');
  }

  if (orderData.status === 'cancelled') {
    return {
      id: orderData.id,
      orderNumber: orderData.order_number,
      workspaceId: orderData.workspace_id,
      coupleName: 'Pasangan Baru',
      productType: orderData.product_type,
      productName: orderData.product_name,
      amount: Number(orderData.amount),
      currency: orderData.currency,
      status: 'cancelled',
      createdAt: orderData.created_at,
      updatedAt: orderData.updated_at,
      paidAt: null,
      metadata: orderData.metadata || {},
    };
  }

  const { data: updatedOrder, error: updateErr } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      updated_at: now.toISOString(),
      metadata: {
        ...(orderData.metadata || {}),
        admin_cancellation: true,
        cancelled_by: actorId,
        cancellation_reason: reason,
        cancelled_at: now.toISOString(),
      },
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (updateErr || !updatedOrder) {
    throw new Error(updateErr?.message || 'Gagal membatalkan status pesanan.');
  }

  // Update pending payment if exists
  await supabase
    .from('payments')
    .update({
      status: 'failed',
      metadata: {
        cancellation_reason: reason,
        cancelled_at: now.toISOString(),
      },
    })
    .eq('order_id', orderId)
    .eq('status', 'pending');

  // Record audit history
  await supabase
    .from('customer_access_history')
    .insert({
      workspace_id: updatedOrder.workspace_id,
      event_type: 'admin_override',
      source: 'admin_manual',
      actor_id: actorId,
      metadata: {
        action: 'admin_cancel_order',
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.order_number,
        reason,
        cancelledAt: now.toISOString(),
      },
      created_at: now.toISOString(),
    });

  return {
    id: updatedOrder.id,
    orderNumber: updatedOrder.order_number,
    workspaceId: updatedOrder.workspace_id,
    coupleName: 'Pasangan Baru',
    productType: updatedOrder.product_type,
    productName: updatedOrder.product_name,
    amount: Number(updatedOrder.amount),
    currency: updatedOrder.currency,
    status: 'cancelled',
    createdAt: updatedOrder.created_at,
    updatedAt: updatedOrder.updated_at,
    paidAt: null,
    metadata: updatedOrder.metadata || {},
  };
}

/**
 * Actively syncs an order's payment status with Midtrans via server-side Edge Function.
 */
export async function syncAdminPaymentStatus(
  orderIdentifier: string
): Promise<{ success: boolean; message: string; order?: AdminOrderSummary }> {
  try {
    const { data: orderData, error: lookupErr } = await supabase
      .from('orders')
      .select('*')
      .or(`id.eq.${orderIdentifier},order_number.eq.${orderIdentifier}`)
      .maybeSingle();

    if (lookupErr || !orderData) {
      return { success: false, message: 'Pesanan tidak ditemukan.' };
    }

    const { data, error } = await supabase.functions.invoke('midtrans-sync', {
      body: { orderNumber: orderData.order_number },
    });

    if (error) {
      return { success: false, message: error.message || 'Gagal menyelaraskan status dengan Midtrans.' };
    }

    return {
      success: true,
      message: 'Status Midtrans berhasil disinkronkan.',
      order: data?.order || orderData,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Terjadi kesalahan saat menyelaraskan status Midtrans.',
    };
  }
}

const PAYMENT_SETTINGS_CONFIG_KEY = 'payment_settings';

/**
 * Fetches authoritative payment settings configuration from database.
 */
export async function fetchPaymentSettingsFromDb(): Promise<PaymentSettingsConfig> {
  try {
    const { data, error } = await supabase
      .from('platform_configurations')
      .select('value, updated_at')
      .eq('key', PAYMENT_SETTINGS_CONFIG_KEY)
      .maybeSingle();

    if (error || !data || !data.value) {
      return DEFAULT_PAYMENT_SETTINGS_CONFIG;
    }

    return {
      ...DEFAULT_PAYMENT_SETTINGS_CONFIG,
      ...(data.value as Partial<PaymentSettingsConfig>),
      updated_at: data.updated_at,
    };
  } catch (err: any) {
    console.warn('[WedFlow Admin] Notice fetching payment settings, using default:', err);
    return DEFAULT_PAYMENT_SETTINGS_CONFIG;
  }
}

/**
 * Persists payment settings configuration strictly via admin-authorized RPC.
 * Direct table mutation fallbacks are prohibited to enforce role authorization.
 */
export async function savePaymentSettingsInDb(
  settings: PaymentSettingsConfig,
  actorId: string = 'admin'
): Promise<PaymentSettingsConfig> {
  const now = new Date().toISOString();

  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_update_payment_settings', {
    p_settings: settings,
    p_actor_id: actorId,
  });

  if (rpcError) {
    console.error('[WedFlow Admin] Failed to save payment settings via RPC:', rpcError);
    throw new Error(rpcError.message || 'Otorisasi ditolak: Gagal memperbarui konfigurasi pembayaran.');
  }

  if (!rpcData) {
    throw new Error('Respon tidak valid dari fungsi pembaruan pengaturan pembayaran.');
  }

  return {
    ...DEFAULT_PAYMENT_SETTINGS_CONFIG,
    ...(rpcData as Partial<PaymentSettingsConfig>),
    updated_at: now,
  };
}

/**
 * Approves a manual payment atomically via PostgreSQL RPC.
 * Activates customer access entitlement and records audit history.
 */
export async function approveManualPaymentInDb(
  payload: ApproveManualPaymentPayload
): Promise<AdminOrderSummary> {
  const orderId = payload.orderId;
  const adminNotes = payload.adminNotes;
  const actorId = payload.actorId || 'admin';
  const now = new Date();

  // 1. Try PostgreSQL RPC
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('approve_manual_payment', {
      p_order_id: orderId,
      p_admin_notes: adminNotes || null,
      p_actor_id: actorId,
    });

    if (!rpcError && rpcData) {
      return {
        id: rpcData.id,
        orderNumber: rpcData.order_number,
        workspaceId: rpcData.workspace_id,
        coupleName: rpcData.couple_name || 'Pasangan Baru',
        productType: rpcData.product_type || 'wedding_pass',
        productName: rpcData.product_name || 'Wedding Pass',
        amount: Number(rpcData.amount) || 0,
        currency: rpcData.currency || 'IDR',
        status: 'paid',
        createdAt: rpcData.created_at || now.toISOString(),
        updatedAt: rpcData.updated_at || now.toISOString(),
        paidAt: rpcData.paid_at || now.toISOString(),
        paymentMethod: 'manual',
        provider: 'manual_whatsapp',
        metadata: rpcData.metadata || {},
      };
    }

    if (rpcError && rpcError.message && !rpcError.message.includes('function') && !rpcError.message.includes('not found')) {
      throw new Error(rpcError.message);
    }
  } catch (rpcErr: any) {
    if (rpcErr.message && !rpcErr.message.includes('rpc') && !rpcErr.message.includes('not a function')) {
      throw rpcErr;
    }
  }

  // 2. Sequential fallback for mock/test environments
  return await completePaidOrderInDb(orderId, {
    paymentMethod: 'manual',
    provider: 'manual_whatsapp',
    providerReference: `manual-${orderId}`,
    metadata: {
      approved_by: actorId,
      approved_at: now.toISOString(),
      admin_notes: adminNotes,
      manual_payment_status: 'approved',
    },
  });
}

/**
 * Rejects a manual payment atomically via PostgreSQL RPC.
 */
export async function rejectManualPaymentInDb(
  payload: RejectManualPaymentPayload
): Promise<AdminOrderSummary> {
  const orderId = payload.orderId;
  const reason = (payload.reason || '').trim();
  const adminNotes = payload.adminNotes;
  const actorId = payload.actorId || 'admin';
  const now = new Date();

  if (!reason) {
    throw new Error('Alasan penolakan pembayaran wajib diisi.');
  }

  // 1. Try PostgreSQL RPC
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('reject_manual_payment', {
      p_order_id: orderId,
      p_reason: reason,
      p_admin_notes: adminNotes || null,
      p_actor_id: actorId,
    });

    if (!rpcError && rpcData) {
      return {
        id: rpcData.id,
        orderNumber: rpcData.order_number,
        workspaceId: rpcData.workspace_id,
        coupleName: rpcData.couple_name || 'Pasangan Baru',
        productType: rpcData.product_type || 'wedding_pass',
        productName: rpcData.product_name || 'Wedding Pass',
        amount: Number(rpcData.amount) || 0,
        currency: rpcData.currency || 'IDR',
        status: rpcData.status || 'pending',
        createdAt: rpcData.created_at || now.toISOString(),
        updatedAt: rpcData.updated_at || now.toISOString(),
        paidAt: null,
        metadata: rpcData.metadata || {},
      };
    }

    if (rpcError && rpcError.message && !rpcError.message.includes('function') && !rpcError.message.includes('not found')) {
      throw new Error(rpcError.message);
    }
  } catch (rpcErr: any) {
    if (rpcErr.message && !rpcErr.message.includes('rpc') && !rpcErr.message.includes('not a function')) {
      throw rpcErr;
    }
  }

  // 2. Sequential fallback for mock/test environments
  const { data: orderData, error: lookupErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (lookupErr || !orderData) {
    throw new Error(lookupErr?.message || 'Pesanan tidak ditemukan.');
  }

  if (orderData.status === 'paid') {
    throw new Error('Pesanan yang telah berstatus Paid tidak dapat ditolak.');
  }

  const { data: updatedOrder, error: updateErr } = await supabase
    .from('orders')
    .update({
      updated_at: now.toISOString(),
      metadata: {
        ...(orderData.metadata || {}),
        manual_payment_status: 'rejected',
        rejection_reason: reason,
        rejected_at: now.toISOString(),
        rejected_by: actorId,
        admin_notes: adminNotes,
      },
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (updateErr || !updatedOrder) {
    throw new Error(updateErr?.message || 'Gagal memperbarui status penolakan pesanan.');
  }

  await supabase
    .from('payments')
    .update({
      status: 'failed',
      metadata: {
        rejection_reason: reason,
        rejected_at: now.toISOString(),
        rejected_by: actorId,
        admin_notes: adminNotes,
      },
    })
    .eq('order_id', orderId)
    .eq('payment_method', 'manual');

  return {
    id: updatedOrder.id,
    orderNumber: updatedOrder.order_number,
    workspaceId: updatedOrder.workspace_id,
    coupleName: 'Pasangan Baru',
    productType: updatedOrder.product_type,
    productName: updatedOrder.product_name,
    amount: Number(updatedOrder.amount),
    currency: updatedOrder.currency,
    status: updatedOrder.status,
    createdAt: updatedOrder.created_at,
    updatedAt: updatedOrder.updated_at,
    paidAt: null,
    metadata: updatedOrder.metadata || {},
  };
}

/**
 * Fetches manual payment approval items for Admin.
 */
export async function fetchManualPaymentApprovalsFromDb(
  filters?: ManualPaymentApprovalsFilterState
): Promise<ManualPaymentApprovalItem[]> {
  try {
    const orders = await fetchAdminOrders();

    // Filter to only orders that have manual payment attempts or manual payment status
    const manualOrders = orders.filter((o) => {
      const isManualMethod =
        o.paymentMethod === 'manual' ||
        o.provider === 'manual_whatsapp' ||
        o.metadata?.paymentMethod === 'manual' ||
        o.metadata?.manual_payment_status !== undefined ||
        o.metadata?.manualPayment !== undefined;

      const hasManualAttempt = Array.isArray(o.metadata?.paymentAttempts) &&
        o.metadata.paymentAttempts.some((att: any) => att.paymentMethod === 'manual' || att.provider === 'manual_whatsapp');

      return isManualMethod || hasManualAttempt;
    });

    const items: ManualPaymentApprovalItem[] = manualOrders.map((o) => {
      const meta = o.metadata || {};
      let manualStatus: 'awaiting_approval' | 'approved' | 'rejected' | 'pending' = 'awaiting_approval';

      if (o.status === 'paid') {
        manualStatus = 'approved';
      } else if (meta.manual_payment_status === 'rejected') {
        manualStatus = 'rejected';
      } else if (meta.manual_payment_status === 'approved') {
        manualStatus = 'approved';
      } else if (meta.manual_payment_status === 'awaiting_approval' || meta.manualPayment?.status === 'awaiting_approval') {
        manualStatus = 'awaiting_approval';
      }

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        workspaceId: o.workspaceId,
        coupleName: o.coupleName,
        customerEmail: meta.customerEmail || null,
        productType: o.productType,
        productName: o.productName,
        amount: o.amount,
        currency: o.currency,
        orderStatus: o.status,
        paymentMethod: o.paymentMethod || 'manual',
        manualPaymentStatus: manualStatus,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        paidAt: o.paidAt,
        rejectionReason: meta.rejection_reason || meta.manualPayment?.rejectionReason || null,
        approvedBy: meta.approved_by || meta.manualPayment?.approvedBy || null,
        approvedAt: meta.approved_at || meta.manualPayment?.approvedAt || null,
        rejectedBy: meta.rejected_by || meta.manualPayment?.rejectedBy || null,
        rejectedAt: meta.rejected_at || meta.manualPayment?.rejectedAt || null,
        adminNotes: meta.admin_notes || null,
        whatsappNumber: meta.manualPayment?.whatsappNumber || null,
        metadata: meta,
      };
    });

    // Apply filters
    let result = items;
    if (filters) {
      if (filters.status && filters.status !== 'all') {
        result = result.filter((item) => item.manualPaymentStatus === filters.status);
      }
      if (filters.search && filters.search.trim() !== '') {
        const query = filters.search.toLowerCase().trim();
        result = result.filter(
          (item) =>
            item.orderNumber.toLowerCase().includes(query) ||
            item.coupleName.toLowerCase().includes(query) ||
            (item.customerEmail && item.customerEmail.toLowerCase().includes(query))
        );
      }
    }

    return result;
  } catch (err) {
    console.error('[WedFlow Admin] Error fetching manual payment approvals:', err);
    return [];
  }
}
