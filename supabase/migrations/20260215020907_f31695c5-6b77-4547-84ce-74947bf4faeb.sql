
-- Add parent_trip_id for sub-trip hierarchy (self-referential FK)
ALTER TABLE public.trips ADD COLUMN parent_trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE;

-- Add trip settings columns
ALTER TABLE public.trips ADD COLUMN currency text NOT NULL DEFAULT 'USD';
ALTER TABLE public.trips ADD COLUMN pricing_visibility text NOT NULL DEFAULT 'show_all';
ALTER TABLE public.trips ADD COLUMN tags text[] DEFAULT '{}';
ALTER TABLE public.trips ADD COLUMN allow_pdf_downloads boolean NOT NULL DEFAULT false;
ALTER TABLE public.trips ADD COLUMN itinerary_style text NOT NULL DEFAULT 'vertical_list';

-- Index for quick sub-trip lookups
CREATE INDEX idx_trips_parent_trip_id ON public.trips(parent_trip_id);
