
-- Add alias columns to trips table
ALTER TABLE public.trips ADD COLUMN advisor_id uuid GENERATED ALWAYS AS (user_id) STORED;
ALTER TABLE public.trips ADD COLUMN title text GENERATED ALWAYS AS (trip_name) STORED;
ALTER TABLE public.trips ADD COLUMN departure_date date GENERATED ALWAYS AS (depart_date) STORED;
