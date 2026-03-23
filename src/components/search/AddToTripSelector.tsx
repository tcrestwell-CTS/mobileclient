import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface TripOption {
  id: string;
  trip_name: string;
  destination: string | null;
  status: string;
  clients?: { name: string } | null;
}

interface ItineraryItemData {
  day_number: number;
  title: string;
  description?: string;
  category: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
  flight_number?: string;
  departure_city_code?: string;
  arrival_city_code?: string;
}

interface AddToTripSelectorProps {
  items: ItineraryItemData[];
  disabled?: boolean;
  label?: string;
  defaultTripId?: string;
}

export function AddToTripSelector({ items, disabled, label = "Add to Trip", defaultTripId }: AddToTripSelectorProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>(defaultTripId || "");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("trips")
      .select("id, trip_name, destination, status, clients!trips_client_id_fkey(name)")
      .in("status", ["lead", "planning", "quoting", "booked", "active"])
      .order("updated_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) setTrips(data as TripOption[]);
        setLoading(false);
      });
  }, [user]);

  const handleAdd = async () => {
    if (!selectedTripId || !user || items.length === 0) return;
    setAdding(true);
    try {
      // Get the first itinerary for this trip so items appear in the builder
      const { data: itineraries } = await supabase
        .from("itineraries")
        .select("id")
        .eq("trip_id", selectedTripId)
        .order("sort_order", { ascending: true })
        .limit(1);
      
      const itineraryId = itineraries?.[0]?.id || null;

      // Get max sort_order for the trip
      const { data: existing } = await supabase
        .from("itinerary_items")
        .select("sort_order")
        .eq("trip_id", selectedTripId)
        .order("sort_order", { ascending: false })
        .limit(1);
      
      let nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

      const inserts = items.map((item, idx) => ({
        trip_id: selectedTripId,
        user_id: user.id,
        itinerary_id: itineraryId,
        day_number: item.day_number,
        title: item.title,
        description: item.description || null,
        category: item.category,
        location: item.location || null,
        start_time: item.start_time || null,
        end_time: item.end_time || null,
        notes: item.notes || null,
        flight_number: item.flight_number || null,
        departure_city_code: item.departure_city_code || null,
        arrival_city_code: item.arrival_city_code || null,
        sort_order: nextOrder + idx,
      }));

      const { error } = await supabase.from("itinerary_items").insert(inserts);
      if (error) throw error;

      const tripName = trips.find(t => t.id === selectedTripId)?.trip_name || "trip";
      toast.success(`Added ${items.length} item${items.length > 1 ? "s" : ""} to ${tripName}`, {
        action: {
          label: "View Trip",
          onClick: () => navigate(`/trips/${selectedTripId}`),
        },
      });
    } catch (err: any) {
      console.error("Add to trip error:", err);
      toast.error(err.message || "Failed to add to trip");
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading trips…</p>;
  if (trips.length === 0) return <p className="text-sm text-muted-foreground">No active trips found. Create a trip first to add items.</p>;

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedTripId} onValueChange={setSelectedTripId}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Select a trip..." />
        </SelectTrigger>
        <SelectContent>
          {trips.map((trip) => (
            <SelectItem key={trip.id} value={trip.id}>
              <span className="truncate">
                {trip.trip_name}
                {trip.clients?.name ? ` — ${trip.clients.name}` : ""}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        onClick={handleAdd}
        disabled={!selectedTripId || disabled || adding || items.length === 0}
        size="sm"
        className="gap-1.5"
      >
        {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
        {label}
      </Button>
    </div>
  );
}
