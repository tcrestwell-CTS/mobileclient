-- Create client_companions table for travel companions and family members
CREATE TABLE public.client_companions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT,
  relationship TEXT NOT NULL DEFAULT 'companion',
  birthday DATE,
  email TEXT,
  phone TEXT,
  passport_info TEXT,
  known_traveler_number TEXT,
  redress_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.client_companions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view companions for their clients"
ON public.client_companions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert companions for their clients"
ON public.client_companions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update companions for their clients"
ON public.client_companions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete companions for their clients"
ON public.client_companions
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all companions"
ON public.client_companions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all companions"
ON public.client_companions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all companions"
ON public.client_companions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Office admins can view all companions"
ON public.client_companions
FOR SELECT
USING (has_role(auth.uid(), 'office_admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_client_companions_updated_at
BEFORE UPDATE ON public.client_companions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_client_companions_client_id ON public.client_companions(client_id);
CREATE INDEX idx_client_companions_user_id ON public.client_companions(user_id);