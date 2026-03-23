
-- Add cover photo, overview, and date fields to itineraries
ALTER TABLE public.itineraries
  ADD COLUMN cover_image_url TEXT,
  ADD COLUMN overview TEXT,
  ADD COLUMN depart_date DATE,
  ADD COLUMN return_date DATE;
