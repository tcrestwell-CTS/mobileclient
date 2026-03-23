
-- Trigger to update trip's updated_at when itinerary items are modified
CREATE OR REPLACE FUNCTION public.touch_trip_on_itinerary_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  affected_trip_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_trip_id := OLD.trip_id;
  ELSE
    affected_trip_id := NEW.trip_id;
  END IF;

  UPDATE public.trips
  SET updated_at = now()
  WHERE id = affected_trip_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER touch_trip_on_itinerary_item_change
  AFTER INSERT OR UPDATE OR DELETE ON public.itinerary_items
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_trip_on_itinerary_change();

-- Also touch trip when option blocks change
CREATE TRIGGER touch_trip_on_option_block_change
  AFTER INSERT OR UPDATE OR DELETE ON public.option_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_trip_on_itinerary_change();
