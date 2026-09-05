-- Migration: Atomic Payment Attempt Recording
-- Eliminates lost updates / race conditions when concurrent payment attempts are created.

CREATE OR REPLACE FUNCTION public.record_payment_attempt(
    p_order_id UUID,
    p_session JSONB,
    p_attempt JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_attempts JSONB;
    v_metadata JSONB;
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

    -- 2. Read latest metadata under row lock
    v_metadata := COALESCE(v_order.metadata, '{}'::jsonb);
    
    -- 3. Extract existing payment attempts
    IF jsonb_typeof(v_metadata->'paymentAttempts') = 'array' THEN
        v_attempts := v_metadata->'paymentAttempts';
    ELSE
        v_attempts := '[]'::jsonb;
    END IF;

    -- 4. Keep max 10 recent attempts (slice array if >= 10)
    IF jsonb_array_length(v_attempts) >= 10 THEN
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_attempts
        FROM (
            SELECT elem
            FROM jsonb_array_elements(v_attempts) WITH ORDINALITY AS t(elem, ord)
            ORDER BY ord DESC
            LIMIT 9
        ) s;
        
        -- Restore chronological order
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_attempts
        FROM (
            SELECT elem
            FROM jsonb_array_elements(v_attempts) WITH ORDINALITY AS t(elem, ord)
            ORDER BY ord ASC
        ) s;
    END IF;

    -- Append new attempt to array
    v_attempts := v_attempts || jsonb_build_array(p_attempt);

    -- 5. Build updated metadata
    v_metadata := v_metadata || jsonb_build_object(
        'midtransSession', p_session,
        'paymentAttempts', v_attempts
    );

    -- 6. Atomically update orders table
    UPDATE public.orders
    SET
        metadata = v_metadata,
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING * INTO v_order;

    SELECT jsonb_build_object(
        'id', v_order.id,
        'order_number', v_order.order_number,
        'metadata', v_order.metadata
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Secure execution privileges
REVOKE EXECUTE ON FUNCTION public.record_payment_attempt FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_payment_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment_attempt TO service_role;
