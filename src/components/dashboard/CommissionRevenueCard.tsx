import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, Receipt, Building2 } from "lucide-react";
import { useBookings } from "@/hooks/useBookings";
import { 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  parseISO, 
  isWithinInterval 
} from "date-fns";

interface FinancialMetric {
  label: string;
  value: number;
  description: string;
  icon: React.ElementType;
  colorClass: string;
}

export function CommissionRevenueCard() {
  const { bookings, loading } = useBookings();

  const financials = useMemo(() => {
    if (!bookings?.length) {
      return null;
    }

    const now = new Date();
    const thisMonth = { start: startOfMonth(now), end: endOfMonth(now) };
    const lastMonth = { 
      start: startOfMonth(subMonths(now, 1)), 
      end: endOfMonth(subMonths(now, 1)) 
    };

    // Filter to non-cancelled bookings
    const activeBookings = bookings.filter(b => b.status !== "cancelled");

    // This month's bookings
    const thisMonthBookings = activeBookings.filter(b => {
      const departDate = parseISO(b.depart_date);
      return isWithinInterval(departDate, thisMonth);
    });

    const lastMonthBookings = activeBookings.filter(b => {
      const departDate = parseISO(b.depart_date);
      return isWithinInterval(departDate, lastMonth);
    });

    // Calculate totals - use gross_sales if available, fall back to total_amount
    const getGrossSales = (b: any) => b.gross_sales ?? b.total_amount ?? 0;
    const getCommissionRevenue = (b: any) => b.commission_revenue ?? (b.total_amount * 0.085);
    const getNetSales = (b: any) => b.net_sales ?? (b.total_amount * 0.915);

    // This month financials
    const thisMonthGross = thisMonthBookings.reduce((sum, b) => sum + getGrossSales(b), 0);
    const thisMonthCommission = thisMonthBookings.reduce((sum, b) => sum + getCommissionRevenue(b), 0);
    const thisMonthNet = thisMonthBookings.reduce((sum, b) => sum + getNetSales(b), 0);

    // Last month financials
    const lastMonthGross = lastMonthBookings.reduce((sum, b) => sum + getGrossSales(b), 0);
    const lastMonthCommission = lastMonthBookings.reduce((sum, b) => sum + getCommissionRevenue(b), 0);

    // All time totals
    const totalGross = activeBookings.reduce((sum, b) => sum + getGrossSales(b), 0);
    const totalCommission = activeBookings.reduce((sum, b) => sum + getCommissionRevenue(b), 0);
    const totalNet = activeBookings.reduce((sum, b) => sum + getNetSales(b), 0);

    // Calculate changes
    const grossChange = lastMonthGross > 0 
      ? ((thisMonthGross - lastMonthGross) / lastMonthGross * 100)
      : thisMonthGross > 0 ? 100 : 0;

    const commissionChange = lastMonthCommission > 0
      ? ((thisMonthCommission - lastMonthCommission) / lastMonthCommission * 100)
      : thisMonthCommission > 0 ? 100 : 0;

    return {
      thisMonthGross,
      thisMonthCommission,
      thisMonthNet,
      grossChange,
      commissionChange,
      totalGross,
      totalCommission,
      totalNet,
      bookingCount: activeBookings.length,
    };
  }, [bookings]);

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
            <Receipt className="h-5 w-5" />
            Commission Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!financials) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Commission Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No booking data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const metrics: FinancialMetric[] = [
    {
      label: "Gross Booking Sales",
      value: financials.thisMonthGross,
      description: "Total guest payments this month",
      icon: DollarSign,
      colorClass: "text-primary",
    },
    {
      label: "Commission Revenue",
      value: financials.thisMonthCommission,
      description: "Your earned commission",
      icon: TrendingUp,
      colorClass: "text-success",
    },
    {
      label: "Net Booking Sales",
      value: financials.thisMonthNet,
      description: "After commission deduction",
      icon: Building2,
      colorClass: "text-muted-foreground",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          This Month's Revenue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg bg-card flex items-center justify-center`}>
                <metric.icon className={`h-5 w-5 ${metric.colorClass}`} />
              </div>
              <div>
                <p className="text-sm font-medium">{metric.label}</p>
                <p className="text-xs text-muted-foreground">{metric.description}</p>
              </div>
            </div>
            <p className={`text-lg font-semibold ${metric.colorClass}`}>
              {formatCurrency(metric.value)}
            </p>
          </div>
        ))}

        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">All-time commission revenue</span>
            <span className="font-semibold text-success">
              {formatCurrency(financials.totalCommission)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-muted-foreground">From {financials.bookingCount} bookings</span>
            <span className="text-muted-foreground">
              {formatCurrency(financials.totalGross)} gross
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
