import { useState, useMemo } from "react";
import { CommissionLinesEditor } from "@/components/bookings/CommissionLinesEditor";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  FileText,
  ExternalLink,
  Pencil,
  Trash2,
  User,
  Mail,
  Phone,
  Clock,
  Percent,
  TrendingUp,
  CheckCircle,
  Loader2,
  UserMinus,
  AlertTriangle,
  Receipt,
  Map,
  CreditCard,
  Ban,
} from "lucide-react";
import { format, differenceInDays, subDays, isPast, isFuture } from "date-fns";
import { useBooking, useBookings } from "@/hooks/useBookings";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUserCommissionRate, useUserCommissionTier } from "@/hooks/useCommissions";
import { useBookingTravelers, useRemoveBookingTraveler } from "@/hooks/useBookingTravelers";
import { useSuppliers, calculateBookingFinancials } from "@/hooks/useSuppliers";
import { EditBookingDialog } from "@/components/bookings/EditBookingDialog";
import { CCAuthorizationDialog } from "@/components/bookings/CCAuthorizationDialog";
import { getTierConfig } from "@/lib/commissionTiers";
import { generateInvoicePDF } from "@/lib/invoiceGenerator";
import { InvoicePreviewDialog } from "@/components/trips/InvoicePreviewDialog";
import { useBrandingSettings } from "@/hooks/useBrandingSettings";
import { useInvoices } from "@/hooks/useInvoices";
import { useClient } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-success/10 text-success";
    case "pending":
      return "bg-accent/10 text-accent";
    case "traveling":
      return "bg-info/10 text-info";
    case "traveled":
      return "bg-primary/10 text-primary";
    case "cancelled":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), "MMMM d, yyyy");
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

