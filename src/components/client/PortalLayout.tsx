import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { usePortalBranding } from "@/hooks/usePortalBranding";
import { usePortalDashboard } from "@/hooks/usePortalData";
import { Home, Map, MessageSquare, FileText, LogOut, Menu, X, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { EmergencyContactButton } from "@/components/client/EmergencyContactButton";

const navItems = [
  { to: "/client", label: "Dashboard", icon: Home, end: true },
  { to: "/client/trips", label: "My Trips", icon: Map },
  { to: "/client/payments", label: "Payments", icon: CreditCard },
  { to: "/client/messages", label: "Messages", icon: MessageSquare },
  { to: "/client/invoices", label: "Invoices", icon: FileText },
];

export function PortalLayout() {
  const { session, logout } = usePortalAuth();
  const { branding } = usePortalBranding();
  const { data: dashboardData } = usePortalDashboard();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.title = "Crestwell Travel Services - Client";
    return () => { document.title = "Crestwell Travel Services - Agent"; };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/client/login");
  };

  const brandStyles = useMemo(() => {
    if (!branding.primary_color) return {};
    return {
      "--portal-primary": branding.primary_color,
      "--portal-accent": branding.accent_color,
    } as React.CSSProperties;
  }, [branding.primary_color, branding.accent_color]);

  const agent = dashboardData?.agent;

  return (
    <div className="min-h-screen bg-background" style={brandStyles}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            {branding.logo_url ? (
              <img src={branding.logo_url} alt={branding.agency_name} className="h-8 w-auto object-contain" />
            ) : (
              <h1 className="text-lg font-bold text-foreground">{branding.agency_name}</h1>
            )}
            {branding.logo_url && (
              <span className="hidden sm:inline text-sm font-semibold text-foreground">{branding.agency_name}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">Welcome, {session?.clientName}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:block max-w-6xl mx-auto px-4">
          <div className="flex gap-1 -mb-px">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                    isActive
                      ? "text-primary border-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )
                }
                style={({ isActive }) =>
                  isActive && branding.primary_color
                    ? { color: branding.primary_color, borderColor: branding.primary_color }
                    : undefined
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-b bg-card px-4 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                )
              }
              style={({ isActive }) =>
                isActive && branding.primary_color ? { color: branding.primary_color } : undefined
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Emergency Contact FAB */}
      <EmergencyContactButton agent={agent} />

      {/* Footer */}
      <footer className="border-t py-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-3">
        <a href="https://portal.crestwelltravels.com/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors underline">
          Terms and Conditions
        </a>
        <span>·</span>
        <a href="https://portal.crestwelltravels.com/privacy-policy-2" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors underline">
          Privacy Policy
        </a>
      </footer>
    </div>
  );
}
