import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, MapPin, Pencil, Trash2, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Booking } from "@/hooks/useBookings";

interface BookingCardProps {
  booking: Booking;
  isAdmin: boolean;
  updatingStatusId: string | null;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (booking: Booking) => void;
  onDelete: (booking: Booking) => void;
}

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-success/10 text-success";
    case "pending":
      return "bg-accent/10 text-accent";
    case "completed":
      return "bg-primary/10 text-primary";
    case "cancelled":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "TBD";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

export function BookingCard({
  booking,
  isAdmin,
  updatingStatusId,
  onStatusChange,
  onEdit,
  onDelete,
}: BookingCardProps) {
  const navigate = useNavigate();

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="combobox"]') || target.closest('a')) {
      return;
    }
    navigate(`/bookings/${booking.id}`);
  };

  const tripName = booking.trips?.trip_name || booking.trips?.destination || "Untitled";
  const destination = booking.trips?.destination;
  const departDate = booking.trips?.depart_date;
  const returnDate = booking.trips?.return_date;
  const clientName = booking.trips?.clients?.name || "No client";

  return (
    <Card 
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {tripName}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {booking.confirmation_number}
            </p>
          </div>
          <Select
            value={booking.status}
            onValueChange={(value) => onStatusChange(booking.id, value)}
            disabled={updatingStatusId === booking.id}
          >
            <SelectTrigger className="w-auto h-7 px-2 border-0 bg-transparent">
              <SelectValue>
                <Badge
                  variant="secondary"
                  className={getStatusBadgeClass(booking.status)}
                >
                  {booking.status}
                </Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">
                <Badge variant="secondary" className="bg-accent/10 text-accent">pending</Badge>
              </SelectItem>
              <SelectItem value="confirmed">
                <Badge variant="secondary" className="bg-success/10 text-success">confirmed</Badge>
              </SelectItem>
              <SelectItem value="completed">
                <Badge variant="secondary" className="bg-primary/10 text-primary">completed</Badge>
              </SelectItem>
              <SelectItem value="cancelled">
                <Badge variant="secondary" className="bg-destructive/10 text-destructive">cancelled</Badge>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        <div className="text-sm text-muted-foreground truncate">{clientName}</div>

        {destination && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{destination}</span>
          </div>
        )}

        {(departDate || returnDate) && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{formatDate(departDate)} — {formatDate(returnDate)}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm font-medium">
          <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>{formatCurrency(booking.total_price)}</span>
        </div>

        <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/50">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(booking)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(booking)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