const BookingDetail = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { booking, loading, error, refetch } = useBooking(bookingId);
  const { updateBooking, updateBookingStatus, deleteBooking, updating, updatingStatusId } = useBookings();
  const { data: userCommissionRate } = useUserCommissionRate();
  const { data: userTier } = useUserCommissionTier();
  const { data: travelers = [], isLoading: travelersLoading } = useBookingTravelers(bookingId);
  const removeBookingTraveler = useRemoveBookingTraveler();
  const { suppliers } = useSuppliers();
  const { settings: branding } = useBrandingSettings();
  const { createInvoice, creating: creatingInvoice } = useInvoices();
  
  // Get the supplier for this booking and calculate financials dynamically
  const selectedSupplier = useMemo(() => {
    if (!booking?.supplier_id) return null;
    return suppliers.find((s) => s.id === booking.supplier_id) || null;
  }, [booking?.supplier_id, suppliers]);

  const tripFinancials = useMemo(() => {
    if (!booking) return null;
    return calculateBookingFinancials(booking.gross_sales || booking.total_amount, selectedSupplier, booking.supplier_payout);
  }, [booking, selectedSupplier]);

  const isMultiLineSupplier = selectedSupplier?.multi_line_commission === true;

  const { data: client } = useClient(booking?.client_id || "");

  // Check if payments are logged against this booking
  const { data: bookingPayments = [] } = useQuery({
    queryKey: ["booking-payments-check", bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data, error } = await supabase
        .from("trip_payments")
        .select("id")
        .eq("booking_id", bookingId)
        .limit(1);
      if (error) throw error;
      return data || [];
    },
    enabled: !!bookingId,
  });
  const hasPayments = bookingPayments.length > 0;
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCCAuthDialog, setShowCCAuthDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelPenalty, setCancelPenalty] = useState("");
  const [cancelRefund, setCancelRefund] = useState("");
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoicePreviewOpen, setInvoicePreviewOpen] = useState(false);
  const [invoicePreviewUrl, setInvoicePreviewUrl] = useState<string | null>(null);
  const [invoicePreviewNumber, setInvoicePreviewNumber] = useState<string | undefined>();
  
  const { user } = useAuth();

  const handleDelete = async () => {
    if (booking) {
      const success = await deleteBooking(booking.id);
      if (success) {
        navigate("/bookings");
      }
    }
    setShowDeleteDialog(false);
  };

  const handleGenerateInvoice = async () => {
    if (!booking) return;
    setGeneratingInvoice(true);
    setInvoicePreviewOpen(true);
    setInvoicePreviewUrl(null);
    try {
      const grossSales = tripFinancials?.grossSales || booking.total_amount;
      
      const invoiceData: Record<string, any> = {
        tripName: booking.trip_name || booking.destination,
        clientName: client?.name || "Client",
        clientEmail: client?.email || undefined,
        clientPhone: client?.phone || undefined,
        clientAddress: [client?.address_line_1, client?.address_city, client?.address_state, client?.address_zip_code]
          .filter(Boolean).join(", ") || undefined,
        destination: booking.destination,
        departDate: booking.depart_date,
        returnDate: booking.return_date,
        payments: [],
        tripTotal: grossSales,
        totalPaid: 0,
        totalRemaining: grossSales,
        agencyName: branding?.agency_name || "Crestwell Travel Services",
        agencyPhone: branding?.phone || undefined,
        agencyEmail: branding?.email_address || undefined,
        agencyAddress: branding?.address || undefined,
        agencyWebsite: branding?.website || undefined,
        agencyLogoUrl: branding?.logo_url || undefined,
        supplierName: selectedSupplier?.name || undefined,
      };

      const invoice = await createInvoice({
        trip_id: booking.trip_id || undefined,
        client_id: booking.client_id,
        trip_name: booking.trip_name || booking.destination,
        client_name: client?.name || "Client",
        total_amount: grossSales,
        amount_paid: 0,
        amount_remaining: grossSales,
      });

      if (invoice) {
        invoiceData.invoiceNumber = invoice.invoice_number;
      }

      const blobUrl = await generateInvoicePDF(invoiceData as any, { returnBlobUrl: true });
      if (blobUrl && typeof blobUrl === "string") {
        setInvoicePreviewUrl(blobUrl);
        setInvoicePreviewNumber(invoice?.invoice_number);
      }
      toast.success("Invoice generated");
    } catch (err) {
      console.error("Error generating invoice:", err);
      toast.error("Failed to generate invoice");
      setInvoicePreviewOpen(false);
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const tripDuration = booking
    ? differenceInDays(new Date(booking.return_date), new Date(booking.depart_date)) + 1
    : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !booking) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">Booking Not Found</h2>
            <p className="text-muted-foreground">
              The booking you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate("/bookings")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bookings
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/bookings")}
            className="mt-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">
                {booking.trip_name || booking.destination}
              </h1>
              <Select
                value={booking.status}
                onValueChange={(value) => {
                  if (value === "cancelled") {
                    setShowCancelDialog(true);
                  } else {
                    updateBookingStatus(booking.id, value);
                  }
                }}
                disabled={updatingStatusId === booking.id}
              >
                <SelectTrigger className="w-auto h-8 px-2 border-0 bg-transparent">
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
                  <SelectItem value="traveling">
                    <Badge variant="secondary" className="bg-info/10 text-info">traveling</Badge>
                  </SelectItem>
                  <SelectItem value="traveled">
                    <Badge variant="secondary" className="bg-primary/10 text-primary">traveled</Badge>
                  </SelectItem>
                  <SelectItem value="cancelled">
                    <Badge variant="secondary" className="bg-destructive/10 text-destructive">cancelled</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-muted-foreground mt-1">
              Booking Reference: {booking.booking_reference}
            </p>
            {booking.override_pending_approval && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-warning/10 border border-warning/20 rounded-lg w-fit">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm text-warning font-medium">
                  Commission override pending approval
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {booking.trip_page_url && (
            <Button variant="outline" asChild>
              <a href={booking.trip_page_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View in Tern
              </a>
            </Button>
           )}
          <Button
            variant="outline"
            onClick={() => setShowCCAuthDialog(true)}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            CC Auth
          </Button>
          <Button
            variant="outline"
            onClick={handleGenerateInvoice}
            disabled={generatingInvoice}
          >
            {generatingInvoice ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Receipt className="h-4 w-4 mr-2" />
            )}
            {generatingInvoice ? "Generating..." : "Generate Invoice"}
          </Button>
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {hasPayments ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="outline" className="text-muted-foreground" disabled>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remove all payments before deleting this booking</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  Trip Details
                </CardTitle>
                {booking.trip_id && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/trips/${booking.trip_id}/itinerary`}>
                      <Map className="h-4 w-4 mr-2" />
                      Build Itinerary
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Destination</p>
                <p className="font-medium text-foreground">{booking.destination}</p>
              </div>
              {booking.trip_name && booking.trip_name !== booking.destination && (
                <div>
                  <p className="text-sm text-muted-foreground">Trip Name</p>
                  <p className="font-medium text-foreground">{booking.trip_name}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Travelers</p>
                <p className="font-medium text-foreground">
                  {booking.travelers} {booking.travelers === 1 ? "traveler" : "travelers"}
                </p>
              </div>
              {booking.owner_agent && (
                <div>
                  <p className="text-sm text-muted-foreground">Booking Agent</p>
                  <p className="font-medium text-foreground">{booking.owner_agent}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                Travel Dates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Departure</p>
                  <p className="font-medium text-foreground">{formatDate(booking.depart_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Return</p>
                  <p className="font-medium text-foreground">{formatDate(booking.return_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium text-foreground">
                    {tripDuration} {tripDuration === 1 ? "day" : "days"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Travelers (Companions) */}
          {(travelers.length > 0 || travelersLoading) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  Travelers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {travelersLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : travelers.length > 0 ? (
                  <div className="space-y-3">
                    {travelers.map((traveler) => (
                      <div
                        key={traveler.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {traveler.companion?.first_name} {traveler.companion?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {traveler.companion?.relationship}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (bookingId) {
                              removeBookingTraveler.mutate({
                                id: traveler.id,
                                bookingId,
                              });
                            }
                          }}
                          disabled={removeBookingTraveler.isPending}
                        >
                          {removeBookingTraveler.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserMinus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No travelers assigned</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {booking.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{booking.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Cancellation Details */}
          {booking.status === "cancelled" && (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Ban className="h-5 w-5" />
                  Cancellation Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {booking.cancellation_reason && (
                  <div>
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="text-foreground">{booking.cancellation_reason}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cancellation Penalty</p>
                    <p className="font-semibold text-warning">{formatCurrency(booking.cancellation_penalty || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Refund to Client</p>
                    <p className="font-semibold text-success">{formatCurrency(booking.cancellation_refund_amount || 0)}</p>
                  </div>
                </div>
                {booking.cancelled_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Cancelled On</p>
                    <p className="text-foreground">{formatDate(booking.cancelled_at)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial Summary - Enhanced with Commission Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                Trip Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Gross Booking Sales</p>
                <p className="text-2xl font-semibold text-foreground">
                  {formatCurrency(booking.gross_sales || booking.total_amount)}
                </p>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Net Sales (Gross − Supplier Cost)
                  </span>
                  <span className="font-medium">
                    {formatCurrency(booking.net_sales || booking.commissionable_amount)}
                  </span>
                </div>

                {(() => {
                  const grossSales = booking.gross_sales || booking.total_amount;
                  const commissionRevenue = booking.commission_revenue || 0;
                  const commissionPct = grossSales > 0
                    ? Math.round((commissionRevenue / (booking.net_sales || grossSales)) * 100)
                    : 0;
                  const agentSplit = userTier ? getTierConfig(userTier).agentSplit : 70;
                  const agencySplit = userTier ? getTierConfig(userTier).agencySplit : 30;
                  const agentAmount = commissionRevenue * (agentSplit / 100);
                  const agencyAmount = commissionRevenue * (agencySplit / 100);

                  return (
                    <>
                      <div className="flex items-center justify-between bg-success/10 p-2 rounded">
                        <span className="text-sm text-success font-medium">
                          Commission Revenue ({commissionPct}%)
                        </span>
                        <span className="font-semibold text-success">
                          {formatCurrency(commissionRevenue)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Net Booking Sales</span>
                        <span className="font-medium">
                          {formatCurrency(booking.net_sales || 0)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t pt-3 bg-primary/10 p-2 rounded">
                        <span className="text-sm font-medium text-primary">
                          Agent Commission ({agentSplit}%)
                        </span>
                        <span className="font-semibold text-primary">
                          {formatCurrency(agentAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Agency receives ({agencySplit}%)</span>
                        <span>{formatCurrency(agencyAmount)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {booking.travelers > 1 && (
                <div className="border-t pt-3">
                  <p className="text-sm text-muted-foreground">Per Traveler</p>
                  <p className="font-medium text-foreground">
                    {formatCurrency((booking.gross_sales || booking.total_amount) / booking.travelers)}
                  </p>
                </div>
              )}

              {selectedSupplier && (
                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  Supplier: <strong>{selectedSupplier.name}</strong>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Commission Line Items (for multi-line suppliers) */}
          {isMultiLineSupplier && booking && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  Commission Line Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CommissionLinesEditor bookingId={booking.id} />
              </CardContent>
            </Card>
          )}


          {/* Client Info */}
          {booking.clients && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Link
                    to={`/contacts/${booking.client_id}`}
                    className="font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {booking.clients.name}
                  </Link>
                </div>
                {booking.clients.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${booking.clients.email}`}
                      className="text-foreground hover:text-primary"
                    >
                      {booking.clients.email}
                    </a>
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                  <Link to={`/contacts/${booking.client_id}`}>View Full Profile</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Record Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="text-foreground">
                  {booking.created_at ? formatDate(booking.created_at) : "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="text-foreground">
                  {booking.updated_at ? formatDate(booking.updated_at) : "Unknown"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditBookingDialog
        booking={booking}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSubmit={async (id, data) => {
          const success = await updateBooking(id, data);
          if (success) {
            refetch();
          }
          return success;
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the booking for{" "}
              <span className="font-medium">{booking.trip_name || booking.destination}</span>
              {booking.clients?.name && <> ({booking.clients.name})</>}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CCAuthorizationDialog
        open={showCCAuthDialog}
        onOpenChange={setShowCCAuthDialog}
        bookingId={booking.id}
        clientId={booking.client_id}
        clientName={booking.clients?.name || "Client"}
        bookingAmount={booking.gross_sales || booking.total_amount}
        bookingReference={booking.booking_reference}
      />

      {/* Cancellation Details Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Cancel Booking
            </AlertDialogTitle>
            <AlertDialogDescription>
              Record the cancellation details for {booking.trip_name || booking.destination}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="cancel-reason">Cancellation Reason</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Why is this booking being cancelled?"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cancel-penalty">Supplier Penalty ($)</Label>
                <Input
                  id="cancel-penalty"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={cancelPenalty}
                  onChange={(e) => setCancelPenalty(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cancel-refund">Refund to Client ($)</Label>
                <Input
                  id="cancel-refund"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={cancelRefund}
                  onChange={(e) => setCancelRefund(e.target.value)}
                />
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const { error } = await supabase
                  .from("bookings")
                  .update({
                    status: "cancelled",
                    cancelled_at: new Date().toISOString(),
                    cancellation_reason: cancelReason || null,
                    cancellation_penalty: parseFloat(cancelPenalty) || 0,
                    cancellation_refund_amount: parseFloat(cancelRefund) || 0,
                  })
                  .eq("id", booking.id);

                if (error) {
                  toast.error("Failed to cancel booking");
                } else {
                  // Log to compliance audit
                  if (user) {
                    await supabase.from("compliance_audit_log").insert({
                      user_id: user.id,
                      event_type: "cancellation_recorded",
                      entity_type: "booking",
                      entity_id: booking.id,
                      client_name: booking.clients?.name || null,
                      metadata: {
                        booking_reference: booking.booking_reference,
                        destination: booking.destination,
                        penalty: parseFloat(cancelPenalty) || 0,
                        refund: parseFloat(cancelRefund) || 0,
                        reason: cancelReason,
                      },
                    });
                  }
                  toast.success("Booking cancelled");
                  refetch();
                }
                setShowCancelDialog(false);
                setCancelReason("");
                setCancelPenalty("");
                setCancelRefund("");
              }}
            >
              Confirm Cancellation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InvoicePreviewDialog
        open={invoicePreviewOpen}
        onOpenChange={(open) => {
          setInvoicePreviewOpen(open);
          if (!open && invoicePreviewUrl) {
            URL.revokeObjectURL(invoicePreviewUrl);
            setInvoicePreviewUrl(null);
          }
        }}
        pdfUrl={invoicePreviewUrl}
        invoiceNumber={invoicePreviewNumber}
        generating={generatingInvoice}
      />
    </DashboardLayout>
  );
};

export default BookingDetail;
