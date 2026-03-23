
-- Add booking_type to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_type text NOT NULL DEFAULT 'other';

-- Add payment_deadline to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_deadline date;

-- Add cancellation_terms to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_terms text;

-- Add budget_range to trips table
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS budget_range text;

-- Add lead_source to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS lead_source text;

-- Create supplier-docs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-docs', 'supplier-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Add supplier_invoice_url to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS supplier_invoice_url text;

-- RLS for supplier-docs bucket
CREATE POLICY "Users can upload their own supplier docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'supplier-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own supplier docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'supplier-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own supplier docs"
ON storage.objects FOR DELETE
USING (bucket_id = 'supplier-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all supplier docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'supplier-docs' AND public.has_role(auth.uid(), 'admin'));
