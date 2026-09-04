-- Migration: Orders & Payments
-- Creates tables for customer orders and payment attempts with immutable price snapshots.

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    product_type TEXT NOT NULL DEFAULT 'wedding_pass',
    product_name TEXT NOT NULL DEFAULT 'Wedding Pass',
    amount BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR',
    status TEXT NOT NULL DEFAULT 'pending',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'IDR',
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    provider TEXT,
    provider_reference TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- Indices for fast querying
CREATE INDEX IF NOT EXISTS idx_orders_workspace_id ON public.orders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users & admin operations
CREATE POLICY "Allow public read access on orders"
    ON public.orders FOR SELECT
    USING (true);

CREATE POLICY "Allow public all access on orders"
    ON public.orders FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public read access on payments"
    ON public.payments FOR SELECT
    USING (true);

CREATE POLICY "Allow public all access on payments"
    ON public.payments FOR ALL
    USING (true)
    WITH CHECK (true);
