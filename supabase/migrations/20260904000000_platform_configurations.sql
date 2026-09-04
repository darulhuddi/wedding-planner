-- WedFlow Platform Configurations Migration
-- Stores global business rules, free trial settings, and wedding pass pricing

CREATE TABLE IF NOT EXISTS public.platform_configurations (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.platform_configurations ENABLE ROW LEVEL SECURITY;

-- Allow public read of platform configurations (needed for client access rules)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'platform_configurations' AND policyname = 'Allow public read of platform configurations'
    ) THEN
        CREATE POLICY "Allow public read of platform configurations"
        ON public.platform_configurations
        FOR SELECT
        USING (true);
    END IF;
END $$;

-- Allow authenticated users to manage platform configurations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'platform_configurations' AND policyname = 'Allow authenticated management of platform configurations'
    ) THEN
        CREATE POLICY "Allow authenticated management of platform configurations"
        ON public.platform_configurations
        FOR ALL
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;
