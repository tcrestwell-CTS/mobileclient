import { CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";

interface Payment {
  id: string;
  payment_type: string;
  amount: number;
  status: string;
  due_date: string | null;
  payment_date: string;
}

interface PaymentMilestoneTrackerProps {
  payments: Payment[];
  totalCost: number;
}

export function PaymentMilestoneTracker({ payments, totalCost }: PaymentMilestoneTrackerProps) {
  if (payments.length === 0) return null;

  const sorted = [...payments].sort((a, b) => {
    const dateA = a.due_date || a.payment_date;
    const dateB = b.due_date || b.payment_date;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  const totalPaid = sorted
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const progress = totalCost > 0 ? Math.min((totalPaid / totalCost) * 100, 100) : 0;
  const remaining = totalCost - totalPaid;

  // Find next pending payment
  const nextPending = sorted.find(p => p.status === "pending");
  const nextDueDate = nextPending?.due_date;
  const isOverdue = nextDueDate ? isPast(new Date(nextDueDate)) : false;
  const daysTilDue = nextDueDate ? differenceInDays(new Date(nextDueDate), new Date()) : null;
  const isDueSoon = daysTilDue !== null && daysTilDue >= 0 && daysTilDue <= 14;

  // Urgency state
  const urgencyColor = isOverdue
    ? "bg-destructive"
    : isDueSoon
    ? "bg-amber-500"
    : "bg-primary";

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const typeLabel = (type: string) =>
    type === "final_balance" ? "Final Balance" : type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div className="space-y-4">
      {/* Remaining balance callout */}
      {remaining > 0 && (
        <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
          isOverdue
            ? "bg-destructive/10 border border-destructive/20"
            : isDueSoon
            ? "bg-amber-50 border border-amber-200"
            : "bg-muted/50 border border-border"
        }`}>
          {isOverdue ? (
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          ) : isDueSoon ? (
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
          ) : null}
          <p className={`text-sm font-medium ${
            isOverdue ? "text-destructive" : isDueSoon ? "text-amber-800" : "text-foreground"
          }`}>
            {formatCurrency(remaining)} remaining
            {nextDueDate && (
              <span className="font-normal text-muted-foreground">
                {isOverdue
                  ? ` — payment was due ${format(new Date(nextDueDate), "MMM d")}`
                  : ` — next payment due ${format(new Date(nextDueDate), "MMM d, yyyy")}`}
              </span>
            )}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">Payment Progress</span>
        <span className="text-muted-foreground">
          {formatCurrency(totalPaid)} of {formatCurrency(totalCost)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${urgencyColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Milestones */}
      <div className="space-y-3">
        {sorted.map((payment) => {
          const isPaid = payment.status === "paid";
          const isPending = payment.status === "pending";
          const date = payment.due_date || payment.payment_date;
          const paymentOverdue = isPending && payment.due_date && isPast(new Date(payment.due_date));

          return (
            <div key={payment.id} className="flex items-center gap-3">
              {isPaid ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              ) : paymentOverdue ? (
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              ) : isPending ? (
                <Clock className="h-5 w-5 text-amber-500 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  isPaid ? "text-green-700" : paymentOverdue ? "text-destructive" : "text-foreground"
                }`}>
                  {typeLabel(payment.payment_type)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPaid ? "Paid" : paymentOverdue ? "Overdue" : "Due"}{" "}
                  {date && format(new Date(date), "MMM d, yyyy")}
                </p>
              </div>
              <span className={`text-sm font-semibold ${
                isPaid ? "text-green-700" : paymentOverdue ? "text-destructive" : "text-foreground"
              }`}>
                {formatCurrency(payment.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
