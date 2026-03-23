import { useState } from "react";
import { CheckCircle2, PenLine, Loader2, DollarSign, MessageSquare, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface SharedTripBudgetConfirmationProps {
  budgetRange: string | null;
  confirmed: boolean;
  confirmedAt: string | null;
  changeRequested: boolean;
  changeRequestMessage: string | null;
  primaryColor: string;
  shareToken?: string;
}

export default function SharedTripBudgetConfirmation({
  budgetRange,
  confirmed,
  confirmedAt,
  changeRequested,
  changeRequestMessage,
  primaryColor,
  shareToken,
}: SharedTripBudgetConfirmationProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [signature, setSignature] = useState("");
  const [budgetAccepted, setBudgetAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [changeMessage, setChangeMessage] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(confirmed);
  const [isChangeRequested, setIsChangeRequested] = useState(changeRequested);

  if (!budgetRange) return null;

  const handleConfirmBudget = async () => {
    if (!shareToken) return;

    setSubmitting(true);
    try {
      let ipAddress = null;
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;
      } catch {
        // best-effort
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/shared-trip`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: shareToken,
            action: "confirm_budget",
            signature: signature.trim(),
            ip_address: ipAddress,
            user_agent: navigator.userAgent,
          }),
        }
      );

      if (res.ok) {
        setIsConfirmed(true);
        setIsChangeRequested(false);
        setShowConfirmDialog(false);
        toast.success("Budget confirmed successfully!");
      } else {
        toast.error("Failed to confirm budget. Please try again.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChange = async () => {
    if (!shareToken || !changeMessage.trim()) return;

    setSubmitting(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/shared-trip`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: shareToken,
            action: "request_budget_change",
            message: changeMessage.trim(),
          }),
        }
      );

      if (res.ok) {
        setIsChangeRequested(true);
        setIsConfirmed(false);
        setShowChangeDialog(false);
        setChangeMessage("");
        toast.success("Your change request has been sent to your advisor.");
      } else {
        toast.error("Failed to send request. Please try again.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const allReady = budgetAccepted && signature.trim().length >= 2;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Budget Approval</h2>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div
          className="px-6 py-5 text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <p className="text-sm font-medium opacity-80">Proposed Budget</p>
          <p className="text-2xl font-bold mt-1">{budgetRange}</p>
        </div>

        <div className="px-6 py-5">
          {isConfirmed ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: primaryColor }} />
              <div>
                <p className="text-sm font-medium text-gray-900">Budget Confirmed</p>
                <p className="text-xs text-gray-500">
                  {confirmedAt
                    ? `Confirmed on ${new Date(confirmedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : "Your advisor has been notified."}
                </p>
              </div>
            </div>
          ) : isChangeRequested ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Change Requested</p>
                  <p className="text-xs text-gray-500">Your advisor has been notified and will follow up.</p>
                </div>
              </div>
              {changeRequestMessage && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800 italic">"{changeRequestMessage}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Please review the proposed budget for your trip. You can confirm it or request changes.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="text-white"
                  style={{ backgroundColor: primaryColor }}
                  onClick={() => setShowConfirmDialog(true)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Budget
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowChangeDialog(true)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Request Changes
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* E-Signature Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" style={{ color: primaryColor }} />
              Confirm Budget
            </DialogTitle>
            <DialogDescription>
              Please review and sign to confirm the proposed budget of <strong>{budgetRange}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={budgetAccepted}
                onCheckedChange={(v) => setBudgetAccepted(!!v)}
                className="mt-0.5"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                I confirm the proposed budget of <strong>{budgetRange}</strong> for this trip and authorize my advisor to plan within this range.
              </span>
            </label>

            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="budget-signature" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <PenLine className="h-4 w-4" style={{ color: primaryColor }} />
                Type your full name as your electronic signature
              </Label>
              <Input
                id="budget-signature"
                placeholder="e.g. John Smith"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="font-serif italic text-lg"
                maxLength={100}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
              <Button
                disabled={!allReady || submitting}
                className="text-white"
                style={{ backgroundColor: primaryColor }}
                onClick={handleConfirmBudget}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                {submitting ? "Processing..." : "Confirm & Sign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Changes Dialog */}
      <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Request Budget Changes
            </DialogTitle>
            <DialogDescription>
              Let your advisor know what changes you'd like to the proposed budget of <strong>{budgetRange}</strong>.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Describe the changes you'd like..."
            value={changeMessage}
            onChange={(e) => setChangeMessage(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeDialog(false)}>Cancel</Button>
            <Button
              onClick={handleRequestChange}
              disabled={submitting || !changeMessage.trim()}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
