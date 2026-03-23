-- Make client_id nullable on trips so trips can be created without a client
ALTER TABLE public.trips ALTER COLUMN client_id DROP NOT NULL;