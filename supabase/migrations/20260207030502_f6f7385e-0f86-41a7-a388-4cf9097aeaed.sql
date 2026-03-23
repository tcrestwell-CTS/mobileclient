-- Add new columns to clients table to match import CSV
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS preferred_first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
ADD COLUMN IF NOT EXISTS address_line_2 TEXT,
ADD COLUMN IF NOT EXISTS address_country TEXT,
ADD COLUMN IF NOT EXISTS address_city TEXT,
ADD COLUMN IF NOT EXISTS address_state TEXT,
ADD COLUMN IF NOT EXISTS address_zip_code TEXT,
ADD COLUMN IF NOT EXISTS loyalty_programs TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT;