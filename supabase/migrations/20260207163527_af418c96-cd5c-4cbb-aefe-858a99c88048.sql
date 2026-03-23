-- Update the default value for agency_name in profiles table
ALTER TABLE public.profiles 
ALTER COLUMN agency_name SET DEFAULT 'Crestwell Travel Services';