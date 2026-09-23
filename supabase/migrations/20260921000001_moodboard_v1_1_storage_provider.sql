-- WedSiap: Moodboard V1.1 Storage Provider Migration
-- Adds storage_provider, storage_file_id, storage_file_name, storage_mime_type, storage_size columns to public.moodboard_items.

ALTER TABLE public.moodboard_items
    ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'external_url',
    ADD COLUMN IF NOT EXISTS storage_file_id TEXT,
    ADD COLUMN IF NOT EXISTS storage_file_name TEXT,
    ADD COLUMN IF NOT EXISTS storage_mime_type TEXT,
    ADD COLUMN IF NOT EXISTS storage_size BIGINT;

-- Backfill storage_provider for existing items based on image_url format
UPDATE public.moodboard_items
SET storage_provider = 'supabase'
WHERE image_url LIKE '%/storage/v1/object/%' AND storage_provider = 'external_url';

UPDATE public.moodboard_items
SET storage_provider = 'google_drive'
WHERE (image_url LIKE '%drive.google.com%' OR image_url LIKE '%lh3.googleusercontent.com%') AND storage_provider = 'external_url';

-- Create Index for storage_provider
CREATE INDEX IF NOT EXISTS idx_moodboard_items_storage_provider
    ON public.moodboard_items(workspace_id, storage_provider);

NOTIFY pgrst, 'reload schema';
