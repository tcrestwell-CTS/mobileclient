import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBookings } from "@/hooks/useBookings";
import { useClients } from "@/hooks/useClients";
import { useCommissions } from "@/hooks/useCommissions";
import { useIsAdmin, useIsOfficeAdmin } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Plane, 
  DollarSign,
  Target,
  BarChart3
} from "lucide-react";
import { 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  parseISO, 
  isWithinInterval,
  startOfYear,
  endOfYear
} from "date-fns";
import { useNavigate } from "react-router-dom";

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  onClick?: () => void;
}

function KPICard({ title, value, change, changeType = "neutral", icon: Icon, onClick }: KPICardProps) {
  return (
    <Card 
      className={onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change && (
              <div className="flex items-center gap-1">
                {changeType === "positive" && <TrendingUp className="h-3 w-3 text-green-500" />}
                {changeType === "negative" && <TrendingDown className="h-3 w-3 text-red-500" />}
                <span className={`text-xs ${
                  changeType === "positive" ? "text-green-500" : 
                  changeType === "negative" ? "text-red-500" : 
                  "text-muted-foreground"
                }`}>
                  {change}
                </span>
              </div>
            )}
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AgencyKPIs() {
  const navigate = useNavigate();
  const { data: isAdmin } = useIsAdmin();
  const { data: isOfficeAdmin } = useIsOfficeAdmin();
  const isAgencyView = isAdmin || isOfficeAdmin;
  
  const { bookings, loading: bookingsLoading } = useBookings();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: commissions, isLoading: commissionsLoading } = useCommissions();

  const loading = bookingsLoading || clientsLoading || commissionsLoading;

  const kpis = useMemo(() => {
    if (!bookings || !clients || !commissions) {
      return null;
    }

    const now = new Date();
    const thisMonth = { start: startOfMonth(now), end: endOfMonth(now) };
    const lastMonth = { 
      start: startOfMonth(subMonths(now, 1)), 
      end: endOfMonth(subMonths(now, 1)) 
    };
    const thisYear = { start: startOfYear(now), end: endOfYear(now) };

    // This month's bookings (based on depart_date since created_at isn't in list query)
    const thisMonthBookings = bookings.filter(b => {
      const departDate = parseISO(b.depart_date);
      return isWithinInterval(departDate, thisMonth) && b.status !== "cancelled";
    });

    const lastMonthBookings = bookings.filter(b => {
      const departDate = parseISO(b.depart_date);
      return isWithinInterval(departDate, lastMonth) && b.status !== "cancelled";
    });

    // This month's revenue
    const thisMonthRevenue = thisMonthBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const lastMonthRevenue = lastMonthBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const revenueChange = lastMonthRevenue > 0 
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(0)
      : thisMonthRevenue > 0 ? "+100" : "0";

    // YTD revenue
    const ytdBookings = bookings.filter(b => {
      const departDate = parseISO(b.depart_date);
      return isWithinInterval(departDate, thisYear) && b.status !== "cancelled";
    });
    const ytdRevenue = ytdBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

    // New clients this month
    const thisMonthClients = clients.filter(c => {
      const created = parseISO(c.created_at);
      return isWithinInterval(created, thisMonth);
    });

    const lastMonthClients = clients.filter(c => {
      const created = parseISO(c.created_at);
      return isWithinInterval(created, lastMonth);
    });

    const clientChange = lastMonthClients.length > 0
      ? ((thisMonthClients.length - lastMonthClients.length) / lastMonthClients.length * 100).toFixed(0)
      : thisMonthClients.length > 0 ? "+100" : "0";

    // Commission stats
    const pendingCommissions = commissions.filter(c => c.status === "pending");
    const paidCommissions = commissions.filter(c => c.status === "paid");
    const totalPendingAmount = pendingCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalPaidAmount = paidCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);

    // Conversion rate (clients with bookings / total clients)
    const clientsWithBookings = new Set(bookings.map(b => b.client_id)).size;
    const conversionRate = clients.length > 0 
      ? ((clientsWithBookings / clients.length) * 100).toFixed(0)
      : "0";

    // Average booking value
    const avgBookingValue = bookings.length > 0
      ? bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0) / bookings.length
      : 0;

    return {
      thisMonthRevenue,
      revenueChange: Number(revenueChange),
      ytdRevenue,
      thisMonthBookings: thisMonthBookings.length,
      bookingChange: lastMonthBookings.length > 0
        ? ((thisMonthBookings.length - lastMonthBookings.length) / lastMonthBookings.length * 100).toFixed(0)
        : thisMonthBookings.length > 0 ? "+100" : "0",
      newClients: thisMonthClients.length,
      clientChange: Number(clientChange),
      totalClients: clients.length,
      pendingCommissions: totalPendingAmount,
      paidCommissions: totalPaidAmount,
      conversionRate: Number(conversionRate),
      avgBookingValue,
    };
  }, [bookings, clients, commissions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {isAgencyView ? "Agency KPIs" : "Your KPIs"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!kpis) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {isAgencyView ? "Agency KPIs" : "Your KPIs"}
          </CardTitle>
          <button
            onClick={() => navigate("/analytics")}
            className="text-sm text-primary hover:underline"
          >
            View Details →
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            title="Monthly Revenue"
            value={formatCurrency(kpis.thisMonthRevenue)}
            change={`${kpis.revenueChange >= 0 ? "+" : ""}${kpis.revenueChange}% vs last month`}
            changeType={kpis.revenueChange > 0 ? "positive" : kpis.revenueChange < 0 ? "negative" : "neutral"}
            icon={DollarSign}
            onClick={() => navigate("/analytics")}
          />
          <KPICard
            title="New Bookings"
            value={kpis.thisMonthBookings.toString()}
            change={`${kpis.bookingChange}% vs last month`}
            changeType={Number(kpis.bookingChange) > 0 ? "positive" : Number(kpis.bookingChange) < 0 ? "negative" : "neutral"}
            icon={Plane}
            onClick={() => navigate("/bookings")}
          />
          <KPICard
            title="New Clients"
            value={kpis.newClients.toString()}
            change={`${kpis.totalClients} total clients`}
            changeType="neutral"
            icon={Users}
            onClick={() => navigate("/contacts")}
          />
          <KPICard
            title="Conversion Rate"
            value={`${kpis.conversionRate}%`}
            change="Clients with bookings"
            changeType="neutral"
            icon={Target}
          />
        </div>
      </CardContent>
    </Card>
  );
}
