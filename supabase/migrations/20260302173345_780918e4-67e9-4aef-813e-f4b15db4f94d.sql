
-- Add group landing page toggle to trips
ALTER TABLE public.trips ADD COLUMN group_landing_enabled boolean NOT NULL DEFAULT false;

-- Create table for group trip signups
CREATE TABLE public.group_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  sub_trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text,
  email text NOT NULL,
  phone text,
  number_of_travelers integer NOT NULL DEFAULT 1,
  notes text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_signups ENABLE ROW LEVEL SECURITY;

-- Agents can view signups for their own trips
CREATE POLICY "Users can view signups for their trips"
ON public.group_signups FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = group_signups.trip_id
    AND t.user_id = auth.uid()
  )
);

-- Admins can view all signups
CREATE POLICY "Admins can view all group signups"
ON public.group_signups FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Agents can update signups for their trips
CREATE POLICY "Users can update signups for their trips"
ON public.group_signups FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = group_signups.trip_id
    AND t.user_id = auth.uid()
  )
);

-- Agents can delete signups for their trips
CREATE POLICY "Users can delete signups for their trips"
ON public.group_signups FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = group_signups.trip_id
    AND t.user_id = auth.uid()
  )
);

-- Public insert (no auth required - this is for public signups)
CREATE POLICY "Anyone can insert group signups"
ON public.group_signups FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Timestamp trigger
CREATE TRIGGER update_group_signups_updated_at
BEFORE UPDATE ON public.group_signups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
