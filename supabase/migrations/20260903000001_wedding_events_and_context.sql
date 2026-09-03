-- WedFlow Phase 1: Wedding Context & Event Foundation Migration

-- 1. Extend workspaces with religious and cultural context metadata
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS religious_contexts JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS cultural_context JSONB DEFAULT '{"hasTradition": null, "description": null}'::jsonb;

-- 2. Create wedding_events table
CREATE TABLE IF NOT EXISTS public.wedding_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    date DATE NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    location TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add indexes for efficient workspace-scoped queries
CREATE INDEX IF NOT EXISTS idx_wedding_events_workspace_id 
ON public.wedding_events(workspace_id);

CREATE INDEX IF NOT EXISTS idx_wedding_events_workspace_date 
ON public.wedding_events(workspace_id, date);

-- 4. Enable Row Level Security (RLS) on wedding_events
ALTER TABLE public.wedding_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'wedding_events' AND policyname = 'Users can manage events of their workspace'
    ) THEN
        CREATE POLICY "Users can manage events of their workspace"
        ON public.wedding_events
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

-- 5. Extend tasks with event_ids array
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS event_ids UUID[] DEFAULT '{}'::uuid[];
