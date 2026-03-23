-- Add unique constraint on booking_reference to prevent collisions
ALTER TABLE public.bookings ADD CONSTRAINT bookings_booking_reference_unique UNIQUE (booking_reference);