-- Create featured_trips table
CREATE TABLE public.featured_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  trip_name TEXT NOT NULL,
  destination TEXT NOT NULL,
  trip_type TEXT,
  depart_date DATE,
  return_date DATE,
  budget_range TEXT,
  deposit_amount NUMERIC,
  cover_image_url TEXT,
  tags TEXT[],
  notes TEXT,
  published BOOLEAN DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.featured_trips ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can read published trips" ON public.featured_trips
  FOR SELECT USING (published = true);

CREATE POLICY "Authenticated users can manage trips" ON public.featured_trips
  FOR ALL USING (auth.role() = 'authenticated');