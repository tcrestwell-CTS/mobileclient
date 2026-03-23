import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export interface VirtualCardEvent {
  id: string;
  trip_id: string;
  amount: number;
  payment_method_choice: string | null;
  virtual_card_status: string | null;
  virtual_card_id: string | null;
  status: string;
  updated_at: string;
  created_at: string;
  trip_name: string | null;
}

/**
 * Fetches trip_payments that have a virtual card flow (payment_method_choice is stripe or affirm)
 * and subscribes to realtime updates on virtual_card_status changes.
 */
export function useVirtualCardEvents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["virtual-card-events", user?.id],
    queryFn: async (): Promise<VirtualCardEvent[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("trip_payments")
        .select(`
          id,
          trip_id,
          amount,
          payment_method_choice,
          virtual_card_status,
          virtual_card_id,
          status,
          updated_at,
          created_at,
          trips!trip_payments_trip_id_fkey ( trip_name )
        `)
        .eq("user_id", user.id)
        .not("payment_method_choice", "is", null)
        .in("payment_method_choice", ["stripe", "affirm"])
        .order("updated_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        trip_id: row.trip_id,
        amount: row.amount,
        payment_method_choice: row.payment_method_choice,
        virtual_card_status: row.virtual_card_status,
        virtual_card_id: row.virtual_card_id,
        status: row.status,
        updated_at: row.updated_at,
        created_at: row.created_at,
        trip_name: row.trips?.trip_name || null,
      }));
    },
    enabled: !!user?.id,
    staleTime: 15_000,
  });

  // Realtime: listen for UPDATE on trip_payments for this user
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("virtual-card-events-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trip_payments",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["virtual-card-events", user.id] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_payments",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["virtual-card-events", user.id] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    events: query.data || [],
    isLoading: query.isLoading,
  };
}
