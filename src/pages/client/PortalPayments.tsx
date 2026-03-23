import { useState } from "react";
import { usePortalPayments } from "@/hooks/usePortalData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard, Receipt, DollarSign, Clock, CheckCircle2, XCircle,
  Loader2, FileText, Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaymentAgreementStep } from "@/components/client/PaymentAgreementStep";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: any; className: string }> = {
  paid: { label: "Paid", variant: "default", icon: CheckCircle2, className: "bg-green-100 text-green-700 border-green-200" },
  pending: { label: "Pending", variant: "secondary", icon: Clock, className: "bg-amber-100 text-amber-700 border-amber-200" },
  authorized: { label: "Authorized", variant: "outline", icon: CreditCard, className: "bg-blue-100 text-blue-700 border-blue-200" },
  refunded: { label: "Refunded", variant: "outline", icon: DollarSign, className: "bg-purple-100 text-purple-700 border-purple-200" },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle, className: "bg-red-100 text-red-700 border-red-200" },
};

export default function PortalPayments() {
  const { data, isLoading, refetch } = usePortalPayments();
  const payments = data?.payments || [];
  const [payingId, setPayingId] = useState<string | null>(null);
  const [showMethodDialog, setShowMethodDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [affirmLoading, setAffirmLoading] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);

  /**
   * Opens the payment agreement step first before showing payment methods.
   */
  const handlePayNowClick = (payment: any) => {
    setSelectedPayment(payment);
    setShowAgreement(true);
  };

  /**
   * Called when client accepts the agreement — proceeds to payment method selection.
   */
  const handleAgreementAccepted = () => {
    setShowAgreement(false);
    // Small delay to let the agreement dialog close before opening the method dialog
    setTimeout(() => {
      setShowMethodDialog(true);
    }, 150);
  };

  /**
   * STRIPE FLOW:
   * Creates a Stripe Checkout session and redirects the client.
   * On completion, verify-stripe-payment marks it paid and triggers
   * virtual card creation + agent notification.
   */
  const handleStripePayment = async () => {
    if (!selectedPayment) return;
    setPayingId(selectedPayment.id);
    setShowMethodDialog(false);

    try {
      const portalSession = localStorage.getItem("portal_session");
      const portalToken = portalSession ? JSON.parse(portalSession).token : null;

      // Record the client's payment method choice
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-stripe-payment`, {
        method: "POST",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "x-portal-token": portalToken || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId: selectedPayment.id,
          returnUrl: window.location.origin,
          paymentMethodChoice: "stripe", // Track which method the client chose
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create payment");
      if (data.url) window.location.href = data.url;
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to start payment. Please try again.");
    } finally {
      setPayingId(null);
    }
  };

  /**
   * AFFIRM FLOW:
   * Opens the Affirm VCN checkout modal directly in the portal.
   * If the client is approved, Affirm issues a virtual card.
   * The card details + checkout_id are sent to the create-virtual-card
   * edge function which notifies the agent.
   */
  const handleAffirmPayment = async () => {
    if (!selectedPayment) return;

    // Guard: Affirm SDK must be loaded (script in index.html)
    if (typeof (window as any).affirm === "undefined") {
      toast.error("Affirm is not available. Please try Stripe or contact your agent.");
      return;
    }

    setAffirmLoading(true);
    setShowMethodDialog(false);

    const affirm = (window as any).affirm;

    // Build checkout data for Affirm VCN
    const checkoutData = {
      merchant: {
        name: "Crestwell Travel Services",
        use_vcn: true, // Enable virtual card generation
      },
      shipping: {
        name: { first: "Client", last: "" },
        address: { line1: "N/A", city: "N/A", state: "CA", zipcode: "00000", country: "USA" },
        phone_number: "0000000000",
        email: "client@example.com",
      },
      billing: {
        name: { first: "Client", last: "" },
        address: { line1: "N/A", city: "N/A", state: "CA", zipcode: "00000", country: "USA" },
        phone_number: "0000000000",
        email: "client@example.com",
      },
      items: [
        {
          display_name: `Trip Payment – ${selectedPayment.trip_name || "Travel"}`,
          sku: selectedPayment.id,
          unit_price: Math.round(selectedPayment.amount * 100), // cents
          qty: 1,
          item_url: window.location.href,
        },
      ],
      order_id: selectedPayment.id,
      metadata: { mode: "modal" },
      total: Math.round(selectedPayment.amount * 100),
      shipping_amount: 0,
      tax_amount: 0,
    };

    // Wait for Affirm SDK readiness, then open VCN checkout
    affirm.ui.ready(function () {
      affirm.checkout(checkoutData);
      affirm.checkout.open_vcn({
        /**
         * SUCCESS CALLBACK:
         * Affirm has approved the loan and issued a virtual card.
         * card_response contains { number, cvv, expiration, cardholder_name, checkout_id }
         *
         * We call create-virtual-card to:
         *   1. Update the trip_payments record
         *   2. Create an agent_notification
         *   3. Send the agent an email
         */
        success: async function (card_response: any) {
          setAffirmLoading(false);
          toast.success("Affirm approved! Your agent has been notified.");

          try {
            const portalSession = localStorage.getItem("portal_session");
            const portalToken = portalSession ? JSON.parse(portalSession).token : null;

            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-virtual-card`, {
              method: "POST",
              headers: {
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                "x-portal-token": portalToken || "",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                paymentId: selectedPayment.id,
                method: "affirm",
                affirmCheckoutId: card_response.checkout_id || null,
              }),
            });

            refetch();
          } catch (err) {
            console.error("Error notifying agent:", err);
          }
        },

        /**
         * ERROR/CANCEL CALLBACK:
         * Client was declined or cancelled the Affirm checkout.
         */
        error: function (error_response: any) {
          setAffirmLoading(false);
          console.error("Affirm error:", error_response);
          toast.error("Affirm checkout was cancelled or declined. Please try Stripe.");
        },

        checkout_data: checkoutData,
      });
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const formatPaymentType = (type: string) =>
    type === "final_balance" ? "Final Balance" : type.charAt(0).toUpperCase() + type.slice(1);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  const paidPayments = payments.filter((p: any) => p.status === "paid");
  const pendingPayments = payments.filter((p: any) => p.status === "pending");
  const totalPaid = paidPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const totalPending = pendingPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Payment History</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
                <p className="text-sm text-muted-foreground">Total Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
                <p className="text-sm text-muted-foreground">Outstanding</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{payments.length}</p>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments with Payment Method Choice */}
      {pendingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" /> Payments Due ({pendingPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingPayments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-lg border border-amber-200 bg-amber-50/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{formatPaymentType(p.payment_type)}</p>
                    <span className="text-xs text-muted-foreground">· {p.trip_name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {p.due_date ? `Due ${format(new Date(p.due_date), "MMM d, yyyy")}` : "Due date pending"}
                  </p>
                  {p.details && <p className="text-xs text-muted-foreground">{p.details}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold">{formatCurrency(p.amount)}</p>
                  <Button
                    size="sm"
                    onClick={() => handlePayNowClick(p)}
                    disabled={payingId === p.id || affirmLoading}
                  >
                    {payingId === p.id || affirmLoading ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-1" />
                    )}
                    Pay Now
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Payment Agreement Dialog */}
      <Dialog open={showAgreement} onOpenChange={setShowAgreement}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Agreement</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <PaymentAgreementStep
              tripName={selectedPayment.trip_name || "Trip"}
              amount={selectedPayment.amount}
              cancellationTerms={selectedPayment.cancellation_terms}
              onAccept={handleAgreementAccepted}
              onCancel={() => setShowAgreement(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Method Selection Dialog */}
      <Dialog open={showMethodDialog} onOpenChange={setShowMethodDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
            <DialogDescription>
              Select how you'd like to pay{" "}
              {selectedPayment && (
                <strong>{formatCurrency(selectedPayment.amount)}</strong>
              )}
              {selectedPayment?.trip_name && (
                <> for <strong>{selectedPayment.trip_name}</strong></>
              )}
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {/* Stripe Option */}
            <button
              onClick={handleStripePayment}
              className="w-full flex items-start gap-4 p-4 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Pay with Card</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Pay instantly using your credit or debit card via Stripe's secure checkout.
                </p>
              </div>
            </button>

            {/* Affirm Option */}
            <button
              onClick={handleAffirmPayment}
              className="w-full flex items-start gap-4 p-4 rounded-lg border-2 border-border hover:border-accent/50 hover:bg-accent/5 transition-all text-left"
            >
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Pay with Affirm</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Finance your trip with Affirm. Get approved instantly and pay over time with flexible monthly payments.
                </p>
              </div>
            </button>

            {/* CC Authorization — send card info to agent */}
            <button
              onClick={async () => {
                setShowMethodDialog(false);
                toast.info("Preparing your authorization form...");
                try {
                  const portalSession = localStorage.getItem("portal_session");
                  const portalToken = portalSession ? JSON.parse(portalSession).token : null;
                  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-data?resource=notify-payment-method`, {
                    method: "POST",
                    headers: {
                      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                      "x-portal-token": portalToken || "",
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      tripId: selectedPayment?.trip_id,
                      paymentId: selectedPayment?.id,
                      method: "cc_to_agent",
                    }),
                  });
                  const result = await res.json();
                  if (result.ccAccessToken) {
                    window.location.href = `/authorize/${result.ccAccessToken}`;
                  } else {
                    toast.info("Your advisor will send you a secure card authorization form shortly.");
                  }
                } catch (err) {
                  console.error("Error:", err);
                  toast.error("Something went wrong. Please try again.");
                }
              }}
              className="w-full flex items-start gap-4 p-4 rounded-lg border-2 border-border hover:border-muted-foreground/30 hover:bg-muted/30 transition-all text-left"
            >
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Send Card Info to Agent</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Securely authorize your credit card and let your advisor process the payment on your behalf.
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* All Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" /> All Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No payment history yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-sm text-muted-foreground">Date</th>
                    <th className="pb-3 font-medium text-sm text-muted-foreground">Description</th>
                    <th className="pb-3 font-medium text-sm text-muted-foreground">Trip</th>
                    <th className="pb-3 font-medium text-sm text-muted-foreground">Method</th>
                    <th className="pb-3 font-medium text-sm text-muted-foreground">Status</th>
                    <th className="pb-3 font-medium text-sm text-muted-foreground text-right">Amount</th>
                    <th className="pb-3 font-medium text-sm text-muted-foreground text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((p: any) => {
                    const config = statusConfig[p.status] || statusConfig.pending;
                    const StatusIcon = config.icon;
                    return (
                      <tr key={p.id} className="hover:bg-muted/50">
                        <td className="py-3 text-sm">
                          {format(new Date(p.payment_date), "MMM d, yyyy")}
                        </td>
                        <td className="py-3">
                          <p className="font-medium text-sm">{formatPaymentType(p.payment_type)}</p>
                          {p.details && <p className="text-xs text-muted-foreground">{p.details}</p>}
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">{p.trip_name}</td>
                        <td className="py-3 text-sm text-muted-foreground capitalize">
                          {p.payment_method?.replace(/_/g, " ") || "—"}
                        </td>
                        <td className="py-3">
                          <Badge variant="outline" className={`gap-1 ${config.className}`}>
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </td>
                        <td className="py-3 text-right font-semibold text-sm">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-3 text-center">
                          {p.status === "paid" && p.stripe_receipt_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => window.open(p.stripe_receipt_url, "_blank")}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              View
                            </Button>
                          ) : p.status === "paid" ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
