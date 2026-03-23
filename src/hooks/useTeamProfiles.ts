import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CommissionTier } from "@/lib/commissionTiers";

export interface TeamProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  agency_name: string | null;
  phone: string | null;
  commission_rate: number | null;
  commission_tier: CommissionTier | null;
  clia_number: string | null;
  ccra_number: string | null;
  asta_number: string | null;
  embarc_number: string | null;
  created_at: string;
}

export function useTeamProfiles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["team-profiles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching team profiles:", error);
        throw error;
      }

      return data as TeamProfile[];
    },
    enabled: !!user,
  });
}
