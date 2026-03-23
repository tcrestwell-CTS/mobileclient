import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WebhookLead {
  id: string;
  lead_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  budget: string | null;
  project_type: string | null;
  timeline: string | null;
  source: string;
  status: string;
  received_at: string;
  raw_payload: Record<string, unknown> | null;
}

export function useWebhookLeads() {
  return useQuery({
    queryKey: ["webhook-leads"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("webhook_leads" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("received_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data as unknown) as WebhookLead[];
    },
    refetchInterval: 30_000,
  });
}
