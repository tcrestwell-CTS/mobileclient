import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, Plane, Ship, Car, Hotel, Umbrella, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TripBooking } from "@/hooks/useTrips";
import { useTripPayments } from "@/hooks/useTripPayments";
import { format, differenceInDays, subDays, parseISO } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AddTripBookingDialog } from "./AddTripBookingDialog";

interface Commission {
  id: string;
  booking_id: string;
  status: string;
  paid_date: string | null;
  amount: number;
}

interface TripBookingsProps {
  tripId: string;
  clientId: string | null;
  bookings: TripBooking[];
  tripTotal: number;
  totalCommission: number;
  destination?: string;
  departDate?: string;
  returnDate?: string;
  onDataChange?: () => void;
}

// Map supplier types to icons and colors
const supplierTypeConfig: Record<string, { icon: typeof Building2; color: string }> = {
  airline: { icon: Plane, color: "bg-sky-500" },
  flight: { icon: Plane, color: "bg-sky-500" },
  hotel: { icon: Hotel, color: "bg-rose-500" },
  lodging: { icon: Hotel, color: "bg-rose-500" },
  cruise: { icon: Ship, color: "bg-teal-500" },
  transfer: { icon: Car, color: "bg-amber-500" },
  car_rental: { icon: Car, color: "bg-amber-500" },
  tour: { icon: Umbrella, color: "bg-purple-500" },
  insurance: { icon: Umbrella, color: "bg-green-500" },
};

