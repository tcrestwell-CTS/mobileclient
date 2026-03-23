
CREATE TABLE public.trip_travelers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  relationship TEXT DEFAULT 'traveler',
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  known_traveler_number TEXT,
  passport_info TEXT,
  birthday TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trip_travelers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trip travelers"
  ON public.trip_travelers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create trip travelers"
  ON public.trip_travelers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trip travelers"
  ON public.trip_travelers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trip travelers"
  ON public.trip_travelers FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_trip_travelers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_trip_travelers_updated_at
  BEFORE UPDATE ON public.trip_travelers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trip_travelers_updated_at();
