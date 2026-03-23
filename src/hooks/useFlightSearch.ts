import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FlightSlice {
  origin: string;
  destination: string;
  departure_date: string;
}

export interface FlightPassenger {
  type: "adult" | "child" | "infant_without_seat";
  age?: number;
}

export interface FlightSearchParams {
  slices: FlightSlice[];
  passengers: FlightPassenger[];
  cabin_class: string;
}

export interface FlightOffer {
  id: string;
  total_amount: string;
  total_currency: string;
  owner: { name: string; logo_symbol_url: string | null; iata_code: string };
  slices: Array<{
    id: string;
    origin: { iata_code: string; name: string; city_name: string };
    destination: { iata_code: string; name: string; city_name: string };
    duration: string;
    segments: Array<{
      id: string;
      origin: { iata_code: string; name: string };
      destination: { iata_code: string; name: string };
      departing_at: string;
      arriving_at: string;
      operating_carrier: { name: string; logo_symbol_url: string | null; iata_code: string };
      operating_carrier_flight_number: string;
      duration: string;
    }>;
  }>;
  passengers: Array<{ id: string; type: string }>;
  available_services?: AvailableService[];
}

// ── Ancillary types ──

export interface AvailableService {
  id: string;
  type: "baggage" | "seat";
  total_amount: string;
  total_currency: string;
  maximum_quantity: number;
  passenger_ids: string[];
  segment_ids: string[];
  metadata?: {
    maximum_weight_kg?: number;
    maximum_length_cm?: number;
    maximum_height_cm?: number;
    maximum_depth_cm?: number;
    type?: string;
  };
}

export interface SeatMapCabin {
  aisles: number;
  cabin_class: string;
  deck: number;
  rows: SeatMapRow[];
}

export interface SeatMapRow {
  sections: SeatMapSection[];
}

export interface SeatMapSection {
  elements: SeatMapElement[];
}

export interface SeatMapElement {
  type: "seat" | "exit_row" | "lavatory" | "galley" | "closet" | "stairs" | "bassinet";
  designator?: string;
  name?: string;
  disclosures?: string[];
  available_services?: Array<{
    id: string;
    passenger_id: string;
    total_amount: string;
    total_currency: string;
  }>;
}

export interface SeatMap {
  cabins: SeatMapCabin[];
  id: string;
  segment_id: string;
  slice_id: string;
}

export interface OrderPassenger {
  id: string;
  given_name: string;
  family_name: string;
  born_on: string;
  gender: "m" | "f";
  title: string;
  email: string;
  phone_number: string;
  infant_passenger_id?: string;
}

export interface ServiceSelection {
  id: string;
  quantity: number;
}

export interface CreateOrderParams {
  selected_offers: string[];
  passengers: OrderPassenger[];
  payments: Array<{
    type: "balance" | "arc_bsp_cash";
    currency: string;
    amount: string;
  }>;
  services?: ServiceSelection[];
}

export function useFlightSearch() {
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [offerRequestId, setOfferRequestId] = useState<string | null>(null);

  const searchFlights = async (params: FlightSearchParams) => {
    setLoading(true);
    setOffers([]);
    try {
      const { data, error } = await supabase.functions.invoke("duffel-flights", {
        body: { action: "search", ...params },
      });
      if (error) throw error;
      const result = data?.data;
      setOfferRequestId(result?.id ?? null);
      setOffers(result?.offers ?? []);
      if (!result?.offers?.length) {
        toast.info("No flights found for those criteria.");
      }
    } catch (err: any) {
      console.error("Flight search error:", err);
      toast.error(err.message || "Failed to search flights");
    } finally {
      setLoading(false);
    }
  };

  const getOffer = async (offerId: string, returnAvailableServices = false): Promise<FlightOffer | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("duffel-flights", {
        body: { action: "get_offer", offer_id: offerId, return_available_services: returnAvailableServices },
      });
      if (error) throw error;
      return data?.data ?? null;
    } catch (err: any) {
      console.error("Get offer error:", err);
      toast.error(err.message || "Failed to retrieve offer details");
      return null;
    }
  };

  const getSeatMaps = async (offerId: string): Promise<SeatMap[]> => {
    try {
      const { data, error } = await supabase.functions.invoke("duffel-flights", {
        body: { action: "get_seat_maps", offer_id: offerId },
      });
      if (error) throw error;
      return data?.data ?? [];
    } catch (err: any) {
      console.error("Get seat maps error:", err);
      toast.error(err.message || "Failed to retrieve seat maps");
      return [];
    }
  };

  const createOrder = async (params: CreateOrderParams) => {
    setBookingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("duffel-flights", {
        body: { action: "create_order", ...params },
      });
      if (error) throw error;
      const order = data?.data;
      if (order?.booking_reference) {
        toast.success(`Booking confirmed! Reference: ${order.booking_reference}`);
      }
      return order;
    } catch (err: any) {
      console.error("Create order error:", err);
      toast.error(err.message || "Failed to create booking");
      return null;
    } finally {
      setBookingLoading(false);
    }
  };

  return { offers, loading, bookingLoading, searchFlights, getOffer, getSeatMaps, createOrder, offerRequestId };
}
