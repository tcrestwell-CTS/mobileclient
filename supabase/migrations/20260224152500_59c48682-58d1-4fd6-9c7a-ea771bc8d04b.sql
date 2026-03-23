
-- New trigger function for trip completion -> QBO journal entry (revenue recognition)
CREATE OR REPLACE FUNCTION public.trigger_qbo_trip_completed()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _service_key text;
BEGIN
  IF NEW.status = 'completed' 
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND COALESCE(NEW.total_commission_revenue, 0) > 0 THEN
    
    SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
    LIMIT 1;

    PERFORM net.http_post(
      url := 'https://zbtnulzvwreqzbmxulpv.supabase.co/functions/v1/qbo-sync-trigger',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_key
      ),
      body := jsonb_build_object(
        'trigger_type', 'trip_completed',
        'record', row_to_json(NEW)::jsonb
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_qbo_trip_completed
  AFTER UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_qbo_trip_completed();
