import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, Loader2, Eye, EyeOff, Copy, CheckCircle2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface StripeVirtualCardButtonProps {
  paymentId: string;
  virtualCardStatus: string | null;
  virtualCardId: string | null;
  paymentMethodChoice: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  amount: number;
  clientName?: string;
  tripName?: string;
}

export function StripeVirtualCardButton({
  paymentId,
  virtualCardStatus,
  virtualCardId,
  paymentMethodChoice,
  paymentMethod,
  paymentStatus,
  amount,
  clientName,
  tripName,
}: StripeVirtualCardButtonProps) {
  const [loading, setLoading] = useState(false);
  const [cardDetails, setCardDetails] = useState<any>(null);
  const [showCardDialog, setShowCardDialog] = useState(false);
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [showNumber, setShowNumber] = useState(false);
  const [showCvc, setShowCvc] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [expirationDays, setExpirationDays] = useState("14");
  const [issueNotes, setIssueNotes] = useState("");

  const isStripePaid =
    paymentStatus === "paid" &&
    (paymentMethodChoice === "stripe" || (!paymentMethodChoice && paymentMethod === "stripe"));

  if (!isStripePaid) return null;

  const hasCard = virtualCardId && virtualCardStatus === "ready";
  const isCardUsed = virtualCardStatus === "used" || virtualCardStatus === "canceled";

  const handleRetrieveCard = async () => {
    setLoading(true);
    try {
      if (hasCard) {
        const { data, error } = await supabase.functions.invoke("retrieve-virtual-card", {
          body: { paymentId },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setCardDetails(data);
        setShowCardDialog(true);
        setShowNumber(false);
        setShowCvc(false);
      } else {
        // Show issue dialog for manual controls
        setShowIssueDialog(true);
      }
    } catch (err: any) {
      console.error("Error with virtual card:", err);
      toast.error(err.message || "Failed to process virtual card");
    } finally {
      setLoading(false);
    }
  };

  const handleIssueCard = async () => {
    setLoading(true);
    try {
      const days = parseInt(expirationDays) || 14;
      const { data, error } = await supabase.functions.invoke("create-virtual-card", {
        body: {
          paymentId,
          method: "stripe",
          expirationDays: days,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.virtualCardId) {
        toast.error("Stripe Issuing is not enabled on this account. Please process supplier payment manually.");
        return;
      }
      toast.success("Stripe virtual card created! Click 'Retrieve Card' to view details.");
      setShowIssueDialog(false);
      window.location.reload();
    } catch (err: any) {
      console.error("Error issuing virtual card:", err);
      toast.error(err.message || "Failed to issue virtual card");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
    toast.success(`${field} copied`);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  const maskNumber = (num: string) =>
    num ? `•••• •••• •••• ${num.slice(-4)}` : "••••";

  const getStatusBadge = () => {
    if (isCardUsed) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <span>Card used & locked</span>
        </div>
      );
    }
    if (virtualCardStatus === "authorized") {
      return (
        <div className="flex items-center gap-1.5 text-xs text-blue-600">
          <CreditCard className="h-3.5 w-3.5" />
          <span>Authorized</span>
        </div>
      );
    }
    if (virtualCardStatus === "declined") {
      return (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <CreditCard className="h-3.5 w-3.5" />
          <span>Declined</span>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {getStatusBadge()}
        {!isCardUsed && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10"
            onClick={handleRetrieveCard}
            disabled={loading}
            title={hasCard ? "Retrieve Stripe Issuing virtual card details" : "Issue a Stripe Issuing virtual card"}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CreditCard className="h-3.5 w-3.5" />
            )}
            {hasCard ? "Retrieve Card" : "Issue Card"}
          </Button>
        )}
      </div>

      {/* Issue Card Dialog — manual controls */}
      <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Issue Supplier Card
            </DialogTitle>
            <DialogDescription>
              Configure the virtual card for this {formatCurrency(amount)} payment
              {tripName && <> on <strong>{tripName}</strong></>}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{formatCurrency(amount)}</span>
              </div>
              {clientName && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Client</span>
                  <span>{clientName}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expirationDays">Card Expiration (days)</Label>
              <Input
                id="expirationDays"
                type="number"
                min="1"
                max="90"
                value={expirationDays}
                onChange={(e) => setExpirationDays(e.target.value)}
                placeholder="14"
              />
              <p className="text-xs text-muted-foreground">
                Card will auto-expire after this many days. Default: 14.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="issueNotes">Notes (optional)</Label>
              <Textarea
                id="issueNotes"
                value={issueNotes}
                onChange={(e) => setIssueNotes(e.target.value)}
                placeholder="e.g. Hilton deposit for booking #A-1029"
                rows={2}
              />
            </div>

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground">
                <strong>Controls applied:</strong> Spending limit set to {formatCurrency(amount)}.
                Card restricted to travel-related merchant categories (airlines, hotels, cruises, transportation).
                Auto-locks after first successful charge.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssueDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleIssueCard} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Issue Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Card Details Dialog */}
      <Dialog open={showCardDialog} onOpenChange={setShowCardDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Stripe Virtual Card
            </DialogTitle>
            <DialogDescription>
              Use these card details to pay the supplier
              {tripName && <> for <strong>{tripName}</strong></>}.
              {clientName && <> Client: <strong>{clientName}</strong>.</>}
            </DialogDescription>
          </DialogHeader>

          {cardDetails && (
            <div className="space-y-3 mt-2">
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/90 to-primary/60 text-primary-foreground space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs uppercase tracking-wider opacity-80">Virtual Card</span>
                  <span className="text-xs font-semibold uppercase">{cardDetails.brand || "Visa"}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg tracking-wider">
                      {showNumber && cardDetails.number
                        ? cardDetails.number.replace(/(.{4})/g, "$1 ").trim()
                        : maskNumber(cardDetails.last4 || "")}
                    </span>
                    <button onClick={() => setShowNumber(!showNumber)} className="opacity-70 hover:opacity-100">
                      {showNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    {cardDetails.number && (
                      <button onClick={() => copyToClipboard(cardDetails.number, "Card number")} className="opacity-70 hover:opacity-100">
                        {copied === "Card number" ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider opacity-70">Expires</span>
                    <p className="font-mono text-sm">
                      {String(cardDetails.exp_month).padStart(2, "0")}/{String(cardDetails.exp_year).slice(-2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider opacity-70">CVC</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-sm">
                        {showCvc && cardDetails.cvc ? cardDetails.cvc : "•••"}
                      </span>
                      <button onClick={() => setShowCvc(!showCvc)} className="opacity-70 hover:opacity-100">
                        {showCvc ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                      {cardDetails.cvc && (
                        <button onClick={() => copyToClipboard(cardDetails.cvc, "CVC")} className="opacity-70 hover:opacity-100">
                          {copied === "CVC" ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider opacity-70">Limit</span>
                    <p className="font-mono text-sm">
                      {cardDetails.spending_limit
                        ? formatCurrency(cardDetails.spending_limit)
                        : formatCurrency(amount)}
                    </p>
                  </div>
                </div>

                {cardDetails.cardholder_name && (
                  <p className="text-xs uppercase tracking-wider opacity-80 pt-1">
                    {cardDetails.cardholder_name}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  Status: <strong className="capitalize">{cardDetails.status}</strong>
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                This card is single-use and limited to {formatCurrency(cardDetails.spending_limit || amount)}.
                Restricted to travel merchant categories. Auto-locks after first successful charge.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
