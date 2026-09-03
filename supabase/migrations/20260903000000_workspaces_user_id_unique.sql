-- WedFlow: Ensure 1 authenticated user has at most 1 workspace (MVP constraint)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_user_id_unique'
    ) THEN
        ALTER TABLE public.workspaces
        ADD CONSTRAINT workspaces_user_id_unique UNIQUE (user_id);
    END IF;
END $$;
