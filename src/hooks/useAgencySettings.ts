import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AgencySettings {
  id: string;
  user_id: string;
  approval_threshold: number;
  commission_holdback_pct: number;
  tier_auto_promote: boolean;
  tier_1_threshold: number;
  tier_2_threshold: number;
  evaluation_period_months: number;
  created_at: string;
  updated_at: string;
}

export function useAgencySettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["agency-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // Return defaults if no settings exist
      if (!data) {
        return {
          id: "",
          user_id: "",
          approval_threshold: 10000,
          commission_holdback_pct: 10,
          tier_auto_promote: false,
          tier_1_threshold: 100000,
          tier_2_threshold: 250000,
          evaluation_period_months: 12,
          created_at: "",
          updated_at: "",
        } as AgencySettings;
      }

      return data as AgencySettings;
    },
    enabled: !!user,
  });
}

export function useUpdateAgencySettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<AgencySettings>) => {
      if (!user) throw new Error("Not authenticated");

      // Check if settings exist
      const { data: existing } = await supabase
        .from("agency_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("agency_settings")
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("agency_settings")
          .insert({
            ...settings,
            user_id: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-settings"] });
      toast.success("Agency settings updated");
    },
    onError: (error) => {
      toast.error("Failed to update settings: " + error.message);
    },
  });
}
