import { useNavigate } from "react-router-dom";
import { Send, Calendar, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface PipelineData {
  quotes: number;
  pending: number;
  confirmed: number;
}

interface PipelineCardsProps {
  data: PipelineData;
  loading?: boolean;
}

const items = [
  { key: "quotes" as const, title: "Quotes Sent", icon: Send, route: "/trips" },
  { key: "pending" as const, title: "Pending Bookings", icon: Calendar, route: "/bookings" },
  { key: "confirmed" as const, title: "Confirmed Trips", icon: CheckCircle2, route: "/trips" },
];

export default function PipelineCards({ data, loading }: PipelineCardsProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map(({ key, title, icon: Icon, route }) => (
        <Card
          key={key}
          onClick={() => navigate(route)}
          className="cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{title}</p>
              {loading ? (
                <Skeleton className="h-6 w-8 mt-1" />
              ) : (
                <p className="text-xl font-semibold text-foreground">{data[key]}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
