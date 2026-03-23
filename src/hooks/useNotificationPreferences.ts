import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface NotificationPreferences {
  new_booking_alerts: boolean;
  commission_updates: boolean;
  client_messages: boolean;
  training_reminders: boolean;
  marketing_emails: boolean;
}

const defaultPreferences: NotificationPreferences = {
  new_booking_alerts: true,
  commission_updates: true,
  client_messages: true,
  training_reminders: false,
  marketing_emails: false,
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching notification preferences:", error);
        return;
      }

      if (data) {
        setPreferences({
          new_booking_alerts: data.new_booking_alerts,
          commission_updates: data.commission_updates,
          client_messages: data.client_messages,
          training_reminders: data.training_reminders,
          marketing_emails: data.marketing_emails,
        });
      }
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) {
      toast.error("You must be logged in to update preferences");
      return false;
    }

    // Optimistically update the UI
    const previousPreferences = { ...preferences };
    setPreferences(prev => ({ ...prev, [key]: value }));

    setSaving(true);
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: user.id,
          ...preferences,
          [key]: value,
        }, {
          onConflict: "user_id",
        });

      if (error) {
        console.error("Error saving notification preference:", error);
        // Revert on error
        setPreferences(previousPreferences);
        toast.error("Failed to update preference");
        return false;
      }

      toast.success("Preference updated");
      return true;
    } catch (error) {
      console.error("Error saving notification preference:", error);
      setPreferences(previousPreferences);
      toast.error("Failed to update preference");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    preferences,
    loading,
    saving,
    updatePreference,
    refetch: fetchPreferences,
  };
}
