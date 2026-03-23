-- Add published_snapshot JSONB column to trips table
-- This stores a frozen copy of itinerary data at the time of publishing
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS published_snapshot jsonb DEFAULT NULL;

COMMENT ON COLUMN public.trips.published_snapshot IS 'Frozen snapshot of itinerary items, bookings, and metadata captured at publish time. The shared-trip edge function serves this instead of live data.';
