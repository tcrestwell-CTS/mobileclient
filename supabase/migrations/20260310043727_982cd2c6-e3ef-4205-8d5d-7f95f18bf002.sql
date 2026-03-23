
-- Add new columns
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

-- Drop unused columns
ALTER TABLE public.quotes DROP COLUMN IF EXISTS client_id;
ALTER TABLE public.quotes DROP COLUMN IF EXISTS quote_number;
ALTER TABLE public.quotes DROP COLUMN IF EXISTS title;
ALTER TABLE public.quotes DROP COLUMN IF EXISTS description;
ALTER TABLE public.quotes DROP COLUMN IF EXISTS total_amount;
ALTER TABLE public.quotes DROP COLUMN IF EXISTS valid_until;
ALTER TABLE public.quotes DROP COLUMN IF EXISTS accepted_at;
ALTER TABLE public.quotes DROP COLUMN IF EXISTS declined_at;
ALTER TABLE public.quotes DROP COLUMN IF EXISTS notes;
