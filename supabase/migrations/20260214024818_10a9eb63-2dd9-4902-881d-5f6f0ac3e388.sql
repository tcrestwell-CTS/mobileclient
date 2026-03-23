
-- When a trip is cancelled or archived, cascade that status to its bookings
CREATE OR REPLACE FUNCTION public.cascade_trip_status_to_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'archived') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.bookings
    SET status = NEW.status, updated_at = now()
    WHERE trip_id = NEW.id
      AND status NOT IN ('cancelled', 'archived');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER cascade_trip_status_to_bookings
AFTER UPDATE OF status ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.cascade_trip_status_to_bookings();
