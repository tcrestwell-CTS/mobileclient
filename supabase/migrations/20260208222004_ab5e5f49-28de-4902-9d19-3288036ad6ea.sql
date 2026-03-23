-- Create trip_payments table to track payments made for trips
CREATE TABLE public.trip_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  payment_type TEXT NOT NULL DEFAULT 'payment', -- 'payment', 'deposit', 'final_balance', 'authorization'
  payment_method TEXT, -- 'credit_card', 'check', 'bank_transfer', 'cash', etc.
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'authorized', 'refunded', 'cancelled'
  details TEXT, -- Additional details like "authorized by John on Visa ending in 4054"
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own trip payments"
ON public.trip_payments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trip payments"
ON public.trip_payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trip payments"
ON public.trip_payments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trip payments"
ON public.trip_payments
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all trip payments"
ON public.trip_payments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all trip payments"
ON public.trip_payments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all trip payments"
ON public.trip_payments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Office admins can view all trip payments"
ON public.trip_payments
FOR SELECT
USING (has_role(auth.uid(), 'office_admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_trip_payments_updated_at
BEFORE UPDATE ON public.trip_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();