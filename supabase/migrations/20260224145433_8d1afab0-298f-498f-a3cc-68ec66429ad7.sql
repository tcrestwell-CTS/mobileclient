
-- Document checklist for client portal
CREATE TABLE public.client_document_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  is_checked boolean NOT NULL DEFAULT false,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, trip_id, item_key)
);

ALTER TABLE public.client_document_checklist ENABLE ROW LEVEL SECURITY;

-- Accessed via service-role through portal-data edge function only
-- No direct RLS policies needed for end users

-- Acceptance signature for proposals
ALTER TABLE public.trip_payments ADD COLUMN IF NOT EXISTS acceptance_signature text;
