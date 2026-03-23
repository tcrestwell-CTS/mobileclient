import { format, parseISO } from "date-fns";
import { CheckCircle2, Circle } from "lucide-react";

interface PaymentTimelineVisualProps {
  deposit: { required: boolean; amount: number };
  paymentDeadlines: { label: string; date: string }[];
  totalCost: number;
  primaryColor: string;
}

export default function PaymentTimelineVisual({
  deposit,
  paymentDeadlines,
  totalCost,
  primaryColor,
}: PaymentTimelineVisualProps) {
  if (!deposit.required && paymentDeadlines.length === 0) return null;

  const steps: { label: string; amount?: number; date?: string; done?: boolean }[] = [];

  if (deposit.required && deposit.amount > 0) {
    steps.push({ label: "Deposit", amount: deposit.amount });
  }

  for (const d of paymentDeadlines) {
    steps.push({ label: d.label, date: d.date });
  }

  if (deposit.required && deposit.amount > 0) {
    const balance = totalCost - deposit.amount;
    if (balance > 0) {
      steps.push({ label: "Final Balance", amount: balance });
    }
  }

  if (steps.length < 2) return null;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <div className="py-2">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Payment Schedule</h3>
      <div className="flex items-start justify-between relative">
        {/* Connecting line */}
        <div
          className="absolute top-3 left-4 right-4 h-0.5"
          style={{ backgroundColor: `${primaryColor}30` }}
        />

        {steps.map((step, i) => (
          <div key={i} className="relative flex flex-col items-center text-center" style={{ flex: 1 }}>
            <div
              className="relative z-10 h-7 w-7 rounded-full flex items-center justify-center border-2"
              style={{
                borderColor: primaryColor,
                backgroundColor: i === 0 ? primaryColor : "white",
              }}
            >
              {i === 0 ? (
                <CheckCircle2 className="h-4 w-4 text-white" />
              ) : (
                <Circle className="h-3 w-3" style={{ color: primaryColor }} />
              )}
            </div>
            <p className="text-xs font-semibold text-gray-900 mt-2">{step.label}</p>
            {step.amount && (
              <p className="text-xs font-medium mt-0.5" style={{ color: primaryColor }}>
                {formatCurrency(step.amount)}
              </p>
            )}
            {step.date && (
              <p className="text-[11px] text-gray-500 mt-0.5">
                {format(parseISO(step.date), "MMM d, yyyy")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
