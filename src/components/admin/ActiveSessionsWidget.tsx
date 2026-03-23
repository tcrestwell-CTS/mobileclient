import { useActiveSessions } from "@/hooks/useActiveSessions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Monitor, Smartphone, Circle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isMobile(ua: string | null) {
  if (!ua) return false;
  return /Mobile|Android|iPhone|iPad/i.test(ua);
}

function friendlyRoute(route: string | null) {
  if (!route) return "—";
  const map: Record<string, string> = {
    "/": "Dashboard",
    "/contacts": "CRM",
    "/bookings": "Bookings",
    "/trips": "Trips",
    "/commissions": "Commissions",
    "/analytics": "Analytics",
    "/settings": "Settings",
    "/team": "Team",
    "/suppliers": "Suppliers",
    "/branding": "Branding",
    "/training": "Training",
    "/qbo-health": "QBO Health",
    "/risk-compliance": "Risk & Compliance",
    "/reconciliation": "Reconciliation",
  };
  // Check exact match first, then prefix match for detail pages
  if (map[route]) return map[route];
  if (route.startsWith("/trips/")) return "Trip Detail";
  if (route.startsWith("/contacts/")) return "Client Detail";
  if (route.startsWith("/bookings/")) return "Booking Detail";
  return route;
}

export function ActiveSessionsWidget() {
  const { sessions, loading, onlineCount, isOnline } = useActiveSessions();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-primary" />
            Active Sessions
          </span>
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
            {onlineCount} Online
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No active sessions</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const online = isOnline(session.last_seen_at);
              return (
                <div
                  key={session.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40"
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={session.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(session.profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <Circle
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-current ${
                        online ? "text-emerald-500" : "text-muted-foreground/40"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {session.profile?.full_name || "Unknown Agent"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{friendlyRoute(session.current_route)}</span>
                      <span>·</span>
                      <span>
                        {online
                          ? "Active now"
                          : formatDistanceToNow(new Date(session.last_seen_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-muted-foreground">
                        {isMobile(session.user_agent) ? (
                          <Smartphone className="h-4 w-4" />
                        ) : (
                          <Monitor className="h-4 w-4" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      {isMobile(session.user_agent) ? "Mobile" : "Desktop"}
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
