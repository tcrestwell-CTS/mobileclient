CREATE OR REPLACE FUNCTION recalculate_trip_totals()
RETURNS TRIGGER AS $$
DECLARE
  affected_trip_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_trip_id := OLD.trip_id;
  ELSE
    affected_trip_id := NEW.trip_id;
  END IF;

  IF affected_trip_id IS NOT NULL THEN
    UPDATE public.trips SET
      total_gross_sales = COALESCE((SELECT SUM(gross_sales) FROM public.bookings WHERE trip_id = affected_trip_id), 0),
      total_commissionable_amount = COALESCE((SELECT SUM(commissionable_amount) FROM public.bookings WHERE trip_id = affected_trip_id), 0),
      total_commission_revenue = COALESCE((SELECT SUM(commission_revenue) FROM public.bookings WHERE trip_id = affected_trip_id), 0),
      total_net_sales = COALESCE((SELECT SUM(net_sales) FROM public.bookings WHERE trip_id = affected_trip_id), 0),
      total_supplier_payout = 0
    WHERE id = affected_trip_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;