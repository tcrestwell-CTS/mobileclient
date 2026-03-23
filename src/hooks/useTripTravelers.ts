import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TripTraveler {
  id: string;
  trip_id: string;
  user_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  relationship: string;
  is_primary: boolean;
  notes: string | null;
  known_traveler_number: string | null;
  passport_info: string | null;
  birthday: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripTravelerInsert {
  trip_id: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  relationship?: string;
  is_primary?: boolean;
  notes?: string | null;
  known_traveler_number?: string | null;
  passport_info?: string | null;
  birthday?: string | null;
}

export function useTripTravelers(tripId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trip-travelers", tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from("trip_travelers")
        .select("*")
        .eq("trip_id", tripId)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TripTraveler[];
    },
    enabled: !!user && !!tripId,
  });
}

export function useCreateTripTraveler() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (traveler: TripTravelerInsert & { client_id?: string | null }) => {
      if (!user) throw new Error("Not authenticated");
      const { client_id, ...travelerData } = traveler;
      const { data, error } = await supabase
        .from("trip_travelers")
        .insert({ ...travelerData, user_id: user.id })
        .select()
        .single();
      if (error) throw error;

      // Also create as a client companion if trip has a client
      if (client_id) {
        await supabase
          .from("client_companions")
          .insert({
            client_id,
            user_id: user.id,
            first_name: travelerData.first_name,
            last_name: travelerData.last_name || null,
            relationship: travelerData.relationship || "companion",
            email: travelerData.email || null,
            phone: travelerData.phone || null,
            birthday: travelerData.birthday || null,
            known_traveler_number: travelerData.known_traveler_number || null,
            passport_info: travelerData.passport_info || null,
            notes: travelerData.notes || null,
          });
        // Don't throw on companion insert failure — it's a best-effort sync
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trip-travelers", data.trip_id] });
      queryClient.invalidateQueries({ queryKey: ["companions"] });
      toast.success("Traveler added");
    },
    onError: (error: Error) => {
      toast.error("Failed to add traveler: " + error.message);
    },
  });
}

export function useUpdateTripTraveler() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TripTraveler> & { id: string }) => {
      const { data, error } = await supabase
        .from("trip_travelers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trip-travelers", data.trip_id] });
      toast.success("Traveler updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update traveler: " + error.message);
    },
  });
}

export function useDeleteTripTraveler() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tripId }: { id: string; tripId: string }) => {
      const { error } = await supabase
        .from("trip_travelers")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { tripId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["trip-travelers", data.tripId] });
      toast.success("Traveler removed");
    },
    onError: (error: Error) => {
      toast.error("Failed to remove traveler: " + error.message);
    },
  });
}
