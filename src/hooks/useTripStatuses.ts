import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TripStatus {
  id: string;
  user_id: string;
  name: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_STATUSES = [
  { name: "Lead", color: "#f59e0b", sort_order: 0 },
  { name: "Quoted", color: "#f97316", sort_order: 1 },
  { name: "Booked", color: "#3b82f6", sort_order: 2 },
  { name: "Confirmed", color: "#22c55e", sort_order: 3 },
  { name: "Completed", color: "#6b7280", sort_order: 4 },
  { name: "Cancelled", color: "#ef4444", sort_order: 5 },
];

// All statuses get their own kanban column (1:1)
const KANBAN_COLUMN_SLUGS = new Set([
  "lead",
  "quoted",
  "booked",
  "confirmed",
  "completed",
  "cancelled",
]);

// Map old statuses to new ones for backward compat
const LEGACY_STATUS_MAP: Record<string, string> = {
  inbound: "Lead",
  planning: "Lead",
  proposal_sent: "Quoted",
  option_selected: "Quoted",
  deposit_authorized: "Booked",
  deposit_paid: "Booked",
  final_paid: "Booked",
  booked: "Booked",
  traveling: "Confirmed",
  traveled: "Completed",
  completed: "Completed",
  commission_pending: "Completed",
  commission_received: "Completed",
  cancelled: "Cancelled",
  archived: "Completed",
  lead: "Lead",
  quoted: "Quoted",
  confirmed: "Confirmed",
};

export function useTripStatuses() {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<TripStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchStatuses = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from("trip_statuses")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const list = (data as TripStatus[]) || [];
      if (list.length === 0 && !seeding) {
        await seedDefaults();
        return;
      }
      setStatuses(list);
    } catch (err) {
      console.error("Error fetching trip statuses:", err);
    } finally {
      setLoading(false);
    }
  }, [user, seeding]);

  const seedDefaults = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const rows = DEFAULT_STATUSES.map((s) => ({
        user_id: user.id,
        name: s.name,
        color: s.color,
        sort_order: s.sort_order,
        is_default: true,
      }));
      const { error } = await supabase.from("trip_statuses").insert(rows as any);
      if (error) throw error;
      await fetchStatuses();
    } catch (err) {
      console.error("Error seeding default statuses:", err);
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => { fetchStatuses(); }, [fetchStatuses]);

  const addStatus = async (name: string, color: string = "#6366f1") => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from("trip_statuses")
        .insert({ user_id: user.id, name, color, sort_order: statuses.length } as any)
        .select()
        .single();
      if (error) throw error;
      toast.success(`Status "${name}" added`);
      await fetchStatuses();
      return data as TripStatus;
    } catch (err: any) {
      if (err?.code === "23505") {
        toast.error("A status with that name already exists");
      } else {
        toast.error("Failed to add status");
      }
      return null;
    }
  };

  const renameStatus = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from("trip_statuses")
        .update({ name } as any)
        .eq("id", id);
      if (error) throw error;
      toast.success("Status renamed");
      await fetchStatuses();
      return true;
    } catch (err: any) {
      if (err?.code === "23505") {
        toast.error("A status with that name already exists");
      } else {
        toast.error("Failed to rename status");
      }
      return false;
    }
  };

  const updateStatusColor = async (id: string, color: string) => {
    try {
      const { error } = await supabase
        .from("trip_statuses")
        .update({ color } as any)
        .eq("id", id);
      if (error) throw error;
      await fetchStatuses();
      return true;
    } catch {
      toast.error("Failed to update color");
      return false;
    }
  };

  const deleteStatus = async (id: string) => {
    try {
      const { error } = await supabase
        .from("trip_statuses")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Status deleted");
      await fetchStatuses();
      return true;
    } catch {
      toast.error("Failed to delete status");
      return false;
    }
  };

  const reorderStatuses = async (reordered: TripStatus[]) => {
    setStatuses(reordered); // optimistic
    try {
      for (let i = 0; i < reordered.length; i++) {
        await supabase
          .from("trip_statuses")
          .update({ sort_order: i } as any)
          .eq("id", reordered[i].id);
      }
      await fetchStatuses();
    } catch {
      toast.error("Failed to reorder");
      await fetchStatuses();
    }
  };

  const statusToSlug = (name: string) => name.toLowerCase().replace(/\s+/g, "_");

  const getStatusLabel = (slug: string) => {
    const found = statuses.find((s) => statusToSlug(s.name) === slug);
    if (found) return found.name;
    return LEGACY_STATUS_MAP[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);
  };

  const getStatusColor = (slug: string) => {
    const found = statuses.find((s) => statusToSlug(s.name) === slug);
    return found?.color || "#6366f1";
  };

  const kanbanColumns = statuses
    .filter((s) => KANBAN_COLUMN_SLUGS.has(statusToSlug(s.name)))
    .map((s) => ({
      id: statusToSlug(s.name),
      label: s.name,
      color: s.color,
      statusId: s.id,
    }));

  // 1:1 mapping — no grouping needed
  const getKanbanStatus = (slug: string): string => {
    // Map legacy statuses to new ones
    const legacyMap: Record<string, string> = {
      inbound: "lead",
      planning: "lead",
      proposal_sent: "quoted",
      option_selected: "quoted",
      deposit_authorized: "booked",
      deposit_paid: "booked",
      final_paid: "booked",
      traveling: "confirmed",
      traveled: "completed",
      commission_pending: "completed",
      commission_received: "completed",
      archived: "completed",
    };
    return legacyMap[slug] || slug;
  };

  return {
    statuses,
    loading: loading || seeding,
    kanbanColumns,
    addStatus,
    renameStatus,
    updateStatusColor,
    deleteStatus,
    reorderStatuses,
    statusToSlug,
    getStatusLabel,
    getStatusColor,
    getKanbanStatus,
    refetch: fetchStatuses,
  };
}
