
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
  v_net_sales numeric;
  v_commission numeric;
BEGIN
  -- Only auto-calc if no manual override
  IF NEW.commission_override_amount IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get supplier commission info
  IF NEW.supplier_id IS NOT NULL THEN
    SELECT commission_rate, supplier_type, override_commission
    INTO v_supplier_rate, v_supplier_type, v_override_commission
    FROM public.suppliers WHERE id = NEW.supplier_id;
  END IF;

  -- Check if this is an airline booking using flat rate
  IF v_supplier_type = 'airline' AND (v_override_commission IS NOT TRUE) THEN
    -- Flat rate: $25 per $500 of gross sales
    v_commission := (NEW.gross_sales / 500.0) * 25.0;
    
    NEW.commissionable_amount := NEW.gross_sales;
    NEW.commission_revenue := ROUND(v_commission, 2);
    NEW.calculated_commission := ROUND(v_commission, 2);
    NEW.net_sales := NEW.gross_sales - COALESCE(NEW.supplier_payout, 0);
  ELSIF v_supplier_rate IS NOT NULL THEN
    -- New formula: net_sales = gross_sales - supplier_payout
    v_net_sales := NEW.gross_sales - COALESCE(NEW.supplier_payout, 0);
    v_commission := v_net_sales * (v_supplier_rate / 100);
    
    NEW.commissionable_amount := v_net_sales;
    NEW.commission_revenue := ROUND(v_commission, 2);
    NEW.calculated_commission := ROUND(v_commission, 2);
    NEW.net_sales := v_net_sales;
  ELSE
    -- No supplier: net_sales = gross_sales - supplier_payout, no commission rate
    v_net_sales := NEW.gross_sales - COALESCE(NEW.supplier_payout, 0);
    NEW.commissionable_amount := v_net_sales;
    NEW.net_sales := v_net_sales;
    NEW.commission_revenue := 0;
    NEW.calculated_commission := 0;
  END IF;

  RETURN NEW;
END;
$function$;
