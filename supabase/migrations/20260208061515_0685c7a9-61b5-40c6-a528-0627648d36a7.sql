-- Add commission override tracking fields to bookings table
ALTER TABLE public.bookings
ADD COLUMN commission_override_amount numeric DEFAULT NULL,
ADD COLUMN override_pending_approval boolean DEFAULT false,
ADD COLUMN override_approved boolean DEFAULT false,
ADD COLUMN override_approved_by uuid DEFAULT NULL,
ADD COLUMN override_approved_at timestamp with time zone DEFAULT NULL,
ADD COLUMN override_notes text DEFAULT NULL;

-- Add calculated_commission column to store the auto-calculated value for comparison
ALTER TABLE public.bookings
ADD COLUMN calculated_commission numeric DEFAULT 0;

-- Create index for pending approvals query performance
CREATE INDEX idx_bookings_override_pending ON public.bookings (override_pending_approval) WHERE override_pending_approval = true;

-- Comment on columns for documentation
COMMENT ON COLUMN public.bookings.commission_override_amount IS 'Manual commission override entered by agent';
COMMENT ON COLUMN public.bookings.override_pending_approval IS 'True if override is higher than calculated and awaiting admin approval';
COMMENT ON COLUMN public.bookings.override_approved IS 'True if admin has approved the commission override';
COMMENT ON COLUMN public.bookings.override_approved_by IS 'User ID of admin who approved the override';
COMMENT ON COLUMN public.bookings.calculated_commission IS 'Auto-calculated commission for comparison with override';