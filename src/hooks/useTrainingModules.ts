import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TrainingModule {
  id: string;
  title: string;
  description: string | null;
  category: string;
  is_required: boolean;
  estimated_minutes: number;
  resource_url: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
}

export interface TrainingProgress {
  id: string;
  user_id: string;
  module_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
}

export function useTrainingModules() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["training-modules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_modules")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as TrainingModule[];
    },
    enabled: !!user,
  });
}

export function useMyTrainingProgress() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-training-progress", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_training_progress")
        .select("*")
        .eq("user_id", user!.id);

      if (error) throw error;
      return data as TrainingProgress[];
    },
    enabled: !!user,
  });
}

export function useUpdateTrainingProgress() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      moduleId,
      status,
    }: {
      moduleId: string;
      status: "not_started" | "in_progress" | "completed";
    }) => {
      if (!user) throw new Error("Not authenticated");

      const updates: Record<string, unknown> = {
        user_id: user.id,
        module_id: moduleId,
        status,
      };

      if (status === "in_progress") updates.started_at = new Date().toISOString();
      if (status === "completed") updates.completed_at = new Date().toISOString();

      // Check if record exists
      const { data: existing } = await supabase
        .from("agent_training_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("module_id", moduleId)
        .maybeSingle();

      let error;
      if (existing) {
        ({ error } = await supabase
          .from("agent_training_progress")
          .update({ status, ...(status === "in_progress" ? { started_at: new Date().toISOString() } : {}), ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}) })
          .eq("id", existing.id));
      } else {
        ({ error } = await supabase
          .from("agent_training_progress")
          .insert({
            user_id: user.id,
            module_id: moduleId,
            status,
            ...(status === "in_progress" ? { started_at: new Date().toISOString() } : {}),
            ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
          }));
      }

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-training-progress"] });
    },
  });
}

export function useCreateTrainingModule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (module: {
      title: string;
      description?: string;
      category: string;
      is_required: boolean;
      estimated_minutes: number;
      resource_url?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("training_modules")
        .insert({ ...module, created_by: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-modules"] });
    },
  });
}
