import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmailLog {
  id: string;
  user_id: string;
  client_id: string;
  to_email: string;
  subject: string;
  template: string;
  status: string;
  sent_at: string;
  created_at: string;
}

export function useEmailLogs(clientId: string | undefined) {
  return useQuery({
    queryKey: ["email-logs", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .eq("client_id", clientId)
        .order("sent_at", { ascending: false });

      if (error) {
        console.error("Error fetching email logs:", error);
        throw error;
      }

      return data as EmailLog[];
    },
    enabled: !!clientId,
  });
}
