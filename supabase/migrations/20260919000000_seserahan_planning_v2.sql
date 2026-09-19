-- WedSiap: Seserahan V2 Planning Foundation Migration
-- Extends seserahan_items with responsibility and due date.
-- Extends seserahan_plans with packaging and final check lifecycle timestamps.

-- 1. Extend public.seserahan_items
ALTER TABLE public.seserahan_items
ADD COLUMN IF NOT EXISTS responsible_party TEXT NULL;

ALTER TABLE public.seserahan_items
ADD COLUMN IF NOT EXISTS responsible_party_custom TEXT NULL;

ALTER TABLE public.seserahan_items
ADD COLUMN IF NOT EXISTS due_date DATE NULL;

-- 2. Constraints for responsible_party on public.seserahan_items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_seserahan_items_responsible_party'
    ) THEN
        ALTER TABLE public.seserahan_items
        ADD CONSTRAINT chk_seserahan_items_responsible_party
        CHECK (
            responsible_party IS NULL OR 
            responsible_party IN ('bride', 'groom', 'bride_family', 'groom_family', 'together', 'custom')
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_seserahan_items_custom_responsibility'
    ) THEN
        ALTER TABLE public.seserahan_items
        ADD CONSTRAINT chk_seserahan_items_custom_responsibility
        CHECK (
            (responsible_party = 'custom' AND responsible_party_custom IS NOT NULL AND TRIM(responsible_party_custom) <> '') OR
            (responsible_party <> 'custom' AND responsible_party_custom IS NULL) OR
            (responsible_party IS NULL AND responsible_party_custom IS NULL)
        );
    END IF;
END $$;

-- 3. Extend public.seserahan_plans with lifecycle timestamps
ALTER TABLE public.seserahan_plans
ADD COLUMN IF NOT EXISTS packaging_started_at TIMESTAMPTZ NULL;

ALTER TABLE public.seserahan_plans
ADD COLUMN IF NOT EXISTS packaging_completed_at TIMESTAMPTZ NULL;

ALTER TABLE public.seserahan_plans
ADD COLUMN IF NOT EXISTS final_checked_at TIMESTAMPTZ NULL;

-- 4. Create Indexes for efficient querying & filtering
CREATE INDEX IF NOT EXISTS idx_seserahan_items_due_date
    ON public.seserahan_items(plan_id, due_date);

CREATE INDEX IF NOT EXISTS idx_seserahan_items_responsible
    ON public.seserahan_items(plan_id, responsible_party);

-- 5. Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