export function TripBookings({ 
  tripId, 
  clientId,
  bookings, 
  tripTotal, 
  totalCommission,
  destination,
  departDate,
  returnDate,
  onDataChange,
}: TripBookingsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { payments, totalPaid, totalAuthorized } = useTripPayments(tripId);
  const [addBookingOpen, setAddBookingOpen] = useState(false);

  const unpaid = tripTotal - totalPaid - totalAuthorized;

  // Fetch commissions for all bookings in this trip
  const bookingIds = bookings.map((b) => b.id);
  const { data: commissions = [] } = useQuery({
    queryKey: ["trip-commissions", tripId, bookingIds],
    queryFn: async () => {
      if (bookingIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("commissions")
        .select("id, booking_id, status, paid_date, amount")
        .in("booking_id", bookingIds);

      if (error) throw error;
      return data as Commission[];
    },
    enabled: !!user && bookingIds.length > 0,
  });

  // Get commission record for a booking
  const getBookingCommission = (bookingId: string) => {
    return commissions.find((c) => c.booking_id === bookingId);
  };

  // Calculate payment totals per booking
  const getBookingPaymentInfo = (bookingId: string) => {
    const bookingPayments = payments.filter((p) => p.booking_id === bookingId);
    const paidAmount = bookingPayments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const authorizedAmount = bookingPayments
      .filter((p) => p.status === "authorized")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingAmount = bookingPayments
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    
    return { paidAmount, authorizedAmount, pendingAmount, hasPayments: bookingPayments.length > 0 };
  };

  const handleRemoveBooking = async (bookingId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId);

      if (error) throw error;

      toast.success("Booking removed from trip");
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      onDataChange?.();
    } catch (error: any) {
      toast.error("Failed to remove booking: " + error.message);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getSupplierIcon = (supplierType: string | undefined) => {
    const type = supplierType?.toLowerCase() || "other";
    const config = supplierTypeConfig[type] || { icon: Building2, color: "bg-muted-foreground" };
    const Icon = config.icon;
    return (
      <div className={`w-6 h-6 rounded flex items-center justify-center ${config.color}`}>
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
    );
  };

  const getPaymentStatus = (booking: TripBooking) => {
    const { paidAmount, authorizedAmount, pendingAmount, hasPayments } = getBookingPaymentInfo(booking.id);
    const bookingCost = Number(booking.gross_sales);
    
    // If booking is fully paid
    if (paidAmount >= bookingCost && bookingCost > 0) {
      return <span className="text-primary font-medium">Paid</span>;
    }
    
    // If there are some payments (partial)
    if (paidAmount > 0 && paidAmount < bookingCost) {
      return (
        <span className="text-amber-600 font-medium">
          Partial ({formatCurrency(paidAmount)})
        </span>
      );
    }
    
    // If there are authorized payments
    if (authorizedAmount > 0) {
      return <span className="text-blue-600 font-medium">Authorized</span>;
    }
    
    // If there are pending payments scheduled
    if (pendingAmount > 0) {
      return <span className="text-muted-foreground">Scheduled</span>;
    }
    
    // No payments linked to this booking
    return <span className="text-muted-foreground">Pending</span>;
  };

  const getCommissionStatus = (booking: TripBooking) => {
    const commission = getBookingCommission(booking.id);
    const today = new Date();
    const rawDepartDate = booking.depart_date ?? departDate;

    const hasValidDepartDate =
      typeof rawDepartDate === "string" && rawDepartDate.trim().length > 0;

    const expectedDate = hasValidDepartDate
      ? subDays(parseISO(rawDepartDate), 30)
      : null;

    // If we have a commission record, use its status
    if (commission) {
      if (commission.status === "paid") {
        return <span className="text-primary font-medium">Paid</span>;
      }

      if (commission.status === "pending") {
        if (!expectedDate || Number.isNaN(expectedDate.getTime())) {
          return <span className="text-muted-foreground">Pending</span>;
        }

        if (today >= expectedDate) {
          return <span className="text-primary font-medium">Available</span>;
        }

        const daysUntil = differenceInDays(expectedDate, today);
        return (
          <span className="text-muted-foreground">
            {daysUntil}d until available
          </span>
        );
      }
    }

    // If booking is completed, commission is available
    if (booking.status === "completed") {
      return <span className="text-primary font-medium">Available</span>;
    }

    // No valid depart date to estimate against
    if (!expectedDate || Number.isNaN(expectedDate.getTime())) {
      return <span className="text-muted-foreground">Pending</span>;
    }

    if (today >= expectedDate) {
      return <span className="text-primary font-medium">Available</span>;
    }

    const daysUntil = differenceInDays(expectedDate, today);
    return (
      <span className="text-muted-foreground">
        {daysUntil}d until available
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total cost</p>
            <p className="text-xl font-semibold">{formatCurrency(tripTotal)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Paid</p>
            <p className="text-xl font-semibold text-primary">{formatCurrency(totalPaid)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Authorized</p>
            <p className={`text-xl font-semibold ${totalAuthorized === 0 ? "text-destructive" : "text-primary"}`}>
              {formatCurrency(totalAuthorized)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Unpaid</p>
            <p className="text-xl font-semibold">{formatCurrency(unpaid > 0 ? unpaid : 0)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Exp. commission after split</p>
            <p className="text-xl font-semibold">{formatCurrency(totalCommission)}</p>
          </div>
        </div>
      </div>

      {/* Add Booking Dialog */}
      <AddTripBookingDialog
        tripId={tripId}
        clientId={clientId}
        destination={destination}
        departDate={departDate}
        returnDate={returnDate}
        open={addBookingOpen}
        onOpenChange={setAddBookingOpen}
        onBookingCreated={onDataChange}
      />

      {/* Bookings Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Bookings</CardTitle>
          <Button size="sm" onClick={() => setAddBookingOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Item
          </Button>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No bookings in this trip yet</p>
              <p className="text-sm mt-1">Add bookings to track hotels, flights, and more</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-sm text-muted-foreground">Item</th>
                    <th className="pb-3 font-medium text-sm text-muted-foreground">Cost</th>
                    <th className="pb-3 font-medium text-sm text-muted-foreground">Supplier</th>
                    <th className="pb-3 font-medium text-sm text-muted-foreground">Confirmation #</th>
                    <th className="pb-3 font-medium text-sm text-muted-foreground">Payment</th>
                    <th className="pb-3 font-medium text-sm text-muted-foreground">Commission</th>
                    <th className="pb-3 font-medium text-sm text-muted-foreground w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/bookings/${booking.id}`)}
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          {getSupplierIcon(booking.suppliers?.supplier_type)}
                          <span className="font-medium text-primary">
                            {booking.trip_name || booking.destination}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">{formatCurrency(booking.gross_sales)}</td>
                      <td className="py-3">
                        <span className="text-primary hover:underline">
                          {booking.suppliers?.name || "-"}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-sm text-primary">
                        {booking.booking_reference}
                      </td>
                      <td className="py-3">{getPaymentStatus(booking)}</td>
                      <td className="py-3">{getCommissionStatus(booking)}</td>
                      <td className="py-3">
                        {getBookingPaymentInfo(booking.id).hasPayments ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground"
                                    disabled
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Remove all payments before deleting this booking</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Booking</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove "{booking.trip_name || booking.destination}" from this trip? 
                                  This will permanently delete the booking and update the trip totals.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={(e) => handleRemoveBooking(booking.id, e)}
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
