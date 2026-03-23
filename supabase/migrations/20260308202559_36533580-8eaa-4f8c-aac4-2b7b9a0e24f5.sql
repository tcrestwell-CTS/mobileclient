
-- Add multi-line commission flag to suppliers
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS multi_line_commission boolean NOT NULL DEFAULT false;

-- Create booking commission line items table
CREATE TABLE public.booking_commission_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_commission_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own commission lines" ON public.booking_commission_lines
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own commission lines" ON public.booking_commission_lines
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own commission lines" ON public.booking_commission_lines
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own commission lines" ON public.booking_commission_lines
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all commission lines" ON public.booking_commission_lines
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all commission lines" ON public.booking_commission_lines
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Update auto_calculate_commission to check for multi-line commission lines
CREATE OR REPLACE FUNCTION public.auto_calculate_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_supplier_rate numeric;
  v_supplier_type text;
  v_override_commission boolean;
  v_multi_line boolean;
  v_net_sales numeric;
  v_commission numeric;
  v_line_commission numeric;
BEGIN
  -- Only auto-calc if no manual override
  IF NEW.commission_override_amount IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get supplier commission info
  IF NEW.supplier_id IS NOT NULL THEN
    SELECT commission_rate, supplier_type, override_commission, multi_line_commission
    INTO v_supplier_rate, v_supplier_type, v_override_commission, v_multi_line
    FROM public.suppliers WHERE id = NEW.supplier_id;
  END IF;

  -- If multi-line commission, sum from booking_commission_lines
  IF v_multi_line IS TRUE THEN
    SELECT COALESCE(SUM(commission_amount), 0)
    INTO v_line_commission
    FROM public.booking_commission_lines
    WHERE booking_id = NEW.id;
    
    NEW.net_sales := NEW.gross_sales - COALESCE(NEW.supplier_payout, 0);
    NEW.commissionable_amount := NEW.gross_sales;
    NEW.commission_revenue := ROUND(v_line_commission, 2);
    NEW.calculated_commission := ROUND(v_line_commission, 2);
    RETURN NEW;
  END IF;

  -- Check if this is an airline booking using flat rate
  IF v_supplier_type = 'airline' AND (v_override_commission IS NOT TRUE) THEN
    v_commission := (NEW.gross_sales / 500.0) * 25.0;
    
    NEW.commissionable_amount := NEW.gross_sales;
    NEW.commission_revenue := ROUND(v_commission, 2);
    NEW.calculated_commission := ROUND(v_commission, 2);
    NEW.net_sales := NEW.gross_sales - COALESCE(NEW.supplier_payout, 0);
  ELSIF v_supplier_rate IS NOT NULL THEN
    v_net_sales := NEW.gross_sales - COALESCE(NEW.supplier_payout, 0);
    v_commission := v_net_sales * (v_supplier_rate / 100);
    
    NEW.commissionable_amount := v_net_sales;
    NEW.commission_revenue := ROUND(v_commission, 2);
    NEW.calculated_commission := ROUND(v_commission, 2);
    NEW.net_sales := v_net_sales;
  ELSE
    v_net_sales := NEW.gross_sales - COALESCE(NEW.supplier_payout, 0);
    NEW.commissionable_amount := v_net_sales;
    NEW.net_sales := v_net_sales;
    NEW.commission_revenue := 0;
    NEW.calculated_commission := 0;
  END IF;

  RETURN NEW;
END;
$function$;
