import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileSpreadsheet, DollarSign, TrendingUp, Users, Percent } from "lucide-react";
import { useCommissionReport } from "@/hooks/useCommissionReport";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useIsAdmin, useIsOfficeAdmin } from "@/hooks/useAdmin";
import { CommissionReportFilters } from "@/components/reports/CommissionReportFilters";
import { CommissionReportTable } from "@/components/reports/CommissionReportTable";
import { exportToCSV, formatCurrencyForExport, formatDateForExport } from "@/lib/csvExport";
import { calculateAgentCommission, getTierConfig, CommissionTier } from "@/lib/commissionTiers";
import { toast } from "sonner";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";


export default function CommissionReport() {
  const { data: reportData, isLoading: reportLoading } = useCommissionReport();
  const { suppliers, isLoading: suppliersLoading } = useSuppliers();
  const { data: isAdmin } = useIsAdmin();
  const { data: isOfficeAdmin } = useIsOfficeAdmin();

  const canViewAll = isAdmin || isOfficeAdmin;
  const loading = reportLoading || suppliersLoading;

  // Filter states
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const clearFilters = () => {
    setDateRange(undefined);
    setSelectedSupplier("all");
    setSelectedAgent("all");
    setSelectedStatus("all");
  };

  // Apply filters
  const filteredData = useMemo(() => {
    if (!reportData) return [];

    return reportData.filter((item) => {
      // Date range filter
      if (dateRange?.from) {
        const itemDate = parseISO(item.created_at);
        const start = startOfDay(dateRange.from);
        const end = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        if (!isWithinInterval(itemDate, { start, end })) return false;
      }

      // Supplier filter
      if (selectedSupplier !== "all") {
        if (selectedSupplier === "none") {
          if (item.booking?.supplier_id) return false;
        } else {
          if (item.booking?.supplier_id !== selectedSupplier) return false;
        }
      }

      // Agent filter
      if (selectedAgent !== "all" && item.user_id !== selectedAgent) return false;

      // Status filter
      if (selectedStatus !== "all" && item.status !== selectedStatus) return false;

      return true;
    });
  }, [reportData, dateRange, selectedSupplier, selectedAgent, selectedStatus]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalCommission = filteredData.reduce((sum, item) => sum + item.amount, 0);
    const totalAgentShare = filteredData.reduce((sum, item) => {
      const tier = (item.agent?.commission_tier || "tier_1") as CommissionTier;
      return sum + calculateAgentCommission(item.amount, tier);
    }, 0);
    const totalGrossSales = filteredData.reduce(
      (sum, item) => sum + (item.booking?.gross_sales || item.booking?.total_amount || 0),
      0
    );
    const uniqueAgents = new Set(filteredData.map((item) => item.user_id)).size;
    const paidCount = filteredData.filter((item) => item.status === "paid").length;
    const pendingCount = filteredData.filter((item) => item.status === "pending").length;
    const marginPct = totalGrossSales > 0 ? (totalCommission / totalGrossSales) * 100 : 0;

    return {
      totalCommission,
      totalAgentShare,
      totalGrossSales,
      uniqueAgents,
      count: filteredData.length,
      paidCount,
      pendingCount,
      marginPct,
    };
  }, [filteredData]);

  // Advisor profitability breakdown (admin only)
  const advisorProfitability = useMemo(() => {
    if (!canViewAll || !filteredData.length) return [];

    const byAgent = filteredData.reduce((acc, item) => {
      const userId = item.user_id;
      if (!acc[userId]) {
        acc[userId] = {
          name: item.agent?.full_name || "Unknown",
          tier: (item.agent?.commission_tier || "tier_1") as CommissionTier,
          grossSales: 0,
          totalCommission: 0,
          agentEarnings: 0,
          tripCount: new Set<string>(),
        };
      }
      acc[userId].grossSales += item.booking?.gross_sales || item.booking?.total_amount || 0;
      acc[userId].totalCommission += item.amount;
      acc[userId].agentEarnings += calculateAgentCommission(item.amount, acc[userId].tier);
      if (item.booking?.trip_id) acc[userId].tripCount.add(item.booking.trip_id);
      return acc;
    }, {} as Record<string, any>);

    return Object.entries(byAgent)
      .map(([userId, data]) => ({
        userId,
        name: data.name,
        tierLabel: getTierConfig(data.tier).label,
        grossSales: data.grossSales,
        totalCommission: data.totalCommission,
        agentEarnings: data.agentEarnings,
        tripCount: data.tripCount.size,
        margin: data.grossSales > 0 ? (data.totalCommission / data.grossSales) * 100 : 0,
      }))
      .sort((a, b) => b.agentEarnings - a.agentEarnings);
  }, [canViewAll, filteredData]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const handleExport = () => {
    if (!filteredData.length) {
      toast.error("No data to export");
      return;
    }

    const exportData = filteredData.map((item) => {
      const tier = (item.agent?.commission_tier || "tier_1") as CommissionTier;
      const agentShare = calculateAgentCommission(item.amount, tier);
      const tierConfig = getTierConfig(tier);

      return {
        date: formatDateForExport(item.created_at),
        booking_reference: item.booking?.booking_reference || "N/A",
        client: item.booking?.client?.name || "Unknown",
        agent: item.agent?.full_name || "Unknown",
        agent_tier: tierConfig.description,
        supplier: item.booking?.supplier?.name || "",
        destination: item.booking?.destination || "N/A",
        gross_sales: formatCurrencyForExport(
          item.booking?.gross_sales || item.booking?.total_amount || 0
        ),
        commission_rate: `${item.rate}%`,
        total_commission: formatCurrencyForExport(item.amount),
        agent_share: formatCurrencyForExport(agentShare),
        agency_share: formatCurrencyForExport(item.amount - agentShare),
        status: item.status,
        paid_date: item.paid_date ? formatDateForExport(item.paid_date) : "",
      };
    });

    const dateStr = format(new Date(), "yyyy-MM-dd");
    const filename = `commission_report_${dateStr}`;

    exportToCSV(exportData, filename, [
      { key: "date", header: "Date" },
      { key: "booking_reference", header: "Booking Ref" },
      { key: "client", header: "Client" },
      { key: "agent", header: "Agent" },
      { key: "agent_tier", header: "Agent Tier" },
      { key: "supplier", header: "Supplier" },
      { key: "destination", header: "Destination" },
      { key: "gross_sales", header: "Gross Sales ($)" },
      { key: "commission_rate", header: "Rate" },
      { key: "total_commission", header: "Total Commission ($)" },
      { key: "agent_share", header: "Agent Share ($)" },
      { key: "agency_share", header: "Agency Share ($)" },
      { key: "status", header: "Status" },
      { key: "paid_date", header: "Paid Date" },
    ]);

    toast.success("Commission report exported successfully");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Commission Report</h1>
            <p className="text-muted-foreground text-sm mt-1">{canViewAll
              ? "Organization-wide commission analysis and export"
              : "Your commission history and analysis"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <CommissionReportFilters
          dateRange={dateRange}
          setDateRange={setDateRange}
          selectedSupplier={selectedSupplier}
          setSelectedSupplier={setSelectedSupplier}
          selectedAgent={selectedAgent}
          setSelectedAgent={setSelectedAgent}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          suppliers={suppliers}
          agents={[]}
          showAgentFilter={canViewAll || false}
          onClearFilters={clearFilters}
        />

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Gross Sales</p>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold">{formatCurrency(stats.totalGrossSales)}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.count} bookings</p>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Commission</p>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-semibold text-primary">
              {formatCurrency(stats.totalCommission)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.paidCount} paid, {stats.pendingCount} pending
            </p>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Agent Payouts</p>
              <DollarSign className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-semibold text-success">
              {formatCurrency(stats.totalAgentShare)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Based on tier splits</p>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Agency Revenue</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-semibold">
              {formatCurrency(stats.totalCommission - stats.totalAgentShare)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {canViewAll ? `${stats.uniqueAgents} agents` : "After agent split"}
            </p>
          </div>

          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Avg Margin</p>
              <Percent className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-semibold text-primary">
              {stats.marginPct.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Commission / Gross Sales</p>
          </div>
        </div>

        {/* Advisor Profitability (Admin) */}
        {canViewAll && advisorProfitability.length > 0 && (
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-card-foreground">Advisor Profitability</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-sm font-medium text-muted-foreground p-3">Agent</th>
                    <th className="text-left text-sm font-medium text-muted-foreground p-3">Tier</th>
                    <th className="text-right text-sm font-medium text-muted-foreground p-3">Gross Sales</th>
                    <th className="text-right text-sm font-medium text-muted-foreground p-3">Commission</th>
                    <th className="text-right text-sm font-medium text-muted-foreground p-3">Agent Earnings</th>
                    <th className="text-right text-sm font-medium text-muted-foreground p-3">Margin %</th>
                    <th className="text-right text-sm font-medium text-muted-foreground p-3">Trips</th>
                  </tr>
                </thead>
                <tbody>
                  {advisorProfitability.map((a) => (
                    <tr key={a.userId} className="border-b last:border-0">
                      <td className="p-3 text-sm font-medium">{a.name}</td>
                      <td className="p-3 text-sm text-muted-foreground">{a.tierLabel}</td>
                      <td className="p-3 text-sm text-right">{formatCurrency(a.grossSales)}</td>
                      <td className="p-3 text-sm text-right text-primary font-medium">{formatCurrency(a.totalCommission)}</td>
                      <td className="p-3 text-sm text-right text-success font-semibold">{formatCurrency(a.agentEarnings)}</td>
                      <td className="p-3 text-sm text-right font-medium">{a.margin.toFixed(1)}%</td>
                      <td className="p-3 text-sm text-right">{a.tripCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Table */}
        <CommissionReportTable data={filteredData} showAgentColumn={canViewAll || false} />
      </div>
    </DashboardLayout>
  );
}
