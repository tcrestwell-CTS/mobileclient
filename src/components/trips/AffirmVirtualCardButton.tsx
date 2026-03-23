import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AffirmVirtualCardButtonProps {
  /** The payment amount in dollars (will be converted to cents for Affirm) */
  amount: number;
  /** Client name (used for Affirm shipping/billing) */
  clientName?: string;
  /** Client email */
  clientEmail?: string;
  /** Client phone */
  clientPhone?: string;
  /** Supplier name displayed in the Affirm checkout */
  supplierName?: string;
  /** Trip name for line item label */
  tripName?: string;
  /** Unique order/payment ID for Affirm's order_id field */
  orderId: string;
  /** Whether the parent payment is confirmed/paid — only show when true */
  paymentStatus: string;
}

/**
 * AffirmVirtualCardButton
 *
 * Shows on confirmed (paid) trip payments in the agent dashboard.
 * On click, it opens the Affirm VCN checkout modal. If the client
 * approves the Affirm loan, Affirm returns a virtual card that the
 * agent can use to pay the supplier directly.
 *
 * IMPORTANT: Affirm does NOT generate real virtual cards in sandbox.
 * Work with your Affirm TAM for live testing.
 *
 * Setup:
 *   1. Replace YOUR_AFFIRM_PUBLIC_KEY in index.html with your Affirm
 *      sandbox public API key.
 *   2. Switch the script URL to the production CDN before going live:
 *      https://cdn1.affirm.com/js/v2/affirm.js
 */
