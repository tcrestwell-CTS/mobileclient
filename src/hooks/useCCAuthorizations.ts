import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CCAuthorization {
  id: string;
  booking_id: string;
  client_id: string;
  authorization_amount: number;
  authorization_description: string | null;
  last_four: string | null;
  cardholder_name: string | null;
  status: string;
  authorized_at: string | null;
  expires_at: string | null;
  access_token: string;
  created_at: string;
  signature_url: string | null;
}

export function useCCAuthorizations(bookingId: string | undefined) {
  const { user } = useAuth();
  const [authorizations, setAuthorizations] = useState<CCAuthorization[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchAuthorizations = useCallback(async () => {
    if (!user || !bookingId) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cc-authorization?action=list&booking_id=${bookingId}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const result = await response.json();
      if (response.ok) {
        setAuthorizations(result.authorizations || []);
      }
    } catch (error) {
      console.error("Error fetching CC authorizations:", error);
    } finally {
      setLoading(false);
    }
  }, [user, bookingId]);

  const createAuthorization = async (data: {
    booking_id: string;
    client_id: string;
    authorization_amount: number;
    authorization_description?: string;
  }) => {
    if (!user) return null;
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cc-authorization?action=create`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success("CC authorization request created");
      await fetchAuthorizations();
      return result;
    } catch (error: any) {
      console.error("Error creating CC authorization:", error);
      toast.error(error.message || "Failed to create authorization request");
      return null;
    } finally {
      setCreating(false);
    }
  };

  const decryptCC = async (authorizationId: string, password: string) => {
    if (!user) return null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cc-authorization?action=decrypt`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ authorization_id: authorizationId, password }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    } catch (error: any) {
      console.error("Error decrypting CC:", error);
      toast.error(error.message || "Failed to retrieve CC information");
      return null;
    }
  };

  return {
    authorizations,
    loading,
    creating,
    fetchAuthorizations,
    createAuthorization,
    decryptCC,
  };
}
