import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Companion {
  id: string;
  client_id: string;
  user_id: string;
  first_name: string;
  last_name: string | null;
  relationship: string;
  birthday: string | null;
  email: string | null;
  phone: string | null;
  passport_info: string | null;
  known_traveler_number: string | null;
  redress_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanionInsert {
  client_id: string;
  first_name: string;
  last_name?: string | null;
  relationship: string;
  birthday?: string | null;
  email?: string | null;
  phone?: string | null;
  passport_info?: string | null;
  known_traveler_number?: string | null;
  redress_number?: string | null;
  notes?: string | null;
}

export function useCompanions(clientId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["companions", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from("client_companions")
        .select("*")
        .eq("client_id", clientId)
        .order("first_name", { ascending: true });

      if (error) throw error;
      return data as Companion[];
    },
    enabled: !!user && !!clientId,
  });
}

export function useCreateCompanion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (companion: CompanionInsert) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("client_companions")
        .insert({ ...companion, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["companions", data.client_id] });
      toast.success("Companion added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add companion: " + error.message);
    },
  });
}

export function useUpdateCompanion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Companion> & { id: string }) => {
      const { data, error } = await supabase
        .from("client_companions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["companions", data.client_id] });
      toast.success("Companion updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update companion: " + error.message);
    },
  });
}

export function useDeleteCompanion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from("client_companions")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return { clientId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["companions", data.clientId] });
      toast.success("Companion removed successfully");
    },
    onError: (error) => {
      toast.error("Failed to remove companion: " + error.message);
    },
  });
}
