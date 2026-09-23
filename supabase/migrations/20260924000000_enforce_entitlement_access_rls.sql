-- Migration: Enforce Active Entitlement Access on RLS & SQL Functions
-- Creates public.has_active_workspace_access(p_workspace_id UUID) helper function
-- and updates RLS policies on feature tables to strictly check active access status.

CREATE OR REPLACE FUNCTION public.has_active_workspace_access(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ent RECORD;
    v_ws RECORD;
BEGIN
    IF p_workspace_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 1. Check explicit record in customer_access_entitlements
    SELECT * INTO v_ent 
    FROM public.customer_access_entitlements 
    WHERE workspace_id = p_workspace_id
    ORDER BY updated_at DESC
    LIMIT 1;

    IF FOUND THEN
        -- Unlimited Paid Wedding Pass
        IF v_ent.tier = 'Paid' AND v_ent.expires_at IS NULL THEN
            RETURN TRUE;
        END IF;
        -- Active Trial, Active Complimentary, or Paid with future expires_at
        IF v_ent.expires_at IS NOT NULL AND v_ent.expires_at > NOW() THEN
            RETURN TRUE;
        END IF;
        RETURN FALSE;
    END IF;

    -- 2. Check if workspace has a completed paid order
    IF EXISTS (
        SELECT 1 FROM public.orders 
        WHERE workspace_id = p_workspace_id AND status = 'paid'
    ) THEN
        RETURN TRUE;
    END IF;

    -- 3. Fallback for newly created workspace without entitlement record (14 days trial)
    SELECT created_at INTO v_ws FROM public.workspaces WHERE id = p_workspace_id;
    IF FOUND AND (v_ws.created_at + INTERVAL '14 days') > NOW() THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- Grant EXECUTE permission on function
GRANT EXECUTE ON FUNCTION public.has_active_workspace_access(UUID) TO authenticated, anon, service_role;

-- ─── UPDATE RLS POLICIES FOR FEATURE TABLES ──────────────────────────────────────────

-- 1. Tasks Table RLS Policy
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage tasks of their workspace" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage their tasks or admin can read all" ON public.tasks;

CREATE POLICY "Users can manage their tasks or admin can read all"
ON public.tasks FOR ALL
USING (
    (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
        AND public.has_active_workspace_access(workspace_id)
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
)
WITH CHECK (
    (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
        AND public.has_active_workspace_access(workspace_id)
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

-- 2. Wedding Events Table RLS Policy
ALTER TABLE public.wedding_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage events of their workspace" ON public.wedding_events;
DROP POLICY IF EXISTS "Users can manage their events or admin can read all" ON public.wedding_events;

CREATE POLICY "Users can manage their events or admin can read all"
ON public.wedding_events FOR ALL
USING (
    (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
        AND public.has_active_workspace_access(workspace_id)
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
)
WITH CHECK (
    (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
        AND public.has_active_workspace_access(workspace_id)
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

-- 3. Budget Allocations & Expenses RLS Policies
ALTER TABLE public.budget_allocations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage budget allocations of their workspace" ON public.budget_allocations;

CREATE POLICY "Users can manage budget allocations of their workspace"
ON public.budget_allocations FOR ALL
USING (
    (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
        AND public.has_active_workspace_access(workspace_id)
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
)
WITH CHECK (
    (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
        AND public.has_active_workspace_access(workspace_id)
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

ALTER TABLE public.budget_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage budget expenses of their workspace" ON public.budget_expenses;

CREATE POLICY "Users can manage budget expenses of their workspace"
ON public.budget_expenses FOR ALL
USING (
    (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
        AND public.has_active_workspace_access(workspace_id)
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
)
WITH CHECK (
    (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
        AND public.has_active_workspace_access(workspace_id)
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

-- 4. Vendors RLS Policy
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage vendors of their workspace" ON public.vendors;

CREATE POLICY "Users can manage vendors of their workspace"
ON public.vendors FOR ALL
USING (
    (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
        AND public.has_active_workspace_access(workspace_id)
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
)
WITH CHECK (
    (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
        AND public.has_active_workspace_access(workspace_id)
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

-- 5. Guests RLS Policy
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage guests of their workspace" ON public.guests;

CREATE POLICY "Users can manage guests of their workspace"
ON public.guests FOR ALL
USING (
    (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
        AND public.has_active_workspace_access(workspace_id)
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
)
WITH CHECK (
    (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
        AND public.has_active_workspace_access(workspace_id)
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

-- 6. Notes RLS Policy
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage notes of their workspace" ON public.notes;

CREATE POLICY "Users can manage notes of their workspace"
ON public.notes FOR ALL
USING (
    (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
        AND public.has_active_workspace_access(workspace_id)
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
)
WITH CHECK (
    (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
        AND public.has_active_workspace_access(workspace_id)
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

-- 7. Seserahan Domain RLS Policies
ALTER TABLE public.seserahan_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage seserahan plans of their workspace" ON public.seserahan_plans;

CREATE POLICY "Users can manage seserahan plans of their workspace"
ON public.seserahan_plans FOR ALL
USING (
    (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
        AND public.has_active_workspace_access(workspace_id)
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
)
WITH CHECK (
    (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
        AND public.has_active_workspace_access(workspace_id)
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

ALTER TABLE public.seserahan_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage seserahan categories of their workspace" ON public.seserahan_categories;

CREATE POLICY "Users can manage seserahan categories of their workspace"
ON public.seserahan_categories FOR ALL
USING (
    (
        plan_id IN (
            SELECT id FROM public.seserahan_plans WHERE workspace_id IN (
                SELECT id FROM public.workspaces WHERE user_id = auth.uid()
            ) AND public.has_active_workspace_access(workspace_id)
        )
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
)
WITH CHECK (
    (
        plan_id IN (
            SELECT id FROM public.seserahan_plans WHERE workspace_id IN (
                SELECT id FROM public.workspaces WHERE user_id = auth.uid()
            ) AND public.has_active_workspace_access(workspace_id)
        )
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

ALTER TABLE public.seserahan_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage seserahan items of their workspace" ON public.seserahan_items;

CREATE POLICY "Users can manage seserahan items of their workspace"
ON public.seserahan_items FOR ALL
USING (
    (
        plan_id IN (
            SELECT id FROM public.seserahan_plans WHERE workspace_id IN (
                SELECT id FROM public.workspaces WHERE user_id = auth.uid()
            ) AND public.has_active_workspace_access(workspace_id)
        )
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
)
WITH CHECK (
    (
        plan_id IN (
            SELECT id FROM public.seserahan_plans WHERE workspace_id IN (
                SELECT id FROM public.workspaces WHERE user_id = auth.uid()
            ) AND public.has_active_workspace_access(workspace_id)
        )
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

-- 8. Moodboard Domain RLS Policies
ALTER TABLE public.moodboards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage moodboards of their workspace" ON public.moodboards;

CREATE POLICY "Users can manage moodboards of their workspace"
ON public.moodboards FOR ALL
USING (
    (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
        AND public.has_active_workspace_access(workspace_id)
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
)
WITH CHECK (
    (
        workspace_id IN (
            SELECT id FROM public.workspaces WHERE user_id = auth.uid()
        )
        AND public.has_active_workspace_access(workspace_id)
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);

ALTER TABLE public.moodboard_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage moodboard items of their workspace" ON public.moodboard_items;

CREATE POLICY "Users can manage moodboard items of their workspace"
ON public.moodboard_items FOR ALL
USING (
    (
        moodboard_id IN (
            SELECT id FROM public.moodboards WHERE workspace_id IN (
                SELECT id FROM public.workspaces WHERE user_id = auth.uid()
            ) AND public.has_active_workspace_access(workspace_id)
        )
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
)
WITH CHECK (
    (
        moodboard_id IN (
            SELECT id FROM public.moodboards WHERE workspace_id IN (
                SELECT id FROM public.workspaces WHERE user_id = auth.uid()
            ) AND public.has_active_workspace_access(workspace_id)
        )
    )
    OR public.is_admin(auth.uid())
    OR auth.role() = 'service_role'
);
