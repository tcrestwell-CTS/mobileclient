import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useAdmin";

// ── Shared select strings ──────────────────────────────────────────────
const BOOKING_FIELDS = `
  id,
  created_at,
  confirmation_number,
  total_price,
  status,
  user_id,
  supplier_id,
  gross_sales,
  commissionable_amount,
  commission_revenue,
  net_sales,
  calculated_commission,
  commission_estimate,
  trip_id
`;

const BOOKING_SELECT_LIST = `
  ${BOOKING_FIELDS},
  trips (
    id,
    status,
    trip_name,
    destination,
    depart_date,
    return_date,
    client_id,
    clients!trips_client_id_fkey (
      name,
      email
    )
  ),
  suppliers (
    id,
    name,
    supplier_type
  )
`;

const BOOKING_SELECT_DETAIL = `
  ${BOOKING_FIELDS},
  updated_at,
  trips (
    id,
    status,
    trip_name,
    destination,
    depart_date,
    return_date,
    client_id,
    clients!trips_client_id_fkey (
      id,
      name,
      email,
      phone,
      first_name,
      last_name,
      location,
      status
    )
  ),
  suppliers (
    id,
    name,
    commissionable_percentage,
    commission_rate
  )
`;

// ── Types ──────────────────────────────────────────────────────────────

export interface Booking {
  id: string;
  created_at: string;
  confirmation_number: string;
  total_price: number;
  status: string;
  user_id: string;
  supplier_id: string | null;
  gross_sales: number;
  commissionable_amount: number;
  commission_revenue: number;
  net_sales: number;
  calculated_commission: number;
  commission_estimate: number;
  trip_id: string | null;
  trips?: {
    id: string;
    status: string;
    trip_name: string | null;
    destination: string | null;
    depart_date: string | null;
    return_date: string | null;
    client_id: string | null;
    clients?: {
      name: string;
      email: string | null;
    } | null;
  } | null;
  suppliers?: {
    id: string;
    name: string;
    supplier_type: string;
  } | null;

  // ── Backward-compat aliases (all optional, derived from trips relation) ──
  booking_reference?: string;
  total_amount?: number;
  destination?: string;
  depart_date?: string;
  return_date?: string;
  trip_name?: string | null;
  client_id?: string;
  clients?: { name: string; email: string | null } | null;
  booking_type?: string;
  travelers?: number;
  notes?: string | null;
  owner_agent?: string | null;
  trip_page_url?: string | null;
  override_pending_approval?: boolean;
  approval_required?: boolean;
  supplier_payout?: number;
  commission_override_amount?: number | null;
  override_approved?: boolean;
  override_approved_by?: string | null;
  override_approved_at?: string | null;
  override_notes?: string | null;
  cancelled_at?: string | null;
  cancellation_penalty?: number;
  cancellation_refund_amount?: number;
  cancellation_reason?: string | null;
  approval_type?: string | null;
}

// Helper to check if a booking should be excluded from reporting
export function isBookingArchived(booking: Booking): boolean {
  return booking.trips?.status === "archived";
}

export interface CreateBookingData {
  trip_id?: string;
  supplier_id?: string;
  total_price?: number;
  gross_sales?: number;
  commission_rate?: number;
  commission_estimate?: number;
  // Legacy fields kept for backward compat with existing dialogs
  client_id?: string;
  destination?: string;
  depart_date?: string;
  return_date?: string;
  travelers?: number;
  total_amount?: number;
  trip_name?: string;
  notes?: string;
  send_confirmation_email?: boolean;
  supplier_payout?: number;
  commissionable_percentage?: number;
  commission_override_amount?: number;
  override_notes?: string;
}

export interface UpdateBookingData {
  supplier_id?: string | null;
  total_price?: number;
  gross_sales?: number;
  commissionable_amount?: number;
  commission_revenue?: number;
  net_sales?: number;
  commission_estimate?: number;
}

// ── Main hook ──────────────────────────────────────────────────────────

