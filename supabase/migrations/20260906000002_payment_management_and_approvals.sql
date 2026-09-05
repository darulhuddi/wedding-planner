-- Migration: Payment Management & Approvals (Manual WhatsApp Payment + Authoritative Payment Settings)
-- 1. Seeds authoritative payment_settings in public.platform_configurations
-- 2. Creates public.admin_update_payment_settings RPC (SECURITY DEFINER)
-- 3. Creates public.create_manual_payment_attempt RPC (SECURITY DEFINER)
-- 4. Creates public.approve_manual_payment RPC (SECURITY DEFINER)
-- 5. Creates public.reject_manual_payment RPC (SECURITY DEFINER)

-- 1. Seed Initial Default Payment Settings (Midtrans: OFF, Manual WhatsApp: ON)
INSERT INTO public.platform_configurations (key, value, updated_at)
VALUES (
    'payment_settings',
    jsonb_build_object(
        'midtrans_enabled', false,
        'manual_payment_enabled', true,
        'manual_payment_whatsapp_number', '6281234567890',
        'manual_payment_message_template', 'Halo Admin WedSiap 👋' || E'\n\n' ||
            'Saya ingin melakukan pembayaran untuk:' || E'\n\n' ||
            'Order: {order_number}' || E'\n' ||
            'Paket: {package_name}' || E'\n' ||
            'Total: {total_amount}' || E'\n\n' ||
            'Mohon dibantu untuk proses pembayarannya.' || E'\n\n' ||
            'Terima kasih.'
    ),
    NOW()
)
ON CONFLICT (key) DO NOTHING;


