
-- Create storage bucket for itinerary cover images
INSERT INTO storage.buckets (id, name, public) VALUES ('itinerary-covers', 'itinerary-covers', true);

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload itinerary covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'itinerary-covers' AND auth.role() = 'authenticated');

-- Allow public read
CREATE POLICY "Itinerary covers are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'itinerary-covers');

-- Allow owners to update/delete their uploads
CREATE POLICY "Users can update their itinerary covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'itinerary-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their itinerary covers"
ON storage.objects FOR DELETE
USING (bucket_id = 'itinerary-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
