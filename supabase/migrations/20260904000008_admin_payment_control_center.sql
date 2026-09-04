-- Migration: Admin Payment Control Center (P1)
-- 1. Creates public.admin_mark_order_paid (SECURITY DEFINER) for authorized administrative payment intervention
-- 2. Creates public.admin_cancel_order (SECURITY DEFINER) for authorized administrative cancellation of pending/eligible orders

-- 1. Administrative Manual Mark Paid Stored Function
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
    -- 1. Validate mandatory reason
    v_clean_reason := TRIM(COALESCE(p_reason, ''));
    IF v_clean_reason = '' THEN
        RAISE EXCEPTION 'Alasan intervensi administratif wajib diisi.';
    END IF;

    -- 2. Safely retrieve and row-lock the order to prevent race conditions
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pesanan dengan ID % tidak ditemukan.', p_order_id;
    END IF;

    -- 3. Enforce Caller Authorization Check
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Otorisasi gagal: caller tidak terautentikasi.';
        END IF;
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


-- 2. Administrative Cancel Order Stored Function
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
    -- 1. Validate mandatory reason
    v_clean_reason := TRIM(COALESCE(p_reason, ''));
    IF v_clean_reason = '' THEN
        RAISE EXCEPTION 'Alasan pembatalan pesanan wajib diisi.';
    END IF;

    -- 2. Safely retrieve and row-lock the order
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pesanan dengan ID % tidak ditemukan.', p_order_id;
    END IF;

    -- 3. Enforce Caller Authorization Check
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Otorisasi gagal: caller tidak terautentikasi.';
        END IF;
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
