import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBookings, isBookingArchived } from "@/hooks/useBookings";
import { useCommissions } from "@/hooks/useCommissions";
import { useTeamProfiles } from "@/hooks/useTeamProfiles";
import { calculateAgencyCommission, CommissionTier } from "@/lib/commissionTiers";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  isWithinInterval,
  isValid,
} from "date-fns";
import { Building2, CheckCircle2 } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { Badge } from "@/components/ui/badge";
import { OpsAlerts } from "@/components/dashboard/OpsAlerts";

type DateRange = "mtd" | "ytd";

const getBookingDepartDate = (booking: any): string | null => {
  return booking?.depart_date ?? booking?.trips?.depart_date ?? null;
};

const parseSafeISO = (dateValue: string | null | undefined): Date | null => {
  if (!dateValue) return null;
  const parsed = parseISO(dateValue);
  return isValid(parsed) ? parsed : null;
};

export function AgencyMetrics() {
  const [range, setRange] = useState<DateRange>("ytd");
  const navigate = useNavigate();
  const { bookings, loading: bookingsLoading } = useBookings();
  const { data: commissions, isLoading: commissionsLoading } = useCommissions();
  const { data: clients } = useClients();
  const { data: teamProfiles } = useTeamProfiles();

  const loading = bookingsLoading || commissionsLoading;

  // Build a map of user_id -> commission_tier for agency split calculation
  const agentTierMap = useMemo(() => {
    const map = new Map<string, CommissionTier | null>();
    if (teamProfiles) {
      teamProfiles.forEach((p) => map.set(p.user_id, p.commission_tier));
    }
    return map;
  }, [teamProfiles]);

  const getAgencyShare = (commissionRevenue: number, userId: string) => {
    const tier = agentTierMap.get(userId);
    return calculateAgencyCommission(commissionRevenue, tier);
  };

  const now = new Date();
  const interval = useMemo(() => {
    if (range === "mtd") {
      return { start: startOfMonth(now), end: endOfMonth(now) };
    }
    return { start: startOfYear(now), end: endOfYear(now) };
  }, [range]);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter((b) => {
      if (b.status === "cancelled" || isBookingArchived(b)) return false;
      const parsedDepartDate = parseSafeISO(getBookingDepartDate(b));
      if (!parsedDepartDate) return false;
      return isWithinInterval(parsedDepartDate, interval);
    });
  }, [bookings, interval]);

  const kpis = useMemo(() => {
    const bookingCount = filteredBookings.length;
    const salesVolume = filteredBookings.reduce((s, b) => s + (b.gross_sales || b.total_amount || 0), 0);
    const commissionReceived = filteredBookings.reduce((s, b) => s + (b.commission_revenue || 0), 0);

    // Agency income uses actual tier split from agent profile
    const agencyIncome = filteredBookings.reduce((s, b) => {
      return s + getAgencyShare(b.commission_revenue || 0, b.user_id);
    }, 0);

    return { bookingCount, salesVolume, commissionReceived, agencyIncome };
  }, [filteredBookings, agentTierMap]);

  // Monthly chart data for the selected range
  const chartData = useMemo(() => {
    if (!bookings) return { commission: [], agencyIncome: [], grossSales: [] };

    const monthCount = range === "mtd" ? 1 : 12;
    const months: string[] = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      months.push(format(startOfMonth(subMonths(now, i)), "yyyy-MM"));
    }

    const initMap = () => Object.fromEntries(months.map((m) => [m, 0]));
    const commMap = initMap();
    const agencyMap = initMap();
    const grossMap = initMap();

    const activeBookings = bookings.filter((b) => b.status !== "cancelled" && !isBookingArchived(b));

    activeBookings.forEach((b) => {
      const parsedDepartDate = parseSafeISO(getBookingDepartDate(b));
      if (!parsedDepartDate) return;

      const key = format(parsedDepartDate, "yyyy-MM");
      if (commMap[key] !== undefined) {
        commMap[key] += b.commission_revenue || 0;
        agencyMap[key] += getAgencyShare(b.commission_revenue || 0, b.user_id);
        grossMap[key] += b.gross_sales || b.total_amount || 0;
      }
    });

    const toArr = (map: Record<string, number>) =>
      Object.entries(map).map(([m, value]) => ({
        month: format(parseISO(`${m}-01`), "MMM"),
        value,
      }));

    return {
      commission: toArr(commMap),
      agencyIncome: toArr(agencyMap),
      grossSales: toArr(grossMap),
    };
  }, [bookings, range]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(v);

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.[0]) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-md text-sm">
          <p className="font-medium">{label}</p>
          <p className="text-primary font-semibold">{fmt(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const MiniBarChart = ({ data, title }: { data: { month: string; value: number }[]; title: string }) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.every((d) => d.value === 0) ? (
          <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
            No data yet
          </div>
        ) : (
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={45}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Agency Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          At a glance
        </h2>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <Button
            variant={range === "mtd" ? "default" : "ghost"}
            size="sm"
            className="rounded-none text-xs px-4"
            onClick={() => setRange("mtd")}
          >
            Month to date
          </Button>
          <Button
            variant={range === "ytd" ? "default" : "ghost"}
            size="sm"
            className="rounded-none text-xs px-4"
            onClick={() => setRange("ytd")}
          >
            Year to date
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Bookings", value: kpis.bookingCount.toString() },
          { label: "Sales volume", value: fmt(kpis.salesVolume) },
          { label: "Commission received", value: fmt(kpis.commissionReceived) },
          { label: "Agency income", value: fmt(kpis.agencyIncome) },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4 space-y-1">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MiniBarChart data={chartData.commission} title="Commission received by month" />
        <MiniBarChart data={chartData.agencyIncome} title="Agency income by month" />
      </div>

      {/* Full Width Gross Sales */}
      <MiniBarChart data={chartData.grossSales} title="Gross sales by month" />

      {/* Ops Alerts */}
      <OpsAlerts />

      {/* Active Authorizations */}
      <ActiveAuthorizations bookings={bookings || []} clients={clients || []} navigate={navigate} />

      {/* Link to full analytics */}
      <Button variant="outline" size="sm" onClick={() => navigate("/analytics")}>
        View all KPIs
      </Button>
    </div>
  );
}

function ActiveAuthorizations({
  bookings,
  clients,
  navigate,
}: {
  bookings: any[];
  clients: any[];
  navigate: (path: string) => void;
}) {
  const upcoming = useMemo(() => {
    const now = new Date();
    const clientMap = new Map(clients.map((c: any) => [c.id, c.name]));

    return bookings
      .map((b) => {
        const departDateRaw = getBookingDepartDate(b);
        const departDate = parseSafeISO(departDateRaw);

        return {
          booking: b,
          departDateRaw,
          departDate,
        };
      })
      .filter(({ booking, departDate }) => {
        if (booking.status === "cancelled" || isBookingArchived(booking)) return false;
        if (!departDate) return false;
        return departDate >= now && (booking.status === "confirmed" || booking.status === "booked");
      })
      .sort(
        (a, b) =>
          (a.departDate?.getTime() ?? Number.POSITIVE_INFINITY) -
          (b.departDate?.getTime() ?? Number.POSITIVE_INFINITY)
      )
      .slice(0, 8)
      .map(({ booking, departDateRaw, departDate }) => ({
        id: booking.id,
        tripId: booking.trip_id,
        client: clientMap.get(booking.client_id) || "Unknown Client",
        destination: booking.destination,
        departDate: departDateRaw,
        departDateLabel: departDate ? format(departDate, "MMM d, yyyy") : "TBD",
        amount: booking.total_amount || 0,
        status: booking.status,
      }));
  }, [bookings, clients]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Active Authorizations
          </CardTitle>
          <Badge variant="secondary" className="text-xs">{upcoming.length} upcoming</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No upcoming confirmed bookings</p>
        ) : (
          <div className="divide-y divide-border">
            {upcoming.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/50 -mx-4 px-4 rounded transition-colors"
                onClick={() => item.tripId ? navigate(`/trips/${item.tripId}`) : navigate("/bookings")}
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">{item.client}</p>
                  <p className="text-xs text-muted-foreground">{item.destination}</p>
                </div>
                <div className="text-right space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">{fmt(item.amount)}</p>
                  <p className="text-xs text-muted-foreground">{item.departDateLabel}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
