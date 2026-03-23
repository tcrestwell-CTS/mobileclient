import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle } from "lucide-react";

interface PaymentAgreementStepProps {
  tripName: string;
  amount: number;
  cancellationTerms?: string;
  onAccept: () => void;
  onCancel: () => void;
}

export function PaymentAgreementStep({
  tripName,
  amount,
  cancellationTerms,
  onAccept,
  onCancel,
}: PaymentAgreementStepProps) {
  const [accepted, setAccepted] = useState({
    totalCost: false,
    cancellation: false,
    travelerNames: false,
  });

  const allAccepted = accepted.totalCost && accepted.cancellation && accepted.travelerNames;
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <Shield className="h-5 w-5 text-primary shrink-0" />
        <div>
          <p className="text-sm font-semibold text-foreground">Agreement Required</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Please review and confirm the following before proceeding with payment for <strong>{tripName}</strong>.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer group">
          <Checkbox
            checked={accepted.totalCost}
            onCheckedChange={(v) => setAccepted((s) => ({ ...s, totalCost: !!v }))}
            className="mt-0.5"
          />
          <span className="text-sm text-foreground leading-relaxed">
            I confirm the payment amount of <strong>{formatCurrency(amount)}</strong> for this trip and understand any remaining balance will be due as specified.
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer group">
          <Checkbox
            checked={accepted.cancellation}
            onCheckedChange={(v) => setAccepted((s) => ({ ...s, cancellation: !!v }))}
            className="mt-0.5"
          />
          <span className="text-sm text-foreground leading-relaxed">
            I have read and accept the cancellation policy.
            {cancellationTerms && (
              <span className="block text-xs text-muted-foreground mt-1 italic">{cancellationTerms}</span>
            )}
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer group">
          <Checkbox
            checked={accepted.travelerNames}
            onCheckedChange={(v) => setAccepted((s) => ({ ...s, travelerNames: !!v }))}
            className="mt-0.5"
          />
          <span className="text-sm text-foreground leading-relaxed">
            I confirm that all traveler names match their passport/ID exactly as provided.
          </span>
        </label>
      </div>

      {!allAccepted && (
        <div className="flex items-center gap-2 text-xs text-amber-600">
          <AlertTriangle className="h-3.5 w-3.5" />
          Please check all boxes to continue.
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Back</Button>
        <Button onClick={onAccept} disabled={!allAccepted}>
          Continue to Payment
        </Button>
      </div>
    </div>
  );
}
