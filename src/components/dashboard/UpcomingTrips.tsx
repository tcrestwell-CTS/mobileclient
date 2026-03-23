import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, MapPin } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface UpcomingTrip {
  id: string;
  trip_name?: string | null;
  destination?: string | null;
  depart_date?: string | null;
  clients?: { name: string } | null;
}

interface UpcomingTripsProps {
  trips: UpcomingTrip[];
  loading?: boolean;
}

export function UpcomingTrips({ trips, loading }: UpcomingTripsProps) {
  const navigate = useNavigate();

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Upcoming Trips
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/trips")} className="text-xs">
            View All <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : trips.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No upcoming trips</p>
        ) : (
          <div className="space-y-2">
            {trips.map((trip) => {
              const daysUntil = differenceInDays(new Date(trip.depart_date!), new Date());
              return (
                <div
                  key={trip.id}
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {trip.clients?.name || "Client"} – {trip.trip_name || trip.destination}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Departure: {format(new Date(trip.depart_date!), "MMM d")}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn("shrink-0 text-xs", daysUntil <= 7 && "bg-destructive/10 text-destructive")}
                  >
                    {daysUntil <= 0 ? "Today" : daysUntil === 1 ? "Tomorrow" : `${daysUntil}d`}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
