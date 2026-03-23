CREATE POLICY "Anyone can read newsletter subscriptions"
  ON public.newsletter_subscribers FOR SELECT
  TO anon, authenticated
  USING (true);