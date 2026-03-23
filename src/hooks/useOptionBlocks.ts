import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OptionBlock {
  id: string;
  trip_id: string;
  itinerary_id: string | null;
  user_id: string;
  day_number: number;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useOptionBlocks(tripId: string | undefined, itineraryId?: string | null) {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<OptionBlock[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlocks = useCallback(async () => {
    if (!user || !tripId) { setLoading(false); return; }
    try {
      let query = supabase
        .from("option_blocks")
        .select("*")
        .eq("trip_id", tripId)
        .order("day_number", { ascending: true })
        .order("sort_order", { ascending: true });
      if (itineraryId) {
        query = query.eq("itinerary_id", itineraryId);
      }
      const { data, error } = await query;
      if (error) throw error;
      setBlocks((data as OptionBlock[]) || []);
    } catch (error) {
      console.error("Error fetching option blocks:", error);
    } finally {
      setLoading(false);
    }
  }, [user, tripId, itineraryId]);

  useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

  const createBlock = async (dayNumber: number, title?: string) => {
    if (!user || !tripId) return null;
    try {
      const { data, error } = await supabase
        .from("option_blocks")
        .insert({
          trip_id: tripId,
          itinerary_id: itineraryId || null,
          user_id: user.id,
          day_number: dayNumber,
          title: title || "Choose an option",
          sort_order: blocks.filter(b => b.day_number === dayNumber).length,
        } as any)
        .select()
        .single();
      if (error) throw error;
      toast.success("Option block created");
      await fetchBlocks();
      return data as OptionBlock;
    } catch (error) {
      console.error("Error creating option block:", error);
      toast.error("Failed to create option block");
      return null;
    }
  };

  const updateBlock = async (id: string, updates: { title?: string; day_number?: number }) => {
    try {
      const { error } = await supabase
        .from("option_blocks")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
      await fetchBlocks();
      return true;
    } catch (error) {
      console.error("Error updating option block:", error);
      toast.error("Failed to update option block");
      return false;
    }
  };

  const deleteBlock = async (id: string) => {
    try {
      const { error } = await supabase
        .from("option_blocks")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Option block deleted");
      await fetchBlocks();
      return true;
    } catch (error) {
      console.error("Error deleting option block:", error);
      toast.error("Failed to delete option block");
      return false;
    }
  };

  return { blocks, loading, fetchBlocks, createBlock, updateBlock, deleteBlock };
}
