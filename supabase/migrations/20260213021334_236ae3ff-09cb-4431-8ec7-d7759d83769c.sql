
-- Add cover_image_url column to trips
ALTER TABLE public.trips ADD COLUMN cover_image_url TEXT;

-- Create storage bucket for trip cover images
INSERT INTO storage.buckets (id, name, public) VALUES ('trip-covers', 'trip-covers', true);

-- Allow authenticated users to upload their own trip covers
CREATE POLICY "Users can upload trip covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'trip-covers' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to update their own uploads
CREATE POLICY "Users can update trip covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'trip-covers' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete trip covers"
ON storage.objects FOR DELETE
USING (bucket_id = 'trip-covers' AND auth.uid() IS NOT NULL);

-- Allow public read access for trip covers
CREATE POLICY "Trip covers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'trip-covers');
