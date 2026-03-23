import { MapPin, Calendar, DollarSign } from "lucide-react";
import { format, parseISO } from "date-fns";

interface SharedTripMetaProps {
  trip: {
    trip_name: string;
    destination: string | null;
    depart_date: string | null;
    return_date: string | null;
    trip_type: string | null;
    total_cost: number | null;
  };
  primaryColor: string;
}

export default function SharedTripMeta({ trip, primaryColor }: SharedTripMetaProps) {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{trip.trip_name}</h1>
      <div className="flex flex-wrap items-center gap-5 mt-3 text-sm text-gray-500">
        {trip.destination && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" style={{ color: primaryColor }} />
            {trip.destination}
          </span>
        )}
        {trip.depart_date && (
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" style={{ color: primaryColor }} />
            {format(parseISO(trip.depart_date), "MMM d, yyyy")}
            {trip.return_date && ` – ${format(parseISO(trip.return_date), "MMM d, yyyy")}`}
          </span>
        )}
        {trip.total_cost != null && trip.total_cost > 0 && (
          <span className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4" style={{ color: primaryColor }} />
            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(trip.total_cost)}
          </span>
        )}
        {trip.trip_type && (
          <span
            className="px-3 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {trip.trip_type.charAt(0).toUpperCase() + trip.trip_type.slice(1).replace("_", " ")}
          </span>
        )}
      </div>
    </div>
  );
}
