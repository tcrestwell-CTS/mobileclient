import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Companion } from "./useCompanions";

export interface BookingTraveler {
  id: string;
  booking_id: string;
  companion_id: string;
  user_id: string;
  created_at: string;
  companion?: Companion;
}

export function useBookingTravelers(bookingId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["booking-travelers", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];

      const { data, error } = await supabase
        .from("booking_travelers")
        .select(`
          *,
          companion:client_companions(*)
        `)
        .eq("booking_id", bookingId);

      if (error) throw error;
      return data as BookingTraveler[];
    },
    enabled: !!user && !!bookingId,
  });
}

export function useAddBookingTravelers() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      bookingId,
      companionIds,
    }: {
      bookingId: string;
      companionIds: string[];
    }) => {
      if (!user) throw new Error("User not authenticated");
      if (companionIds.length === 0) return [];

      const records = companionIds.map((companionId) => ({
        booking_id: bookingId,
        companion_id: companionId,
        user_id: user.id,
      }));

      const { data, error } = await supabase
        .from("booking_travelers")
        .insert(records)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["booking-travelers", variables.bookingId],
      });
    },
    onError: (error) => {
      toast.error("Failed to add travelers: " + error.message);
    },
  });
}

export function useRemoveBookingTraveler() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      bookingId,
    }: {
      id: string;
      bookingId: string;
    }) => {
      const { error } = await supabase
        .from("booking_travelers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { bookingId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["booking-travelers", data.bookingId],
      });
      toast.success("Traveler removed from booking");
    },
    onError: (error) => {
      toast.error("Failed to remove traveler: " + error.message);
    },
  });
}
