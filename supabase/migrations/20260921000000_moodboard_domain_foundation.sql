-- WedSiap: Moodboard V1 Foundation Migration
-- Creates moodboards, moodboard_items tables, RLS policies, storage bucket rules, and workspace reset integration.

-- 1. Create moodboards table
CREATE TABLE IF NOT EXISTS public.moodboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Wedding Moodboard',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_workspace_moodboard UNIQUE (workspace_id)
);

-- 2. Create moodboard_items table
CREATE TABLE IF NOT EXISTS public.moodboard_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moodboard_id UUID NOT NULL REFERENCES public.moodboards(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    title TEXT,
    note TEXT,
    category TEXT NOT NULL DEFAULT 'other',
    tags TEXT[] NOT NULL DEFAULT '{}',
    source_url TEXT,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_moodboards_workspace_id
    ON public.moodboards(workspace_id);

CREATE INDEX IF NOT EXISTS idx_moodboard_items_moodboard_id
    ON public.moodboard_items(moodboard_id);

CREATE INDEX IF NOT EXISTS idx_moodboard_items_workspace_id
    ON public.moodboard_items(workspace_id);

CREATE INDEX IF NOT EXISTS idx_moodboard_items_category
    ON public.moodboard_items(workspace_id, category);

CREATE INDEX IF NOT EXISTS idx_moodboard_items_is_favorite
    ON public.moodboard_items(workspace_id, is_favorite);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.moodboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moodboard_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for moodboards
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'moodboards' AND policyname = 'Users can manage moodboards of their workspace'
    ) THEN
        CREATE POLICY "Users can manage moodboards of their workspace"
        ON public.moodboards
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

-- 6. RLS Policies for moodboard_items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'moodboard_items' AND policyname = 'Users can manage moodboard items of their workspace'
    ) THEN
        CREATE POLICY "Users can manage moodboard items of their workspace"
        ON public.moodboard_items
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

-- 7. Ensure storage bucket for moodboard exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'moodboard',
    'moodboard',
    true,
    5242880, -- 5 MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Storage RLS Policies for moodboard bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Access for Moodboard Images'
    ) THEN
        CREATE POLICY "Public Access for Moodboard Images"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'moodboard');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated Users Upload Moodboard Images'
    ) THEN
        CREATE POLICY "Authenticated Users Upload Moodboard Images"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'moodboard');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated Users Delete Moodboard Images'
    ) THEN
        CREATE POLICY "Authenticated Users Delete Moodboard Images"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'moodboard');
    END IF;
END $$;

-- 8. Update reset_user_wedding_planning RPC to include moodboard deletion
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
    DELETE FROM public.moodboards WHERE workspace_id = v_workspace.id;

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

REVOKE EXECUTE ON FUNCTION public.reset_user_wedding_planning() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_user_wedding_planning() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_user_wedding_planning() TO service_role;

NOTIFY pgrst, 'reload schema';
