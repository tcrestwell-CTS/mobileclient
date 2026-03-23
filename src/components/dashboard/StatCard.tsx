import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconBg?: "primary" | "accent" | "success";
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconBg = "primary",
}: StatCardProps) {
  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight text-card-foreground">
            {value}
          </p>
          {change && (
            <p
              className={cn(
                "text-sm font-medium",
                changeType === "positive" && "text-success",
                changeType === "negative" && "text-destructive",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            iconBg === "primary" && "bg-primary/10",
            iconBg === "accent" && "bg-accent/10",
            iconBg === "success" && "bg-success/10"
          )}
        >
          <Icon
            className={cn(
              "h-6 w-6",
              iconBg === "primary" && "text-primary",
              iconBg === "accent" && "text-accent",
              iconBg === "success" && "text-success"
            )}
          />
        </div>
      </div>
    </div>
  );
}
