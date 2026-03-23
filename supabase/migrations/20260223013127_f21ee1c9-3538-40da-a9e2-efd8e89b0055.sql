
-- Trigger function to send post-trip email when trip status changes to 'completed'
CREATE OR REPLACE FUNCTION public.trigger_post_trip_email()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _service_key text;
BEGIN
  -- Only fire when status changes TO 'completed' and email hasn't been sent yet
  IF NEW.status = 'completed' 
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND (NEW.post_trip_email_sent IS NOT TRUE) THEN
    
    SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
    LIMIT 1;

    PERFORM net.http_post(
      url := 'https://zbtnulzvwreqzbmxulpv.supabase.co/functions/v1/post-trip-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _service_key
      ),
      body := jsonb_build_object(
        'record', row_to_json(NEW)::jsonb
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger on trips table
CREATE TRIGGER trigger_post_trip_email_on_complete
  AFTER UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_post_trip_email();
