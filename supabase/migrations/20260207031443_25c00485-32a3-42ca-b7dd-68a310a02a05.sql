-- Add new columns to bookings table for trip imports
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS trip_name TEXT,
ADD COLUMN IF NOT EXISTS trip_page_url TEXT,
ADD COLUMN IF NOT EXISTS owner_agent TEXT;