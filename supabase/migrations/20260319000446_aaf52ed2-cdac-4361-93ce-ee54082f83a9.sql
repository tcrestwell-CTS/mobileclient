
-- Loan payment schedule table for amortization tracking + QBO sync
CREATE TABLE public.loan_payment_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_application_id UUID NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  payment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  principal_amount NUMERIC NOT NULL DEFAULT 0,
  interest_amount NUMERIC NOT NULL DEFAULT 0,
  total_payment NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_date DATE,
  qbo_invoice_id TEXT,
  qbo_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.loan_payment_schedules ENABLE ROW LEVEL SECURITY;

-- Agents can manage payment schedules
CREATE POLICY "Authenticated users can manage loan payment schedules"
  ON public.loan_payment_schedules
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Index for quick lookup
CREATE INDEX idx_loan_payment_schedules_loan_id ON public.loan_payment_schedules(loan_application_id);
CREATE INDEX idx_loan_payment_schedules_status ON public.loan_payment_schedules(status);

-- Add QBO sync tracking columns to loan_applications
ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS qbo_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS qbo_synced_at TIMESTAMPTZ;
