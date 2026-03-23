-- Add comprehensive travel CRM fields to clients table

-- Personal Information
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS title text; -- Ms., Mr., Mrs., etc.
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS anniversary date;

-- Contact Information (secondary contacts)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS secondary_email text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS secondary_phone text;

-- Secure Travel IDs
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS redress_number text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS known_traveler_number text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS passport_info text; -- JSON string for multiple passports

-- Preferences
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS activities_interests text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS food_drink_allergies text;

-- Travel Preferences
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS flight_seating_preference text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS flight_bulkhead_preference text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS lodging_floor_preference text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS lodging_elevator_preference text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cruise_cabin_floor_preference text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cruise_cabin_location_preference text;