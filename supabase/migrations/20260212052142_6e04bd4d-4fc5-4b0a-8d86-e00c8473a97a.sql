
-- Create itinerary_items table for day-by-day trip planning
CREATE TABLE public.itinerary_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  day_number INTEGER NOT NULL,
  item_date DATE,
  start_time TIME,
  end_time TIME,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'activity',
  location TEXT,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own itinerary items"
ON public.itinerary_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own itinerary items"
ON public.itinerary_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own itinerary items"
ON public.itinerary_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own itinerary items"
ON public.itinerary_items FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_itinerary_items_updated_at
BEFORE UPDATE ON public.itinerary_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_itinerary_items_trip_id ON public.itinerary_items(trip_id);
CREATE INDEX idx_itinerary_items_day_number ON public.itinerary_items(trip_id, day_number, sort_order);
