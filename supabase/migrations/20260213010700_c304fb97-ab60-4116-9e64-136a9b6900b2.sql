
-- Add share_token and published_at to trips for public sharing and publish tracking
ALTER TABLE public.trips
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Generate share tokens for existing trips
UPDATE public.trips
SET share_token = encode(gen_random_bytes(12), 'hex')
WHERE share_token IS NULL;

-- Make share_token NOT NULL after backfill
ALTER TABLE public.trips ALTER COLUMN share_token SET NOT NULL;
ALTER TABLE public.trips ALTER COLUMN share_token SET DEFAULT encode(gen_random_bytes(12), 'hex');

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_trips_share_token ON public.trips (share_token);
