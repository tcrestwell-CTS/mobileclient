-- Create trips table as parent container for bookings
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  trip_name TEXT NOT NULL,
  destination TEXT,
  status TEXT NOT NULL DEFAULT 'planning',
  depart_date DATE,
  return_date DATE,
  trip_type TEXT DEFAULT 'regular',
  notes TEXT,
  trip_page_url TEXT,
  
  -- Aggregated financial fields (calculated from bookings)
  total_gross_sales NUMERIC NOT NULL DEFAULT 0,
  total_commissionable_amount NUMERIC NOT NULL DEFAULT 0,
  total_commission_revenue NUMERIC NOT NULL DEFAULT 0,
  total_net_sales NUMERIC NOT NULL DEFAULT 0,
  total_supplier_payout NUMERIC NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- RLS policies for trips (same pattern as bookings)
CREATE POLICY "Users can view their own trips" 
ON public.trips FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trips" 
ON public.trips FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips" 
ON public.trips FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips" 
ON public.trips FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all trips" 
ON public.trips FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all trips" 
ON public.trips FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all trips" 
ON public.trips FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Office admins can view all trips" 
ON public.trips FOR SELECT 
USING (has_role(auth.uid(), 'office_admin'::app_role));

-- Add trip_id to bookings table to link bookings to trips
ALTER TABLE public.bookings 
ADD COLUMN trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_bookings_trip_id ON public.bookings(trip_id);
CREATE INDEX idx_trips_user_id ON public.trips(user_id);
CREATE INDEX idx_trips_client_id ON public.trips(client_id);
CREATE INDEX idx_trips_depart_date ON public.trips(depart_date);

-- Create trigger to update updated_at on trips
CREATE TRIGGER update_trips_updated_at
BEFORE UPDATE ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to recalculate trip totals from bookings
CREATE OR REPLACE FUNCTION public.recalculate_trip_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected_trip_id UUID;
BEGIN
  -- Determine which trip_id to update
  IF TG_OP = 'DELETE' THEN
    affected_trip_id := OLD.trip_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update both old and new trip if trip_id changed
    IF OLD.trip_id IS DISTINCT FROM NEW.trip_id THEN
      -- Update old trip totals
      IF OLD.trip_id IS NOT NULL THEN
        UPDATE public.trips SET
          total_gross_sales = COALESCE((SELECT SUM(gross_sales) FROM public.bookings WHERE trip_id = OLD.trip_id), 0),
          total_commissionable_amount = COALESCE((SELECT SUM(commissionable_amount) FROM public.bookings WHERE trip_id = OLD.trip_id), 0),
          total_commission_revenue = COALESCE((SELECT SUM(commission_revenue) FROM public.bookings WHERE trip_id = OLD.trip_id), 0),
          total_net_sales = COALESCE((SELECT SUM(net_sales) FROM public.bookings WHERE trip_id = OLD.trip_id), 0),
          total_supplier_payout = COALESCE((SELECT SUM(supplier_payout) FROM public.bookings WHERE trip_id = OLD.trip_id), 0)
        WHERE id = OLD.trip_id;
      END IF;
    END IF;
    affected_trip_id := NEW.trip_id;
  ELSE
    affected_trip_id := NEW.trip_id;
  END IF;

  -- Update the affected trip's totals
  IF affected_trip_id IS NOT NULL THEN
    UPDATE public.trips SET
      total_gross_sales = COALESCE((SELECT SUM(gross_sales) FROM public.bookings WHERE trip_id = affected_trip_id), 0),
      total_commissionable_amount = COALESCE((SELECT SUM(commissionable_amount) FROM public.bookings WHERE trip_id = affected_trip_id), 0),
      total_commission_revenue = COALESCE((SELECT SUM(commission_revenue) FROM public.bookings WHERE trip_id = affected_trip_id), 0),
      total_net_sales = COALESCE((SELECT SUM(net_sales) FROM public.bookings WHERE trip_id = affected_trip_id), 0),
      total_supplier_payout = COALESCE((SELECT SUM(supplier_payout) FROM public.bookings WHERE trip_id = affected_trip_id), 0)
    WHERE id = affected_trip_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger to recalculate trip totals when bookings change
CREATE TRIGGER recalculate_trip_totals_on_booking_change
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_trip_totals();