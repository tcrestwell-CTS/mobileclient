
-- Table to persist client option selections (agent-confirmed model)
CREATE TABLE public.client_option_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  option_block_id UUID NOT NULL REFERENCES public.option_blocks(id) ON DELETE CASCADE,
  selected_item_id UUID NOT NULL REFERENCES public.itinerary_items(id) ON DELETE CASCADE,
  agent_confirmed BOOLEAN NOT NULL DEFAULT false,
  agent_confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (client_id, trip_id, option_block_id)
);

-- Enable RLS
ALTER TABLE public.client_option_selections ENABLE ROW LEVEL SECURITY;

-- Agents can view selections for their clients
CREATE POLICY "Users can view selections for their trips"
  ON public.client_option_selections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = client_option_selections.trip_id
        AND t.user_id = auth.uid()
    )
  );

-- Agents can update (confirm) selections
CREATE POLICY "Users can update selections for their trips"
  ON public.client_option_selections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = client_option_selections.trip_id
        AND t.user_id = auth.uid()
    )
  );

-- Admins can view all
CREATE POLICY "Admins can view all selections"
  ON public.client_option_selections FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Office admins can view all
CREATE POLICY "Office admins can view all selections"
  ON public.client_option_selections FOR SELECT
  USING (has_role(auth.uid(), 'office_admin'::app_role));
