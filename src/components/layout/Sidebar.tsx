import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Calendar,
  GraduationCap,
  DollarSign,
  Mail,
  Settings,
  LogOut,
  UserPlus,
  BarChart3,
  Building2,
  FileSpreadsheet,
  Compass,
  Menu,
  X,
  HeartPulse,
  ShieldAlert,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Bell,
  CreditCard,
  CheckCircle2,
  ExternalLink,
  Globe,
  Plane,
  FileText,
  Hotel,
  Wrench,
  Ship,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useCanViewTeam, useUserRole } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import crestwellLogo from "@/assets/crestwell-logo.png";
import { useState, useEffect, createContext, useContext, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAgentNotifications } from "@/hooks/useAgentNotifications";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

// Context so DashboardLayout can read collapsed state
export const SidebarCollapsedContext = createContext<boolean>(false);
export const useSidebarCollapsed = () => useContext(SidebarCollapsedContext);

type NavItem = { name: string; href: string; icon: React.ComponentType<{ className?: string }> };

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const topLevelNav: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
];

const navGroups: NavGroup[] = [
  {
    label: "Sales",
    icon: DollarSign,
    items: [
      { name: "Trips", href: "/trips", icon: Compass },
      { name: "Quotes", href: "/commission-report", icon: FileText },
      { name: "Clients", href: "/contacts", icon: Users },
    ],
  },
  {
    label: "Bookings",
    icon: Calendar,
    items: [
      { name: "Suppliers", href: "/suppliers", icon: Building2 },
      { name: "Commissions", href: "/commissions", icon: DollarSign },
    ],
  },
  {
    label: "Marketing",
    icon: Mail,
    items: [
      { name: "Email & Branding", href: "/branding", icon: Mail },
      { name: "Publish Manager", href: "/publish-manager", icon: Globe },
      { name: "Featured Trips", href: "/featured-trips", icon: Star },
    ],
  },
  {
    label: "Tools",
    icon: Wrench,
    items: [
      { name: "Flight Search", href: "/flights", icon: Plane },
      { name: "Hotel Search", href: "/hotels", icon: Hotel },
      { name: "Cruise Search", href: "/cruises", icon: Ship },
      { name: "Training", href: "/training", icon: GraduationCap },
      { name: "Loan Applications", href: "/loan-applications", icon: CreditCard },
    ],
  },
  {
    label: "Reports",
    icon: BarChart3,
    items: [
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
];

const bottomNav: NavItem[] = [
  { name: "Settings", href: "/settings", icon: Settings },
];

const adminNavigation: NavItem[] = [
  { name: "Team Management", href: "/team", icon: UserPlus },
  { name: "Reconciliation", href: "/reconciliation", icon: FileSpreadsheet },
  { name: "QBO Health", href: "/qbo-health", icon: HeartPulse },
  { name: "Risk & Compliance", href: "/risk-compliance", icon: ShieldAlert },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (val: boolean) => void;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { canView: canViewTeam } = useCanViewTeam();
  const { data: userRole } = useUserRole();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useAgentNotifications();

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [location.pathname, isMobile]);

  // Close notification panel on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || "U";

  const userName = user?.user_metadata?.full_name || user?.email || "User";

  const getRoleLabel = (role: string | null | undefined) => {
    switch (role) {
      case "admin": return "Admin";
      case "office_admin": return "Office Admin";
      case "user":
      default: return "Travel Agent";
    }
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    // Auto-open the group containing the current route
    const initial: Record<string, boolean> = {};
    navGroups.forEach((g) => {
      if (g.items.some((i) => location.pathname === i.href || location.pathname.startsWith(i.href + "/"))) {
        initial[g.label] = true;
      }
    });
    return initial;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const NavItemLink = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href;
    const link = (
      <Link
        to={item.href}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
          collapsed && !isMobile ? "justify-center px-2" : "",
          isActive
            ? "bg-sidebar-accent text-sidebar-primary"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
      >
        <item.icon
          className={cn(
            "h-4.5 w-4.5 shrink-0 transition-colors",
            isActive
              ? "text-sidebar-primary"
              : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70"
          )}
        />
        {(!collapsed || isMobile) && <span>{item.name}</span>}
      </Link>
    );

    if (collapsed && !isMobile) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">{item.name}</TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  const NavGroupSection = ({ group }: { group: NavGroup }) => {
    const isOpen = openGroups[group.label] ?? false;
    const hasActiveChild = group.items.some(
      (i) => location.pathname === i.href || location.pathname.startsWith(i.href + "/")
    );

    if (collapsed && !isMobile) {
      // In collapsed mode, show group items as individual icon-only links
      return (
        <>
          <div className="pt-2 pb-1">
            <hr className="border-sidebar-border" />
          </div>
          {group.items.map((item) => (
            <NavItemLink key={item.name} item={item} />
          ))}
        </>
      );
    }

    return (
      <div className="pt-2">
        <button
          onClick={() => toggleGroup(group.label)}
          className={cn(
            "flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors",
            hasActiveChild
              ? "text-sidebar-foreground/80"
              : "text-sidebar-foreground/50 hover:text-sidebar-foreground/70"
          )}
        >
          <div className="flex items-center gap-2">
            <group.icon className="h-4 w-4" />
            <span>{group.label}</span>
          </div>
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        {isOpen && (
          <div className="ml-2 mt-0.5 space-y-0.5">
            {group.items.map((item) => (
              <NavItemLink key={item.name} item={item} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo / collapse toggle */}
      <div
        className={cn(
          "flex h-20 items-center border-b border-sidebar-border",
          collapsed && !isMobile ? "justify-center px-2" : "px-4 justify-between"
        )}
      >
        {!isMobile ? (
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="flex items-center gap-2 group focus:outline-none"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <img
              src={crestwellLogo}
              alt="Crestwell Travel Services"
              className={cn(
                "object-contain transition-all duration-300",
                collapsed ? "h-8 w-8" : "h-14 w-auto"
              )}
            />
            {!collapsed && (
              <ChevronLeft className="h-4 w-4 text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70 transition-colors ml-1 shrink-0" />
            )}
          </button>
        ) : (
          <>
            <img src={crestwellLogo} alt="Crestwell Travel Services" className="h-14 w-auto object-contain" />
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="text-sidebar-foreground">
              <X className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        <TooltipProvider delayDuration={0}>
          {/* Top-level items (Dashboard) */}
          {topLevelNav.map((item) => (
            <NavItemLink key={item.name} item={item} />
          ))}

          {/* Grouped nav sections */}
          {navGroups.map((group) => (
            <NavGroupSection key={group.label} group={group} />
          ))}

          {/* Settings at the bottom of nav */}
          <div className="pt-2">
            <hr className="border-sidebar-border mb-2" />
            {bottomNav.map((item) => (
              <NavItemLink key={item.name} item={item} />
            ))}
          </div>

          {/* Admin section */}
          {canViewTeam && (
            <>
              {(!collapsed || isMobile) && (
                <div className="pt-4 pb-2 px-3">
                  <p className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">Team</p>
                </div>
              )}
              {collapsed && !isMobile && <div className="pt-4 pb-2"><hr className="border-sidebar-border" /></div>}
              {adminNavigation.map((item) => (
                <NavItemLink key={item.name} item={item} />
              ))}
            </>
          )}
        </TooltipProvider>
      </nav>

      {/* Notification Bell */}
      <div className="border-t border-sidebar-border px-3 py-2" ref={notifRef}>
        {collapsed && !isMobile ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { navigate("/notifications"); if (isMobile) setMobileOpen(false); }}
                  className="relative flex items-center justify-center w-full p-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-2 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <button
            onClick={() => { navigate("/notifications"); if (isMobile) setMobileOpen(false); }}
            className="relative flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <Bell className="h-5 w-5 shrink-0" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="default" className="ml-auto text-[10px] px-1.5 py-0 h-5">
                {unreadCount}
              </Badge>
            )}
          </button>
        )}

        {/* Notification Dropdown */}
        {notifOpen && (
          <div className={cn(
            "absolute z-[60] bg-popover border border-border rounded-lg shadow-lg overflow-hidden",
            collapsed && !isMobile
              ? "left-[calc(100%+8px)] bottom-16 w-80"
              : "left-4 right-4 bottom-[calc(100%+4px)] w-auto"
          )} style={{ maxHeight: 400 }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead.mutate()}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 340 }}>
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                notifications.slice(0, 10).map((n) => {
                  const NotifIcon = n.type === "itinerary_approved" ? CheckCircle2
                    : n.type === "payment_reminder" ? Bell
                    : n.type === "option_selected" ? ExternalLink
                    : CreditCard;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "px-4 py-3 border-b border-border/50 cursor-pointer transition-colors text-sm",
                        n.is_read ? "bg-popover" : "bg-primary/5"
                      )}
                      onClick={() => {
                        if (!n.is_read) markAsRead.mutate(n.id);
                        if (n.trip_id) {
                          navigate(`/trips/${n.trip_id}`);
                          setNotifOpen(false);
                          if (isMobile) setMobileOpen(false);
                        }
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <NotifIcon className={cn("h-4 w-4 mt-0.5 shrink-0", n.is_read ? "text-muted-foreground" : "text-primary")} />
                        <div className="flex-1 min-w-0">
                          <p className={cn("font-medium truncate", n.is_read ? "text-muted-foreground" : "text-foreground")}>
                            {n.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {notifications.length > 0 && (
              <div className="border-t border-border px-4 py-2">
                <button
                  onClick={() => {
                    setNotifOpen(false);
                    if (isMobile) setMobileOpen(false);
                    navigate("/notifications?filter=pending");
                  }}
                  className="w-full text-center text-xs font-medium text-primary hover:underline py-1"
                >
                  View Pending Notifications
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User section */}
      <div className="border-t border-sidebar-border p-4">
        {(!collapsed || isMobile) ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Avatar" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
                  <span className="text-sm font-medium text-sidebar-foreground">{userInitials}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{getRoleLabel(userRole)}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </>
        ) : (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={signOut}
                  className="flex items-center justify-center w-full p-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger header */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-background px-4">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <img src={crestwellLogo} alt="Crestwell Travel Services" className="h-8 w-auto object-contain" />
        </header>
      )}

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 transition-opacity" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
          isMobile
            ? cn("w-64", mobileOpen ? "translate-x-0" : "-translate-x-full")
            : collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
