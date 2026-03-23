import { usePortalDashboard } from "@/hooks/usePortalData";

export interface PortalBranding {
  agency_name: string;
  primary_color: string;
  accent_color: string;
  logo_url: string;
  tagline: string;
}

const DEFAULT_BRANDING: PortalBranding = {
  agency_name: "Crestwell Travel Services",
  primary_color: "#0D7377",
  accent_color: "#E8A87C",
  logo_url: "",
  tagline: "Your Journey, Our Passion",
};

export function usePortalBranding(): { branding: PortalBranding; isLoading: boolean } {
  const { data, isLoading } = usePortalDashboard();

  const branding: PortalBranding = data?.branding
    ? {
        agency_name: data.branding.agency_name || DEFAULT_BRANDING.agency_name,
        primary_color: data.branding.primary_color || DEFAULT_BRANDING.primary_color,
        accent_color: data.branding.accent_color || DEFAULT_BRANDING.accent_color,
        logo_url: data.branding.logo_url || DEFAULT_BRANDING.logo_url,
        tagline: data.branding.tagline || DEFAULT_BRANDING.tagline,
      }
    : DEFAULT_BRANDING;

  return { branding, isLoading };
}
