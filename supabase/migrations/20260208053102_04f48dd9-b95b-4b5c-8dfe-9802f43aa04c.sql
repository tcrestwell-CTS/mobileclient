-- Create suppliers table with commission rules
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  supplier_type TEXT NOT NULL DEFAULT 'hotel',
  commissionable_percentage NUMERIC NOT NULL DEFAULT 85,
  commission_rate NUMERIC NOT NULL DEFAULT 10,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- RLS policies for suppliers
CREATE POLICY "Users can view their own suppliers"
  ON public.suppliers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own suppliers"
  ON public.suppliers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own suppliers"
  ON public.suppliers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own suppliers"
  ON public.suppliers FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all suppliers"
  ON public.suppliers FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all suppliers"
  ON public.suppliers FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all suppliers"
  ON public.suppliers FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Office admins can view all suppliers"
  ON public.suppliers FOR SELECT
  USING (has_role(auth.uid(), 'office_admin'::app_role));

-- Add new financial columns to bookings
ALTER TABLE public.bookings
  ADD COLUMN supplier_id UUID REFERENCES public.suppliers(id),
  ADD COLUMN gross_sales NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN commissionable_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN commission_revenue NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN net_sales NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN supplier_payout NUMERIC NOT NULL DEFAULT 0;

-- Migrate existing bookings: set gross_sales = total_amount for existing records
UPDATE public.bookings 
SET gross_sales = total_amount,
    commissionable_amount = total_amount * 0.85,
    commission_revenue = total_amount * 0.85 * 0.10,
    net_sales = total_amount - (total_amount * 0.85 * 0.10),
    supplier_payout = total_amount - (total_amount * 0.85 * 0.10)
WHERE gross_sales = 0 AND total_amount > 0;

-- Create trigger for suppliers updated_at
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for supplier lookups
CREATE INDEX idx_bookings_supplier_id ON public.bookings(supplier_id);
CREATE INDEX idx_suppliers_user_id ON public.suppliers(user_id);
CREATE INDEX idx_suppliers_type ON public.suppliers(supplier_type);