export function useBookings() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT_LIST)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings((data as any) || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchBookings();
    } else {
      setLoading(false);
    }
  }, [user, fetchBookings]);

  const generateConfirmationNumber = () => {
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    const random = Array.from(array, b => b.toString(36).padStart(2, '0')).join('').toUpperCase().slice(0, 12);
    return `CW-${random}`;
  };

  const createBooking = async (data: CreateBookingData) => {
    if (!user) {
      toast.error("You must be logged in to create a booking");
      return null;
    }

    setCreating(true);
    try {
      const confirmationNumber = generateConfirmationNumber();

      const grossSales = data.gross_sales ?? data.total_price;
      const commissionRate = data.commission_rate ?? 10;
      const netSales = grossSales;
      const commissionableAmount = netSales;
      const commissionRevenue = netSales * (commissionRate / 100);

      const hasOverride = data.commission_override_amount !== undefined && data.commission_override_amount !== null;
      const overridePending = hasOverride && data.commission_override_amount! > commissionRevenue;

      const { data: newBooking, error } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          trip_id: data.trip_id,
          confirmation_number: confirmationNumber,
          total_price: data.total_price,
          status: "confirmed",
          supplier_id: data.supplier_id || null,
          gross_sales: grossSales,
          commissionable_amount: commissionableAmount,
          commission_revenue: hasOverride ? data.commission_override_amount! : commissionRevenue,
          net_sales: netSales,
          calculated_commission: commissionRevenue,
          commission_estimate: data.commission_estimate ?? 0,
          supplier_payout: data.supplier_payout ?? 0,
          commission_override_amount: hasOverride ? data.commission_override_amount : null,
          override_notes: data.override_notes || null,
          override_pending_approval: overridePending,
        } as any)
        .select("*")
        .single();

      if (error) {
        console.error("Error creating booking:", error);
        toast.error("Failed to create booking");
        return null;
      }

      toast.success("Booking created successfully");
      await fetchBookings();
      return newBooking;
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error("Failed to create booking");
      return null;
    } finally {
      setCreating(false);
    }
  };

  const updateBookingStatus = async (
    bookingId: string,
    newStatus: string,
  ) => {
    if (!user) {
      toast.error("You must be logged in to update bookings");
      return false;
    }

    setUpdatingStatusId(bookingId);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus } as any)
        .eq("id", bookingId);

      if (error) {
        console.error("Error updating booking status:", error);
        toast.error("Failed to update booking status");
        return false;
      }

      toast.success(`Booking status updated to ${newStatus}`);
      await fetchBookings();
      return true;
    } catch (error) {
      console.error("Error updating booking status:", error);
      toast.error("Failed to update booking status");
      return false;
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const updateBooking = async (bookingId: string, data: UpdateBookingData) => {
    if (!user) {
      toast.error("You must be logged in to update bookings");
      return false;
    }

    setUpdating(true);
    try {
      const updatePayload: Record<string, unknown> = {};

      if (data.total_price !== undefined) updatePayload.total_price = data.total_price;
      if (data.supplier_id !== undefined) updatePayload.supplier_id = data.supplier_id;
      if (data.gross_sales !== undefined) updatePayload.gross_sales = data.gross_sales;
      if (data.commissionable_amount !== undefined) updatePayload.commissionable_amount = data.commissionable_amount;
      if (data.commission_revenue !== undefined) updatePayload.commission_revenue = data.commission_revenue;
      if (data.net_sales !== undefined) updatePayload.net_sales = data.net_sales;
      if (data.commission_estimate !== undefined) updatePayload.commission_estimate = data.commission_estimate;

      const { error } = await supabase
        .from("bookings")
        .update(updatePayload as any)
        .eq("id", bookingId);

      if (error) {
        console.error("Error updating booking:", error);
        toast.error("Failed to update booking");
        return false;
      }

      toast.success("Booking updated successfully");
      await fetchBookings();
      return true;
    } catch (error) {
      console.error("Error updating booking:", error);
      toast.error("Failed to update booking");
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const deleteBooking = async (bookingId: string) => {
    if (!user) {
      toast.error("You must be logged in to delete bookings");
      return false;
    }

    try {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("trip_payments")
        .select("id")
        .eq("booking_id", bookingId)
        .limit(1);

      if (paymentsError) throw paymentsError;

      if (paymentsData && paymentsData.length > 0) {
        toast.error("Cannot delete booking — payments are logged against it. Remove all payments first.");
        return false;
      }
    } catch (error) {
      console.error("Error checking booking payments:", error);
      toast.error("Failed to verify booking payments");
      return false;
    }

    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId);

      if (error) {
        console.error("Error deleting booking:", error);
        toast.error("Failed to delete booking");
        return false;
      }

      toast.success("Booking deleted successfully");
      await fetchBookings();
      return true;
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast.error("Failed to delete booking");
      return false;
    }
  };

  return {
    bookings,
    loading,
    creating,
    updating,
    updatingStatusId,
    isAdmin: !!isAdmin,
    createBooking,
    updateBooking,
    updateBookingStatus,
    deleteBooking,
    refetch: fetchBookings,
  };
}

// ── Detail hook ────────────────────────────────────────────────────────

export interface BookingWithClient extends Booking {
  updated_at?: string;
}

export function useBooking(bookingId: string | undefined) {
  const { user } = useAuth();
  const [booking, setBooking] = useState<BookingWithClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!user || !bookingId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from("bookings")
          .select(BOOKING_SELECT_DETAIL)
          .eq("id", bookingId)
          .maybeSingle();

        if (fetchError) throw fetchError;
        setBooking(data as any);
      } catch (err) {
        console.error("Error fetching booking:", err);
        setError(err instanceof Error ? err : new Error("Failed to fetch booking"));
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [user, bookingId, refetchTrigger]);

  return { booking, loading, error, refetch };
}

// ── Client bookings hook ───────────────────────────────────────────────

export function useClientBookings(clientId: string | undefined) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClientBookings = async () => {
      if (!user || !clientId) {
        setLoading(false);
        return;
      }

      try {
        // Find bookings via trips that belong to this client
        const { data: trips, error: tripsError } = await supabase
          .from("trips")
          .select("id")
          .eq("client_id", clientId);

        if (tripsError) throw tripsError;

        const tripIds = (trips || []).map(t => t.id);
        if (tripIds.length === 0) {
          setBookings([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("bookings")
          .select(`
            ${BOOKING_FIELDS},
            trips (
              id,
              status,
              trip_name,
              destination,
              depart_date,
              return_date,
              client_id
            )
          `)
          .in("trip_id", tripIds)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setBookings((data as any) || []);
      } catch (err) {
        console.error("Error fetching client bookings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClientBookings();
  }, [user, clientId]);

  return { bookings, loading };
}
