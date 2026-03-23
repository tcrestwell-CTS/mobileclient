-- Add approved itinerary tracking to trips
ALTER TABLE public.trips 
ADD COLUMN approved_itinerary_id UUID REFERENCES public.itineraries(id) ON DELETE SET NULL,
ADD COLUMN itinerary_approved_at TIMESTAMPTZ,
ADD COLUMN itinerary_approved_by_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create index for lookup
CREATE INDEX idx_trips_approved_itinerary ON public.trips(approved_itinerary_id) WHERE approved_itinerary_id IS NOT NULL;