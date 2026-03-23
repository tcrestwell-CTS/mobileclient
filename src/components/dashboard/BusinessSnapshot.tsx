import { DollarSign, Users, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BusinessSnapshotProps {
  revenueMTD: number;
  totalClients: number;
  conversionRate: number;
  loading?: boolean;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

const stats = [
  { key: "revenue" as const, label: "Revenue MTD", icon: DollarSign },
  { key: "clients" as const, label: "Clients", icon: Users },
  { key: "conversion" as const, label: "Conversion", icon: TrendingUp },
];

export function BusinessSnapshot({ revenueMTD, totalClients, conversionRate, loading }: BusinessSnapshotProps) {
  const values = {
    revenue: formatCurrency(revenueMTD),
    clients: String(totalClients),
    conversion: `${conversionRate}%`,
  };

  return (
    <div className="flex items-center gap-6 flex-wrap">
      {stats.map(({ key, label, icon: Icon }) => (
        <div key={key} className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
          {loading ? (
            <Skeleton className="h-5 w-10" />
          ) : (
            <span className="text-sm font-semibold text-foreground">{values[key]}</span>
          )}
        </div>
      ))}
    </div>
  );
}
