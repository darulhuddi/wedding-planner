-- Migration: Unlimited Wedding Pass Access Model
-- 1. Migrates all existing Paid entitlements to expires_at = NULL (Unlimited Access)
-- 2. Updates complete_paid_order RPC to grant expires_at = NULL for paid orders
-- 3. Updates create_order RPC to record accessDurationRule = 'unlimited'
-- 4. Harmonizes platform_configurations commercial_access_rules with accessDurationRule = 'unlimited'

-- 1. Data Migration: Convert all active Paid entitlements to Unlimited (expires_at = NULL)
UPDATE public.customer_access_entitlements
SET expires_at = NULL,
    updated_at = NOW()
WHERE tier = 'Paid';

-- 2. Harmonize commercial_access_rules in platform_configurations
UPDATE public.platform_configurations
SET value = value || jsonb_build_object(
    'accessDurationRule', 'unlimited'
),
updated_at = NOW()
WHERE key = 'commercial_access_rules';

-- 3. Updated Atomic Stored Function: complete_paid_order
CREATE OR REPLACE FUNCTION public.complete_paid_order(
    p_order_id UUID,
    p_amount BIGINT DEFAULT NULL,
    p_currency TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'qris',
    p_provider TEXT DEFAULT 'manual_gateway',
    p_provider_reference TEXT DEFAULT NULL,
    p_payment_metadata JSONB DEFAULT '{}'::jsonb
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
BEGIN
    -- 1. Safely retrieve and row-lock the order to prevent concurrent race conditions
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
            RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki izin untuk menyelesaikan pesanan ini.';
        END IF;
    END IF;

    -- 3. Idempotency Check: if order is already paid, return existing state without duplicate insertions
    IF v_order.status = 'paid' THEN
        SELECT jsonb_build_object(
            'id', v_order.id,
            'order_number', v_order.order_number,
            'workspace_id', v_order.workspace_id,
            'product_type', v_order.product_type,
            'product_name', v_order.product_name,
            'amount', v_order.amount,
            'currency', v_order.currency,
            'status', v_order.status,
            'created_at', v_order.created_at,
            'updated_at', v_order.updated_at,
            'paid_at', v_order.paid_at,
            'metadata', v_order.metadata,
            'is_idempotent_replay', true
        ) INTO v_result;
        RETURN v_result;
    END IF;

    -- 4. Strict Order state validation: must be strictly in 'pending' state
    IF v_order.status <> 'pending' THEN
        RAISE EXCEPTION 'Pesanan tidak dapat diselesaikan karena status saat ini: %.', v_order.status;
    END IF;

    -- 5. Payment Amount and Currency Validation (Anti-tampering & Fraud check)
    IF p_amount IS NOT NULL AND p_amount != v_order.amount THEN
        RAISE EXCEPTION 'Jumlah pembayaran tidak sesuai: tagihan % %, diterima % %.', 
            v_order.amount, v_order.currency, p_amount, COALESCE(p_currency, v_order.currency);
    END IF;

    IF p_currency IS NOT NULL AND UPPER(TRIM(p_currency)) != UPPER(TRIM(v_order.currency)) THEN
        RAISE EXCEPTION 'Mata uang pembayaran tidak sesuai: tagihan %, diterima %.', 
            v_order.currency, p_currency;
    END IF;

    -- 6. Mark Order as Paid
    UPDATE public.orders
    SET 
        status = 'paid',
        paid_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;

    -- 7. Insert Payment Record
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
        p_payment_method,
        p_provider,
        COALESCE(p_provider_reference, 'ref-' || v_order.order_number),
        p_payment_metadata,
        NOW(),
        NOW()
    );

    -- 8. Fetch workspace details for couple name
    SELECT * INTO v_workspace
    FROM public.workspaces
    WHERE id = v_order.workspace_id;

    -- 9. Upsert Customer Entitlement with UNLIMITED access (expires_at = NULL)
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
        'Paid',
        'purchased',
        NOW(),
        NULL,
        'system_order',
        'Purchased via order ' || v_order.order_number,
        NOW()
    )
    ON CONFLICT (workspace_id) DO UPDATE SET
        tier = 'Paid',
        source = 'purchased',
        expires_at = NULL,
        granted_by = 'system_order',
        notes = EXCLUDED.notes,
        updated_at = NOW();

    -- 10. Insert Access History Record with event_type = 'wedding_pass_purchased'
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
        'wedding_pass_purchased',
        'customer',
        COALESCE(p_provider, 'payment_gateway'),
        jsonb_build_object(
            'source', 'purchased',
            'orderNumber', v_order.order_number,
            'amount', v_order.amount,
            'currency', v_order.currency,
            'newExpiresAt', NULL,
            'provider', p_provider,
            'paymentMethod', p_payment_method
        ),
        NOW()
    );

    -- 11. Return Updated Order Summary JSON
    SELECT jsonb_build_object(
        'id', v_order.id,
        'order_number', v_order.order_number,
        'workspace_id', v_order.workspace_id,
        'couple_name', COALESCE(v_workspace.couple_name, 'Pasangan Baru'),
        'product_type', v_order.product_type,
        'product_name', v_order.product_name,
        'amount', v_order.amount,
        'currency', v_order.currency,
        'status', 'paid',
        'created_at', v_order.created_at,
        'updated_at', NOW(),
        'paid_at', NOW(),
        'payment_method', p_payment_method,
        'provider', p_provider,
        'metadata', v_order.metadata,
        'is_idempotent_replay', false
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Secure Execution Privileges for complete_paid_order
REVOKE EXECUTE ON FUNCTION public.complete_paid_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_paid_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_paid_order TO service_role;

-- 4. Updated Trusted Server-Side Order Creation Function: create_order
CREATE OR REPLACE FUNCTION public.create_order(
    p_workspace_id UUID,
    p_product_type TEXT DEFAULT 'wedding_pass',
    p_custom_order_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_workspace RECORD;
    v_config RECORD;
    v_product JSONB;
    v_price BIGINT;
    v_currency TEXT := 'IDR';
    v_product_name TEXT := 'Wedding Pass';
    v_is_enabled BOOLEAN := TRUE;
    v_duration_rule TEXT := 'unlimited';
    v_order_number TEXT;
    v_order RECORD;
    v_result JSONB;
BEGIN
    -- 1. Caller Authorization: caller must be service_role OR the workspace owner
    IF auth.role() <> 'service_role' THEN
        IF auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Otorisasi gagal: caller tidak terautentikasi.';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM public.workspaces 
            WHERE id = p_workspace_id AND user_id = auth.uid()
        ) THEN
            RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki izin untuk membuat pesanan untuk workspace ini.';
        END IF;
    END IF;

    -- 2. Verify workspace exists
    SELECT * INTO v_workspace
    FROM public.workspaces
    WHERE id = p_workspace_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workspace dengan ID % tidak ditemukan.', p_workspace_id;
    END IF;

    -- 3. Retrieve authoritative commercial product configuration from database
    SELECT value INTO v_config
    FROM public.platform_configurations
    WHERE key = 'commercial_access_rules';

    -- Check if products array exists in configuration
    IF v_config.value IS NOT NULL AND v_config.value ? 'products' THEN
        SELECT elem INTO v_product
        FROM jsonb_array_elements(v_config.value->'products') AS elem
        WHERE elem->>'productType' = p_product_type;
    END IF;

    IF v_product IS NOT NULL THEN
        v_is_enabled := COALESCE((v_product->>'isEnabled')::BOOLEAN, TRUE);
        v_price := (v_product->>'price')::BIGINT;
        v_currency := COALESCE(v_product->>'currency', 'IDR');
        v_product_name := COALESCE(v_product->>'name', 'Wedding Pass');
        v_duration_rule := COALESCE(v_product->>'accessDurationRule', 'unlimited');
    ELSIF p_product_type = 'wedding_pass' THEN
        -- Fallback to top-level commercial configuration fields
        v_is_enabled := COALESCE((v_config.value->>'weddingPassEnabled')::BOOLEAN, TRUE);
        v_price := COALESCE((v_config.value->>'price')::BIGINT, 199000);
        v_currency := COALESCE(v_config.value->>'currency', 'IDR');
        v_product_name := 'Wedding Pass';
        v_duration_rule := COALESCE(v_config.value->>'accessDurationRule', 'unlimited');
    ELSE
        RAISE EXCEPTION 'Produk komersial % tidak ditemukan atau tidak valid.', p_product_type;
    END IF;

    -- Ensure product is active and enabled
    IF NOT v_is_enabled THEN
        RAISE EXCEPTION 'Produk komersial % sedang dinonaktifkan.', v_product_name;
    END IF;

    IF v_price IS NULL OR v_price <= 0 THEN
        RAISE EXCEPTION 'Harga produk tidak valid dalam konfigurasi platform.';
    END IF;

    -- 4. Atomically supersede any existing pending orders for this workspace and product
    UPDATE public.orders
    SET status = 'expired',
        updated_at = NOW(),
        metadata = metadata || jsonb_build_object(
            'expired_reason', 'superseded_by_new_order',
            'superseded_at', NOW()
        )
    WHERE workspace_id = p_workspace_id
      AND product_type = p_product_type
      AND status = 'pending';

    -- 5. Generate Order Number
    IF p_custom_order_number IS NOT NULL AND TRIM(p_custom_order_number) <> '' THEN
        v_order_number := TRIM(p_custom_order_number);
    ELSE
        v_order_number := 'WF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    END IF;

    -- 6. Insert Order with Immutable Price Snapshot & Always 'pending' Status
    INSERT INTO public.orders (
        order_number,
        workspace_id,
        product_type,
        product_name,
        amount,
        currency,
        status,
        metadata,
        created_at,
        updated_at
    )
    VALUES (
        v_order_number,
        p_workspace_id,
        p_product_type,
        v_product_name,
        v_price,
        v_currency,
        'pending',
        jsonb_build_object(
            'priceSnapshot', v_price,
            'currency', v_currency,
            'productName', v_product_name,
            'accessDurationRule', v_duration_rule
        ),
        NOW(),
        NOW()
    )
    RETURNING * INTO v_order;

    -- 7. Return Created Order Summary
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
        'metadata', v_order.metadata
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Secure Execution Privileges for create_order
REVOKE EXECUTE ON FUNCTION public.create_order FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order TO service_role;
