
-- Replace the overly permissive insert policy with a scoped one
DROP POLICY "Anyone can insert group signups" ON public.group_signups;

CREATE POLICY "Public can signup for enabled group trips"
ON public.group_signups FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = group_signups.trip_id
    AND t.trip_type = 'group'
    AND t.group_landing_enabled = true
  )
);
