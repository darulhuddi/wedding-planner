-- WedSiap: Moodboard Storage Migration (Google Drive -> Cloudflare R2)
-- Adds storage_key column, sets default storage_provider to 'r2', backfills keys, and updates indexes.

ALTER TABLE public.moodboard_items
    ADD COLUMN IF NOT EXISTS storage_key TEXT;

-- Backfill storage_key from storage_file_id for existing supabase/external items
UPDATE public.moodboard_items
SET storage_key = storage_file_id
WHERE storage_key IS NULL AND storage_file_id IS NOT NULL;

-- Update default storage_provider to 'r2'
ALTER TABLE public.moodboard_items
    ALTER COLUMN storage_provider SET DEFAULT 'r2';

-- Convert any legacy google_drive records to 'r2'
UPDATE public.moodboard_items
SET storage_provider = 'r2'
WHERE storage_provider = 'google_drive';

-- Create Index for storage_key
CREATE INDEX IF NOT EXISTS idx_moodboard_items_storage_key
    ON public.moodboard_items(workspace_id, storage_key);

NOTIFY pgrst, 'reload schema';
