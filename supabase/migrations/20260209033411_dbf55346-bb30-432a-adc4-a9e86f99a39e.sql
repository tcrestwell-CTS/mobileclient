-- Create invoices table to track invoice history and sequential numbering
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  trip_name TEXT,
  client_name TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  amount_remaining NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a sequence for invoice numbers per user
CREATE TABLE public.invoice_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_number INTEGER NOT NULL DEFAULT 0,
  prefix TEXT NOT NULL DEFAULT 'INV',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Function to get next invoice number
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_number INTEGER;
  v_year TEXT;
BEGIN
  -- Get or create sequence for user
  INSERT INTO public.invoice_sequences (user_id, current_number, prefix)
  VALUES (p_user_id, 1, 'INV')
  ON CONFLICT (user_id) DO UPDATE SET
    current_number = invoice_sequences.current_number + 1,
    updated_at = now()
  RETURNING prefix, current_number INTO v_prefix, v_number;
  
  -- Format: INV-2026-00001
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_number::TEXT, 5, '0');
END;
$$;

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoices
CREATE POLICY "Users can view their own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all invoices"
  ON public.invoices FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Office admins can view all invoices"
  ON public.invoices FOR SELECT
  USING (has_role(auth.uid(), 'office_admin'::app_role));

-- RLS policies for invoice sequences
CREATE POLICY "Users can view their own sequence"
  ON public.invoice_sequences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sequence"
  ON public.invoice_sequences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sequence"
  ON public.invoice_sequences FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_sequences_updated_at
  BEFORE UPDATE ON public.invoice_sequences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();