
-- Quote Requests
CREATE TABLE IF NOT EXISTS public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  trip_type text NOT NULL,
  destination text,
  departure_date date,
  travelers_adults integer NOT NULL DEFAULT 2,
  travelers_children integer NOT NULL DEFAULT 0,
  budget text,
  flexibility text DEFAULT 'flexible',
  message text,
  status text DEFAULT 'new'
);

-- Validation trigger for quote_requests.status
CREATE OR REPLACE FUNCTION public.validate_quote_request_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('new', 'contacted', 'booked', 'closed') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_quote_request_status
  BEFORE INSERT OR UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_quote_request_status();

-- Contact Messages
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'new'
);

CREATE OR REPLACE FUNCTION public.validate_contact_message_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('new', 'read', 'replied') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_contact_message_status
  BEFORE INSERT OR UPDATE ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_contact_message_status();

-- Newsletter Subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  email text NOT NULL UNIQUE,
  source text DEFAULT 'website',
  active boolean DEFAULT true
);

-- RLS
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous insert" ON public.quote_requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Auth users can view all" ON public.quote_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can update" ON public.quote_requests FOR UPDATE TO authenticated USING (true);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous insert" ON public.contact_messages FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Auth users can view all" ON public.contact_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can update" ON public.contact_messages FOR UPDATE TO authenticated USING (true);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous insert" ON public.newsletter_subscribers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Auth users can view all" ON public.newsletter_subscribers FOR SELECT TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quote_requests_email ON public.quote_requests(email);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON public.quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_created ON public.quote_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscribers(email);
