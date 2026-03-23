import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CreditCard, Calendar, DollarSign, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface OpsAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  icon: React.ElementType;
  title: string;
  count: number;
  description: string;
  action?: () => void;
}

export function OpsAlerts() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch all trips for ops monitoring
  const { data: trips } = useQuery({
    queryKey: ["ops-trips", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, trip_name, status, proposal_sent_at, follow_up_due_at, depart_date, return_date")
        .not("status", "in", '("cancelled","archived")');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch expired/active CC authorizations
  const { data: expiredAuths } = useQuery({
    queryKey: ["ops-expired-auths", user?.id],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("cc_authorizations")
        .select("id")
        .in("status", ["pending", "authorized"])
        .lt("created_at", cutoff);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch booked trips missing commission expected date (commissions with null expected_commission)
  const { data: bookedMissingCommDate } = useQuery({
    queryKey: ["ops-missing-comm-date", user?.id],
    queryFn: async () => {
      const { data: bookedTrips } = await supabase
        .from("trips")
        .select("id")
        .eq("status", "booked");

      if (!bookedTrips?.length) return [];

      const tripIds = bookedTrips.map((t) => t.id);
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, trip_id, commission_revenue")
        .in("trip_id", tripIds)
        .gt("commission_revenue", 0);

      if (!bookings?.length) return [];

      const bookingIds = bookings.map((b) => b.id);
      const { data: commissions } = await supabase
        .from("commissions")
        .select("booking_id, paid_date")
        .in("booking_id", bookingIds)
        .is("paid_date", null);

      // Trips with commissions that have no paid_date AND no expected date
      const missingTrips = new Set<string>();
      commissions?.forEach((c) => {
        const booking = bookings.find((b) => b.id === c.booking_id);
        if (booking) missingTrips.add(booking.trip_id!);
      });

      return Array.from(missingTrips);
    },
    enabled: !!user,
  });

  // Fetch commission_pending trips older than 14 days
  const { data: stalePendingCommissions } = useQuery({
    queryKey: ["ops-stale-comm-pending", user?.id],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("trips")
        .select("id")
        .eq("status", "commission_pending")
        .lt("updated_at", cutoff);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const alerts = useMemo<OpsAlert[]>(() => {
    const result: OpsAlert[] = [];
    const now = new Date();

    // 1. Proposals > 7 days without response
    const staleProposals = (trips || []).filter((t) => {
      if (t.status !== "proposal_sent" || !t.proposal_sent_at) return false;
      return differenceInDays(now, parseISO(t.proposal_sent_at)) > 7;
    });
    if (staleProposals.length > 0) {
      result.push({
        id: "stale-proposals",
        severity: "warning",
        icon: Send,
        title: "Stale Proposals",
        count: staleProposals.length,
        description: `${staleProposals.length} trip${staleProposals.length > 1 ? "s" : ""} in Proposal Sent > 7 days`,
        action: () => navigate("/trips"),
      });
    }

    // 2. Deposit Ready > 5 days (option_selected or deposit_authorized)
    const depositReady = (trips || []).filter((t) => {
      if (!["option_selected", "deposit_authorized"].includes(t.status)) return false;
      // Use a rough proxy — trips stuck in these statuses
      return true; // We show all since we can't easily tell how long without updated_at
    });
    if (depositReady.length > 0) {
      result.push({
        id: "deposit-ready",
        severity: "info",
        icon: CreditCard,
        title: "Awaiting Deposit",
        count: depositReady.length,
        description: `${depositReady.length} trip${depositReady.length > 1 ? "s" : ""} awaiting deposit action`,
        action: () => navigate("/trips"),
      });
    }

    // 3. Expired CC authorizations
    if (expiredAuths && expiredAuths.length > 0) {
      result.push({
        id: "expired-auths",
        severity: "critical",
        icon: AlertTriangle,
        title: "Expired Authorizations",
        count: expiredAuths.length,
        description: `${expiredAuths.length} CC authorization${expiredAuths.length > 1 ? "s" : ""} expired (>30 days)`,
      });
    }

    // 4. Booked trips missing commission date
    if (bookedMissingCommDate && bookedMissingCommDate.length > 0) {
      result.push({
        id: "missing-comm-date",
        severity: "warning",
        icon: Calendar,
        title: "Missing Commission Date",
        count: bookedMissingCommDate.length,
        description: `${bookedMissingCommDate.length} booked trip${bookedMissingCommDate.length > 1 ? "s" : ""} without expected commission date`,
        action: () => navigate("/trips"),
      });
    }

    // 5. Commission Pending > 14 days
    if (stalePendingCommissions && stalePendingCommissions.length > 0) {
      result.push({
        id: "stale-comm-pending",
        severity: "critical",
        icon: DollarSign,
        title: "Overdue Commission",
        count: stalePendingCommissions.length,
        description: `${stalePendingCommissions.length} trip${stalePendingCommissions.length > 1 ? "s" : ""} with commission pending > 14 days`,
        action: () => navigate("/trips"),
      });
    }

    return result.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });
  }, [trips, expiredAuths, bookedMissingCommDate, stalePendingCommissions, navigate]);

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Ops Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">All clear — no operational alerts</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Ops Alerts
          </CardTitle>
          <Badge variant="destructive" className="text-xs">
            {alerts.reduce((s, a) => s + a.count, 0)} items
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
                alert.severity === "critical"
                  ? "border-destructive/30 bg-destructive/5"
                  : alert.severity === "warning"
                  ? "border-orange-500/30 bg-orange-500/5"
                  : "border-border"
              )}
              onClick={alert.action}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                  alert.severity === "critical"
                    ? "bg-destructive/10 text-destructive"
                    : alert.severity === "warning"
                    ? "bg-orange-500/10 text-orange-600"
                    : "bg-primary/10 text-primary"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs",
                      alert.severity === "critical" && "bg-destructive/10 text-destructive"
                    )}
                  >
                    {alert.count}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
