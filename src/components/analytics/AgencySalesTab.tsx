import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBookings } from "@/hooks/useBookings";
import { useCommissions } from "@/hooks/useCommissions";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useTeamProfiles } from "@/hooks/useTeamProfiles";
import { DateRange } from "./DateRangeFilter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  format,
  parseISO,
  isWithinInterval,
  eachMonthOfInterval,
} from "date-fns";
import {
  DollarSign,
  FileText,
  Banknote,
  TrendingUp,
  Download,
  Building2,
  User,
} from "lucide-react";
import { exportToCSV, formatCurrencyForExport } from "@/lib/csvExport";
import { toast } from "sonner";
import { getTierConfig, CommissionTier } from "@/lib/commissionTiers";

interface AgencySalesTabProps {
  dateRange: DateRange;
}

export function AgencySalesTab({ dateRange }: AgencySalesTabProps) {
  const { bookings } = useBookings();
  const { data: commissions } = useCommissions();
  const { suppliers } = useSuppliers();
  const { data: teamProfiles } = useTeamProfiles();

  // Filters
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDestination, setSelectedDestination] = useState<string>("all");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatCurrencyCompact = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get unique destinations for filter
  const destinations = useMemo(() => {
    if (!bookings?.length) return [];
    const uniqueDestinations = [...new Set(bookings.map((b) => b.destination).filter(Boolean))];
    return uniqueDestinations.sort();
  }, [bookings]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    if (!bookings?.length) return [];

    return bookings.filter((booking) => {
      // Date filter
      const departDate = parseISO(booking.depart_date);
      const inDateRange = isWithinInterval(departDate, {
        start: dateRange.from,
        end: dateRange.to,
      });
      if (!inDateRange) return false;

      // Supplier filter
      if (selectedSupplier !== "all" && booking.supplier_id !== selectedSupplier) {
        return false;
      }

      // Agent filter
      if (selectedAgent !== "all" && booking.user_id !== selectedAgent) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "all" && booking.status !== selectedStatus) {
        return false;
      }

      // Destination filter
      if (selectedDestination !== "all" && booking.destination !== selectedDestination) {
        return false;
      }

      return true;
    });
  }, [bookings, dateRange, selectedSupplier, selectedAgent, selectedStatus, selectedDestination]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const activeBookings = filteredBookings.filter((b) => b.status !== "cancelled");
    
    // Basic metrics
    const totalBookings = activeBookings.length;
    const grossSales = activeBookings.reduce((sum, b) => sum + (b.gross_sales || b.total_amount || 0), 0);

    // Expected commission (total commission revenue from bookings)
    const expectedCommission = activeBookings.reduce(
      (sum, b) => sum + (b.commission_revenue || 0),
      0
    );

    // Get filtered commissions based on booking IDs
    const bookingIds = new Set(activeBookings.map((b) => b.id));
    const relevantCommissions = commissions?.filter((c) => bookingIds.has(c.booking_id)) || [];

    // Received commission (commissions that are paid)
    const receivedCommission = relevantCommissions
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + c.amount, 0);

    // Calculate agency income (the agency's portion of commission after agent split)
    // Using tier-based calculation
    let expectedAgencyIncome = 0;
    let receivedAgencyIncome = 0;

    activeBookings.forEach((booking) => {
      const agentProfile = teamProfiles?.find((p) => p.user_id === booking.user_id);
      const tier = (agentProfile?.commission_tier as CommissionTier) || "tier_1";
      const tierConfig = getTierConfig(tier);
      const agencyPercentage = (100 - tierConfig.agentSplit) / 100;

      const bookingCommission = booking.commission_revenue || 0;
      expectedAgencyIncome += bookingCommission * agencyPercentage;

      // Check if this booking's commission is paid
      const bookingPaidCommission = relevantCommissions.find(
        (c) => c.booking_id === booking.id && c.status === "paid"
      );
      if (bookingPaidCommission) {
        receivedAgencyIncome += bookingPaidCommission.amount * agencyPercentage;
      }
    });

    return {
      totalBookings,
      grossSales,
      expectedCommission,
      expectedAgencyIncome,
      receivedCommission,
      receivedAgencyIncome,
    };
  }, [filteredBookings, commissions, teamProfiles]);

  // Monthly bookings chart data
  const monthlyBookingsData = useMemo(() => {
    if (!filteredBookings?.length) return [];

    const monthsInRange = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
    const months: { [key: string]: number } = {};

    monthsInRange.forEach((monthDate) => {
      const monthKey = format(monthDate, "yyyy-MM");
      months[monthKey] = 0;
    });

    filteredBookings
      .filter((b) => b.status !== "cancelled")
      .forEach((booking) => {
        const departDate = parseISO(booking.depart_date);
        const monthKey = format(departDate, "yyyy-MM");
        if (months[monthKey] !== undefined) {
          months[monthKey] += 1;
        }
      });

    return Object.entries(months).map(([month, count]) => ({
      month: format(parseISO(`${month}-01`), "MMM"),
      bookings: count,
    }));
  }, [filteredBookings, dateRange]);

  // Monthly gross sales chart data
  const monthlyGrossSalesData = useMemo(() => {
    if (!filteredBookings?.length) return [];

    const monthsInRange = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
    const months: { [key: string]: number } = {};

    monthsInRange.forEach((monthDate) => {
      const monthKey = format(monthDate, "yyyy-MM");
      months[monthKey] = 0;
    });

    filteredBookings
      .filter((b) => b.status !== "cancelled")
      .forEach((booking) => {
        const departDate = parseISO(booking.depart_date);
        const monthKey = format(departDate, "yyyy-MM");
        if (months[monthKey] !== undefined) {
          months[monthKey] += booking.gross_sales || booking.total_amount || 0;
        }
      });

    return Object.entries(months).map(([month, sales]) => ({
      month: format(parseISO(`${month}-01`), "MMM"),
      sales,
    }));
  }, [filteredBookings, dateRange]);

  const handleExportSales = () => {
    if (!filteredBookings.length) {
      toast.error("No data to export");
      return;
    }

    const exportData = filteredBookings.map((b) => {
      const supplier = suppliers.find((s) => s.id === b.supplier_id);
      const agent = teamProfiles?.find((p) => p.user_id === b.user_id);
      return {
        booking_reference: b.booking_reference,
        destination: b.destination,
        depart_date: format(parseISO(b.depart_date), "yyyy-MM-dd"),
        status: b.status,
        gross_sales: formatCurrencyForExport(b.gross_sales || b.total_amount || 0),
        commission_revenue: formatCurrencyForExport(b.commission_revenue || 0),
        supplier: supplier?.name || "N/A",
        agent: agent?.full_name || "N/A",
      };
    });

    exportToCSV(
      exportData,
      `agency_sales_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to, "yyyy-MM-dd")}`,
      [
        { key: "booking_reference", header: "Reference" },
        { key: "destination", header: "Destination" },
        { key: "depart_date", header: "Departure Date" },
        { key: "status", header: "Status" },
        { key: "gross_sales", header: "Gross Sales ($)" },
        { key: "commission_revenue", header: "Commission ($)" },
        { key: "supplier", header: "Supplier" },
        { key: "agent", header: "Agent" },
      ]
    );
    toast.success("Agency sales exported successfully");
  };

  const clearFilters = () => {
    setSelectedSupplier("all");
    setSelectedAgent("all");
    setSelectedStatus("all");
    setSelectedDestination("all");
  };

  const hasActiveFilters =
    selectedSupplier !== "all" ||
    selectedAgent !== "all" ||
    selectedStatus !== "all" ||
    selectedDestination !== "all";

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="w-[160px]">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-[160px]">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {teamProfiles?.map((profile) => (
                  <SelectItem key={profile.user_id} value={profile.user_id}>
                    {profile.full_name || "Unnamed Agent"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedDestination} onValueChange={setSelectedDestination}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Destination" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Destinations</SelectItem>
                {destinations.map((dest) => (
                  <SelectItem key={dest} value={dest}>
                    {dest}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}

            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={handleExportSales}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Row KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Bookings</p>
              <p className="text-4xl font-bold">{kpis.totalBookings}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Gross Sales</p>
              <p className="text-4xl font-bold">{formatCurrency(kpis.grossSales)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Your Currency</p>
              <p className="text-4xl font-bold">USD</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commission KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Expected Commission</p>
                <p className="text-3xl font-bold">{formatCurrency(kpis.expectedCommission)}</p>
                <p className="text-xs text-muted-foreground">Total from bookings</p>
              </div>
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Expected Agency Income</p>
                <p className="text-3xl font-bold">{formatCurrency(kpis.expectedAgencyIncome)}</p>
                <p className="text-xs text-muted-foreground">After agent splits</p>
              </div>
              <Building2 className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Received Commission</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(kpis.receivedCommission)}</p>
                <p className="text-xs text-muted-foreground">Already paid out</p>
              </div>
              <Banknote className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Received Agency Income</p>
                <p className="text-3xl font-bold text-emerald-600">{formatCurrency(kpis.receivedAgencyIncome)}</p>
                <p className="text-xs text-muted-foreground">Agency portion paid</p>
              </div>
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Bookings</CardTitle>
            <CardDescription>Number of bookings per month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {monthlyBookingsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyBookingsData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No booking data for selected period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Gross Sales</CardTitle>
            <CardDescription>Revenue per month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {monthlyGrossSalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyGrossSalesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={50}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrencyCompact(value), "Sales"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No sales data for selected period
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
