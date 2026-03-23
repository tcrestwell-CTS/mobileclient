
-- Add advisor_id as a generated column that mirrors user_id
ALTER TABLE public.clients ADD COLUMN advisor_id uuid GENERATED ALWAYS AS (user_id) STORED;
