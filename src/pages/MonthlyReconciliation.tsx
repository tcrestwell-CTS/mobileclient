import { useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Users,
} from "lucide-react";
import { useBookings } from "@/hooks/useBookings";
import { useCommissions } from "@/hooks/useCommissions";
import { useClients } from "@/hooks/useClients";
import { usePermissions } from "@/hooks/usePermissions";
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from "date-fns";
import { exportToCSV, formatCurrencyForExport, formatDateForExport } from "@/lib/csvExport";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const MonthlyReconciliation = () => {
  const { bookings, loading: bookingsLoading } = useBookings();
  const { data: commissions, isLoading: commissionsLoading } = useCommissions();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { isAdmin, canViewFinancials } = usePermissions();
  const navigate = useNavigate();

  const loading = bookingsLoading || commissionsLoading || clientsLoading;

  // Current and previous month ranges
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));

  const monthlyData = useMemo(() => {
    if (!bookings || !commissions) return null;

    const inRange = (dateStr: string, start: Date, end: Date) => {
      try {
        return isWithinInterval(parseISO(dateStr), { start, end });
      } catch {
        return false;
      }
    };

    const currentBookings = bookings.filter((b) => inRange(b.created_at, currentMonthStart, currentMonthEnd));
    const prevBookings = bookings.filter((b) => inRange(b.created_at, prevMonthStart, prevMonthEnd));
    const currentCommissions = commissions.filter((c) => inRange(c.created_at, currentMonthStart, currentMonthEnd));
    const prevCommissions = commissions.filter((c) => inRange(c.created_at, prevMonthStart, prevMonthEnd));

    const currentRevenue = currentBookings.reduce((s, b) => s + b.gross_sales, 0);
    const prevRevenue = prevBookings.reduce((s, b) => s + b.gross_sales, 0);
    const currentCommTotal = currentCommissions.reduce((s, c) => s + c.amount, 0);
    const prevCommTotal = prevCommissions.reduce((s, c) => s + c.amount, 0);
    const currentHoldback = currentCommissions.reduce((s, c) => s + (c.holdback_amount || 0), 0);
    const currentOutstanding = bookings
      .filter((b) => b.status === "confirmed")
      .reduce((s, b) => s + b.gross_sales, 0);

    const refundedPayments = bookings.filter((b) => b.status === "cancelled" && b.cancellation_refund_amount > 0);
    const totalRefunds = refundedPayments.reduce((s, b) => s + b.cancellation_refund_amount, 0);

    return {
      currentRevenue,
      prevRevenue,
      revenueChange: prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0,
      currentBookingCount: currentBookings.length,
      prevBookingCount: prevBookings.length,
      currentCommTotal,
      prevCommTotal,
      commChange: prevCommTotal > 0 ? ((currentCommTotal - prevCommTotal) / prevCommTotal) * 100 : 0,
      currentHoldback,
      currentOutstanding,
      totalRefunds,
      refundCount: refundedPayments.length,
      paidCommissions: currentCommissions.filter((c) => c.status === "paid").reduce((s, c) => s + c.amount, 0),
      pendingCommissions: currentCommissions.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount, 0),
      // Top bookings this month
      topBookings: currentBookings
        .sort((a, b) => b.gross_sales - a.gross_sales)
        .slice(0, 10)
        .map((b) => ({
          ...b,
          clientName: clients?.find((c) => c.id === b.client_id)?.name || "Unknown",
        })),
    };
  }, [bookings, commissions, clients, currentMonthStart, currentMonthEnd, prevMonthStart, prevMonthEnd]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  const handleExport = () => {
    if (!monthlyData?.topBookings.length) {
      toast.error("No data to export");
      return;
    }
    const data = monthlyData.topBookings.map((b) => ({
      reference: b.booking_reference,
      client: b.clientName,
      destination: b.destination,
      gross_sales: formatCurrencyForExport(b.gross_sales),
      commission: formatCurrencyForExport(b.commission_revenue),
      status: b.status,
      date: formatDateForExport(b.created_at),
    }));
    exportToCSV(data, `reconciliation_${format(now, "yyyy-MM")}`, [
      { key: "reference", header: "Reference" },
      { key: "client", header: "Client" },
      { key: "destination", header: "Destination" },
      { key: "gross_sales", header: "Gross Sales" },
      { key: "commission", header: "Commission" },
      { key: "status", header: "Status" },
      { key: "date", header: "Date" },
    ]);
    toast.success("Report exported");
  };

  if (!canViewFinancials) {
    navigate("/");
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Monthly Reconciliation
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(now, "MMMM yyyy")} financial summary
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Revenue</p>
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <p className="text-3xl font-semibold">{fmt(monthlyData?.currentRevenue || 0)}</p>
            <div className="flex items-center gap-1 mt-2 text-sm">
              {(monthlyData?.revenueChange || 0) >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-success" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              )}
              <span className={(monthlyData?.revenueChange || 0) >= 0 ? "text-success" : "text-destructive"}>
                {Math.abs(monthlyData?.revenueChange || 0).toFixed(1)}%
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Commissions</p>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-semibold">{fmt(monthlyData?.currentCommTotal || 0)}</p>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                {fmt(monthlyData?.paidCommissions || 0)} paid
              </Badge>
              <Badge variant="secondary" className="bg-warning/10 text-warning text-xs">
                {fmt(monthlyData?.pendingCommissions || 0)} pending
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Holdback Reserve</p>
              <Calendar className="h-5 w-5 text-accent" />
            </div>
            <p className="text-3xl font-semibold">{fmt(monthlyData?.currentHoldback || 0)}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Released on trip completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Refunds</p>
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-3xl font-semibold text-destructive">{fmt(monthlyData?.totalRefunds || 0)}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {monthlyData?.refundCount || 0} cancellations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Balance */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Outstanding Balances
          </CardTitle>
          <CardDescription>
            Total confirmed bookings awaiting full payment: {fmt(monthlyData?.currentOutstanding || 0)}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Top Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">This Month's Bookings</CardTitle>
          <CardDescription>{monthlyData?.currentBookingCount || 0} bookings created</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData?.topBookings.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No bookings this month
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead className="text-right">Gross Sales</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData?.topBookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-mono text-xs">{b.booking_reference}</TableCell>
                    <TableCell>{b.clientName}</TableCell>
                    <TableCell>{b.destination}</TableCell>
                    <TableCell className="text-right">{fmt(b.gross_sales)}</TableCell>
                    <TableCell className="text-right text-success">{fmt(b.commission_revenue)}</TableCell>
                    <TableCell>
                      <Badge variant={b.status === "confirmed" ? "default" : "secondary"}>
                        {b.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default MonthlyReconciliation;
