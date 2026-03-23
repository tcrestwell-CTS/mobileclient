import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const tripId = searchParams.get("trip_id");
  const cancelled = searchParams.get("payment") === "cancelled";

  const [status, setStatus] = useState<"loading" | "success" | "failed" | "cancelled">(
    cancelled ? "cancelled" : "loading"
  );
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  useEffect(() => {
    if (cancelled || !sessionId) {
      setStatus(cancelled ? "cancelled" : "failed");
      return;
    }

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-stripe-payment", {
          body: { sessionId },
        });
        if (error) throw error;
        if (data?.paid) {
          setStatus("success");
          setReceiptUrl(data.receiptUrl || null);
        } else {
          setStatus("failed");
        }
      } catch (err) {
        console.error("Payment verification error:", err);
        setStatus("failed");
      }
    };

    verify();
  }, [sessionId, cancelled]);

  const handleBack = () => {
    if (tripId) {
      navigate(`/trips/${tripId}?tab=payments`);
    } else {
      navigate("/trips");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
            <h1 className="text-2xl font-semibold">Verifying payment…</h1>
            <p className="text-muted-foreground">Please wait while we confirm your transaction.</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-semibold">Payment Successful!</h1>
            <p className="text-muted-foreground">The payment has been recorded and the client has been emailed a receipt.</p>
            <div className="flex flex-col gap-3">
              {receiptUrl && (
                <Button variant="outline" asChild>
                  <a href={receiptUrl} target="_blank" rel="noreferrer">View Stripe Receipt</a>
                </Button>
              )}
              <Button onClick={handleBack}>Back to Trip Payments</Button>
            </div>
          </>
        )}

        {status === "cancelled" && (
          <>
            <XCircle className="h-16 w-16 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-semibold">Payment Cancelled</h1>
            <p className="text-muted-foreground">The payment was not completed. The payment record remains pending.</p>
            <Button onClick={handleBack}>Back to Trip Payments</Button>
          </>
        )}

        {status === "failed" && (
          <>
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <h1 className="text-2xl font-semibold">Verification Failed</h1>
            <p className="text-muted-foreground">We couldn't confirm this payment. Please check the payment list or contact support.</p>
            <Button onClick={handleBack}>Back to Trip Payments</Button>
          </>
        )}
      </div>
    </div>
  );
}
