
ALTER TABLE public.itinerary_items
ADD COLUMN flight_number text,
ADD COLUMN departure_city_code text,
ADD COLUMN arrival_city_code text;
