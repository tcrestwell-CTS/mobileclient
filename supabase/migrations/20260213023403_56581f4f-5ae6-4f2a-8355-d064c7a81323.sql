
-- Create itineraries table for multiple itineraries per trip
CREATE TABLE public.itineraries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Itinerary 1',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own itineraries" ON public.itineraries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own itineraries" ON public.itineraries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own itineraries" ON public.itineraries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own itineraries" ON public.itineraries FOR DELETE USING (auth.uid() = user_id);

-- Add itinerary_id to itinerary_items (nullable for backward compat)
ALTER TABLE public.itinerary_items ADD COLUMN itinerary_id UUID REFERENCES public.itineraries(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX idx_itineraries_trip_id ON public.itineraries(trip_id);
CREATE INDEX idx_itinerary_items_itinerary_id ON public.itinerary_items(itinerary_id);
