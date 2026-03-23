import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useAdmin";

export interface Trip {
  id: string;
  user_id: string;
  client_id: string;
  trip_name: string;
  destination: string | null;
  status: string;
  depart_date: string | null;
  return_date: string | null;
  trip_type: string | null;
  notes: string | null;
  trip_page_url: string | null;
  total_gross_sales: number;
  total_commissionable_amount: number;
  total_commission_revenue: number;
  total_net_sales: number;
  total_supplier_payout: number;
  created_at: string;
  updated_at: string;
  share_token: string;
  published_at: string | null;
  cover_image_url: string | null;
  approved_itinerary_id: string | null;
  itinerary_approved_at: string | null;
  parent_trip_id: string | null;
  currency: string;
  pricing_visibility: string;
  tags: string[];
  allow_pdf_downloads: boolean;
  itinerary_style: string;
  proposal_sent_at: string | null;
  follow_up_due_at: string | null;
  clients?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  bookings?: TripBooking[];
  isOptimistic?: boolean;
}

export interface TripBooking {
  id: string;
  confirmation_number: string;
  status: string;
  total_price: number;
  gross_sales: number;
  commissionable_amount: number;
  commission_revenue: number;
  commission_estimate: number;
  supplier_id: string | null;
  suppliers?: {
    id: string;
    name: string;
    supplier_type: string;
  } | null;
  // Backward-compat aliases (optional)
  booking_reference?: string;
  destination?: string;
  depart_date?: string;
  return_date?: string;
  travelers?: number;
  trip_name?: string | null;
}

export interface CreateTripData {
  client_id?: string;
  trip_name: string;
  destination?: string;
  depart_date?: string;
  return_date?: string;
  trip_type?: string;
  notes?: string;
  trip_page_url?: string;
  parent_trip_id?: string;
}

export interface UpdateTripData {
  trip_name?: string;
  destination?: string;
  status?: string;
  depart_date?: string;
  return_date?: string;
  trip_type?: string;
  notes?: string;
  trip_page_url?: string;
}

export function useTrips() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchTrips = useCallback(async () => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("trips")
        .select(`
          *,
          clients!trips_client_id_fkey (
            id,
            name,
            email,
            phone
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error("Error fetching trips:", error);
      toast.error("Unable to load trips. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTrips();
    } else {
      setLoading(false);
    }
  }, [user, fetchTrips]);

  const createTrip = async (data: CreateTripData) => {
    if (!user) {
      toast.error("You must be logged in to create a trip");
      return null;
    }

    // Create optimistic trip for immediate UI update
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticTrip: Trip = {
      id: optimisticId,
      user_id: user.id,
      client_id: data.client_id || null,
      trip_name: data.trip_name,
      destination: data.destination || null,
      depart_date: data.depart_date || null,
      return_date: data.return_date || null,
      trip_type: data.trip_type || "regular",
      notes: data.notes || null,
      trip_page_url: data.trip_page_url || null,
          status: "lead",
          total_gross_sales: 0,
      total_commissionable_amount: 0,
      total_commission_revenue: 0,
      total_net_sales: 0,
      total_supplier_payout: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      share_token: "",
      published_at: null,
      cover_image_url: null,
      approved_itinerary_id: null,
      itinerary_approved_at: null,
      parent_trip_id: data.parent_trip_id || null,
      currency: "USD",
      pricing_visibility: "show_all",
      tags: [],
      allow_pdf_downloads: false,
      itinerary_style: "vertical_list",
      proposal_sent_at: null,
      follow_up_due_at: null,
      clients: null,
      isOptimistic: true,
    };

    // Add optimistic trip to state immediately
    setTrips((prev) => [optimisticTrip, ...prev]);
    setCreating(true);

    try {
      const { data: newTrip, error } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          client_id: data.client_id || null,
          trip_name: data.trip_name,
          destination: data.destination || null,
          depart_date: data.depart_date || null,
          return_date: data.return_date || null,
          trip_type: data.trip_type || "regular",
          notes: data.notes || null,
          trip_page_url: data.trip_page_url || null,
           status: "lead",
           parent_trip_id: data.parent_trip_id || null,
        } as any)
        .select(`
          *,
          clients!trips_client_id_fkey (
            id,
            name,
            email,
            phone
          )
        `)
        .single();

      if (error) {
        console.error("Error creating trip:", error);
        // Remove optimistic trip on error
        setTrips((prev) => prev.filter((t) => t.id !== optimisticId));
        toast.error("Failed to create trip");
        return null;
      }

      // Auto-assign trip_page_url using the share_token
      const shareToken = (newTrip as any).share_token;
      if (shareToken && !newTrip.trip_page_url) {
        const tripPageUrl = `https://app.crestwelltravels.com/shared/${shareToken}`;
        await supabase
          .from("trips")
          .update({ trip_page_url: tripPageUrl })
          .eq("id", newTrip.id);
        newTrip.trip_page_url = tripPageUrl;
      }

      // Replace optimistic trip with real trip
      setTrips((prev) =>
        prev.map((t) => (t.id === optimisticId ? newTrip : t))
      );
      toast.success("Trip created successfully");
      return newTrip;
    } catch (error) {
      console.error("Error creating trip:", error);
      // Remove optimistic trip on error
      setTrips((prev) => prev.filter((t) => t.id !== optimisticId));
      toast.error("Failed to create trip");
      return null;
    } finally {
      setCreating(false);
    }
  };

  const updateTrip = async (tripId: string, data: UpdateTripData) => {
    if (!user) {
      toast.error("You must be logged in to update trips");
      return false;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("trips")
        .update(data)
        .eq("id", tripId);

      if (error) {
        console.error("Error updating trip:", error);
        toast.error("Failed to update trip");
        return false;
      }

      toast.success("Trip updated successfully");
      await fetchTrips();
      return true;
    } catch (error) {
      console.error("Error updating trip:", error);
      toast.error("Failed to update trip");
      return false;
    } finally {
      setUpdating(false);
    }
  };

  const deleteTrip = async (tripId: string) => {
    if (!user) {
      toast.error("You must be logged in to delete trips");
      return false;
    }

    // Check if any payments/authorizations exist for bookings tied to this trip
    try {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("trip_payments")
        .select("id")
        .eq("trip_id", tripId)
        .limit(1);

      if (paymentsError) throw paymentsError;

      if (paymentsData && paymentsData.length > 0) {
        toast.error("Cannot delete trip — payments or authorizations are logged. Remove all payments first.");
        return false;
      }
    } catch (error) {
      console.error("Error checking trip payments:", error);
      toast.error("Failed to verify trip payments");
      return false;
    }

    // Store the trip for potential rollback
    const tripToDelete = trips.find((t) => t.id === tripId);
    
    // Optimistically remove the trip immediately
    setTrips((prev) => prev.filter((t) => t.id !== tripId));

    try {
      const { error } = await supabase
        .from("trips")
        .delete()
        .eq("id", tripId);

      if (error) {
        console.error("Error deleting trip:", error);
        // Rollback: restore the trip on error
        if (tripToDelete) {
          setTrips((prev) => [tripToDelete, ...prev]);
        }
        toast.error("Failed to delete trip");
        return false;
      }

      toast.success("Trip deleted successfully");
      return true;
    } catch (error) {
      console.error("Error deleting trip:", error);
      // Rollback: restore the trip on error
      if (tripToDelete) {
        setTrips((prev) => [tripToDelete, ...prev]);
      }
      toast.error("Failed to delete trip");
      return false;
    }
  };

  return {
    trips,
    loading,
    creating,
    updating,
    fetchTrips,
    createTrip,
    updateTrip,
    deleteTrip,
  };
}

