import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Error checking admin status:", error);
        return false;
      }

      return !!data;
    },
    enabled: !!user,
  });
}

export function useIsOfficeAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["is-office-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "office_admin")
        .maybeSingle();

      if (error) {
        console.error("Error checking office admin status:", error);
        return false;
      }

      return !!data;
    },
    enabled: !!user,
  });
}

export function useUserRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      if (!data) return "user"; // Default to agent if no role assigned
      
      return data.role as "admin" | "office_admin" | "user";
    },
    enabled: !!user,
  });
}

export function useCanViewTeam() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: isOfficeAdmin, isLoading: officeAdminLoading } = useIsOfficeAdmin();

  return {
    canView: isAdmin || isOfficeAdmin,
    canManage: isAdmin,
    isLoading: adminLoading || officeAdminLoading,
  };
}
