import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CommissionLine {
  id: string;
  booking_id: string;
  user_id: string;
  description: string;
  amount: number;
  commission_rate: number;
  commission_amount: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCommissionLine {
  description: string;
  amount: number;
  commission_rate: number;
}

export function useBookingCommissionLines(bookingId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ["booking-commission-lines", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data, error } = await supabase
        .from("booking_commission_lines")
        .select("*")
        .eq("booking_id", bookingId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as CommissionLine[];
    },
    enabled: !!bookingId,
  });

  const addLine = useMutation({
    mutationFn: async (line: CreateCommissionLine) => {
      if (!user || !bookingId) throw new Error("Not authenticated");
      const commission_amount = line.amount * (line.commission_rate / 100);
      const { data, error } = await supabase
        .from("booking_commission_lines")
        .insert({
          booking_id: bookingId,
          user_id: user.id,
          description: line.description,
          amount: line.amount,
          commission_rate: line.commission_rate,
          commission_amount: Math.round(commission_amount * 100) / 100,
          sort_order: lines.length,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-commission-lines", bookingId] });
    },
    onError: () => toast.error("Failed to add commission line"),
  });

  const updateLine = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<CreateCommissionLine>) => {
      const updateData: Record<string, number | string> = {};
      if (data.description !== undefined) updateData.description = data.description;
      if (data.amount !== undefined) updateData.amount = data.amount;
      if (data.commission_rate !== undefined) updateData.commission_rate = data.commission_rate;
      if (data.amount !== undefined || data.commission_rate !== undefined) {
        const existing = lines.find(l => l.id === id);
        const amt = data.amount ?? existing?.amount ?? 0;
        const rate = data.commission_rate ?? existing?.commission_rate ?? 0;
        updateData.commission_amount = Math.round(amt * (rate / 100) * 100) / 100;
      }
      const { error } = await supabase
        .from("booking_commission_lines")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-commission-lines", bookingId] });
    },
    onError: () => toast.error("Failed to update commission line"),
  });

  const deleteLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("booking_commission_lines")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-commission-lines", bookingId] });
    },
    onError: () => toast.error("Failed to delete commission line"),
  });

  const totalCommission = lines.reduce((sum, l) => sum + l.commission_amount, 0);
  const totalAmount = lines.reduce((sum, l) => sum + l.amount, 0);

  return { lines, isLoading, addLine, updateLine, deleteLine, totalCommission, totalAmount };
}
