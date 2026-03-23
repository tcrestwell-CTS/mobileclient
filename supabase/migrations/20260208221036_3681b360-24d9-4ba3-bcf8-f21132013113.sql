-- Migrate existing bookings to trips (one trip per booking)
-- This creates a trip for each booking that doesn't have a trip_id
INSERT INTO public.trips (
  user_id,
  client_id,
  trip_name,
  destination,
  status,
  depart_date,
  return_date,
  trip_type,
  notes,
  trip_page_url,
  total_gross_sales,
  total_commissionable_amount,
  total_commission_revenue,
  total_net_sales,
  total_supplier_payout
)
SELECT 
  b.user_id,
  b.client_id,
  COALESCE(b.trip_name, b.destination),
  b.destination,
  CASE 
    WHEN b.status = 'cancelled' THEN 'cancelled'
    WHEN b.status = 'completed' THEN 'completed'
    WHEN b.status = 'traveling' THEN 'traveling'
    ELSE 'booked'
  END,
  b.depart_date,
  b.return_date,
  'regular',
  b.notes,
  b.trip_page_url,
  b.gross_sales,
  b.commissionable_amount,
  b.commission_revenue,
  b.net_sales,
  b.supplier_payout
FROM public.bookings b
WHERE b.trip_id IS NULL;

-- Now link each booking to its corresponding newly created trip
-- We match by user_id, client_id, trip_name/destination, and dates
UPDATE public.bookings b
SET trip_id = t.id
FROM public.trips t
WHERE b.trip_id IS NULL
  AND b.user_id = t.user_id
  AND b.client_id = t.client_id
  AND COALESCE(b.trip_name, b.destination) = t.trip_name
  AND b.depart_date = t.depart_date
  AND b.return_date = t.return_date;