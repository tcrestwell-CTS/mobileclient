import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, FileText, CreditCard, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface Booking {
  id: string;
  confirmation_number?: string;
  booking_reference?: string;
  supplier_id?: string | null;
  total_price?: number;
  total_amount?: number;
  status: string;
  suppliers?: { name: string } | null;
}

interface TripPayment {
  id: string;
  booking_id?: string | null;
  virtual_card_id?: string | null;
  virtual_card_status?: string | null;
  amount: number;
  status: string;
}

interface SupplierPaymentStatusProps {
  bookings: Booking[];
  payments: TripPayment[];
}

const cardStatusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  ready: { label: "Card Ready", color: "bg-primary/10 text-primary", icon: CreditCard },
  authorized: { label: "Authorized", color: "bg-blue-100 text-blue-700", icon: CreditCard },
  used: { label: "Paid", color: "bg-success/10 text-success", icon: CheckCircle2 },
  canceled: { label: "Locked", color: "bg-muted text-muted-foreground", icon: CheckCircle2 },
  declined: { label: "Declined", color: "bg-destructive/10 text-destructive", icon: AlertTriangle },
};

export function SupplierPaymentStatus({ bookings, payments }: SupplierPaymentStatusProps) {
  if (!bookings.length) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  const getBookingPaymentInfo = (bookingId: string) => {
    const payment = payments.find((p) => p.booking_id === bookingId);
    return payment;
  };

  const getVirtualCardStatus = (payment: TripPayment | undefined) => {
    if (!payment) return "not_issued";
    if (!payment.virtual_card_id) return "not_issued";
    return payment.virtual_card_status || "pending";
  };

  const getRowColor = (vcStatus: string, paymentStatus: string) => {
    if (vcStatus === "used" || vcStatus === "canceled") return "border-l-success";
    if (vcStatus === "ready" || vcStatus === "authorized") return "border-l-primary";
    if (vcStatus === "declined") return "border-l-destructive";
    if (paymentStatus === "paid") return "border-l-warning";
    return "border-l-muted-foreground/30";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Supplier Payment Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {bookings.map((booking) => {
          const payment = getBookingPaymentInfo(booking.id);
          const vcStatus = getVirtualCardStatus(payment);
          const hasInvoice = false;
          const supplierName = (booking as any).suppliers?.name || "No supplier";
          const rowColor = getRowColor(vcStatus, payment?.status || "pending");

          const statusInfo = cardStatusConfig[vcStatus];

          return (
            <div
              key={booking.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border border-l-4 bg-card",
                rowColor
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link to={`/bookings/${booking.id}`} className="text-sm font-medium truncate text-primary hover:underline">
                    {booking.confirmation_number || booking.booking_reference || booking.id.slice(0, 8)}
                  </Link>
                  <span className="text-xs text-muted-foreground">•</span>
                  <p className="text-xs text-muted-foreground truncate">{supplierName}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatCurrency(booking.total_price || booking.total_amount || 0)}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Invoice Status */}
                <div className="flex items-center gap-1">
                  <FileText className={cn("h-3.5 w-3.5", hasInvoice ? "text-success" : "text-muted-foreground")} />
                  <span className={cn("text-xs", hasInvoice ? "text-success" : "text-muted-foreground")}>
                    {hasInvoice ? "Invoice" : "No invoice"}
                  </span>
                </div>

                {/* Card Status */}
                {statusInfo ? (
                  <Badge variant="secondary" className={cn("text-xs gap-1", statusInfo.color)}>
                    <statusInfo.icon className="h-3 w-3" />
                    {statusInfo.label}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs gap-1 bg-muted text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {vcStatus === "not_issued" ? "No card" : "Pending"}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
