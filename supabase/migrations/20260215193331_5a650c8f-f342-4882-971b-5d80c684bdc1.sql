
-- Store QuickBooks Online OAuth tokens per user
CREATE TABLE public.qbo_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  realm_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  company_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.qbo_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own QBO connection"
  ON public.qbo_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own QBO connection"
  ON public.qbo_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own QBO connection"
  ON public.qbo_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own QBO connection"
  ON public.qbo_connections FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_qbo_connections_updated_at
  BEFORE UPDATE ON public.qbo_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Map CRM clients to QBO customers
CREATE TABLE public.qbo_client_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  qbo_customer_id TEXT NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, client_id),
  UNIQUE(user_id, qbo_customer_id)
);

ALTER TABLE public.qbo_client_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own QBO client mappings"
  ON public.qbo_client_mappings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Map CRM invoices to QBO invoices
CREATE TABLE public.qbo_invoice_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  qbo_invoice_id TEXT NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, invoice_id),
  UNIQUE(user_id, qbo_invoice_id)
);

ALTER TABLE public.qbo_invoice_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own QBO invoice mappings"
  ON public.qbo_invoice_mappings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sync activity log
CREATE TABLE public.qbo_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sync_type TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'push',
  status TEXT NOT NULL DEFAULT 'success',
  records_processed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.qbo_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own QBO sync logs"
  ON public.qbo_sync_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own QBO sync logs"
  ON public.qbo_sync_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
