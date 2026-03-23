import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plane, Calendar, Users, MapPin, DollarSign } from "lucide-react";
import { useTrips } from "@/hooks/useTrips";
import { format, addDays, isWithinInterval, isFuture } from "date-fns";

export function UpcomingDepartures() {
  const navigate = useNavigate();
  const { trips, loading } = useTrips();

  const today = new Date();
  const thirtyDaysFromNow = addDays(today, 30);

  const upcomingDepartures = trips
    .filter((trip) => {
      if (!trip.depart_date) return false;
      const departDate = new Date(trip.depart_date);
      return (
        trip.status !== "cancelled" &&
        isFuture(departDate) &&
        isWithinInterval(departDate, { start: today, end: thirtyDaysFromNow })
      );
    })
    .sort((a, b) => new Date(a.depart_date!).getTime() - new Date(b.depart_date!).getTime())
    .slice(0, 5);

  const getDaysUntilDeparture = (departDate: string) => {
    const days = Math.ceil(
      (new Date(departDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `${days} days`;
  };

  const getUrgencyColor = (departDate: string) => {
    const days = Math.ceil(
      (new Date(departDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days <= 3) return "bg-destructive/10 text-destructive border-destructive/20";
    if (days <= 7) return "bg-accent/10 text-accent border-accent/20";
    return "bg-primary/10 text-primary border-primary/20";
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Plane className="h-5 w-5 text-primary" />
          Upcoming Departures
        </CardTitle>
        <p className="text-sm text-muted-foreground">Next 30 days</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : upcomingDepartures.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Plane className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No departures in the next 30 days</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingDepartures.map((trip) => (
              <div
                key={trip.id}
                onClick={() => navigate(`/trips/${trip.id}`)}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${getUrgencyColor(trip.depart_date!)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {trip.trip_name}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {trip.destination && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {trip.destination}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(trip.depart_date!), "MMM d")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {trip.clients?.name || "Unknown"}
                      </span>
                      {trip.total_gross_sales > 0 && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(trip.total_gross_sales)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="shrink-0 font-semibold"
                  >
                    {getDaysUntilDeparture(trip.depart_date!)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
