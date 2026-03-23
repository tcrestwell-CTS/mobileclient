import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WebhookConfig {
  id: string;
  user_id: string;
  webhook_url: string | null;
  http_method: string;
  data_format: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UpsertWebhookConfig {
  webhook_url?: string | null;
  http_method?: string;
  data_format?: string;
  is_active?: boolean;
}

export function useGetWebhookConfig() {
  return useQuery({
    queryKey: ["webhook-configuration"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("webhook_configurations" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return (data as unknown) as WebhookConfig | null;
    },
  });
}

export function useUpsertWebhookConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (config: UpsertWebhookConfig) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("webhook_configurations" as any)
        .upsert(
          { ...config, user_id: user.id },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return (data as unknown) as WebhookConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-configuration"] });
      toast({ title: "Configuration saved", description: "Webhook configuration has been saved successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    },
  });
}
