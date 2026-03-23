
-- Add budget confirmation fields to trips table
ALTER TABLE public.trips
  ADD COLUMN budget_confirmed boolean DEFAULT false,
  ADD COLUMN budget_confirmed_at timestamp with time zone,
  ADD COLUMN budget_confirmed_by_client_id uuid REFERENCES public.clients(id),
  ADD COLUMN budget_confirmation_signature text,
  ADD COLUMN budget_confirmation_ip text,
  ADD COLUMN budget_confirmation_user_agent text,
  ADD COLUMN budget_change_requested boolean DEFAULT false,
  ADD COLUMN budget_change_request_message text,
  ADD COLUMN budget_change_requested_at timestamp with time zone,
  ADD COLUMN budget_change_requested_by_client_id uuid REFERENCES public.clients(id);
