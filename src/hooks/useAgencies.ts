import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Agency {
  id: string;
  name: string;
  owner_user_id: string;
  logo_url: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tagline: string | null;
  primary_color: string | null;
  accent_color: string | null;
  asta_number: string | null;
  clia_number: string | null;
  iata_number: string | null;
  created_at: string;
  updated_at: string;
}

export function useAgencies() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["agencies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agencies" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as Agency[];
    },
    enabled: !!user,
  });
}

export function useUpdateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Agency> & { id: string }) => {
      const { data, error } = await supabase
        .from("agencies" as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Agency;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      toast.success("Agency updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update agency: " + error.message);
    },
  });
}
