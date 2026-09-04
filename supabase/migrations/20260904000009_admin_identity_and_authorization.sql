-- Migration: Admin Identity & Authorization Foundation (P0)
-- 1. Creates public.admin_users table & is_admin(auth.uid()) helper function
-- 2. Creates public.check_current_user_is_admin() RPC for frontend state verification
-- 3. Creates public.bootstrap_admin_user() RPC for initial secure admin bootstrap
-- 4. Reconfigures RLS across all tables separating Customer Workspace isolation and Admin cross-workspace access
-- 5. Secures administrative mutation RPCs (admin_mark_order_paid, admin_cancel_order, process_refunded_order)

-- 1. Create Admin Users Table
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON public.admin_users(is_active);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 2. Authoritative is_admin Helper Function
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = COALESCE(p_user_id, auth.uid())
      AND is_active = true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO service_role;

-- 3. RPC to Check Current User Admin Status
CREATE OR REPLACE FUNCTION public.check_current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_admin(auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.check_current_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_current_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_current_user_is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.check_current_user_is_admin() TO service_role;

-- 4. Secure Admin Bootstrap Function
CREATE OR REPLACE FUNCTION public.bootstrap_admin_user(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.admin_users;
    
    -- Only allow if admin_users is empty OR caller is service_role OR caller is an active admin
    IF v_count > 0 AND auth.role() <> 'service_role' AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya admin aktif atau service_role yang dapat mendaftarkan admin baru.';
    END IF;

    INSERT INTO public.admin_users (user_id, role, is_active, created_at, updated_at)
    VALUES (p_user_id, 'admin', true, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        is_active = true,
        updated_at = NOW();

    RETURN jsonb_build_object('success', true, 'user_id', p_user_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bootstrap_admin_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_user(UUID) TO service_role;

-- 5. Admin Users RLS Policies
DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;
CREATE POLICY "Admins can view admin_users"
ON public.admin_users FOR SELECT
USING (public.is_admin(auth.uid()) OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can manage admin_users" ON public.admin_users;
CREATE POLICY "Admins can manage admin_users"
ON public.admin_users FOR ALL
USING (public.is_admin(auth.uid()) OR auth.role() = 'service_role')
WITH CHECK (public.is_admin(auth.uid()) OR auth.role() = 'service_role');

-- 6. Workspaces RLS: Customer Isolation + Admin Cross-Workspace
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Users can manage their own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Allow user workspace access" ON public.workspaces;
DROP POLICY IF EXISTS "Allow public read access on workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Allow public all access on workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can read their own workspace or admin can read all" ON public.workspaces;
DROP POLICY IF EXISTS "Users can insert their own workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Users can update their own workspace or admin can update all" ON public.workspaces;
DROP POLICY IF EXISTS "Users can delete their own workspace or admin can delete all" ON public.workspaces;

CREATE POLICY "Users can read their own workspace or admin can read all"
ON public.workspaces FOR SELECT
USING (
    user_id = auth.uid() 
    OR public.is_admin(auth.uid()) 
    OR auth.role() = 'service_role'
);

CREATE POLICY "Users can insert their own workspace"
ON public.workspaces FOR INSERT
WITH CHECK (
    user_id = auth.uid() 
    OR public.is_admin(auth.uid()) 
    OR auth.role() = 'service_role'
);

CREATE POLICY "Users can update their own workspace or admin can update all"
ON public.workspaces FOR UPDATE
USING (
    user_id = auth.uid() 
    OR public.is_admin(auth.uid()) 
    OR auth.role() = 'service_role'
)
WITH CHECK (
    user_id = auth.uid() 
    OR public.is_admin(auth.uid()) 
    OR auth.role() = 'service_role'
);

CREATE POLICY "Users can delete their own workspace or admin can delete all"
ON public.workspaces FOR DELETE
USING (
    user_id = auth.uid() 
    OR public.is_admin(auth.uid()) 
    OR auth.role() = 'service_role'
);

-- 7. Orders RLS: Customer Isolation + Admin Cross-Workspace
DROP POLICY IF EXISTS "Users can read orders of their workspace" ON public.orders;
DROP POLICY IF EXISTS "Users can read their workspace orders or admin can read all" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

CREATE POLICY "Users can read their workspace orders or admin can read all"
ON public.orders FOR SELECT
USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

CREATE POLICY "Admins can update orders"
ON public.orders FOR UPDATE
USING (
    public.is_admin(auth.uid()) 
    OR auth.role() = 'service_role'
)
WITH CHECK (
    public.is_admin(auth.uid()) 
    OR auth.role() = 'service_role'
);

-- 8. Payments RLS: Customer Isolation + Admin Cross-Workspace
DROP POLICY IF EXISTS "Users can read payments of their workspace orders" ON public.payments;
DROP POLICY IF EXISTS "Users can read their workspace payments or admin can read all" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;

CREATE POLICY "Users can read their workspace payments or admin can read all"
ON public.payments FOR SELECT
USING (
    order_id IN (
        SELECT id FROM public.orders WHERE workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

CREATE POLICY "Admins can manage payments"
ON public.payments FOR ALL
USING (
    public.is_admin(auth.uid()) 
    OR auth.role() = 'service_role'
)
WITH CHECK (
    public.is_admin(auth.uid()) 
    OR auth.role() = 'service_role'
);

-- 9. Customer Access Entitlements RLS: Customer Isolation + Admin Cross-Workspace
DROP POLICY IF EXISTS "Users can read entitlements of their workspace" ON public.customer_access_entitlements;
DROP POLICY IF EXISTS "Users can read their workspace entitlements or admin can read all" ON public.customer_access_entitlements;
DROP POLICY IF EXISTS "Admins can manage entitlements" ON public.customer_access_entitlements;

CREATE POLICY "Users can read their workspace entitlements or admin can read all"
ON public.customer_access_entitlements FOR SELECT
USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

CREATE POLICY "Admins can manage entitlements"
ON public.customer_access_entitlements FOR ALL
USING (
    public.is_admin(auth.uid()) 
    OR auth.role() = 'service_role'
)
WITH CHECK (
    public.is_admin(auth.uid()) 
    OR auth.role() = 'service_role'
);

-- 10. Customer Access History RLS: Customer Isolation + Admin Cross-Workspace
DROP POLICY IF EXISTS "Users can read access history of their workspace" ON public.customer_access_history;
DROP POLICY IF EXISTS "Users can read their workspace access history or admin can read all" ON public.customer_access_history;
DROP POLICY IF EXISTS "Admins can manage access history" ON public.customer_access_history;

CREATE POLICY "Users can read their workspace access history or admin can read all"
ON public.customer_access_history FOR SELECT
USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

CREATE POLICY "Admins can manage access history"
ON public.customer_access_history FOR ALL
USING (
    public.is_admin(auth.uid()) 
    OR auth.role() = 'service_role'
)
WITH CHECK (
    public.is_admin(auth.uid()) 
    OR auth.role() = 'service_role'
);

-- 11. Tasks RLS: Customer Isolation + Admin Cross-Workspace
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage tasks of their workspace" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage their tasks or admin can read all" ON public.tasks;

CREATE POLICY "Users can manage their tasks or admin can read all"
ON public.tasks FOR ALL
USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
)
WITH CHECK (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

-- 12. Wedding Events RLS: Customer Isolation + Admin Cross-Workspace
DROP POLICY IF EXISTS "Users can manage events of their workspace" ON public.wedding_events;
DROP POLICY IF EXISTS "Users can manage their events or admin can read all" ON public.wedding_events;

CREATE POLICY "Users can manage their events or admin can read all"
ON public.wedding_events FOR ALL
USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
)
WITH CHECK (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

-- 13. Platform Configurations RLS: Public Read + Admin Write
ALTER TABLE public.platform_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on platform_configurations" ON public.platform_configurations;
DROP POLICY IF EXISTS "Allow public all access on platform_configurations" ON public.platform_configurations;
DROP POLICY IF EXISTS "Allow anyone to read platform configurations" ON public.platform_configurations;
DROP POLICY IF EXISTS "Admins can manage platform configurations" ON public.platform_configurations;

CREATE POLICY "Allow anyone to read platform configurations"
ON public.platform_configurations FOR SELECT
USING (true);

CREATE POLICY "Admins can manage platform configurations"
ON public.platform_configurations FOR ALL
USING (
    public.is_admin(auth.uid()) 
    OR auth.role() = 'service_role'
)
WITH CHECK (
    public.is_admin(auth.uid()) 
    OR auth.role() = 'service_role'
);

-- 14. Hardened Administrative RPC: admin_mark_order_paid
CREATE OR REPLACE FUNCTION public.admin_mark_order_paid(
    p_order_id UUID,
    p_reason TEXT,
    p_admin_notes TEXT DEFAULT NULL,
    p_actor_id TEXT DEFAULT 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_workspace RECORD;
    v_existing_payment RECORD;
    v_current_entitlement RECORD;
    v_result JSONB;
    v_clean_reason TEXT;
BEGIN
    -- 1. Enforce Caller Authorization Check: Must be service_role OR active admin
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
            RAISE EXCEPTION 'Otorisasi ditolak: Hanya administrator terotorisasi yang dapat melakukan aksi ini.';
        END IF;
    END IF;

    -- 2. Validate mandatory reason
    v_clean_reason := TRIM(COALESCE(p_reason, ''));
    IF v_clean_reason = '' THEN
        RAISE EXCEPTION 'Alasan intervensi administratif wajib diisi.';
    END IF;

    -- 3. Safely retrieve and row-lock the order to prevent race conditions
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pesanan dengan ID % tidak ditemukan.', p_order_id;
    END IF;

    -- 4. State Protection: Do NOT mark paid if order is already refunded or charged back
    IF v_order.status = 'cancelled' AND (v_order.metadata->>'refunded_at') IS NOT NULL THEN
        RAISE EXCEPTION 'Pesanan yang telah direfund/chargeback tidak dapat diubah menjadi Paid.';
    END IF;

    -- 5. Idempotency Check: if order is already paid, return existing state
    IF v_order.status = 'paid' THEN
        SELECT jsonb_build_object(
            'id', v_order.id,
            'order_number', v_order.order_number,
            'workspace_id', v_order.workspace_id,
            'status', v_order.status,
            'is_idempotent_replay', true,
            'message', 'Pesanan sudah berstatus Paid.'
        ) INTO v_result;
        RETURN v_result;
    END IF;

    -- 6. Fetch workspace details
    SELECT * INTO v_workspace
    FROM public.workspaces
    WHERE id = v_order.workspace_id;

    -- 7. Update Order to 'paid' with Administrative Intervention Metadata
    UPDATE public.orders
    SET
        status = 'paid',
        paid_at = NOW(),
        updated_at = NOW(),
        metadata = metadata || jsonb_build_object(
            'admin_intervention', true,
            'intervention_type', 'manual_mark_paid',
            'admin_actor_id', p_actor_id,
            'admin_reason', v_clean_reason,
            'admin_notes', p_admin_notes,
            'intervened_at', NOW()
        )
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    -- 8. Record / Update Payment Record as 'manual_admin' (NEVER pretending Midtrans settlement)
    SELECT * INTO v_existing_payment
    FROM public.payments
    WHERE order_id = p_order_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_existing_payment IS NOT NULL THEN
        UPDATE public.payments
        SET
            status = 'paid',
            paid_at = NOW(),
            payment_method = COALESCE(payment_method, 'manual_admin'),
            provider = 'manual_admin',
            provider_reference = 'admin-manual-' || v_order.order_number,
            metadata = metadata || jsonb_build_object(
                'admin_intervention', true,
                'admin_actor_id', p_actor_id,
                'admin_reason', v_clean_reason,
                'admin_notes', p_admin_notes,
                'intervened_at', NOW()
            )
        WHERE id = v_existing_payment.id;
    ELSE
        INSERT INTO public.payments (
            order_id,
            amount,
            currency,
            status,
            payment_method,
            provider,
            provider_reference,
            metadata,
            created_at,
            paid_at
        )
        VALUES (
            p_order_id,
            v_order.amount,
            v_order.currency,
            'paid',
            'manual_admin',
            'manual_admin',
            'admin-manual-' || v_order.order_number,
            jsonb_build_object(
                'admin_intervention', true,
                'admin_actor_id', p_actor_id,
                'admin_reason', v_clean_reason,
                'admin_notes', p_admin_notes,
                'intervened_at', NOW()
            ),
            NOW(),
            NOW()
        );
    END IF;

    -- 9. Fetch current entitlement to capture previous tier
    SELECT * INTO v_current_entitlement
    FROM public.customer_access_entitlements
    WHERE workspace_id = v_order.workspace_id;

    -- 10. Upsert Entitlement to 'Paid' with expires_at = NULL (Unlimited Access)
    INSERT INTO public.customer_access_entitlements (
        workspace_id,
        tier,
        source,
        expires_at,
        notes,
        created_at,
        updated_at
    )
    VALUES (
        v_order.workspace_id,
        'Paid',
        'purchased',
        NULL,
        'Akses Wedding Pass diaktifkan via intervensi admin manual: ' || v_clean_reason,
        NOW(),
        NOW()
    )
    ON CONFLICT (workspace_id) DO UPDATE
    SET
        tier = 'Paid',
        source = 'purchased',
        expires_at = NULL,
        notes = 'Akses Wedding Pass diaktifkan via intervensi admin manual: ' || v_clean_reason,
        updated_at = NOW();

    -- 11. Insert Audit History Record in customer_access_history
    INSERT INTO public.customer_access_history (
        workspace_id,
        event_type,
        source,
        actor_id,
        metadata,
        created_at
    )
    VALUES (
        v_order.workspace_id,
        'wedding_pass_granted_admin',
        'admin_manual',
        p_actor_id,
        jsonb_build_object(
            'action', 'admin_manual_mark_paid',
            'orderId', v_order.id,
            'orderNumber', v_order.order_number,
            'amount', v_order.amount,
            'currency', v_order.currency,
            'previousTier', COALESCE(v_current_entitlement.tier, 'Trial'),
            'newTier', 'Paid',
            'newExpiresAt', NULL,
            'reason', v_clean_reason,
            'adminNotes', p_admin_notes,
            'intervenedAt', NOW()
        ),
        NOW()
    );

    -- 12. Return Result Summary
    SELECT jsonb_build_object(
        'id', v_order.id,
        'order_number', v_order.order_number,
        'workspace_id', v_order.workspace_id,
        'couple_name', COALESCE(v_workspace.couple_name, 'Pasangan Baru'),
        'product_type', v_order.product_type,
        'product_name', v_order.product_name,
        'amount', v_order.amount,
        'currency', v_order.currency,
        'status', v_order.status,
        'paid_at', v_order.paid_at,
        'created_at', v_order.created_at,
        'updated_at', v_order.updated_at,
        'metadata', v_order.metadata,
        'is_admin_intervention', true
    ) INTO v_result;

    RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_mark_order_paid FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_mark_order_paid TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_order_paid TO service_role;

-- 15. Hardened Administrative RPC: admin_cancel_order
CREATE OR REPLACE FUNCTION public.admin_cancel_order(
    p_order_id UUID,
    p_reason TEXT,
    p_actor_id TEXT DEFAULT 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_workspace RECORD;
    v_result JSONB;
    v_clean_reason TEXT;
BEGIN
    -- 1. Enforce Caller Authorization Check: Must be service_role OR active admin
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
            RAISE EXCEPTION 'Otorisasi ditolak: Hanya administrator terotorisasi yang dapat melakukan aksi ini.';
        END IF;
    END IF;

    -- 2. Validate mandatory reason
    v_clean_reason := TRIM(COALESCE(p_reason, ''));
    IF v_clean_reason = '' THEN
        RAISE EXCEPTION 'Alasan pembatalan pesanan wajib diisi.';
    END IF;

    -- 3. Safely retrieve and row-lock the order
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pesanan dengan ID % tidak ditemukan.', p_order_id;
    END IF;

    -- 4. State Protection: Only pending or failed/expired orders can be cancelled by admin
    IF v_order.status = 'paid' THEN
        RAISE EXCEPTION 'Pesanan yang telah berstatus Paid tidak dapat dibatalkan melalui aksi cancel biasa. Gunakan proses refund.';
    END IF;

    IF v_order.status = 'cancelled' THEN
        SELECT jsonb_build_object(
            'id', v_order.id,
            'order_number', v_order.order_number,
            'workspace_id', v_order.workspace_id,
            'status', v_order.status,
            'is_idempotent_replay', true,
            'message', 'Pesanan sudah dibatalkan sebelumnya.'
        ) INTO v_result;
        RETURN v_result;
    END IF;

    -- 5. Fetch workspace details
    SELECT * INTO v_workspace
    FROM public.workspaces
    WHERE id = v_order.workspace_id;

    -- 6. Update Order Status to 'cancelled'
    UPDATE public.orders
    SET
        status = 'cancelled',
        updated_at = NOW(),
        metadata = metadata || jsonb_build_object(
            'admin_cancellation', true,
            'cancelled_by', p_actor_id,
            'cancellation_reason', v_clean_reason,
            'cancelled_at', NOW()
        )
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    -- 7. Update pending payment record if exists
    UPDATE public.payments
    SET
        status = 'failed',
        metadata = metadata || jsonb_build_object(
            'cancellation_reason', v_clean_reason,
            'cancelled_at', NOW()
        )
    WHERE order_id = p_order_id AND status = 'pending';

    -- 8. Return Result Summary
    SELECT jsonb_build_object(
        'id', v_order.id,
        'order_number', v_order.order_number,
        'workspace_id', v_order.workspace_id,
        'couple_name', COALESCE(v_workspace.couple_name, 'Pasangan Baru'),
        'product_type', v_order.product_type,
        'product_name', v_order.product_name,
        'amount', v_order.amount,
        'currency', v_order.currency,
        'status', v_order.status,
        'created_at', v_order.created_at,
        'updated_at', v_order.updated_at,
        'metadata', v_order.metadata,
        'is_admin_cancellation', true
    ) INTO v_result;

    RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_cancel_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_cancel_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancel_order TO service_role;

-- 16. Hardened Administrative RPC: process_refunded_order
CREATE OR REPLACE FUNCTION public.process_refunded_order(
    p_order_id UUID,
    p_provider TEXT DEFAULT 'midtrans',
    p_provider_reference TEXT DEFAULT NULL,
    p_reason TEXT DEFAULT 'Payment refunded or charged back',
    p_refund_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_workspace RECORD;
    v_current_entitlement RECORD;
    v_result JSONB;
BEGIN
    -- 1. Safely retrieve and row-lock the order
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pesanan dengan ID % tidak ditemukan.', p_order_id;
    END IF;

    -- 2. Enforce Caller Authorization Check: Must be service_role OR active admin
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
            RAISE EXCEPTION 'Otorisasi ditolak: Hanya administrator terotorisasi yang dapat memproses refund pesanan.';
        END IF;
    END IF;

    -- 3. Idempotency Check: if order is already cancelled and has refund record, return cleanly
    IF v_order.status = 'cancelled' AND (v_order.metadata->>'refunded_at') IS NOT NULL THEN
        SELECT jsonb_build_object(
            'id', v_order.id,
            'order_number', v_order.order_number,
            'workspace_id', v_order.workspace_id,
            'status', v_order.status,
            'is_idempotent_replay', true,
            'message', 'Refund already processed for this order.'
        ) INTO v_result;
        RETURN v_result;
    END IF;

    -- 4. Mark Order as Cancelled with Refund Metadata
    UPDATE public.orders
    SET 
        status = 'cancelled',
        updated_at = NOW(),
        metadata = metadata || jsonb_build_object(
            'refunded_at', NOW(),
            'refund_reason', p_reason,
            'provider', p_provider,
            'provider_reference', p_provider_reference,
            'refund_metadata', p_refund_metadata
        )
    WHERE id = p_order_id;

    -- 5. Update Payment Record to 'refunded'
    UPDATE public.payments
    SET
        status = 'refunded',
        metadata = metadata || jsonb_build_object(
            'refunded_at', NOW(),
            'refund_reason', p_reason,
            'refund_metadata', p_refund_metadata
        )
    WHERE order_id = p_order_id;

    -- If no payment record exists, insert a refunded payment record
    IF NOT FOUND THEN
        INSERT INTO public.payments (
            order_id,
            amount,
            currency,
            status,
            payment_method,
            provider,
            provider_reference,
            metadata,
            created_at,
            paid_at
        )
        VALUES (
            p_order_id,
            v_order.amount,
            v_order.currency,
            'refunded',
            'unknown',
            p_provider,
            COALESCE(p_provider_reference, 'ref-' || v_order.order_number),
            p_refund_metadata,
            NOW(),
            NULL
        );
    END IF;

    -- 6. Fetch workspace details
    SELECT * INTO v_workspace
    FROM public.workspaces
    WHERE id = v_order.workspace_id;

    -- 7. Fetch current entitlement to capture previous state
    SELECT * INTO v_current_entitlement
    FROM public.customer_access_entitlements
    WHERE workspace_id = v_order.workspace_id;

    -- 8. Revoke entitlement: downgrade to Expired
    UPDATE public.customer_access_entitlements
    SET 
        tier = 'Expired',
        expires_at = NOW(),
        notes = 'Access revoked due to payment refund for order ' || v_order.order_number,
        updated_at = NOW()
    WHERE workspace_id = v_order.workspace_id;

    -- If no entitlement existed yet, insert an Expired row
    IF NOT FOUND THEN
        INSERT INTO public.customer_access_entitlements (
            workspace_id,
            tier,
            source,
            started_at,
            expires_at,
            granted_by,
            notes,
            updated_at
        )
        VALUES (
            v_order.workspace_id,
            'Expired',
            'system',
            NOW(),
            NOW(),
            'system_refund',
            'Access revoked due to payment refund for order ' || v_order.order_number,
            NOW()
        );
    END IF;

    -- 9. Insert Access History Record with event_type = 'access_revoked'
    INSERT INTO public.customer_access_history (
        workspace_id,
        event_type,
        source,
        actor_id,
        metadata,
        created_at
    )
    VALUES (
        v_order.workspace_id,
        'access_revoked',
        'payment_gateway',
        COALESCE(p_provider, 'midtrans'),
        jsonb_build_object(
            'reason', p_reason,
            'orderNumber', v_order.order_number,
            'orderId', v_order.id,
            'amount', v_order.amount,
            'currency', v_order.currency,
            'previousTier', COALESCE(v_current_entitlement.tier, 'Paid'),
            'provider', p_provider,
            'providerReference', p_provider_reference,
            'refundedAt', NOW()
        ),
        NOW()
    );

    -- 10. Return Updated Order Summary JSON
    SELECT jsonb_build_object(
        'id', v_order.id,
        'order_number', v_order.order_number,
        'workspace_id', v_order.workspace_id,
        'couple_name', COALESCE(v_workspace.couple_name, 'Pasangan Baru'),
        'product_type', v_order.product_type,
        'product_name', v_order.product_name,
        'amount', v_order.amount,
        'currency', v_order.currency,
        'status', 'cancelled',
        'is_refunded', true,
        'is_idempotent_replay', false,
        'refund_reason', p_reason,
        'updated_at', NOW()
    ) INTO v_result;

    RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_refunded_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_refunded_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_refunded_order TO service_role;
