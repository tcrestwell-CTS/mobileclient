
-- Add landing page content columns to trips
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS group_landing_headline text,
  ADD COLUMN IF NOT EXISTS group_landing_description text;
