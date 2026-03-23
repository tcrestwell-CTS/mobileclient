import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface InsuranceSettings {
  id: string;
  trip_id: string;
  user_id: string;
  amount_to_insure: number;
  use_full_trip_cost: boolean;
  ready_for_client_review: boolean;
  allow_skip_selection: boolean;
  agency_disclaimer: string;
  created_at: string;
  updated_at: string;
}

export interface InsuranceQuote {
  id: string;
  trip_id: string;
  user_id: string;
  provider_name: string;
  plan_name: string | null;
  premium_amount: number;
  coverage_amount: number;
  coverage_details: string | null;
  quote_url: string | null;
  is_recommended: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface InsuranceResponse {
  id: string;
  trip_id: string;
  client_id: string;
  response_type: "accepted" | "declined_no_insurance" | "declined_buying_elsewhere";
  selected_quote_id: string | null;
  acknowledgment_text: string | null;
  responded_at: string;
  created_at: string;
}

export function useTripInsurance(tripId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["trip-insurance-settings", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_insurance_settings")
        .select("*")
        .eq("trip_id", tripId!)
        .maybeSingle();
      if (error) throw error;
      return data as InsuranceSettings | null;
    },
    enabled: !!tripId,
  });

  const quotesQuery = useQuery({
    queryKey: ["trip-insurance-quotes", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_insurance_quotes")
        .select("*")
        .eq("trip_id", tripId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as InsuranceQuote[];
    },
    enabled: !!tripId,
  });

  const responsesQuery = useQuery({
    queryKey: ["trip-insurance-responses", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_insurance_responses")
        .select("*")
        .eq("trip_id", tripId!)
        .order("responded_at", { ascending: false });
      if (error) throw error;
      return (data || []) as InsuranceResponse[];
    },
    enabled: !!tripId,
  });

  const upsertSettings = useMutation({
    mutationFn: async (values: Partial<InsuranceSettings>) => {
      const payload = {
        trip_id: tripId!,
        user_id: user!.id,
        ...values,
        updated_at: new Date().toISOString(),
      };

      if (settingsQuery.data?.id) {
        const { error } = await supabase
          .from("trip_insurance_settings")
          .update(payload)
          .eq("id", settingsQuery.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("trip_insurance_settings")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-insurance-settings", tripId] });
      toast.success("Insurance settings updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addQuote = useMutation({
    mutationFn: async (values: Partial<InsuranceQuote>) => {
      const { error } = await supabase
        .from("trip_insurance_quotes")
        .insert({
          trip_id: tripId!,
          user_id: user!.id,
          provider_name: values.provider_name!,
          plan_name: values.plan_name,
          premium_amount: values.premium_amount || 0,
          coverage_amount: values.coverage_amount || 0,
          coverage_details: values.coverage_details,
          quote_url: values.quote_url,
          is_recommended: values.is_recommended || false,
          sort_order: (quotesQuery.data?.length || 0),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-insurance-quotes", tripId] });
      toast.success("Quote added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateQuote = useMutation({
    mutationFn: async ({ id, ...values }: Partial<InsuranceQuote> & { id: string }) => {
      const { error } = await supabase
        .from("trip_insurance_quotes")
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-insurance-quotes", tripId] });
      toast.success("Quote updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteQuote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trip_insurance_quotes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-insurance-quotes", tripId] });
      toast.success("Quote removed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return {
    settings: settingsQuery.data,
    quotes: quotesQuery.data || [],
    responses: responsesQuery.data || [],
    isLoading: settingsQuery.isLoading || quotesQuery.isLoading,
    upsertSettings,
    addQuote,
    updateQuote,
    deleteQuote,
  };
}
