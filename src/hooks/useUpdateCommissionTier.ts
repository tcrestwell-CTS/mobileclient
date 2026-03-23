import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CommissionTier } from "@/lib/commissionTiers";

export function useUpdateCommissionTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, tier }: { userId: string; tier: CommissionTier }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ commission_tier: tier })
        .eq("user_id", userId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-profiles"] });
      toast.success("Commission tier updated");
    },
    onError: (error) => {
      console.error("Error updating commission tier:", error);
      toast.error("Failed to update commission tier");
    },
  });
}
