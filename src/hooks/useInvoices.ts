import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Invoice {
  id: string;
  user_id: string;
  trip_id: string | null;
  client_id: string | null;
  invoice_number: string;
  invoice_date: string;
  trip_name: string | null;
  client_name: string | null;
  total_amount: number;
  amount_paid: number;
  amount_remaining: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceData {
  trip_id?: string;
  client_id?: string;
  trip_name?: string;
  client_name?: string;
  total_amount: number;
  amount_paid: number;
  amount_remaining: number;
}

export function useInvoices() {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);

  const getNextInvoiceNumber = async (): Promise<string | null> => {
    if (!user) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      const { data, error } = await supabase.rpc("get_next_invoice_number", {
        p_user_id: user.id,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error getting invoice number:", error);
      toast.error("Failed to generate invoice number");
      return null;
    }
  };

  const createInvoice = async (invoiceData: CreateInvoiceData): Promise<Invoice | null> => {
    if (!user) {
      toast.error("You must be logged in");
      return null;
    }

    setCreating(true);
    try {
      // Get next invoice number
      const invoiceNumber = await getNextInvoiceNumber();
      if (!invoiceNumber) {
        throw new Error("Failed to generate invoice number");
      }

      const { data, error } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          invoice_number: invoiceNumber,
          trip_id: invoiceData.trip_id || null,
          client_id: invoiceData.client_id || null,
          trip_name: invoiceData.trip_name || null,
          client_name: invoiceData.client_name || null,
          total_amount: invoiceData.total_amount,
          amount_paid: invoiceData.amount_paid,
          amount_remaining: invoiceData.amount_remaining,
          status: "sent",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error("Failed to create invoice");
      return null;
    } finally {
      setCreating(false);
    }
  };

  return {
    getNextInvoiceNumber,
    createInvoice,
    creating,
  };
}
