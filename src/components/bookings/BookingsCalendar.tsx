import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Users, MapPin } from "lucide-react";
import { format, isSameDay, isWithinInterval, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { Booking } from "@/hooks/useBookings";
import { cn } from "@/lib/utils";

interface BookingsCalendarProps {
  bookings: Booking[];
  isAdmin: boolean;
}

export const BookingsCalendar = ({ bookings, isAdmin }: BookingsCalendarProps) => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get bookings for a specific date (departures, returns, or ongoing)
  const getBookingsForDate = (date: Date) => {
    return bookings.filter((booking) => {
      const departDate = new Date(booking.depart_date);
      const returnDate = new Date(booking.return_date);
      
      // Check if it's a departure day
      if (isSameDay(departDate, date)) return true;
      // Check if it's a return day
      if (isSameDay(returnDate, date)) return true;
      // Check if the trip is ongoing on this date
      if (isWithinInterval(date, { start: departDate, end: returnDate })) return true;
      
      return false;
    });
  };

  // Get departure bookings for selected date
  const selectedDateBookings = useMemo(() => {
    if (!selectedDate) return [];
    return getBookingsForDate(selectedDate);
  }, [selectedDate, bookings]);

  // Create a map of dates with bookings for the calendar
  const bookingDates = useMemo(() => {
    const dates = new Map<string, { departures: number; returns: number; ongoing: number }>();
    
    bookings.forEach((booking) => {
      const departDate = new Date(booking.depart_date);
      const returnDate = new Date(booking.return_date);
      
      // Mark departure date
      const departKey = format(departDate, "yyyy-MM-dd");
      const existing = dates.get(departKey) || { departures: 0, returns: 0, ongoing: 0 };
      dates.set(departKey, { ...existing, departures: existing.departures + 1 });
      
      // Mark return date
      const returnKey = format(returnDate, "yyyy-MM-dd");
      const existingReturn = dates.get(returnKey) || { departures: 0, returns: 0, ongoing: 0 };
      dates.set(returnKey, { ...existingReturn, returns: existingReturn.returns + 1 });
    });
    
    return dates;
  }, [bookings]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-success/10 text-success border-success/20";
      case "pending":
        return "bg-accent/10 text-accent border-accent/20";
      case "traveling":
        return "bg-info/10 text-info border-info/20";
      case "traveled":
        return "bg-primary/10 text-primary border-primary/20";
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getEventType = (booking: Booking, date: Date) => {
    const departDate = new Date(booking.depart_date);
    const returnDate = new Date(booking.return_date);
    
    if (isSameDay(departDate, date)) return "Departure";
    if (isSameDay(returnDate, date)) return "Return";
    return "Ongoing";
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "Departure":
        return "bg-success text-success-foreground";
      case "Return":
        return "bg-primary text-primary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">
            {format(currentMonth, "MMMM yyyy")}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentMonth(new Date());
                setSelectedDate(new Date());
              }}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            className="w-full pointer-events-auto"
            classNames={{
              months: "w-full",
              month: "w-full space-y-4",
              table: "w-full border-collapse",
              head_row: "flex w-full",
              head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem] text-center",
              row: "flex w-full mt-2",
              cell: cn(
                "relative h-14 w-full text-center text-sm p-0",
                "focus-within:relative focus-within:z-20"
              ),
              day: cn(
                "h-14 w-full p-0 font-normal flex flex-col items-center justify-start pt-1",
                "hover:bg-accent/50 rounded-md transition-colors",
                "aria-selected:bg-primary aria-selected:text-primary-foreground"
              ),
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
            }}
            components={{
              DayContent: ({ date }) => {
                const dateKey = format(date, "yyyy-MM-dd");
                const dayBookings = bookingDates.get(dateKey);
                
                return (
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{date.getDate()}</span>
                    {dayBookings && (
                      <div className="flex gap-0.5">
                        {dayBookings.departures > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-success" title={`${dayBookings.departures} departure(s)`} />
                        )}
                        {dayBookings.returns > 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" title={`${dayBookings.returns} return(s)`} />
                        )}
                      </div>
                    )}
                  </div>
                );
              },
            }}
          />
          
          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-success" />
              <span>Departure</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span>Return</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">
            {selectedDate ? format(selectedDate, "EEEE, MMMM d") : "Select a date"}
          </CardTitle>
          {selectedDateBookings.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedDateBookings.length} booking{selectedDateBookings.length !== 1 ? "s" : ""}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {selectedDateBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p className="text-sm">No bookings on this date</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {selectedDateBookings.map((booking) => {
                  const eventType = getEventType(booking, selectedDate!);
                  
                  return (
                    <div
                      key={booking.id}
                      className="p-3 rounded-lg border border-border bg-card hover:bg-accent/5 cursor-pointer transition-colors"
                      onClick={() => navigate(`/bookings/${booking.id}`)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {booking.trip_name || booking.destination}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {booking.booking_reference}
                          </p>
                        </div>
                        <Badge className={cn("text-xs shrink-0", getEventTypeColor(eventType))}>
                          {eventType}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{booking.destination}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{booking.travelers}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline" className={cn("text-xs", getStatusBadgeClass(booking.status))}>
                          {booking.status}
                        </Badge>
                        {isAdmin && booking.owner_agent && (
                          <span className="text-xs text-muted-foreground truncate">
                            {booking.owner_agent}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground mt-2">
                        {format(new Date(booking.depart_date), "MMM d")} → {format(new Date(booking.return_date), "MMM d, yyyy")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
