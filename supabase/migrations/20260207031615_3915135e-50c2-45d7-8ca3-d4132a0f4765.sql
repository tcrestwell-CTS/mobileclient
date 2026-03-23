-- Drop the existing check constraint and recreate with completed status
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add new check constraint including 'completed'
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'));