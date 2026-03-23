import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WorkflowTask {
  id: string;
  trip_id: string;
  user_id: string;
  title: string;
  description: string | null;
  task_type: string;
  status: string;
  due_at: string | null;
  created_at: string;
  completed_at: string | null;
}

export function useWorkflowTasks(tripId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["workflow-tasks", tripId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      let q = supabase
        .from("workflow_tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (tripId) {
        q = q.eq("trip_id", tripId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as WorkflowTask[];
    },
    enabled: !!user?.id,
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("workflow_tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() } as any)
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-tasks"] });
    },
  });

  const dismissTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("workflow_tasks")
        .update({ status: "dismissed" } as any)
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-tasks"] });
    },
  });

  const pendingTasks = (query.data || []).filter((t) => t.status === "pending");

  return {
    tasks: query.data || [],
    pendingTasks,
    isLoading: query.isLoading,
    completeTask,
    dismissTask,
  };
}
