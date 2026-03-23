import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Client = Tables<"clients">;
export type ClientInsert = TablesInsert<"clients">;

export function useClients() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Client[];
    },
    enabled: !!user,
  });
}

export function useClient(clientId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .maybeSingle();

      if (error) throw error;
      return data as Client | null;
    },
    enabled: !!user && !!clientId,
  });
}

export function useClientWithBookings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["clients-with-bookings", user?.id],
    queryFn: async () => {
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (clientsError) throw clientsError;

      // Fetch booking stats via trips
      const { data: trips, error: tripsError } = await supabase
        .from("trips")
        .select("id, client_id");
      
      if (tripsError) throw tripsError;
      
      const tripsByClient = (trips || []).reduce((acc: Record<string, string[]>, t: any) => {
        if (t.client_id) {
          if (!acc[t.client_id]) acc[t.client_id] = [];
          acc[t.client_id].push(t.id);
        }
        return acc;
      }, {});

      const allTripIds = (trips || []).map((t: any) => t.id);
      
      let bookingStats: Record<string, { count: number; total: number }> = {};
      
      if (allTripIds.length > 0) {
        const { data: bookings, error: bookingsError } = await supabase
          .from("bookings")
          .select("trip_id, total_price")
          .in("trip_id", allTripIds);

        if (bookingsError) throw bookingsError;

        // Map bookings back to clients via trip_id
        bookingStats = (bookings || []).reduce((acc: Record<string, { count: number; total: number }>, booking: any) => {
          // Find which client owns this trip
          const clientId = Object.keys(tripsByClient).find(cid => tripsByClient[cid].includes(booking.trip_id));
          if (clientId) {
            if (!acc[clientId]) acc[clientId] = { count: 0, total: 0 };
            acc[clientId].count += 1;
            acc[clientId].total += Number(booking.total_price) || 0;
          }
          return acc;
        }, {});
      }

      return (clients || []).map((client) => ({
        ...client,
        totalBookings: bookingStats?.[client.id]?.count || 0,
        totalSpent: bookingStats?.[client.id]?.total || 0,
      }));
    },
    enabled: !!user,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (client: Omit<ClientInsert, "user_id">) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("clients")
        .insert({ ...client, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients-with-bookings"] });
      toast.success("Client created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create client: " + error.message);
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients-with-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["client", data.id] });
    },
    onError: (error) => {
      toast.error("Failed to update client: " + error.message);
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients-with-bookings"] });
      toast.success("Client deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete client: " + error.message);
    },
  });
}
