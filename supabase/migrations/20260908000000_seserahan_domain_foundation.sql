-- WedSiap: Seserahan V1 Phase 1 Migration
-- Creates tables, constraints, indexes, RLS, and workspace reset integration for the Seserahan planning domain.

-- 1. Create seserahan_plans table
CREATE TABLE IF NOT EXISTS public.seserahan_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Seserahan',
    budget NUMERIC NOT NULL DEFAULT 0 CHECK (budget >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create seserahan_categories table
CREATE TABLE IF NOT EXISTS public.seserahan_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.seserahan_plans(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create seserahan_items table
CREATE TABLE IF NOT EXISTS public.seserahan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.seserahan_plans(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.seserahan_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'purchased', 'completed')),
    estimated_cost NUMERIC NOT NULL DEFAULT 0 CHECK (estimated_cost >= 0),
    actual_cost NUMERIC NOT NULL DEFAULT 0 CHECK (actual_cost >= 0),
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_seserahan_plans_workspace_id
    ON public.seserahan_plans(workspace_id);

CREATE INDEX IF NOT EXISTS idx_seserahan_categories_plan_id
    ON public.seserahan_categories(plan_id);

CREATE INDEX IF NOT EXISTS idx_seserahan_categories_sort_order
    ON public.seserahan_categories(plan_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_seserahan_items_plan_id
    ON public.seserahan_items(plan_id);

CREATE INDEX IF NOT EXISTS idx_seserahan_items_category_id
    ON public.seserahan_items(category_id);

CREATE INDEX IF NOT EXISTS idx_seserahan_items_status
    ON public.seserahan_items(plan_id, status);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.seserahan_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seserahan_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seserahan_items ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for seserahan_plans
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'seserahan_plans' AND policyname = 'Users can manage seserahan plans of their workspace'
    ) THEN
        CREATE POLICY "Users can manage seserahan plans of their workspace"
        ON public.seserahan_plans
        FOR ALL
        USING (
            workspace_id IN (
                SELECT id FROM public.workspaces WHERE user_id = auth.uid()
            )
        )
        WITH CHECK (
            workspace_id IN (
                SELECT id FROM public.workspaces WHERE user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- 7. RLS Policies for seserahan_categories
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'seserahan_categories' AND policyname = 'Users can manage seserahan categories of their workspace'
    ) THEN
        CREATE POLICY "Users can manage seserahan categories of their workspace"
        ON public.seserahan_categories
        FOR ALL
        USING (
            plan_id IN (
                SELECT sp.id FROM public.seserahan_plans sp
                JOIN public.workspaces w ON sp.workspace_id = w.id
                WHERE w.user_id = auth.uid()
            )
        )
        WITH CHECK (
            plan_id IN (
                SELECT sp.id FROM public.seserahan_plans sp
                JOIN public.workspaces w ON sp.workspace_id = w.id
                WHERE w.user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- 8. RLS Policies for seserahan_items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'seserahan_items' AND policyname = 'Users can manage seserahan items of their workspace'
    ) THEN
        CREATE POLICY "Users can manage seserahan items of their workspace"
        ON public.seserahan_items
        FOR ALL
        USING (
            plan_id IN (
                SELECT sp.id FROM public.seserahan_plans sp
                JOIN public.workspaces w ON sp.workspace_id = w.id
                WHERE w.user_id = auth.uid()
            )
        )
        WITH CHECK (
            plan_id IN (
                SELECT sp.id FROM public.seserahan_plans sp
                JOIN public.workspaces w ON sp.workspace_id = w.id
                WHERE w.user_id = auth.uid()
            )
            AND (
                category_id IS NULL
                OR category_id IN (
                    SELECT sc.id FROM public.seserahan_categories sc
                    WHERE sc.plan_id = seserahan_items.plan_id
                )
            )
        );
    END IF;
END $$;

-- 9. Update reset_user_wedding_planning RPC to include seserahan deletion
CREATE OR REPLACE FUNCTION public.reset_user_wedding_planning()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_workspace RECORD;
    v_result JSONB;
BEGIN
    -- 1. Validasi otentikasi caller
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Akses ditolak: Pengguna belum terotentikasi.';
    END IF;

    -- 2. Dapatkan workspace milik authenticated caller
    SELECT * INTO v_workspace
    FROM public.workspaces
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Workspace perencanaan pernikahan tidak ditemukan untuk akun ini.';
    END IF;

    -- 3. Hapus seluruh data child planning secara berurutan aman foreign key
    DELETE FROM public.tasks WHERE workspace_id = v_workspace.id;
    DELETE FROM public.budget_expenses WHERE workspace_id = v_workspace.id;
    DELETE FROM public.budget_allocations WHERE workspace_id = v_workspace.id;
    DELETE FROM public.vendors WHERE workspace_id = v_workspace.id;
    DELETE FROM public.guests WHERE workspace_id = v_workspace.id;
    DELETE FROM public.notes WHERE workspace_id = v_workspace.id;
    DELETE FROM public.wedding_events WHERE workspace_id = v_workspace.id;
    DELETE FROM public.seserahan_plans WHERE workspace_id = v_workspace.id;

    -- 4. Reset field planning pada row public.workspaces
    UPDATE public.workspaces
    SET
        couple_name = '',
        wedding_date = CURRENT_DATE,
        estimated_budget = 100000000,
        estimated_guest_count = 400,
        completed_categories = ARRAY[]::text[],
        primary_planning_priority = 'checklist',
        religious_contexts = '[]'::jsonb,
        cultural_context = '{"hasTradition": null, "description": null}'::jsonb,
        administration_context = NULL,
        updated_at = NOW()
    WHERE id = v_workspace.id;

    -- 5. Return payload JSON hasil
    SELECT jsonb_build_object(
        'success', true,
        'workspace_id', v_workspace.id,
        'user_id', v_user_id,
        'message', 'Seluruh data perencanaan pernikahan berhasil di-reset ke kondisi awal.',
        'reset_at', NOW()
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Hak Akses Fungsi
REVOKE EXECUTE ON FUNCTION public.reset_user_wedding_planning() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_user_wedding_planning() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_user_wedding_planning() TO service_role;

-- Reload Schema Cache PostgREST
NOTIFY pgrst, 'reload schema';
