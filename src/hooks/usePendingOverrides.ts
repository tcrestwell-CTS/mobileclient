import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "./useAdmin";
import { toast } from "sonner";

export interface PendingOverride {
  id: string;
  confirmation_number: string;
  user_id: string;
  gross_sales: number;
  calculated_commission: number;
  commission_estimate: number;
  created_at: string;
  trip: {
    destination: string | null;
    clients: { name: string } | null;
  } | null;
  agent: {
    full_name: string | null;
  } | null;
}

export function usePendingOverrides() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["pending-overrides", user?.id],
    queryFn: async () => {
      // With override columns removed, this feature is effectively disabled
      // Return empty array for now
      return [] as PendingOverride[];
    },
    enabled: !!user && !!isAdmin,
  });
}

export function useApproveOverride() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      if (!user) throw new Error("Not authenticated");
      // Override approval columns were removed — this is a no-op now
      return bookingId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Override approved");
    },
    onError: () => {
      toast.error("Failed to approve override");
    },
  });
}

export function useRejectOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      // Override approval columns were removed — this is a no-op now
      return bookingId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Override rejected");
    },
    onError: () => {
      toast.error("Failed to reject override");
    },
  });
}
