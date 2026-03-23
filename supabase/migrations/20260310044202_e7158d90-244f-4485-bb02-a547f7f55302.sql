
-- Rename booking_reference to confirmation_number
ALTER TABLE public.bookings RENAME COLUMN booking_reference TO confirmation_number;

-- Rename total_amount to total_price
ALTER TABLE public.bookings RENAME COLUMN total_amount TO total_price;

-- Add commission_estimate column
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS commission_estimate numeric DEFAULT 0;

-- Drop columns not in the simplified schema (keeping commission-related ones)
ALTER TABLE public.bookings DROP COLUMN IF EXISTS approval_required;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS approval_type;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS cancellation_penalty;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS cancellation_reason;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS cancellation_refund_amount;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS cancellation_terms;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS cancelled_at;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS commission_override_amount;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS override_approved;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS override_approved_at;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS override_approved_by;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS override_notes;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS override_pending_approval;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS owner_agent;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS payment_deadline;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS supplier_invoice_url;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS trip_page_url;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS booking_type;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS depart_date;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS return_date;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS destination;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS travelers;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS trip_name;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS notes;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS supplier_payout;
