
-- Re-enable RLS on loan_applications (policies already exist)
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;

-- Create authenticated policy only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'loan_applications' AND policyname = 'Authenticated users can manage loan applications'
  ) THEN
    CREATE POLICY "Authenticated users can manage loan applications"
    ON public.loan_applications FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
