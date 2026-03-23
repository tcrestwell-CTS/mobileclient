-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. BOOKING CONFIRMED trigger
-- Fires when bookings.status changes to 'confirmed'
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.trigger_qbo_booking_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/qbo-sync-trigger',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
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

DROP TRIGGER IF EXISTS trg_qbo_booking_confirmed ON public.bookings;
CREATE TRIGGER trg_qbo_booking_confirmed
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_qbo_booking_confirmed();

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. COMMISSION RECEIVED trigger
-- Fires when commissions.status changes to 'paid'
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.trigger_qbo_commission_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/qbo-sync-trigger',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
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

DROP TRIGGER IF EXISTS trg_qbo_commission_received ON public.commissions;
CREATE TRIGGER trg_qbo_commission_received
  AFTER UPDATE ON public.commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_qbo_commission_received();

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ADVISOR PAYOUT APPROVED trigger
-- Fires when bookings.override_approved changes to true
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.trigger_qbo_payout_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.override_approved = true AND (OLD.override_approved IS DISTINCT FROM true) THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/qbo-sync-trigger',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
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

DROP TRIGGER IF EXISTS trg_qbo_payout_approved ON public.bookings;
CREATE TRIGGER trg_qbo_payout_approved
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_qbo_payout_approved();

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. DEPOSIT POSTED trigger
-- Fires when trip_payments with payment_type='deposit' has status set to 'completed'
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.trigger_qbo_deposit_posted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed')
     AND NEW.payment_type = 'deposit' THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/qbo-sync-trigger',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
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

DROP TRIGGER IF EXISTS trg_qbo_deposit_posted ON public.trip_payments;
CREATE TRIGGER trg_qbo_deposit_posted
  AFTER UPDATE ON public.trip_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_qbo_deposit_posted();