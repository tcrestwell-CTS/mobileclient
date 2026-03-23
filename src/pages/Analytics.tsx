import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBookings } from "@/hooks/useBookings";
import { useClients } from "@/hooks/useClients";
import { useCommissions } from "@/hooks/useCommissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentPerformanceSection } from "@/components/analytics/AgentPerformanceSection";
import { AgencySalesTab } from "@/components/analytics/AgencySalesTab";
import { AgentIntelligenceTab } from "@/components/analytics/AgentIntelligenceTab";
import { useIsAdmin, useIsOfficeAdmin } from "@/hooks/useAdmin";
import { DateRangeFilter, DateRange } from "@/components/analytics/DateRangeFilter";
import { exportToCSV, formatCurrencyForExport, formatDateForExport } from "@/lib/csvExport";
import { toast } from "sonner";
import type { TooltipProps } from "recharts";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  format,
  parseISO,
  subMonths,
  isWithinInterval,
  eachMonthOfInterval,
} from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Plane,
  DollarSign,
  Target,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Trophy,
  Download,
  Brain,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  description,
}: {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {change && (
              <div className="flex items-center gap-1">
                {changeType === "positive" && <TrendingUp className="h-4 w-4 text-green-500" />}
                {changeType === "negative" && <TrendingDown className="h-4 w-4 text-red-500" />}
                <span
                  className={`text-sm font-medium ${
                    changeType === "positive"
                      ? "text-green-500"
                      : changeType === "negative"
                      ? "text-red-500"
                      : "text-muted-foreground"
                  }`}
                >
                  {change}
                </span>
              </div>
            )}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const Analytics = () => {
  const { bookings, loading: bookingsLoading } = useBookings();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: commissions, isLoading: commissionsLoading } = useCommissions();
  const { data: isAdmin } = useIsAdmin();
  const { data: isOfficeAdmin } = useIsOfficeAdmin();
  const canViewIntelligence = isAdmin || isOfficeAdmin;

  // Default to last 12 months
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subMonths(new Date(), 12),
    to: new Date(),
  });

  const loading = bookingsLoading || clientsLoading || commissionsLoading;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Filter bookings by date range (based on depart_date)
  const filteredBookings = useMemo(() => {
    if (!bookings?.length) return [];
    return bookings.filter((booking) => {
      const departDate = parseISO(booking.depart_date);
      return isWithinInterval(departDate, { start: dateRange.from, end: dateRange.to });
    });
  }, [bookings, dateRange]);

  // Filter clients by date range (based on created_at)
  const filteredClients = useMemo(() => {
    if (!clients?.length) return [];
    return clients.filter((client) => {
      const createdDate = parseISO(client.created_at);
      return isWithinInterval(createdDate, { start: dateRange.from, end: dateRange.to });
    });
  }, [clients, dateRange]);

  // Monthly revenue data for chart (based on depart_date within date range)
  const monthlyRevenueData = useMemo(() => {
    if (!filteredBookings?.length) return [];

    // Generate months within the date range
    const monthsInRange = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
    const months: { [key: string]: number } = {};

    monthsInRange.forEach((monthDate) => {
      const monthKey = format(monthDate, "yyyy-MM");
      months[monthKey] = 0;
    });

    filteredBookings.forEach((booking) => {
      if (booking.status === "cancelled") return;
      const departDate = parseISO(booking.depart_date);
      const monthKey = format(departDate, "yyyy-MM");
      if (months[monthKey] !== undefined) {
        months[monthKey] += booking.total_amount || 0;
      }
    });

    return Object.entries(months).map(([month, revenue]) => ({
      month: format(parseISO(`${month}-01`), "MMM yy"),
      revenue,
    }));
  }, [filteredBookings, dateRange]);

  // Booking status distribution (filtered)
  const bookingStatusData = useMemo(() => {
    if (!filteredBookings?.length) return [];

    const statusCounts: { [key: string]: number } = {};
    filteredBookings.forEach((booking) => {
      const status = booking.status || "unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [filteredBookings]);

  // Top destinations (filtered)
  const topDestinations = useMemo(() => {
    if (!filteredBookings?.length) return [];

    const destinations: { [key: string]: { count: number; revenue: number } } = {};
    filteredBookings.forEach((booking) => {
      if (booking.status === "cancelled") return;
      const dest = booking.destination || "Unknown";
      if (!destinations[dest]) {
        destinations[dest] = { count: 0, revenue: 0 };
      }
      destinations[dest].count += 1;
      destinations[dest].revenue += booking.total_amount || 0;
    });

    return Object.entries(destinations)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredBookings]);

  // Client acquisition over time (filtered)
  const clientAcquisitionData = useMemo(() => {
    if (!filteredClients?.length) return [];

    // Generate months within the date range
    const monthsInRange = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
    const months: { [key: string]: number } = {};

    monthsInRange.forEach((monthDate) => {
      const monthKey = format(monthDate, "yyyy-MM");
      months[monthKey] = 0;
    });

    filteredClients.forEach((client) => {
      const created = parseISO(client.created_at);
      const monthKey = format(created, "yyyy-MM");
      if (months[monthKey] !== undefined) {
        months[monthKey] += 1;
      }
    });

    return Object.entries(months).map(([month, count]) => ({
      month: format(parseISO(`${month}-01`), "MMM yy"),
      clients: count,
    }));
  }, [filteredClients, dateRange]);

  // KPI calculations (using filtered data for period-specific metrics)
  const kpis = useMemo(() => {
    if (!filteredBookings || !filteredClients || !commissions) return null;

    // Period metrics (using filtered data)
    const periodBookings = filteredBookings.filter((b) => b.status !== "cancelled");
    const periodRevenue = periodBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

    // Commission revenue metrics from booking data
    const periodGrossSales = periodBookings.reduce((sum, b) => sum + (b.gross_sales || b.total_amount || 0), 0);
    // Named constants — keep in sync with agency_settings default commission rate
    const DEFAULT_COMMISSION_RATE = 0.085;
    const DEFAULT_NET_RATE = 1 - DEFAULT_COMMISSION_RATE;
    const periodCommissionRevenue = periodBookings.reduce((sum, b) => sum + (b.commission_revenue || (b.total_amount * DEFAULT_COMMISSION_RATE)), 0);
    const periodNetSales = periodBookings.reduce((sum, b) => sum + (b.net_sales || (b.total_amount * DEFAULT_NET_RATE)), 0);

    // All-time metrics (using original data for comparison)
    const totalRevenue = bookings
      ?.filter((b) => b.status !== "cancelled")
      .reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;

    const totalCommissionRevenue = bookings
      ?.filter((b) => b.status !== "cancelled")
      .reduce((sum, b) => sum + (b.commission_revenue || (b.total_amount * DEFAULT_COMMISSION_RATE)), 0) || 0;

    // Average booking value (within period)
    const avgBookingValue =
      periodBookings.length > 0
        ? periodBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0) / periodBookings.length
        : 0;

    // Booking rate: clients with bookings in period / total clients (all-time)
    const clientsWithBookings = new Set(filteredBookings.map((b) => b.client_id)).size;
    const allClientsCount = clients?.length || 0;
    const bookingRate = allClientsCount > 0 ? (clientsWithBookings / allClientsCount) * 100 : 0;

    // Commission metrics (all commissions - not date filtered as they track differently)
    const totalPending = commissions
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const totalPaid = commissions
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    return {
      totalRevenue,
      periodRevenue,
      totalBookings: bookings?.length || 0,
      periodBookings: periodBookings.length,
      totalClients: clients?.length || 0,
      periodClients: filteredClients.length,
      avgBookingValue,
      bookingRate,
      pendingCommissions: totalPending,
      paidCommissions: totalPaid,
      // New commission structure metrics
      periodGrossSales,
      periodCommissionRevenue,
      periodNetSales,
      totalCommissionRevenue,
    };
  }, [filteredBookings, filteredClients, commissions, bookings?.length, clients?.length]);

  // Export functions
  const handleExportBookings = () => {
    if (!filteredBookings?.length) {
      toast.error("No booking data to export");
      return;
    }
    const exportData = filteredBookings.map((b) => ({
      booking_reference: b.booking_reference,
      trip_name: b.trip_name || "",
      destination: b.destination,
      status: b.status,
      depart_date: formatDateForExport(b.depart_date),
      return_date: formatDateForExport(b.return_date),
      travelers: b.travelers,
      total_amount: formatCurrencyForExport(b.total_amount || 0),
    }));
    exportToCSV(exportData, `bookings_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}`, [
      { key: "booking_reference", header: "Reference" },
      { key: "trip_name", header: "Trip Name" },
      { key: "destination", header: "Destination" },
      { key: "status", header: "Status" },
      { key: "depart_date", header: "Departure Date" },
      { key: "return_date", header: "Return Date" },
      { key: "travelers", header: "Travelers" },
      { key: "total_amount", header: "Total Amount ($)" },
    ]);
    toast.success("Bookings exported successfully");
  };

  const handleExportRevenue = () => {
    if (!monthlyRevenueData?.length) {
      toast.error("No revenue data to export");
      return;
    }
    const exportData = monthlyRevenueData.map((d) => ({
      month: d.month,
      revenue: formatCurrencyForExport(d.revenue),
    }));
    exportToCSV(exportData, `revenue_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}`, [
      { key: "month", header: "Month" },
      { key: "revenue", header: "Revenue ($)" },
    ]);
    toast.success("Revenue data exported successfully");
  };

  const handleExportClients = () => {
    if (!filteredClients?.length) {
      toast.error("No client data to export");
      return;
    }
    const exportData = filteredClients.map((c) => ({
      name: c.name,
      email: c.email || "",
      phone: c.phone || "",
      status: c.status,
      location: c.location || "",
      created_at: formatDateForExport(c.created_at),
    }));
    exportToCSV(exportData, `clients_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}`, [
      { key: "name", header: "Name" },
      { key: "email", header: "Email" },
      { key: "phone", header: "Phone" },
      { key: "status", header: "Status" },
      { key: "location", header: "Location" },
      { key: "created_at", header: "Created Date" },
    ]);
    toast.success("Clients exported successfully");
  };

  const handleExportDestinations = () => {
    if (!topDestinations?.length) {
      toast.error("No destination data to export");
      return;
    }
    const exportData = topDestinations.map((d) => ({
      destination: d.name,
      bookings: d.count,
      revenue: formatCurrencyForExport(d.revenue),
    }));
    exportToCSV(exportData, `destinations_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}`, [
      { key: "destination", header: "Destination" },
      { key: "bookings", header: "Bookings" },
      { key: "revenue", header: "Revenue ($)" },
    ]);
    toast.success("Destinations exported successfully");
  };

  const handleExportSummary = () => {
    if (!kpis) {
      toast.error("No summary data to export");
      return;
    }
    const exportData = [
      {
        metric: "Period Revenue",
        value: formatCurrencyForExport(kpis.periodRevenue),
      },
      {
        metric: "Period Bookings",
        value: kpis.periodBookings.toString(),
      },
      {
        metric: "Period Clients",
        value: kpis.periodClients.toString(),
      },
      {
        metric: "Average Booking Value",
        value: formatCurrencyForExport(kpis.avgBookingValue),
      },
      {
        metric: "Booking Rate (%)",
        value: kpis.bookingRate.toFixed(1),
      },
      {
        metric: "Pending Commissions",
        value: formatCurrencyForExport(kpis.pendingCommissions),
      },
      {
        metric: "Paid Commissions",
        value: formatCurrencyForExport(kpis.paidCommissions),
      },
    ];
    exportToCSV(exportData, `summary_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}`, [
      { key: "metric", header: "Metric" },
      { key: "value", header: "Value" },
    ]);
    toast.success("Summary exported successfully");
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-md">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name === "revenue" ? formatCurrency(entry.value as number) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground mt-1">Agency performance metrics and insights</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-1">Agency performance metrics and insights</p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportSummary}>
                  Export Summary
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportBookings}>
                  Export Bookings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportRevenue}>
                  Export Revenue by Month
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportClients}>
                  Export Clients
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportDestinations}>
                  Export Top Destinations
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="agency-sales" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Agency Sales
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Agent Performance
            </TabsTrigger>
            {canViewIntelligence && (
              <TabsTrigger value="intelligence" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Agent Intelligence
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Period Revenue"
            value={formatCurrency(kpis?.periodRevenue || 0)}
            change={`${formatCurrency(kpis?.totalRevenue || 0)} all-time`}
            changeType="neutral"
            icon={DollarSign}
          />
          <StatCard
            title="Period Bookings"
            value={kpis?.periodBookings?.toString() || "0"}
            change={`${kpis?.totalBookings || 0} all-time`}
            changeType="neutral"
            icon={Plane}
          />
          <StatCard
            title="Period Clients"
            value={kpis?.periodClients?.toString() || "0"}
            change={`${kpis?.bookingRate?.toFixed(0) || 0}% booking rate`}
            changeType="neutral"
            icon={Users}
          />
          <StatCard
            title="Avg. Booking Value"
            value={formatCurrency(kpis?.avgBookingValue || 0)}
            description="For selected period"
            icon={Target}
          />
        </div>

        {/* Commission Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gross Booking Sales</p>
                  <p className="text-2xl font-bold">{formatCurrency(kpis?.periodGrossSales || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total guest payments</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Commission Revenue</p>
                  <p className="text-2xl font-bold text-success">{formatCurrency(kpis?.periodCommissionRevenue || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatCurrency(kpis?.totalCommissionRevenue || 0)} all-time</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-muted-foreground">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net Booking Sales</p>
                  <p className="text-2xl font-bold">{formatCurrency(kpis?.periodNetSales || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">After commission</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Commissions</p>
                  <p className="text-2xl font-bold">{formatCurrency(kpis?.pendingCommissions || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatCurrency(kpis?.paidCommissions || 0)} paid</p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Revenue Trend
              </CardTitle>
              <CardDescription>Monthly revenue from {format(dateRange.from, "MMM yyyy")} to {format(dateRange.to, "MMM yyyy")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={50}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Booking Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Booking Status
              </CardTitle>
              <CardDescription>Distribution of booking statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {bookingStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bookingStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ percent }) => (percent > 0.1 ? `${(percent * 100).toFixed(0)}%` : "")}
                        labelLine={false}
                      >
                        {bookingStatusData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No booking data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Destinations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Destinations
              </CardTitle>
              <CardDescription>Revenue by destination</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {topDestinations.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topDestinations} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        width={100}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No destination data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Client Acquisition */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Client Acquisition
              </CardTitle>
              <CardDescription>New clients per month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientAcquisitionData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={30} />
                    <Tooltip />
                    <Bar dataKey="clients" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
          </TabsContent>

          <TabsContent value="agency-sales">
            <AgencySalesTab dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="agents">
            <AgentPerformanceSection dateRange={dateRange} />
          </TabsContent>

          {canViewIntelligence && (
            <TabsContent value="intelligence">
              <AgentIntelligenceTab dateRange={dateRange} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
