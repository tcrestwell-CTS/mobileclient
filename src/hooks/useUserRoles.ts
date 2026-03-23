import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type AppRole = "admin" | "office_admin" | "user";

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export function useAllUserRoles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["all-user-roles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*");

      if (error) {
        console.error("Error fetching user roles:", error);
        throw error;
      }

      return data as UserRole[];
    },
    enabled: !!user,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole | null }) => {
      if (role === null) {
        // Remove all roles for this user
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        if (error) throw error;
        return null;
      }

      // Check if user already has a role
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        // Update existing role
        const { data, error } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new role
        const { data, error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["team-profiles"] });
      toast.success("Role updated successfully");
    },
    onError: (error) => {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["team-profiles"] });
      toast.success("User removed from team");
    },
    onError: (error: Error) => {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Failed to remove user");
    },
  });
}
