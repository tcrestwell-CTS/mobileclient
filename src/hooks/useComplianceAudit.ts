import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ComplianceAuditEntry {
  id: string;
  user_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  client_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  signature: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface RefundRecord {
  id: string;
  amount: number;
  payment_date: string;
  status: string;
  details: string | null;
  notes: string | null;
  stripe_receipt_url: string | null;
  trip_id: string;
  user_id: string;
  created_at: string;
  trip?: { trip_name: string; client_id: string | null } | null;
}

export interface CancelledBooking {
  id: string;
  booking_reference: string;
  destination: string;
  trip_name: string | null;
  total_amount: number;
  gross_sales: number;
  status: string;
  cancelled_at: string | null;
  cancellation_penalty: number;
  cancellation_refund_amount: number;
  cancellation_reason: string | null;
  user_id: string;
  created_at: string;
  clients?: { name: string } | null;
}

export function useComplianceAuditLog() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["compliance-audit-log", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data || []) as ComplianceAuditEntry[];
    },
    enabled: !!user,
  });
}

export function useRefundedPayments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["refunded-payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_payments")
        .select(`
          id, amount, payment_date, status, details, notes,
          stripe_receipt_url, trip_id, user_id, created_at,
          trips:trip_id (trip_name, client_id)
        `)
        .in("status", ["refunded", "disputed"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as RefundRecord[];
    },
    enabled: !!user,
  });
}

export function useCancelledBookings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["cancelled-bookings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, booking_reference, destination, trip_name, total_amount,
          gross_sales, status, cancelled_at, cancellation_penalty,
          cancellation_refund_amount, cancellation_reason, user_id, created_at,
          clients (name)
        `)
        .eq("status", "cancelled")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as CancelledBooking[];
    },
    enabled: !!user,
  });
}
