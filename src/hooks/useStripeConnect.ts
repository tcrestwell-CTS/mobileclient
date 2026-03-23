import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ConnectStatus {
  exists: boolean;
  stripeAccountId?: string;
  businessName?: string;
  onboardingStatus?: string;
  cardIssuingStatus?: string;
  transfersStatus?: string;
  requirementsDue?: string[];
  requirementsPastDue?: string[];
  requirementsEventuallyDue?: string[];
}

export function useStripeConnect() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-onboarding?action=status`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setStatus(result);
    } catch (error: any) {
      console.error("Error fetching connect status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const createAccount = async (data: Record<string, any>) => {
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect-onboarding?action=create`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      
      if (result.alreadyExists) {
        toast.info("Connected account already exists");
      } else {
        toast.success("Stripe Connect account created successfully!");
      }
      
      await fetchStatus();
      return result;
    } catch (error: any) {
      console.error("Error creating connect account:", error);
      toast.error(error.message || "Failed to create connected account");
      return null;
    } finally {
      setCreating(false);
    }
  };

  return {
    status,
    loading,
    creating,
    fetchStatus,
    createAccount,
  };
}
