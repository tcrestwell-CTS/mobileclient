import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Clock, Calendar } from "lucide-react";
import { useBookings } from "@/hooks/useBookings";
import { format, subDays, differenceInDays, isWithinInterval, addDays } from "date-fns";
import { useNavigate } from "react-router-dom";

interface UpcomingCommission {
  bookingId: string;
  clientName: string;
  destination: string;
  commissionAmount: number;
  expectedDate: Date;
  daysUntil: number;
}

export function UpcomingCommissions() {
  const { bookings, loading } = useBookings();
  const navigate = useNavigate();

  // Calculate upcoming commissions (expected within next 30 days)
  const upcomingCommissions: UpcomingCommission[] = (bookings || [])
    .filter((booking) => {
      // Only include confirmed or pending bookings
      if (booking.status === "cancelled" || booking.status === "completed") return false;
      
      const expectedDate = subDays(new Date(booking.depart_date), 30);
      const today = new Date();
      const thirtyDaysFromNow = addDays(today, 30);
      
      // Check if expected date is within the next 30 days
      return isWithinInterval(expectedDate, { start: today, end: thirtyDaysFromNow });
    })
    .map((booking) => {
      const expectedDate = subDays(new Date(booking.depart_date), 30);
      const daysUntil = differenceInDays(expectedDate, new Date());
      
      return {
        bookingId: booking.id,
        clientName: (booking as any).clients?.name || "Unknown Client",
        destination: booking.destination,
        commissionAmount: booking.commission_revenue || 0,
        expectedDate,
        daysUntil,
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  const totalExpectedAmount = upcomingCommissions.reduce(
    (sum, c) => sum + c.commissionAmount,
    0
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getUrgencyColor = (daysUntil: number) => {
    if (daysUntil <= 3) return "text-success font-semibold";
    if (daysUntil <= 7) return "text-primary";
    return "text-muted-foreground";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            Upcoming Commissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            Upcoming Commissions
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            Next 30 days
          </Badge>
        </div>
        {upcomingCommissions.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {formatCurrency(totalExpectedAmount)} expected from {upcomingCommissions.length} booking{upcomingCommissions.length !== 1 ? "s" : ""}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {upcomingCommissions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No commissions expected in the next 30 days</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingCommissions.map((commission) => (
              <div
                key={commission.bookingId}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/bookings/${commission.bookingId}`)}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {commission.clientName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {commission.destination}
                  </p>
                </div>
                <div className="text-right ml-3">
                  <p className="font-semibold text-sm text-success">
                    {formatCurrency(commission.commissionAmount)}
                  </p>
                  <div className="flex items-center gap-1 justify-end">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className={`text-xs ${getUrgencyColor(commission.daysUntil)}`}>
                      {commission.daysUntil === 0
                        ? "Today"
                        : commission.daysUntil === 1
                        ? "Tomorrow"
                        : `${commission.daysUntil} days`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
