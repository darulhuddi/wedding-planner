-- Migration: Atomic Payment Attempt Cancellation
-- Allows users to cancel/abandon an active Midtrans payment attempt without cancelling the parent order.

CREATE OR REPLACE FUNCTION public.cancel_payment_attempt(
    p_order_id UUID,
    p_midtrans_order_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_order RECORD;
    v_metadata JSONB;
    v_attempts JSONB;
    v_updated_attempts JSONB := '[]'::jsonb;
    v_elem JSONB;
    v_session JSONB;
    v_session_cancelled BOOLEAN := FALSE;
    v_active_pending_attempt JSONB := NULL;
    v_now TIMESTAMPTZ := NOW();
    v_result JSONB;
BEGIN
    -- 1. Safely retrieve and row-lock the order to prevent concurrent race conditions
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order with ID % not found.', p_order_id;
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
            RAISE EXCEPTION 'Akses ditolak: Anda tidak memiliki izin untuk membatalkan attempt pesanan ini.';
        END IF;
    END IF;

    -- 3. If order is already paid, do not permit cancellation of attempts
    IF v_order.status = 'paid' THEN
        SELECT jsonb_build_object(
            'id', v_order.id,
            'order_number', v_order.order_number,
            'status', v_order.status,
            'metadata', v_order.metadata,
            'message', 'Pesanan sudah dibayar.'
        ) INTO v_result;
        RETURN v_result;
    END IF;

    -- 4. Read metadata and payment attempts
    v_metadata := COALESCE(v_order.metadata, '{}'::jsonb);
    v_session := v_metadata->'midtransSession';
    
    -- Check if the active midtransSession is the target to be cancelled
    IF v_session IS NOT NULL AND (
        (v_session->>'midtransOrderId') = p_midtrans_order_id OR 
        (v_session->>'token') = p_midtrans_order_id
    ) THEN
        v_session_cancelled := TRUE;
    END IF;

    IF jsonb_typeof(v_metadata->'paymentAttempts') = 'array' THEN
        v_attempts := v_metadata->'paymentAttempts';
        
        FOR v_elem IN SELECT * FROM jsonb_array_elements(v_attempts)
        LOOP
            IF (v_elem->>'midtransOrderId') = p_midtrans_order_id OR (v_elem->>'token') = p_midtrans_order_id THEN
                -- Mark ONLY this exact attempt as cancelled (idempotent if already cancelled)
                v_elem := v_elem || jsonb_build_object(
                    'status', 'cancelled',
                    'cancelledAt', COALESCE(v_elem->>'cancelledAt', v_now::TEXT)
                );
            END IF;
            v_updated_attempts := v_updated_attempts || jsonb_build_array(v_elem);
        END LOOP;
    ELSE
        -- If no array exists yet but midtransSession matched, create array with cancelled attempt
        IF v_session_cancelled THEN
            v_updated_attempts := jsonb_build_array(
                v_session || jsonb_build_object(
                    'status', 'cancelled',
                    'cancelledAt', v_now::TEXT
                )
            );
        END IF;
    END IF;

    -- 5. Handle midtransSession:
    -- ONLY alter midtransSession if the cancelled attempt matches midtransSession directly.
    IF v_session_cancelled THEN
        -- Find the latest valid pending, non-expired attempt from v_updated_attempts
        FOR v_elem IN SELECT * FROM jsonb_array_elements(v_updated_attempts)
        LOOP
            IF (v_elem->>'status' = 'pending' OR v_elem->>'status' IS NULL) AND
               (v_elem->>'expiresAt')::timestamptz > v_now THEN
                v_active_pending_attempt := v_elem;
            END IF;
        END LOOP;

        IF v_active_pending_attempt IS NOT NULL THEN
            -- Point midtransSession to the latest valid pending attempt
            v_metadata := v_metadata || jsonb_build_object('midtransSession', v_active_pending_attempt);
        ELSE
            -- No valid pending attempt left: mark session cancelled
            v_metadata := v_metadata || jsonb_build_object(
                'midtransSession',
                v_session || jsonb_build_object('status', 'cancelled', 'cancelledAt', v_now::TEXT)
            );
        END IF;
    END IF;

    -- Update paymentAttempts in metadata
    v_metadata := v_metadata || jsonb_build_object('paymentAttempts', v_updated_attempts);

    -- 6. Persist to orders table (orders.status remains unchanged!)
    UPDATE public.orders
    SET
        metadata = v_metadata,
        updated_at = v_now
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    SELECT jsonb_build_object(
        'id', v_order.id,
        'order_number', v_order.order_number,
        'status', v_order.status,
        'metadata', v_order.metadata,
        'cancelled_attempt_id', p_midtrans_order_id,
        'is_cancelled', TRUE
    ) INTO v_result;

    RETURN v_result;
END;
$func$;

-- Secure execution privileges
REVOKE EXECUTE ON FUNCTION public.cancel_payment_attempt FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_payment_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_payment_attempt TO service_role;
