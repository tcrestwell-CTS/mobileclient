import { useNavigate } from "react-router-dom";
import { Phone, CreditCard, Plane } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TodayPanelProps {
  followUps: number;
  paymentsDue: number;
  departuresSoon: number;
  loading?: boolean;
}

export function TodayPanel({ followUps, paymentsDue, departuresSoon, loading }: TodayPanelProps) {
  const navigate = useNavigate();

  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Today</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CounterCard label="Follow Ups" count={loading ? null : followUps} icon={Phone} onClick={() => navigate("/trips")} urgent={followUps > 0} />
        <CounterCard label="Payments Due" count={loading ? null : paymentsDue} icon={CreditCard} onClick={() => navigate("/trips")} urgent={paymentsDue > 0} />
        <CounterCard label="Departures Soon" count={loading ? null : departuresSoon} icon={Plane} onClick={() => navigate("/trips")} urgent={departuresSoon >= 3} />
      </div>
    </div>
  );
}

function CounterCard({
  label,
  count,
  icon: Icon,
  onClick,
  urgent,
}: {
  label: string;
  count: number | null;
  icon: React.ElementType;
  onClick?: () => void;
  urgent?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
        urgent ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
      )}
    >
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", urgent ? "bg-destructive/10" : "bg-primary/10")}>
        <Icon className={cn("h-5 w-5", urgent ? "text-destructive" : "text-primary")} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-foreground leading-none">
          {count === null ? <Skeleton className="h-7 w-8 inline-block" /> : count}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}
