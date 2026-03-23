import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  entity_type: string;
  entity_id: string | null;
  title: string;
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export function useActivities(limit = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["activities", user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as unknown as Activity[];
    },
    enabled: !!user,
  });
}

export function useLogActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (activity: Omit<Activity, "id" | "user_id" | "created_at">) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("activities" as any)
        .insert({ ...activity, user_id: user.id } as any)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Activity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}
