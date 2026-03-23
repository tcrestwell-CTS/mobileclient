
-- Add certification number fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clia_number TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ccra_number TEXT DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS asta_number TEXT DEFAULT NULL;
