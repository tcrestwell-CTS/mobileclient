import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, AlertTriangle } from "lucide-react";
import { differenceInDays, isPast } from "date-fns";
import { cn } from "@/lib/utils";

interface AgingCommission {
  id: string;
  amount: number;
  agentShare: number;
  expectedCommissionDate: Date | null;
  status: string;
}

interface CommissionAgingReportProps {
  commissions: AgingCommission[];
}

interface AgingBucket {
  label: string;
  range: string;
  count: number;
  total: number;
  color: string;
  bgColor: string;
}

export function CommissionAgingReport({ commissions }: CommissionAgingReportProps) {
  const now = new Date();

  // Only include pending commissions past their expected date
  const overdueCommissions = commissions.filter(
    (c) => c.status === "pending" && c.expectedCommissionDate && isPast(c.expectedCommissionDate)
  );

  if (overdueCommissions.length === 0) return null;

  const buckets: AgingBucket[] = [
    { label: "0–30 days", range: "0-30", count: 0, total: 0, color: "text-warning", bgColor: "bg-warning" },
    { label: "31–60 days", range: "31-60", count: 0, total: 0, color: "text-orange-600", bgColor: "bg-orange-500" },
    { label: "61–90 days", range: "61-90", count: 0, total: 0, color: "text-destructive", bgColor: "bg-destructive" },
    { label: "90+ days", range: "90+", count: 0, total: 0, color: "text-destructive", bgColor: "bg-destructive" },
  ];

  overdueCommissions.forEach((c) => {
    const daysOverdue = differenceInDays(now, c.expectedCommissionDate!);
    let bucketIndex: number;
    if (daysOverdue <= 30) bucketIndex = 0;
    else if (daysOverdue <= 60) bucketIndex = 1;
    else if (daysOverdue <= 90) bucketIndex = 2;
    else bucketIndex = 3;

    buckets[bucketIndex].count += 1;
    buckets[bucketIndex].total += c.agentShare;
  });

  const maxTotal = Math.max(...buckets.map((b) => b.total), 1);
  const totalOverdue = overdueCommissions.reduce((sum, c) => sum + c.agentShare, 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Commission Aging
          </CardTitle>
          <span className="text-sm font-semibold text-warning">
            {formatCurrency(totalOverdue)} overdue
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {buckets.map((bucket) => (
          <div key={bucket.range} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Clock className={cn("h-3.5 w-3.5", bucket.color)} />
                <span className="font-medium">{bucket.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{bucket.count} items</span>
                <span className={cn("font-semibold text-sm", bucket.count > 0 ? bucket.color : "text-muted-foreground")}>
                  {formatCurrency(bucket.total)}
                </span>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", bucket.bgColor)}
                style={{ width: `${Math.max((bucket.total / maxTotal) * 100, 0)}%`, opacity: bucket.count > 0 ? 1 : 0.2 }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
