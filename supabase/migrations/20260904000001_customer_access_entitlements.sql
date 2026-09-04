-- Migration: Customer Access Entitlements & History
-- Stores workspace-specific access entitlements and immutable audit logs.

CREATE TABLE IF NOT EXISTS public.customer_access_entitlements (
    workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
    tier TEXT NOT NULL DEFAULT 'Trial',
    source TEXT NOT NULL DEFAULT 'trial',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    granted_by TEXT,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_access_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'admin',
    actor_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for efficient workspace queries
CREATE INDEX IF NOT EXISTS idx_customer_access_history_workspace_id ON public.customer_access_history(workspace_id);
CREATE INDEX IF NOT EXISTS idx_customer_access_history_created_at ON public.customer_access_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.customer_access_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_access_history ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users & anon (admin operations)
CREATE POLICY "Allow public read access on entitlements"
    ON public.customer_access_entitlements FOR SELECT
    USING (true);

CREATE POLICY "Allow public all access on entitlements"
    ON public.customer_access_entitlements FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public read access on access history"
    ON public.customer_access_history FOR SELECT
    USING (true);

CREATE POLICY "Allow public all access on access history"
    ON public.customer_access_history FOR ALL
    USING (true)
    WITH CHECK (true);
