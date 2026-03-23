import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface QBOSyncLog {
  id: string;
  sync_type: string;
  direction: string;
  status: string;
  records_processed: number;
  error_message: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export function useQBOSyncLogs(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["qbo-sync-logs", user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qbo_sync_logs")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as QBOSyncLog[];
    },
    enabled: !!user,
  });
}
