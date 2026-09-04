-- Migration: Process Refunded Order & Atomic Entitlement Revocation
-- 1. Creates public.process_refunded_order stored procedure (SECURITY DEFINER)
-- 2. Atomically marks order cancelled, payment refunded, revokes active entitlement, and records access_revoked audit log.

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

    -- 2. Enforce Caller Authorization Check
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Otorisasi gagal: caller tidak terautentikasi.';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.workspaces w
            WHERE w.id = v_order.workspace_id AND w.user_id = auth.uid()
        ) THEN
            RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki izin untuk memproses refund pesanan ini.';
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

-- Secure Execution Privileges for process_refunded_order
REVOKE EXECUTE ON FUNCTION public.process_refunded_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_refunded_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_refunded_order TO service_role;
