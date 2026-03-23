
-- Drop existing table and recreate with new schema
DROP TABLE IF EXISTS public.featured_trips;

CREATE TABLE public.featured_trips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  trip_name text NOT NULL,
  destination text NOT NULL,
  trip_type text,
  duration text,
  starting_from text,
  highlights text[],
  description text,
  popular boolean DEFAULT false,
  cover_image_url text,
  published boolean DEFAULT false
);

ALTER TABLE public.featured_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published trips"
  ON public.featured_trips FOR SELECT
  USING (published = true);

CREATE POLICY "Authenticated users can manage featured trips"
  ON public.featured_trips FOR ALL
  USING (auth.role() = 'authenticated');
