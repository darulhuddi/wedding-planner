-- Migration: Add administration_context JSONB column to public.workspaces and update reset_user_wedding_planning RPC
-- Ensures administrative profile context is persisted in PostgreSQL database per workspace.

-- 1. Extend public.workspaces with administration_context column
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS administration_context JSONB DEFAULT NULL;

-- 2. Update reset_user_wedding_planning RPC to include administration_context reset
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
