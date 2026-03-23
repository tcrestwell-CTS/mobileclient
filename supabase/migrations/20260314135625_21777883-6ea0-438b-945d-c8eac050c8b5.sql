
DROP POLICY IF EXISTS "Public can insert newsletter" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Public can update newsletter" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Anyone can upsert newsletter subscription" ON public.newsletter_subscribers;

CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update newsletter subscription"
  ON public.newsletter_subscribers
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
