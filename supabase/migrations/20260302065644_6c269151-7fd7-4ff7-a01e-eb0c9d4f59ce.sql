
-- Add override_commission column to suppliers table
-- When true for airline suppliers, use standard percentage-based commission instead of flat $25/$500
ALTER TABLE public.suppliers ADD COLUMN override_commission boolean NOT NULL DEFAULT false;

-- Update the auto_calculate_commission trigger to handle flat flight rate
CREATE OR REPLACE FUNCTION public.auto_calculate_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_supplier_rate numeric;
  v_supplier_commissionable_pct numeric;
  v_supplier_type text;
  v_override_commission boolean;
  v_commissionable numeric;
  v_commission numeric;
BEGIN
  -- Only auto-calc if no manual override
  IF NEW.commission_override_amount IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get supplier commission info
  IF NEW.supplier_id IS NOT NULL THEN
    SELECT commission_rate, commissionable_percentage, supplier_type, override_commission
    INTO v_supplier_rate, v_supplier_commissionable_pct, v_supplier_type, v_override_commission
    FROM public.suppliers WHERE id = NEW.supplier_id;
  END IF;

  -- Check if this is an airline booking using flat rate
  IF v_supplier_type = 'airline' AND (v_override_commission IS NOT TRUE) THEN
    -- Flat rate: $25 per $500 of gross sales
    v_commission := (NEW.gross_sales / 500.0) * 25.0;
    v_commissionable := NEW.gross_sales; -- entire amount is the base for flat rate
    
    NEW.commissionable_amount := v_commissionable;
    NEW.commission_revenue := ROUND(v_commission, 2);
    NEW.calculated_commission := ROUND(v_commission, 2);
    NEW.net_sales := NEW.gross_sales - ROUND(v_commission, 2);
  ELSIF v_supplier_rate IS NOT NULL AND v_supplier_commissionable_pct IS NOT NULL THEN
    v_commissionable := NEW.gross_sales * (v_supplier_commissionable_pct / 100);
    v_commission := v_commissionable * (v_supplier_rate / 100);
    
    NEW.commissionable_amount := v_commissionable;
    NEW.commission_revenue := v_commission;
    NEW.calculated_commission := v_commission;
    NEW.net_sales := NEW.gross_sales - COALESCE(NEW.supplier_payout, 0);
  END IF;

  RETURN NEW;
END;
$function$;
