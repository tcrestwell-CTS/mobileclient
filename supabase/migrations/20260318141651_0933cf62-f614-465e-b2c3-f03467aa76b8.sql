
ALTER TABLE public.secure_links ADD COLUMN IF NOT EXISTS used_ip TEXT;

CREATE POLICY "Anon can select secure_links by token"
  ON public.secure_links
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can update secure_links"
  ON public.secure_links
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
