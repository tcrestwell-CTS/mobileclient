import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BrandingSettings {
  id?: string;
  agency_name: string;
  tagline: string;
  logo_url: string;
  primary_color: string;
  accent_color: string;
  email_address: string;
  phone: string;
  address: string;
  website: string;
  instagram: string;
  facebook: string;
  from_email: string;
  from_name: string;
}

const defaultSettings: BrandingSettings = {
  agency_name: "Crestwell Travel Services",
  tagline: "Your Journey, Our Passion",
  logo_url: "",
  primary_color: "#0D7377",
  accent_color: "#E8763A",
  email_address: "info@crestwellgetaways.com",
  phone: "1-888-508-6893",
  address: "105 Pine Hill Drive\nCalhoun, GA 30701",
  website: "https://crestwellgetaways.com",
  instagram: "@crestwelltravels",
  facebook: "crestwelltravel",
  from_email: "",
  from_name: "",
};

export function useBrandingSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<BrandingSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("branding_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching branding settings:", error);
        return;
      }

      if (data) {
        setSettings({
          id: data.id,
          agency_name: data.agency_name || defaultSettings.agency_name,
          tagline: data.tagline || defaultSettings.tagline,
          logo_url: data.logo_url || "",
          primary_color: data.primary_color || defaultSettings.primary_color,
          accent_color: data.accent_color || defaultSettings.accent_color,
          email_address: data.email_address || defaultSettings.email_address,
          phone: data.phone || defaultSettings.phone,
          address: data.address || defaultSettings.address,
          website: data.website || defaultSettings.website,
          instagram: data.instagram || defaultSettings.instagram,
          facebook: data.facebook || defaultSettings.facebook,
          from_email: data.from_email || "",
          from_name: data.from_name || "",
        });
      }
    } catch (error) {
      console.error("Error fetching branding settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<BrandingSettings>) => {
    if (!user) {
      toast.error("You must be logged in to save settings");
      return false;
    }

    setSaving(true);
    try {
      const updatedSettings = { ...settings, ...newSettings };

      const { error } = await supabase
        .from("branding_settings")
        .upsert({
          user_id: user.id,
          agency_name: updatedSettings.agency_name,
          tagline: updatedSettings.tagline,
          logo_url: updatedSettings.logo_url,
          primary_color: updatedSettings.primary_color,
          accent_color: updatedSettings.accent_color,
          email_address: updatedSettings.email_address,
          phone: updatedSettings.phone,
          address: updatedSettings.address,
          website: updatedSettings.website,
          instagram: updatedSettings.instagram,
          facebook: updatedSettings.facebook,
          from_email: updatedSettings.from_email,
          from_name: updatedSettings.from_name,
        }, {
          onConflict: "user_id",
        });

      if (error) {
        console.error("Error saving branding settings:", error);
        toast.error("Failed to save settings");
        return false;
      }

      setSettings(updatedSettings);
      toast.success("Settings saved successfully");
      return true;
    } catch (error) {
      console.error("Error saving branding settings:", error);
      toast.error("Failed to save settings");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    if (!user) {
      toast.error("You must be logged in to upload a logo");
      return null;
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/logo.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error("Error uploading logo:", uploadError);
        toast.error("Failed to upload logo");
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("logos")
        .getPublicUrl(fileName);

      // Add cache-busting parameter
      const logoUrl = `${publicUrl}?v=${Date.now()}`;
      
      await saveSettings({ logo_url: logoUrl });
      return logoUrl;
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
      return null;
    }
  };

  return {
    settings,
    loading,
    saving,
    saveSettings,
    uploadLogo,
    refetch: fetchSettings,
  };
}
