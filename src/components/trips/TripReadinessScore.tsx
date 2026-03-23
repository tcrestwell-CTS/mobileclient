import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TripReadinessScoreProps {
  departDate: string | null;
  returnDate: string | null;
  hasSupplierBooking: boolean;
  totalCommissionRevenue: number;
}

interface ReadinessItem {
  label: string;
  checked: boolean;
  description: string;
}

export function TripReadinessScore({
  departDate,
  returnDate,
  hasSupplierBooking,
  totalCommissionRevenue,
}: TripReadinessScoreProps) {
  const items: ReadinessItem[] = [
    {
      label: "Dates confirmed",
      checked: !!departDate && !!returnDate,
      description: "Both depart and return dates set",
    },
    {
      label: "Supplier checked",
      checked: hasSupplierBooking,
      description: "At least one booking with a supplier",
    },
    {
      label: "Margin confirmed",
      checked: totalCommissionRevenue > 0,
      description: "Commission revenue calculated",
    },
  ];

  const completedCount = items.filter((i) => i.checked).length;
  const percentage = Math.round((completedCount / items.length) * 100);
  const isReady = completedCount === items.length;

  // SVG circle progress
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Trip Readiness
          </CardTitle>
          {isReady && (
            <Badge className="bg-success/10 text-success border-success/20 text-xs">
              Ready for Proposal
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Ring */}
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r={radius}
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="32"
                cy="32"
                r={radius}
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={cn(
                  "transition-all duration-500",
                  isReady ? "text-success" : "text-primary"
                )}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold">{percentage}%</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">
              {completedCount} of {items.length} complete
            </p>
            <p className="text-xs text-muted-foreground">
              {isReady ? "All checks passed" : "Complete all items before proposal"}
            </p>
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-start gap-2.5">
              {item.checked ? (
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              )}
              <div>
                <p className={cn("text-sm font-medium", item.checked ? "text-foreground" : "text-muted-foreground")}>
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