-- 2. Administrative Payment Settings Update Function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.admin_update_payment_settings(
    p_settings JSONB,
    p_actor_id TEXT DEFAULT 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_settings JSONB;
    v_new_settings JSONB;
    v_midtrans_enabled BOOLEAN;
    v_manual_enabled BOOLEAN;
    v_wa_number TEXT;
    v_template TEXT;
BEGIN
    -- 1. Enforce Admin Caller Authorization
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
            RAISE EXCEPTION 'Otorisasi ditolak: Hanya administrator terotorisasi yang dapat mengubah konfigurasi pembayaran.';
        END IF;
    END IF;

    -- 2. Validate input fields
    IF p_settings IS NULL THEN
        RAISE EXCEPTION 'Konfigurasi pembayaran tidak boleh kosong.';
    END IF;

    v_midtrans_enabled := COALESCE((p_settings->>'midtrans_enabled')::BOOLEAN, false);
    v_manual_enabled := COALESCE((p_settings->>'manual_payment_enabled')::BOOLEAN, true);
    v_wa_number := TRIM(COALESCE(p_settings->>'manual_payment_whatsapp_number', ''));
    v_template := COALESCE(p_settings->>'manual_payment_message_template', '');

    IF v_manual_enabled AND v_wa_number = '' THEN
        RAISE EXCEPTION 'Nomor WhatsApp Admin wajib diisi jika metode manual diaktifkan.';
    END IF;

    -- 3. Retrieve old settings for audit logging
    SELECT value INTO v_old_settings
    FROM public.platform_configurations
    WHERE key = 'payment_settings';

    v_new_settings := jsonb_build_object(
        'midtrans_enabled', v_midtrans_enabled,
        'manual_payment_enabled', v_manual_enabled,
        'manual_payment_whatsapp_number', v_wa_number,
        'manual_payment_message_template', v_template,
        'updated_at', NOW()
    );

    -- 4. Upsert into platform_configurations
    INSERT INTO public.platform_configurations (key, value, updated_at)
    VALUES ('payment_settings', v_new_settings, NOW())
    ON CONFLICT (key) DO UPDATE
    SET
        value = EXCLUDED.value,
        updated_at = NOW();

    -- 5. Record Audit History Log if any workspace exists
    INSERT INTO public.customer_access_history (
        workspace_id,
        event_type,
        source,
        actor_id,
        metadata,
        created_at
    )
    SELECT
        w.id,
        'admin_override',
        'admin_payment_settings',
        p_actor_id,
        jsonb_build_object(
            'action', 'update_payment_settings',
            'oldValue', v_old_settings,
            'newValue', v_new_settings,
            'changedBy', p_actor_id,
            'changedAt', NOW()
        ),
        NOW()
    FROM public.workspaces w
    LIMIT 1;

    RETURN v_new_settings;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_update_payment_settings FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_payment_settings TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_payment_settings TO service_role;


-- 3. Customer / Admin Manual Payment Attempt Creation Function (SECURITY DEFINER)
-- 3. Customer / Admin Manual Payment Attempt Creation Function (SECURITY DEFINER)
-- Invoked when a customer chooses "Transfer Bank & WhatsApp (Manual)"
-- Validates workspace access, configuration, and appends a manual payment attempt.
CREATE OR REPLACE FUNCTION public.create_manual_payment_attempt(
    p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_config RECORD;
    v_manual_enabled BOOLEAN := TRUE;
    v_wa_number TEXT := '';
    v_template TEXT := '';
    v_metadata JSONB;
    v_attempts JSONB;
    v_attempt JSONB;
    v_now TIMESTAMPTZ := NOW();
    v_attempt_index INT := 1;
    v_provider_ref TEXT;
    v_result JSONB;
BEGIN
    -- 1. Safely retrieve and row-lock the order to prevent concurrent race conditions
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pesanan dengan ID % tidak ditemukan.', p_order_id;
    END IF;

    -- 2. Caller Authorization Check (Workspace owner, admin, or service_role)
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Otorisasi gagal: caller tidak terautentikasi.';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.workspaces w
            WHERE w.id = v_order.workspace_id AND w.user_id = auth.uid()
        ) AND NOT public.is_admin(auth.uid()) THEN
            RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki izin untuk pesanan ini.';
        END IF;
    END IF;

    -- 3. Verify server-authoritative payment configuration
    SELECT value INTO v_config
    FROM public.platform_configurations
    WHERE key = 'payment_settings';

    IF v_config.value IS NOT NULL THEN
        v_manual_enabled := COALESCE((v_config.value->>'manual_payment_enabled')::BOOLEAN, TRUE);
        v_wa_number := COALESCE(v_config.value->>'manual_payment_whatsapp_number', '');
        v_template := COALESCE(v_config.value->>'manual_payment_message_template', '');
    END IF;

    IF NOT v_manual_enabled THEN
        RAISE EXCEPTION 'Metode pembayaran manual melalui WhatsApp sedang dinonaktifkan oleh administrator.';
    END IF;

    -- 4. Order State Protection
    IF v_order.status = 'paid' THEN
        RAISE EXCEPTION 'Pesanan % sudah berstatus Paid.', v_order.order_number;
    END IF;

    IF v_order.status <> 'pending' THEN
        RAISE EXCEPTION 'Pesanan tidak dalam status pending (status: %).', v_order.status;
    END IF;

    v_metadata := COALESCE(v_order.metadata, '{}'::jsonb);

    -- 4b. Active Manual Payment Attempt Guard (Single Active Attempt Invariant)
    IF (v_metadata->>'manual_payment_status') = 'awaiting_approval' THEN
        SELECT jsonb_build_object(
            'id', v_order.id,
            'order_number', v_order.order_number,
            'workspace_id', v_order.workspace_id,
            'amount', v_order.amount,
            'currency', v_order.currency,
            'status', v_order.status,
            'payment_method', 'manual',
            'provider', 'manual_whatsapp',
            'manual_payment_status', 'awaiting_approval',
            'whatsapp_number', v_wa_number,
            'message_template', v_template,
            'created_at', v_order.created_at,
            'updated_at', v_order.updated_at,
            'metadata', v_order.metadata,
            'is_idempotent_replay', true
        ) INTO v_result;

        RETURN v_result;
    END IF;

    -- 5. Prepare Attempt Payload & Compute Unique Provider Reference
    IF jsonb_typeof(v_metadata->'paymentAttempts') = 'array' THEN
        v_attempts := v_metadata->'paymentAttempts';
        v_attempt_index := jsonb_array_length(v_attempts) + 1;
    ELSE
        v_attempts := '[]'::jsonb;
        v_attempt_index := 1;
    END IF;

    v_provider_ref := 'manual-' || v_order.order_number || '-ATT' || v_attempt_index;

    -- Slice array to max 9 items if full to fit new attempt
    IF jsonb_array_length(v_attempts) >= 10 THEN
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_attempts
        FROM (
            SELECT elem
            FROM jsonb_array_elements(v_attempts) WITH ORDINALITY AS t(elem, ord)
            ORDER BY ord DESC
            LIMIT 9
        ) s;

        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_attempts
        FROM (
            SELECT elem
            FROM jsonb_array_elements(v_attempts) WITH ORDINALITY AS t(elem, ord)
            ORDER BY ord ASC
        ) s;
    END IF;

    v_attempt := jsonb_build_object(
        'paymentMethod', 'manual',
        'provider', 'manual_whatsapp',
        'providerReference', v_provider_ref,
        'status', 'awaiting_approval',
        'grossAmount', v_order.amount,
        'currency', v_order.currency,
        'whatsappNumber', v_wa_number,
        'createdAt', v_now::TEXT
    );

    v_attempts := v_attempts || jsonb_build_array(v_attempt);

    v_metadata := v_metadata || jsonb_build_object(
        'paymentMethod', 'manual',
        'manualPayment', v_attempt,
        'manual_payment_status', 'awaiting_approval',
        'paymentAttempts', v_attempts
    );

    -- 6. Update Orders table (Status remains 'pending'!)
    UPDATE public.orders
    SET
        metadata = v_metadata,
        updated_at = v_now
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    -- 7. Return created manual payment summary
    -- Note: Canonical row in public.payments table is created upon settlement via complete_paid_order()
    SELECT jsonb_build_object(
        'id', v_order.id,
        'order_number', v_order.order_number,
        'workspace_id', v_order.workspace_id,
        'amount', v_order.amount,
        'currency', v_order.currency,
        'status', v_order.status,
        'payment_method', 'manual',
        'provider', 'manual_whatsapp',
        'provider_reference', v_provider_ref,
        'manual_payment_status', 'awaiting_approval',
        'whatsapp_number', v_wa_number,
        'message_template', v_template,
        'created_at', v_order.created_at,
        'updated_at', v_order.updated_at,
        'metadata', v_order.metadata,
        'is_idempotent_replay', false
    ) INTO v_result;

    RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_manual_payment_attempt FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_manual_payment_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_manual_payment_attempt TO service_role;


-- 4. Atomic Manual Payment Approval Function (SECURITY DEFINER)
-- Invoked ONLY by authorized Administrators.
-- Routes order settlement through authoritative canonical complete_paid_order() engine.
CREATE OR REPLACE FUNCTION public.approve_manual_payment(
    p_order_id UUID,
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
    v_attempts JSONB;
    v_updated_attempts JSONB := '[]'::jsonb;
    v_elem JSONB;
    v_now TIMESTAMPTZ := NOW();
    v_active_ref TEXT := NULL;
    v_result JSONB;
BEGIN
    -- 1. Enforce Admin Caller Authorization Check
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
            RAISE EXCEPTION 'Otorisasi ditolak: Hanya administrator terotorisasi yang dapat menyetujui pembayaran manual.';
        END IF;
    END IF;

    -- 2. Safely retrieve and row-lock the order to prevent concurrent race conditions
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pesanan dengan ID % tidak ditemukan.', p_order_id;
    END IF;

    -- 3. Idempotency Check: if order is already paid, return existing state cleanly
    IF v_order.status = 'paid' THEN
        SELECT jsonb_build_object(
            'id', v_order.id,
            'order_number', v_order.order_number,
            'workspace_id', v_order.workspace_id,
            'status', v_order.status,
            'paid_at', v_order.paid_at,
            'is_idempotent_replay', true,
            'message', 'Pesanan sudah berstatus Paid.'
        ) INTO v_result;
        RETURN v_result;
    END IF;

    -- 4. State Protection: Order must be in 'pending' status
    IF v_order.status <> 'pending' THEN
        RAISE EXCEPTION 'Pesanan tidak dapat disetujui karena status saat ini: %.', v_order.status;
    END IF;

    -- 5. Update Payment Attempts in metadata to mark the active manual attempt as 'paid'
    IF jsonb_typeof(v_order.metadata->'paymentAttempts') = 'array' THEN
        v_attempts := v_order.metadata->'paymentAttempts';
        FOR v_elem IN SELECT * FROM jsonb_array_elements(v_attempts)
        LOOP
            IF ((v_elem->>'paymentMethod') = 'manual' OR (v_elem->>'provider') = 'manual_whatsapp') 
               AND (v_elem->>'status') = 'awaiting_approval' THEN
                v_active_ref := v_elem->>'providerReference';
                v_elem := v_elem || jsonb_build_object(
                    'status', 'paid',
                    'approvedAt', v_now::TEXT,
                    'approvedBy', p_actor_id
                );
            END IF;
            v_updated_attempts := v_updated_attempts || jsonb_build_array(v_elem);
        END LOOP;
    END IF;

    IF v_active_ref IS NULL THEN
        v_active_ref := 'manual-' || v_order.order_number || '-ATT1';
        IF jsonb_array_length(v_updated_attempts) = 0 THEN
            v_updated_attempts := jsonb_build_array(
                jsonb_build_object(
                    'paymentMethod', 'manual',
                    'provider', 'manual_whatsapp',
                    'providerReference', v_active_ref,
                    'status', 'paid',
                    'approvedAt', v_now::TEXT,
                    'approvedBy', p_actor_id
                )
            );
        END IF;
    END IF;

    -- 6. Attach manual approval metadata to order before canonical settlement
    UPDATE public.orders
    SET
        updated_at = v_now,
        metadata = metadata || jsonb_build_object(
            'manual_payment_status', 'approved',
            'approved_at', v_now,
            'approved_by', p_actor_id,
            'admin_notes', p_admin_notes,
            'paymentAttempts', v_updated_attempts
        )
    WHERE id = p_order_id;

    -- 7. Route settlement & entitlement activation through canonical complete_paid_order() RPC
    -- Passing the exact unique provider_reference of this attempt
    v_result := public.complete_paid_order(
        p_order_id := p_order_id,
        p_amount := v_order.amount,
        p_currency := v_order.currency,
        p_payment_method := 'manual',
        p_provider := 'manual_whatsapp',
        p_provider_reference := v_active_ref,
        p_payment_metadata := jsonb_build_object(
            'manual_payment', true,
            'provider_reference', v_active_ref,
            'approved_by', p_actor_id,
            'approved_at', v_now,
            'admin_notes', p_admin_notes
        )
    );

    RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_manual_payment FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_manual_payment TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_manual_payment TO service_role;


-- 5. Atomic Manual Payment Rejection Function (SECURITY DEFINER)
-- Rejects manual payment with mandatory rejection reason without setting order paid or granting entitlements.
CREATE OR REPLACE FUNCTION public.reject_manual_payment(
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
    v_clean_reason TEXT;
    v_now TIMESTAMPTZ := NOW();
    v_attempts JSONB;
    v_updated_attempts JSONB := '[]'::jsonb;
    v_elem JSONB;
    v_result JSONB;
BEGIN
    -- 1. Enforce Admin Caller Authorization Check
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
            RAISE EXCEPTION 'Otorisasi ditolak: Hanya administrator terotorisasi yang dapat menolak pembayaran manual.';
        END IF;
    END IF;

    -- 2. Validate mandatory rejection reason
    v_clean_reason := TRIM(COALESCE(p_reason, ''));
    IF v_clean_reason = '' THEN
        RAISE EXCEPTION 'Alasan penolakan pembayaran wajib diisi.';
    END IF;

    -- 3. Safely retrieve and row-lock the order
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pesanan dengan ID % tidak ditemukan.', p_order_id;
    END IF;

    -- 4. State Protection: Cannot reject already paid orders
    IF v_order.status = 'paid' THEN
        RAISE EXCEPTION 'Pesanan yang telah berstatus Paid tidak dapat ditolak.';
    END IF;

    -- 5. Idempotency Check: if already rejected with same status
    IF (v_order.metadata->>'manual_payment_status') = 'rejected' THEN
        SELECT jsonb_build_object(
            'id', v_order.id,
            'order_number', v_order.order_number,
            'workspace_id', v_order.workspace_id,
            'status', v_order.status,
            'manual_payment_status', 'rejected',
            'is_idempotent_replay', true,
            'message', 'Pembayaran manual sudah ditolak sebelumnya.'
        ) INTO v_result;
        RETURN v_result;
    END IF;

    -- 6. Update paymentAttempts array in metadata to mark active manual attempt as 'rejected'
    IF jsonb_typeof(v_order.metadata->'paymentAttempts') = 'array' THEN
        v_attempts := v_order.metadata->'paymentAttempts';
        FOR v_elem IN SELECT * FROM jsonb_array_elements(v_attempts)
        LOOP
            IF ((v_elem->>'paymentMethod') = 'manual' OR (v_elem->>'provider') = 'manual_whatsapp')
               AND (v_elem->>'status') = 'awaiting_approval' THEN
                v_elem := v_elem || jsonb_build_object(
                    'status', 'rejected',
                    'rejectionReason', v_clean_reason,
                    'rejectedAt', v_now::TEXT,
                    'rejectedBy', p_actor_id
                );
            END IF;
            v_updated_attempts := v_updated_attempts || jsonb_build_array(v_elem);
        END LOOP;
    ELSE
        v_updated_attempts := jsonb_build_array(
            jsonb_build_object(
                'paymentMethod', 'manual',
                'provider', 'manual_whatsapp',
                'status', 'rejected',
                'rejectionReason', v_clean_reason,
                'rejectedAt', v_now::TEXT,
                'rejectedBy', p_actor_id
            )
        );
    END IF;

    -- 7. Update orders metadata (Orders remains pending so customer can retry)
    UPDATE public.orders
    SET
        updated_at = v_now,
        metadata = metadata || jsonb_build_object(
            'manual_payment_status', 'rejected',
            'rejection_reason', v_clean_reason,
            'rejected_at', v_now,
            'rejected_by', p_actor_id,
            'admin_notes', p_admin_notes,
            'paymentAttempts', v_updated_attempts
        )
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    -- 8. Fetch Workspace Details
    SELECT * INTO v_workspace
    FROM public.workspaces
    WHERE id = v_order.workspace_id;

    -- 9. Record History Log
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
        'admin_override',
        'manual_rejection',
        p_actor_id,
        jsonb_build_object(
            'action', 'reject_manual_payment',
            'orderId', v_order.id,
            'orderNumber', v_order.order_number,
            'rejectionReason', v_clean_reason,
            'rejectedBy', p_actor_id,
            'rejectedAt', v_now,
            'adminNotes', p_admin_notes
        ),
        v_now
    );

    -- 10. Return Summary
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
        'manual_payment_status', 'rejected',
        'rejection_reason', v_clean_reason,
        'rejected_at', v_now,
        'rejected_by', p_actor_id,
        'created_at', v_order.created_at,
        'updated_at', v_order.updated_at,
        'metadata', v_order.metadata,
        'is_idempotent_replay', false
    ) INTO v_result;

    RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reject_manual_payment FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_manual_payment TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_manual_payment TO service_role;
