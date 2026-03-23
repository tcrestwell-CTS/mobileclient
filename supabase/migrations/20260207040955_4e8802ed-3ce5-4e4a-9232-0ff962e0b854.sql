-- Create branding_settings table to store agency branding
CREATE TABLE public.branding_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agency_name TEXT DEFAULT 'My Travel Agency',
  tagline TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#0D7377',
  accent_color TEXT DEFAULT '#E8763A',
  email_address TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  from_email TEXT,
  from_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own branding settings"
ON public.branding_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own branding settings"
ON public.branding_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own branding settings"
ON public.branding_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_branding_settings_updated_at
BEFORE UPDATE ON public.branding_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for logo uploads
CREATE POLICY "Users can upload their own logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'logos');