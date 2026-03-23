import { useState } from "react";
import { DollarSign, Calendar, CheckCircle2, AlertTriangle, CreditCard, Shield, ArrowUpRight, PenLine, Loader2, Lock, Wallet } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface SharedTripInvestmentProps {
  trip: {
    total_cost: number | null;
    depart_date: string | null;
    notes: string | null;
  };
  upgradeNotes?: string | null;
  deposit: {
    required: boolean;
    amount: number;
  };
  cancellationTerms: string[];
  paymentDeadlines: { label: string; date: string }[];
  primaryColor: string;
  shareToken?: string;
}

export default function SharedTripInvestment({
  trip,
  deposit,
  cancellationTerms,
  paymentDeadlines,
  primaryColor,
  upgradeNotes,
  shareToken,
}: SharedTripInvestmentProps) {
  const totalCost = trip.total_cost || 0;
  const depositAmount = deposit.required ? deposit.amount : 0;
  const finalBalance = totalCost - depositAmount;
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [accepted, setAccepted] = useState({
    totalCost: false,
    cancellation: false,
    travelerNames: false,
  });
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ccLoading, setCcLoading] = useState(false);

  if (totalCost <= 0) return null;

  const allAccepted = accepted.totalCost && accepted.cancellation && accepted.travelerNames && signature.trim().length >= 2;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const handleAcceptTerms = async () => {
    if (!shareToken) {
      setTermsAccepted(true);
      setShowTerms(false);
      setTimeout(() => setShowPaymentMethods(true), 150);
      return;
    }

    setSubmitting(true);
    try {
      // Capture IP address
      let ipAddress = null;
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;
      } catch {
        // IP capture is best-effort
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/shared-trip`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: shareToken,
            signature: signature.trim(),
            ip_address: ipAddress,
            user_agent: navigator.userAgent,
          }),
        }
      );

      if (!res.ok) {
        console.error("Failed to log terms acceptance");
      }
    } catch (err) {
      console.error("Error logging terms acceptance:", err);
    } finally {
      setSubmitting(false);
      setTermsAccepted(true);
      setShowTerms(false);
      setTimeout(() => setShowPaymentMethods(true), 150);
    }
  };

  const handleCCToAgent = async () => {
    if (!shareToken) return;
    setCcLoading(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/shared-trip`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: shareToken,
            action: "create_cc_auth",
            amount: paymentAmount,
          }),
        }
      );
      const result = await res.json();
      if (result.ccAccessToken) {
        setShowPaymentMethods(false);
        window.location.href = `/authorize/${result.ccAccessToken}`;
      } else {
        toast.error(result.error || "Unable to create authorization. Please contact your advisor.");
      }
    } catch (err) {
      console.error("CC auth error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setCcLoading(false);
    }
  };

  const paymentAmount = deposit.required && depositAmount > 0 ? depositAmount : totalCost;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Your Investment</h2>

      {/* Urgency Banner */}
      <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-5 py-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800 font-medium">
          Pricing is subject to availability and may change. Book now to secure these rates.
        </p>
      </div>

      {/* Pricing Breakdown */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div
          className="px-6 py-5 text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <p className="text-sm font-medium opacity-80">Total Trip Cost</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(totalCost)}</p>
        </div>

        <div className="divide-y divide-gray-100">
          {deposit.required && depositAmount > 0 && (
            <>
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Deposit Due</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(depositAmount)}</span>
              </div>
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Final Balance</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(finalBalance)}</span>
              </div>
            </>
          )}

          {paymentDeadlines.length > 0 && paymentDeadlines.map((deadline, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700">{deadline.label}</span>
              </div>
              <span className="text-sm font-medium text-gray-600">
                {format(parseISO(deadline.date), "MMM d, yyyy")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* What's Included */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">What's Included</h3>
          <ul className="space-y-2">
            {["All accommodations as outlined", "Transfers & transportation", "Activities & experiences listed", "Travel advisor support"].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: primaryColor }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Not Included</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            {["International airfare (unless specified)", "Travel insurance", "Personal expenses & gratuities", "Meals not specified in itinerary"].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-gray-300 mt-0.5">–</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Cancellation Terms */}
      {cancellationTerms.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" />
            Cancellation Policy
          </h3>
          <ul className="space-y-2">
            {cancellationTerms.map((term, i) => (
              <li key={i} className="text-sm text-amber-700">{term}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Optional Upgrades */}
      {upgradeNotes && (
        <div className="rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4" style={{ color: primaryColor }} />
            Optional Upgrades
          </h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{upgradeNotes}</p>
        </div>
      )}

      {/* Ready to Book CTA */}
      <div className="rounded-xl border border-gray-200 p-6 text-center space-y-4 bg-gray-50">
        <h3 className="text-lg font-bold text-gray-900">Ready to Book?</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Review and accept the terms below to proceed with payment.
        </p>
        {termsAccepted ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm font-medium" style={{ color: primaryColor }}>
              <CheckCircle2 className="h-5 w-5" />
              Terms accepted
            </div>
            <Button
              size="lg"
              className="text-white"
              style={{ backgroundColor: primaryColor }}
              onClick={() => setShowPaymentMethods(true)}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Choose Payment Method
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            className="text-white"
            style={{ backgroundColor: primaryColor }}
            onClick={() => setShowTerms(true)}
          >
            <Shield className="h-4 w-4 mr-2" />
            Review Terms & Proceed
          </Button>
        )}
      </div>

      {/* Terms Acceptance Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" style={{ color: primaryColor }} />
              Pre-Payment Agreement
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="rounded-lg p-4 border" style={{ backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}30` }}>
              <p className="text-sm text-gray-700">
                Please review and confirm the following before your advisor proceeds with payment for your trip.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={accepted.totalCost}
                  onCheckedChange={(v) => setAccepted((s) => ({ ...s, totalCost: !!v }))}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  I confirm the {deposit.required && depositAmount > 0 ? "deposit" : "payment"} amount of{" "}
                  <strong>{formatCurrency(paymentAmount)}</strong>
                  {deposit.required && depositAmount > 0 && (
                    <> (total trip cost: {formatCurrency(totalCost)})</>
                  )} and understand any remaining balance will be due as specified.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={accepted.cancellation}
                  onCheckedChange={(v) => setAccepted((s) => ({ ...s, cancellation: !!v }))}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  I have read and accept the cancellation policy.
                  {cancellationTerms.length > 0 && (
                    <span className="block text-xs text-gray-500 mt-1 italic">
                      {cancellationTerms.join(" • ")}
                    </span>
                  )}
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={accepted.travelerNames}
                  onCheckedChange={(v) => setAccepted((s) => ({ ...s, travelerNames: !!v }))}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  I confirm that all traveler names match their passport/ID exactly as provided.
                </span>
              </label>
            </div>

            {/* E-Signature */}
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="signature" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <PenLine className="h-4 w-4" style={{ color: primaryColor }} />
                Type your full name as your electronic signature
              </Label>
              <Input
                id="signature"
                placeholder="e.g. John Smith"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="font-serif italic text-lg"
                maxLength={100}
              />
              {signature.trim().length > 0 && signature.trim().length < 2 && (
                <p className="text-xs text-amber-600">Please enter at least 2 characters.</p>
              )}
            </div>

            {!(accepted.totalCost && accepted.cancellation && accepted.travelerNames) && (
              <div className="flex items-center gap-2 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                Please check all boxes to continue.
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowTerms(false)}>Cancel</Button>
              <Button
                disabled={!allAccepted || submitting}
                className="text-white"
                style={{ backgroundColor: primaryColor }}
                onClick={handleAcceptTerms}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="h-4 w-4 mr-2" />
                )}
                {submitting ? "Processing..." : "Accept & Continue"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Method Selection Dialog */}
      <Dialog open={showPaymentMethods} onOpenChange={setShowPaymentMethods}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
            <DialogDescription>
              Select how you'd like to pay <strong>{formatCurrency(paymentAmount)}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {/* Send Card Info to Agent */}
            <button
              onClick={handleCCToAgent}
              disabled={ccLoading}
              className="w-full flex items-start gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all text-left disabled:opacity-50"
            >
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                {ccLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                ) : (
                  <Lock className="h-5 w-5 text-gray-600" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900">Send Card Info to Agent</p>
                <p className="text-sm text-gray-500 mt-0.5">Securely authorize your credit card and let your advisor process the payment.</p>
              </div>
            </button>

            <p className="text-xs text-center text-gray-400 py-1">
              Your card information is encrypted and transmitted securely.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}