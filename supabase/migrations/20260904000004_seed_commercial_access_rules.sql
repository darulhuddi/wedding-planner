-- Migration: Seed Commercial Access Rules & Harmonize Wedding Pass Pricing
-- Ensures platform_configurations has an authoritative single source of truth for commercial pricing.
-- Default price: 199000 IDR.

-- 1. Idempotent seed for commercial_access_rules
INSERT INTO public.platform_configurations (key, value, updated_at)
VALUES (
    'commercial_access_rules',
    jsonb_build_object(
        'trialEnabled', true,
        'trialDurationDays', 14,
        'trialStartTrigger', 'account_created',
        'trialGracePeriodDays', 0,
        'weddingPassEnabled', true,
        'price', 199000,
        'currency', 'IDR',
        'accessDurationRule', 'until_wedding_day',
        'maxDurationMonths', 18,
        'postWeddingGracePeriodDays', 30
    ),
    NOW()
)
ON CONFLICT (key) DO NOTHING;

-- 2. Ensure create_order PostgreSQL function uses authoritative 199000 fallback
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
        -- Authoritative lookup from commercial configuration fields (with 199000 standard fallback)
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

    -- 6. Build Return Object
    v_result := jsonb_build_object(
        'id', v_order.id,
        'order_number', v_order.order_number,
        'workspace_id', v_order.workspace_id,
        'couple_name', v_workspace.couple_name,
        'product_type', v_order.product_type,
        'product_name', v_order.product_name,
        'amount', v_order.amount,
        'currency', v_order.currency,
        'status', v_order.status,
        'metadata', v_order.metadata,
        'created_at', v_order.created_at,
        'updated_at', v_order.updated_at
    );

    RETURN v_result;
END;
$$;
