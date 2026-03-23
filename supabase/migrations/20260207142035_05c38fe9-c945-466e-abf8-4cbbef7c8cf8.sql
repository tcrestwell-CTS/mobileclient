-- Create junction table for booking travelers (linking bookings to companions)
CREATE TABLE public.booking_travelers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  companion_id UUID NOT NULL REFERENCES public.client_companions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(booking_id, companion_id)
);

-- Enable Row Level Security
ALTER TABLE public.booking_travelers ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own booking travelers" 
ON public.booking_travelers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own booking travelers" 
ON public.booking_travelers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own booking travelers" 
ON public.booking_travelers 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can view all booking travelers" 
ON public.booking_travelers 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Office admins can view all booking travelers" 
ON public.booking_travelers 
FOR SELECT 
USING (has_role(auth.uid(), 'office_admin'::app_role));