export function AffirmVirtualCardButton({
  amount,
  clientName,
  clientEmail,
  clientPhone,
  supplierName,
  tripName,
  orderId,
  paymentStatus,
}: AffirmVirtualCardButtonProps) {
  const [loading, setLoading] = useState(false);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [showCardDialog, setShowCardDialog] = useState(false);

  // Only render the button for paid/confirmed payments — guard is after hooks

  /**
   * Splits a full name into first and last for Affirm's name object.
   * Falls back to "Client" if no name is provided.
   */
  const parseName = (fullName?: string) => {
    const parts = (fullName || "Client").trim().split(" ");
    return {
      first: parts[0] || "Client",
      last: parts.slice(1).join(" ") || "",
    };
  };

  const handleIssueCard = () => {
    // Guard: ensure Affirm SDK is loaded
    if (typeof (window as any).affirm === "undefined") {
      toast.error("Affirm SDK is not loaded. Check your API key in index.html.");
      return;
    }

    setLoading(true);
    const affirm = (window as any).affirm;
    const clientNameParsed = parseName(clientName);

    /**
     * Build the Affirm checkout object.
     *
     * use_vcn: true  → enables Virtual Card Number generation on loan origination
     * mode: "modal"  → required for VCN (opens as a pop-up over the current page)
     *
     * All amounts are in cents (multiply dollars × 100).
     */
    const checkoutData = {
      merchant: {
        name: "Crestwell Travel Services",
        use_vcn: true, // REQUIRED: enables virtual card issuance
      },
      shipping: {
        name: clientNameParsed,
        address: {
          line1: "N/A", // Required field — use client's actual address when available
          city: "N/A",
          state: "CA",
          zipcode: "00000",
          country: "USA",
        },
        phone_number: (clientPhone || "0000000000").replace(/\D/g, "").slice(0, 10) || "0000000000",
        email: clientEmail || "agent@crestwelltravels.com",
      },
      billing: {
        name: clientNameParsed,
        address: {
          line1: "N/A",
          city: "N/A",
          state: "CA",
          zipcode: "00000",
          country: "USA",
        },
        phone_number: (clientPhone || "0000000000").replace(/\D/g, "").slice(0, 10) || "0000000000",
        email: clientEmail || "agent@crestwelltravels.com",
      },
      items: [
        {
          display_name: supplierName
            ? `Supplier Payment – ${supplierName}`
            : `Trip Payment – ${tripName || "Travel"}`,
          // SKU uses the payment/order ID for reconciliation
          sku: orderId,
          // Affirm requires unit_price in cents
          unit_price: Math.round(amount * 100),
          qty: 1,
          item_url: window.location.href,
        },
      ],
      order_id: orderId,
      metadata: {
        // VCN only supports modal mode
        mode: "modal",
      },
      // Total in cents — must match sum of items
      total: Math.round(amount * 100),
      shipping_amount: 0,
      tax_amount: 0,
    };

    /**
     * Wrap calls in affirm.ui.ready() to avoid
     * "affirm.checkout.open_vcn is not a function" errors.
     * This ensures Affirm.js is fully initialized before we call it.
     */
    affirm.ui.ready(function () {
      // Step 1: Pass checkout data to Affirm
      affirm.checkout(checkoutData);

      // Step 2: Open the VCN modal and handle callbacks
      affirm.checkout.open_vcn({
        /**
         * SUCCESS: Client approved the Affirm loan.
         * card_response contains the virtual card details:
         *   { number, cvv, expiration, cardholder_name, checkout_id }
         *
         * In production, send these details to your payment processor
         * or Affirm's Read Card API using the checkout_id for server-side retrieval.
         */
        success: function (card_response: any) {
          setLoading(false);
          setCardDetails(card_response);
          setShowCardDialog(true);
          toast.success("Virtual card issued successfully! Use the card details to pay the supplier.");
        },

        /**
         * ERROR/CANCEL: Client declined or cancelled the Affirm checkout.
         * Redirect the agent back to the payment selection screen
         * so they can choose an alternative payment method.
         */
        error: function (error_response: any) {
          setLoading(false);
          console.error("Affirm VCN error:", error_response);
          toast.error("Affirm checkout was cancelled or declined. Please try another payment method.");
        },

        checkout_data: checkoutData,
      });
    });
  };

  return (
    <>
      {/* Only show for paid/confirmed payments */}
      {paymentStatus === "paid" && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs border-accent text-accent-foreground hover:bg-accent/10"
          onClick={handleIssueCard}
          disabled={loading}
          title="Issue an Affirm virtual card to pay this supplier"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CreditCard className="h-3.5 w-3.5" />
          )}
          Issue Virtual Card
        </Button>
      )}

      {/* Virtual card details dialog — shown after successful Affirm checkout */}
      <Dialog open={showCardDialog} onOpenChange={setShowCardDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Virtual Card Issued
            </DialogTitle>
            <DialogDescription>
              Use these card details to pay{" "}
              {supplierName ? <strong>{supplierName}</strong> : "the supplier"}.
              This card is single-use and tied to this transaction.
            </DialogDescription>
          </DialogHeader>

          {cardDetails && (
            <div className="space-y-3 mt-2">
              {/* Card number */}
              <div className="p-3 rounded-lg bg-muted border font-mono text-sm space-y-2">
                {cardDetails.number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs uppercase tracking-wide">Card Number</span>
                    <span className="font-semibold">{cardDetails.number}</span>
                  </div>
                )}
                {cardDetails.cvv && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs uppercase tracking-wide">CVV</span>
                    <span className="font-semibold">{cardDetails.cvv}</span>
                  </div>
                )}
                {cardDetails.expiration && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs uppercase tracking-wide">Expiry</span>
                    <span className="font-semibold">{cardDetails.expiration}</span>
                  </div>
                )}
                {cardDetails.cardholder_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs uppercase tracking-wide">Cardholder</span>
                    <span className="font-semibold">{cardDetails.cardholder_name}</span>
                  </div>
                )}
              </div>

              {/* Sandbox note */}
              <p className="text-xs text-foreground bg-muted border rounded p-2">
                ⚠️ <strong>Sandbox mode:</strong> Affirm does not generate real virtual cards in sandbox.
                Contact your Affirm TAM for live testing.
              </p>

              {/* Checkout ID for server-side card retrieval */}
              {cardDetails.checkout_id && (
                <p className="text-xs text-muted-foreground">
                  Checkout ID: <code className="font-mono">{cardDetails.checkout_id}</code>
                  <br />
                  Use this with Affirm's Read Card API for server-side card retrieval.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
