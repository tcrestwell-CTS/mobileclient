import { useEffect, useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Stripe publishable key — public key, safe to be in frontend code
const stripePromise = loadStripe("pk_live_51RrgVIPJljF0WNcYMZK3XH5QGmffC4LsV0e8EdSglGdrD8SlY9akQwJhBO8N2d87i574E3ONKvbsabfgKc3SDSq500gJ96MghZ");

type ResultStatus = "success" | "failed" | "cancelled";

interface StripeCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  tripId: string;
  onComplete?: () => void;
}

export function StripeCheckoutDialog({
  open,
  onOpenChange,
  paymentId,
  tripId,
  onComplete,
}: StripeCheckoutDialogProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ResultStatus | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Fetch client secret for embedded checkout
  useEffect(() => {
    if (!open || !paymentId) return;
    setClientSecret(null);
    setResult(null);
    setReceiptUrl(null);
    setLoading(true);

    supabase.functions
      .invoke("create-stripe-payment", {
        body: {
          paymentId,
          returnUrl: window.location.origin,
          embedded: true,
        },
      })
      .then(({ data, error }) => {
        if (error || !data?.clientSecret) {
          toast.error("Failed to initialise payment");
          onOpenChange(false);
          return;
        }
        setClientSecret(data.clientSecret);
      })
      .finally(() => setLoading(false));
  }, [open, paymentId]);

  // Called by EmbeddedCheckout when Stripe redirects to return_url
  // We intercept via onComplete callback instead of a real redirect
  const handleComplete = useCallback(async () => {
    // Stripe embedded checkout calls return_url; we verify via session stored on payment
    setVerifying(true);
    try {
      // Fetch the session id from the payment record
      const { data: payment } = await supabase
        .from("trip_payments")
        .select("stripe_session_id")
        .eq("id", paymentId)
        .single();

      if (!payment?.stripe_session_id) {
        setResult("failed");
        return;
      }

      const { data, error } = await supabase.functions.invoke("verify-stripe-payment", {
        body: { sessionId: payment.stripe_session_id },
      });

      if (error) throw error;

      if (data?.paid) {
        setReceiptUrl(data.receiptUrl || null);
        setResult("success");
        onComplete?.();
      } else {
        setResult("failed");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setResult("failed");
    } finally {
      setVerifying(false);
    }
  }, [paymentId, onComplete]);

  const handleClose = () => {
    setClientSecret(null);
    setResult(null);
    setReceiptUrl(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {result ? "Payment Result" : "Complete Payment"}
          </DialogTitle>
        </DialogHeader>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Preparing secure checkout…</p>
          </div>
        )}

        {/* Verifying state */}
        {verifying && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Confirming payment…</p>
          </div>
        )}

        {/* Embedded Checkout */}
        {!loading && !result && !verifying && clientSecret && (
          <div className="min-h-[400px]">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                clientSecret,
                onComplete: handleComplete,
              }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}

        {/* Result: Success */}
        {result === "success" && (
          <div className="flex flex-col items-center text-center gap-5 py-10">
            <div className="rounded-full bg-primary/10 p-4">
              <CheckCircle className="h-14 w-14 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">Payment Successful!</h2>
              <p className="text-muted-foreground max-w-sm">
                The payment has been recorded and a receipt has been automatically sent to the client with Crestwell Travel Services branding.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              {receiptUrl && (
                <Button variant="outline" asChild>
                  <a href={receiptUrl} target="_blank" rel="noreferrer">
                    View Stripe Receipt
                  </a>
                </Button>
              )}
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}

        {/* Result: Failed */}
        {result === "failed" && (
          <div className="flex flex-col items-center text-center gap-5 py-10">
            <div className="rounded-full bg-destructive/10 p-4">
              <XCircle className="h-14 w-14 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">Payment Failed</h2>
              <p className="text-muted-foreground max-w-sm">
                The payment could not be verified. Please try again or use a different payment method.
              </p>
            </div>
            <Button onClick={handleClose}>Close</Button>
          </div>
        )}

        {/* Result: Cancelled */}
        {result === "cancelled" && (
          <div className="flex flex-col items-center text-center gap-5 py-10">
            <div className="rounded-full bg-muted p-4">
              <XCircle className="h-14 w-14 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">Payment Cancelled</h2>
              <p className="text-muted-foreground max-w-sm">
                The payment was not completed. The record remains pending.
              </p>
            </div>
            <Button onClick={handleClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
