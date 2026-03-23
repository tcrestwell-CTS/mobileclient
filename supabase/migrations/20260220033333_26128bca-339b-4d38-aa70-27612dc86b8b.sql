
CREATE TABLE public.webhook_configurations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  webhook_url text,
  http_method text NOT NULL DEFAULT 'POST',
  data_format text NOT NULL DEFAULT 'JSON',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhook_configurations_pkey PRIMARY KEY (id),
  CONSTRAINT webhook_configurations_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.webhook_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own webhook config"
  ON public.webhook_configurations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_webhook_configurations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_webhook_configurations_updated_at
  BEFORE UPDATE ON public.webhook_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_webhook_configurations_updated_at();