export function useTrip(tripId: string | undefined) {
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [bookings, setBookings] = useState<TripBooking[]>([]);
  const [subTrips, setSubTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchTrip = useCallback(async () => {
    if (!user || !tripId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch trip with client info
      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .select(`
          *,
          clients!trips_client_id_fkey (
            id,
            name,
            email,
            phone
          )
        `)
        .eq("id", tripId)
        .single();

      if (tripError) throw tripError;

      // Fetch bookings for this trip
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          id,
          confirmation_number,
          status,
          total_price,
          gross_sales,
          commissionable_amount,
          commission_revenue,
          commission_estimate,
          supplier_id,
          suppliers (
            id,
            name,
            supplier_type
          )
        `)
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });

      if (bookingsError) throw bookingsError;

      // Fetch sub-trips
      const { data: subTripsData, error: subTripsError } = await (supabase
        .from("trips")
        .select(`
          *,
          clients!trips_client_id_fkey (
            id,
            name,
            email,
            phone
          )
        `) as any)
        .eq("parent_trip_id", tripId)
        .order("created_at", { ascending: false });

      if (subTripsError) throw subTripsError;

      setTrip(tripData);
      setBookings(bookingsData || []);
      setSubTrips((subTripsData as Trip[]) || []);
    } catch (error) {
      console.error("Error fetching trip:", error);
      setTrip(null);
      setBookings([]);
      setSubTrips([]);
    } finally {
      setLoading(false);
    }
  }, [user, tripId]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  const addBookingToTrip = async (bookingId: string) => {
    if (!tripId) return false;

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ trip_id: tripId })
        .eq("id", bookingId);

      if (error) throw error;

      toast.success("Booking added to trip");
      await fetchTrip();
      return true;
    } catch (error) {
      console.error("Error adding booking to trip:", error);
      toast.error("Failed to add booking to trip");
      return false;
    }
  };

  const removeBookingFromTrip = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ trip_id: null })
        .eq("id", bookingId);

      if (error) throw error;

      toast.success("Booking removed from trip");
      await fetchTrip();
      return true;
    } catch (error) {
      console.error("Error removing booking from trip:", error);
      toast.error("Failed to remove booking from trip");
      return false;
    }
  };

  const updateTripStatus = async (newStatus: string) => {
    if (!tripId || !user) {
      toast.error("Unable to update trip status");
      return false;
    }

    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("trips")
        .update({ status: newStatus })
        .eq("id", tripId);

      if (error) throw error;

      // Update local state immediately for better UX
      setTrip((prev) => (prev ? { ...prev, status: newStatus } : null));
      toast.success(`Trip status updated to ${newStatus}`);
      return true;
    } catch (error) {
      console.error("Error updating trip status:", error);
      toast.error("Failed to update trip status");
      return false;
    } finally {
      setUpdatingStatus(false);
    }
  };

  return {
    trip,
    bookings,
    subTrips,
    loading,
    updatingStatus,
    fetchTrip,
    addBookingToTrip,
    removeBookingFromTrip,
    updateTripStatus,
  };
}
