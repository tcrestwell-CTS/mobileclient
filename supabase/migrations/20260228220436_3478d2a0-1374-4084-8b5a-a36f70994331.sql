
-- Allow agents to insert selections for their trips (for dashboard management)
CREATE POLICY "Users can insert selections for their trips"
  ON public.client_option_selections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = client_option_selections.trip_id
        AND t.user_id = auth.uid()
    )
  );

-- Allow agents to delete selections for their trips
CREATE POLICY "Users can delete selections for their trips"
  ON public.client_option_selections FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = client_option_selections.trip_id
        AND t.user_id = auth.uid()
    )
  );
