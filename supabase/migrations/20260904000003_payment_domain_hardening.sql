-- Migration: Payment Domain Hardening — Pre-Production Blockers
-- 1. Unique partial index on (provider, provider_reference) for webhook idempotency
-- 2. PostgreSQL Atomic RPC function `create_order` with trusted server-side pricing & workspace auth
-- 3. PostgreSQL Atomic RPC function `complete_paid_order` with row-level locking, caller authorization, strict status validation & transaction rollback
-- 4. Hardened RLS policies ensuring clients cannot insert arbitrary amounts directly

-- 1. Webhook Idempotency Constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_ref_unique 
ON public.payments (provider, provider_reference) 
WHERE provider_reference IS NOT NULL;

-- 2. Trusted Server-Side Order Creation Function (SECURITY DEFINER)
-- Prevents client-side price tampering by fetching authoritative price from platform_configurations
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
    v_duration_rule TEXT := 'until_wedding_day';
    v_max_months INT := 18;
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
        v_duration_rule := COALESCE(v_product->>'accessDurationRule', 'until_wedding_day');
        v_max_months := COALESCE((v_product->>'maxDurationMonths')::INT, 18);
    ELSIF p_product_type = 'wedding_pass' THEN
        -- Fallback to top-level commercial configuration fields
        v_is_enabled := COALESCE((v_config.value->>'weddingPassEnabled')::BOOLEAN, TRUE);
        v_price := COALESCE((v_config.value->>'price')::BIGINT, 199000);
        v_currency := COALESCE(v_config.value->>'currency', 'IDR');
        v_product_name := 'Wedding Pass';
        v_duration_rule := COALESCE(v_config.value->>'accessDurationRule', 'until_wedding_day');
        v_max_months := COALESCE((v_config.value->>'maxDurationMonths')::INT, 18);
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

    -- 4. Generate Order Number
    IF p_custom_order_number IS NOT NULL AND TRIM(p_custom_order_number) <> '' THEN
        v_order_number := TRIM(p_custom_order_number);
    ELSE
        v_order_number := 'WF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    END IF;

    -- 5. Insert Order with Immutable Price Snapshot & Always 'pending' Status
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
            'accessDurationRule', v_duration_rule,
            'maxDurationMonths', v_max_months
        ),
        NOW(),
        NOW()
    )
    RETURNING * INTO v_order;

    -- 6. Return Created Order Summary
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

-- 3. Atomic Payment Completion Stored Function (SECURITY DEFINER)
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
    v_config RECORD;
    v_expires_at TIMESTAMPTZ;
    v_post_wedding_grace_days INT := 30;
    v_max_duration_months INT := 18;
    v_access_duration_rule TEXT := 'until_wedding_day';
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
    -- 'failed', 'cancelled', 'expired' are strictly rejected
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

    -- 8. Calculate Entitlement Expiration from Workspace & Platform Config
    SELECT * INTO v_workspace
    FROM public.workspaces
    WHERE id = v_order.workspace_id;

    -- Read commercial configuration if present
    SELECT (value->>'postWeddingGracePeriodDays')::INT,
           (value->>'maxDurationMonths')::INT,
           COALESCE(value->>'accessDurationRule', 'until_wedding_day')
    INTO v_post_wedding_grace_days, v_max_duration_months, v_access_duration_rule
    FROM public.platform_configurations
    WHERE key = 'commercial_access_rules';

    IF v_post_wedding_grace_days IS NULL THEN v_post_wedding_grace_days := 30; END IF;
    IF v_max_duration_months IS NULL THEN v_max_duration_months := 18; END IF;
    IF v_access_duration_rule IS NULL THEN v_access_duration_rule := 'until_wedding_day'; END IF;

    IF v_access_duration_rule = 'until_wedding_day' AND v_workspace.wedding_date IS NOT NULL THEN
        v_expires_at := (v_workspace.wedding_date::TIMESTAMPTZ + (v_post_wedding_grace_days || ' days')::INTERVAL);
    ELSE
        v_expires_at := (NOW() + (v_max_duration_months || ' months')::INTERVAL);
    END IF;

    -- 9. Upsert Customer Entitlement with source = 'purchased'
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
        v_expires_at,
        'system_order',
        'Purchased via order ' || v_order.order_number,
        NOW()
    )
    ON CONFLICT (workspace_id) DO UPDATE SET
        tier = 'Paid',
        source = 'purchased',
        expires_at = EXCLUDED.expires_at,
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
            'newExpiresAt', v_expires_at,
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

-- 4. Hardened RLS Security Policies
-- Drop old insecure/permissive policies
DROP POLICY IF EXISTS "Allow public read access on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public all access on orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create pending orders for their workspace" ON public.orders;
DROP POLICY IF EXISTS "Allow public read access on payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public all access on payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public read access on entitlements" ON public.customer_access_entitlements;
DROP POLICY IF EXISTS "Allow public all access on entitlements" ON public.customer_access_entitlements;
DROP POLICY IF EXISTS "Allow public read access on access history" ON public.customer_access_history;
DROP POLICY IF EXISTS "Allow public all access on access history" ON public.customer_access_history;

-- Orders RLS: Users can only read orders of their workspace.
-- Direct client INSERT is removed; orders must be created via trusted create_order RPC.
CREATE POLICY "Users can read orders of their workspace"
ON public.orders FOR SELECT
USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
);

-- Payments RLS: Users can only read payments belonging to their workspace orders
CREATE POLICY "Users can read payments of their workspace orders"
ON public.payments FOR SELECT
USING (
    order_id IN (
        SELECT id FROM public.orders WHERE workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
    )
);

-- Entitlements RLS: Users can only read their own workspace entitlement
CREATE POLICY "Users can read entitlements of their workspace"
ON public.customer_access_entitlements FOR SELECT
USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
);

-- Access History RLS: Users can only read history of their workspace
CREATE POLICY "Users can read access history of their workspace"
ON public.customer_access_history FOR SELECT
USING (
    workspace_id IN (
        SELECT id FROM public.workspaces WHERE user_id = auth.uid()
    )
);
