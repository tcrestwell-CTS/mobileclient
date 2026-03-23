import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CommissionTier, getTierConfig } from "@/lib/commissionTiers";
import { useAgencySettings } from "@/hooks/useAgencySettings";

export interface Commission {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  rate: number;
  status: string;
  paid_date: string | null;
  expected_commission: number;
  created_at: string;
  updated_at: string;
  holdback_amount: number;
  holdback_released: boolean;
  holdback_released_at: string | null;
}

export interface CommissionInsert {
  booking_id: string;
  amount: number;
  rate: number;
  status?: string;
  paid_date?: string | null;
}

/** Fields explicitly allowed for commission updates */
type CommissionUpdate = {
  id: string;
  status?: string;
  paid_date?: string | null;
  holdback_released?: boolean;
  holdback_released_at?: string | null;
  amount?: number;
  rate?: number;
  expected_commission?: number;
};

// RLS policies on commissions table scope results to current user.
// Admins/office admins see all via separate policies — see database RLS config.
export function useCommissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["commissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Commission[];
    },
    enabled: !!user,
  });
}

export function useBookingCommission(bookingId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["commission", bookingId],
    queryFn: async () => {
      if (!bookingId) return null;

      const { data, error } = await supabase
        .from("commissions")
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle();

      if (error) throw error;
      return data as Commission | null;
    },
    enabled: !!user && !!bookingId,
  });
}

export function useCreateCommission() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // Cache agency settings (1hr staleTime) to avoid extra DB call per creation
  const { data: agencySettings } = useAgencySettings();

  return useMutation({
    mutationFn: async (commission: CommissionInsert) => {
      if (!user) throw new Error("User not authenticated");

      const holdbackPct = agencySettings?.commission_holdback_pct ?? 10;
      const holdbackAmount = (commission.amount * holdbackPct) / 100;

      const { data, error } = await supabase
        .from("commissions")
        .insert({
          ...commission,
          user_id: user.id,
          status: commission.status || "pending",
          holdback_amount: holdbackAmount,
          holdback_released: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["commission", data.booking_id] });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast.success("Commission created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create commission: " + error.message);
    },
  });
}

export function useUpdateCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: CommissionUpdate) => {
      const { data, error } = await supabase
        .from("commissions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    // Optimistic update for instant UI feedback on status changes
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["commissions"] });
      const previous = queryClient.getQueryData<Commission[]>(["commissions"]);
      if (previous) {
        queryClient.setQueryData<Commission[]>(["commissions"], (old) =>
          (old || []).map((c) =>
            c.id === variables.id ? { ...c, ...variables } : c
          )
        );
      }
      return { previous };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["commission", data.booking_id] });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast.success("Commission updated successfully");
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["commissions"], context.previous);
      }
      toast.error("Failed to update commission: " + error.message);
    },
  });
}

/** Merged hook: returns both commission_rate and commission_tier in a single query */
export function useUserCommissionProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-commission-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("commission_rate, commission_tier")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      const tier = data?.commission_tier as CommissionTier | null;
      const rate = tier
        ? getTierConfig(tier).agentSplit
        : (data?.commission_rate ?? 10);

      return {
        tier: (tier || "tier_1") as CommissionTier,
        rate,
        rawCommissionRate: data?.commission_rate,
      };
    },
    enabled: !!user,
  });
}

// Legacy wrappers — delegate to merged hook to avoid duplicate queries
export function useUserCommissionRate() {
  const profile = useUserCommissionProfile();
  return {
    ...profile,
    data: profile.data?.rate ?? null,
  };
}

export function useUserCommissionTier() {
  const profile = useUserCommissionProfile();
  return {
    ...profile,
    data: profile.data?.tier ?? null,
  };
}
