
-- Drop and recreate triggers with hardcoded URL and vault-based service role key

CREATE OR REPLACE FUNCTION public.trigger_qbo_booking_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _service_key text;
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
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
        'trigger_type', 'booking_confirmed',
        'record', row_to_json(NEW)::jsonb,
        'old_record', row_to_json(OLD)::jsonb
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_qbo_commission_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _service_key text;
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
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
        'trigger_type', 'commission_received',
        'record', row_to_json(NEW)::jsonb,
        'old_record', row_to_json(OLD)::jsonb
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_qbo_payout_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _service_key text;
BEGIN
  IF NEW.override_approved = true AND (OLD.override_approved IS DISTINCT FROM true) THEN
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
        'trigger_type', 'payout_approved',
        'record', row_to_json(NEW)::jsonb,
        'old_record', row_to_json(OLD)::jsonb
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_qbo_deposit_posted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  _service_key text;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed')
     AND NEW.payment_type = 'deposit' THEN
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
        'trigger_type', 'deposit_posted',
        'record', row_to_json(NEW)::jsonb,
        'old_record', row_to_json(OLD)::jsonb
      )
    );
  END IF;
  RETURN NEW;
END;
$$;
