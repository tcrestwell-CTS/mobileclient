import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBookings } from "@/hooks/useBookings";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { TrendingUp } from "lucide-react";

export function MonthlyRevenueChart() {
  const { bookings, loading } = useBookings();

  const chartData = useMemo(() => {
    if (!bookings?.length) return [];

    // Get the last 12 months
    const months: { [key: string]: number } = {};
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const monthDate = startOfMonth(subMonths(now, i));
      const monthKey = format(monthDate, "yyyy-MM");
      months[monthKey] = 0;
    }

    // Aggregate revenue by month based on departure date
    bookings.forEach((booking) => {
      if (booking.status === "cancelled") return;
      
      const departDate = parseISO(booking.depart_date);
      const monthKey = format(departDate, "yyyy-MM");
      
      if (months[monthKey] !== undefined) {
        months[monthKey] += booking.total_amount || 0;
      }
    });

    // Convert to chart format
    return Object.entries(months).map(([month, revenue]) => ({
      month: format(parseISO(`${month}-01`), "MMM"),
      fullMonth: format(parseISO(`${month}-01`), "MMMM yyyy"),
      revenue,
    }));
  }, [bookings]);

  const totalRevenue = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.revenue, 0);
  }, [chartData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-md">
          <p className="text-sm font-medium">{payload[0]?.payload?.fullMonth}</p>
          <p className="text-sm text-primary font-semibold">
            {formatCurrency(payload[0]?.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Revenue
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            12-month total: <span className="font-semibold text-foreground">{formatCurrency(totalRevenue)}</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 || totalRevenue === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            No revenue data available
          </div>
        ) : (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                />
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
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
        )}
      </CardContent>
    </Card>
  );
}
