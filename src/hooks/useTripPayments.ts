import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TripPayment {
  id: string;
  trip_id: string;
  booking_id: string | null;
  user_id: string;
  amount: number;
  payment_date: string;
  due_date: string | null;
  payment_type: string;
  payment_method: string | null;
  status: string;
  details: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  stripe_session_id: string | null;
  stripe_payment_url: string | null;
  stripe_receipt_url: string | null;
  payment_method_choice: string | null;
  virtual_card_status: string | null;
  virtual_card_id: string | null;
  bookings?: {
    id: string;
    confirmation_number: string;
    suppliers?: {
      name: string;
      supplier_type: string;
    } | null;
  } | null;
}

export interface CreatePaymentData {
  trip_id: string;
  booking_id?: string | null;
  amount: number;
  payment_date?: string;
  due_date?: string | null;
  payment_type?: string;
  payment_method?: string | null;
  status?: string;
  details?: string | null;
  notes?: string | null;
}

export interface UpdatePaymentData {
  amount?: number;
  payment_date?: string;
  due_date?: string | null;
  payment_type?: string;
  payment_method?: string | null;
  status?: string;
  details?: string | null;
  notes?: string | null;
}

export function useTripPayments(tripId: string | undefined) {
  const { user } = useAuth();
  const [payments, setPayments] = useState<TripPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchPayments = useCallback(async () => {
    if (!user || !tripId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("trip_payments")
        .select(`
          *,
          bookings (
            id,
            confirmation_number,
            suppliers (
              name,
              supplier_type
            )
          )
        `)
        .eq("trip_id", tripId)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching trip payments:", error);
    } finally {
      setLoading(false);
    }
  }, [user, tripId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const createPayment = async (data: CreatePaymentData) => {
    if (!user) {
      toast.error("You must be logged in to add a payment");
      return null;
    }

    setCreating(true);
    try {
      const { data: newPayment, error } = await supabase
        .from("trip_payments")
        .insert({
          user_id: user.id,
          trip_id: data.trip_id,
          booking_id: data.booking_id || null,
          amount: data.amount,
          payment_date: data.payment_date || new Date().toISOString().split("T")[0],
          due_date: data.due_date || null,
          payment_type: data.payment_type || "payment",
          payment_method: data.payment_method || null,
          status: data.status || "pending",
          details: data.details || null,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating payment:", error);
        toast.error("Failed to add payment");
        return null;
      }

      toast.success("Payment added successfully");
      await fetchPayments();
      return newPayment;
    } catch (error) {
      console.error("Error creating payment:", error);
      toast.error("Failed to add payment");
      return null;
    } finally {
      setCreating(false);
    }
  };

  const updatePayment = async (paymentId: string, data: UpdatePaymentData) => {
    if (!user) {
      toast.error("You must be logged in to update payments");
      return false;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("trip_payments")
        .update(data)
        .eq("id", paymentId);

      if (error) {
        console.error("Error updating payment:", error);
        toast.error("Failed to update payment");
        return false;
      }

      toast.success("Payment updated successfully");
      await fetchPayments();
      return true;
    } catch (error) {
      console.error("Error updating payment:", error);
      toast.error("Failed to update payment");
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const deletePayment = async (paymentId: string) => {
    if (!user) {
      toast.error("You must be logged in to delete payments");
      return false;
    }

    try {
      const { error } = await supabase
        .from("trip_payments")
        .delete()
        .eq("id", paymentId);

      if (error) {
        console.error("Error deleting payment:", error);
        toast.error("Failed to delete payment");
        return false;
      }

      toast.success("Payment deleted successfully");
      await fetchPayments();
      return true;
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error("Failed to delete payment");
      return false;
    }
  };

  // Calculate totals
  const totalExpected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAuthorized = payments
    .filter((p) => p.status === "authorized")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalRemaining = totalExpected - totalPaid;

  return {
    payments,
    loading,
    creating,
    updating,
    fetchPayments,
    createPayment,
    updatePayment,
    deletePayment,
    totalExpected,
    totalPaid,
    totalAuthorized,
    totalRemaining,
  };
}
