import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MentorAssignment {
  id: string;
  mentee_user_id: string;
  mentor_user_id: string;
  assigned_by: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export function useMyMentor() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-mentor", user?.id],
    queryFn: async () => {
      // Get assignment
      const { data: assignment, error } = await supabase
        .from("mentor_assignments")
        .select("*")
        .eq("mentee_user_id", user!.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      if (!assignment) return null;

      // Get mentor profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, phone, job_title")
        .eq("user_id", assignment.mentor_user_id)
        .maybeSingle();

      return {
        ...assignment,
        mentor: profile,
      };
    },
    enabled: !!user,
  });
}
