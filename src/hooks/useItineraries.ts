import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Itinerary {
  id: string;
  trip_id: string;
  user_id: string;
  name: string;
  sort_order: number;
  cover_image_url: string | null;
  overview: string | null;
  depart_date: string | null;
  return_date: string | null;
  created_at: string;
  updated_at: string;
}

export function useItineraries(tripId: string | undefined) {
  const { user } = useAuth();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchItineraries = useCallback(async () => {
    if (!user || !tripId) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from("itineraries")
        .select("*")
        .eq("trip_id", tripId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const list = (data as Itinerary[]) || [];
      setItineraries(list);
      // Auto-select first if none active
      if (list.length > 0 && (!activeId || !list.find(i => i.id === activeId))) {
        setActiveId(list[0].id);
      }
    } catch (error) {
      console.error("Error fetching itineraries:", error);
    } finally {
      setLoading(false);
    }
  }, [user, tripId]);

  useEffect(() => { fetchItineraries(); }, [fetchItineraries]);

  const createItinerary = async (opts?: { name?: string; depart_date?: string; return_date?: string; cover_image_url?: string; overview?: string }) => {
    if (!user || !tripId) return null;
    const newName = opts?.name || `Itinerary ${itineraries.length + 1}`;
    try {
      const { data, error } = await supabase
        .from("itineraries")
        .insert({
          trip_id: tripId,
          user_id: user.id,
          name: newName,
          sort_order: itineraries.length,
          depart_date: opts?.depart_date || null,
          return_date: opts?.return_date || null,
          cover_image_url: opts?.cover_image_url || null,
          overview: opts?.overview || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      const created = data as Itinerary;
      toast.success(`Created "${newName}"`);
      await fetchItineraries();
      setActiveId(created.id);
      return created;
    } catch (error) {
      console.error("Error creating itinerary:", error);
      toast.error("Failed to create itinerary");
      return null;
    }
  };

  const renameItinerary = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from("itineraries")
        .update({ name } as any)
        .eq("id", id);
      if (error) throw error;
      await fetchItineraries();
      return true;
    } catch (error) {
      console.error("Error renaming itinerary:", error);
      toast.error("Failed to rename");
      return false;
    }
  };

  const updateItinerary = async (id: string, updates: { name?: string; depart_date?: string | null; return_date?: string | null; cover_image_url?: string | null; overview?: string | null }) => {
    try {
      const { error } = await supabase
        .from("itineraries")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
      toast.success("Itinerary updated");
      await fetchItineraries();
      return true;
    } catch (error) {
      console.error("Error updating itinerary:", error);
      toast.error("Failed to update");
      return false;
    }
  };

  const deleteItinerary = async (id: string) => {
    try {
      const { error } = await supabase
        .from("itineraries")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Itinerary deleted");
      await fetchItineraries();
      return true;
    } catch (error) {
      console.error("Error deleting itinerary:", error);
      toast.error("Failed to delete");
      return false;
    }
  };

  // Auto-create a default itinerary if none exist once loading is done
  const ensureDefault = useCallback(async () => {
    if (!loading && itineraries.length === 0 && user && tripId) {
      await createItinerary({ name: "Itinerary 1" });
    }
  }, [loading, itineraries.length, user, tripId]);

  useEffect(() => { ensureDefault(); }, [ensureDefault]);

  return {
    itineraries,
    activeId,
    setActiveId,
    loading,
    createItinerary,
    updateItinerary,
    renameItinerary,
    deleteItinerary,
  };
}
