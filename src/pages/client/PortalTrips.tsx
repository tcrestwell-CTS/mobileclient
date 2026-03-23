import { usePortalTrips } from "@/hooks/usePortalData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { MapPin, Calendar } from "lucide-react";
import { DepartureCountdown } from "@/components/client/DepartureCountdown";

export default function PortalTrips() {
  const { data, isLoading } = usePortalTrips();
  const trips = data?.trips || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">My Trips</h1>

      {trips.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No trips found. Your travel agent will add trips here once they're booked.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map((trip: any) => (
            <Link key={trip.id} to={`/client/trips/${trip.id}`}>
              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden group h-full">
                {/* Cover Image */}
                {trip.cover_image_url ? (
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={trip.cover_image_url}
                      alt={trip.trip_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="font-bold text-lg text-white drop-shadow-sm">{trip.trip_name}</h3>
                      {trip.destination && (
                        <p className="text-sm text-white/90 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3.5 w-3.5" /> {trip.destination}
                        </p>
                      )}
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge
                        variant={trip.status === "confirmed" ? "default" : "secondary"}
                        className="shadow-sm"
                      >
                        {trip.status}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="relative h-28 bg-gradient-to-br from-primary/10 via-accent/5 to-muted flex items-end">
                    <div className="absolute top-3 right-3">
                      <Badge variant={trip.status === "confirmed" ? "default" : "secondary"}>
                        {trip.status}
                      </Badge>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg text-foreground">{trip.trip_name}</h3>
                      {trip.destination && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3.5 w-3.5" /> {trip.destination}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    {trip.depart_date && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(trip.depart_date), "MMM d")}
                        {trip.return_date && ` – ${format(new Date(trip.return_date), "MMM d, yyyy")}`}
                      </p>
                    )}
                    <DepartureCountdown departDate={trip.depart_date} returnDate={trip.return_date} compact />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
