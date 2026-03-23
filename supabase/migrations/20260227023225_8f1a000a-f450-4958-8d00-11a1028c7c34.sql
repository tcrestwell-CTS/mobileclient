-- Create option_blocks table for grouping itinerary alternatives
CREATE TABLE public.option_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  itinerary_id UUID REFERENCES public.itineraries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL DEFAULT 'Choose an option',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.option_blocks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own option blocks"
  ON public.option_blocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own option blocks"
  ON public.option_blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own option blocks"
  ON public.option_blocks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own option blocks"
  ON public.option_blocks FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all option blocks"
  ON public.option_blocks FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add option_block_id to itinerary_items
ALTER TABLE public.itinerary_items
  ADD COLUMN option_block_id UUID REFERENCES public.option_blocks(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX idx_option_blocks_trip_id ON public.option_blocks(trip_id);
CREATE INDEX idx_itinerary_items_option_block_id ON public.itinerary_items(option_block_id);
