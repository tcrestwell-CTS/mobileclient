import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Send, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  status: string;
  trips?: { clients?: { name: string } | null } | null;
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

function getActivityLabel(item: ActivityItem) {
  const clientName = item.trips?.clients?.name || "Client";
  switch (item.status) {
    case "confirmed":
      return { icon: CheckCircle2, text: `Booking Confirmed → ${clientName}`, color: "text-success" };
    case "pending":
      return { icon: Send, text: `Quote Sent → ${clientName}`, color: "text-accent" };
    default:
      return { icon: FileText, text: `${item.status} → ${clientName}`, color: "text-muted-foreground" };
  }
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!items || items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const activity = getActivityLabel(item);
              const Icon = activity.icon;
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <Icon className={cn("h-4 w-4 shrink-0", activity.color)} />
                  <p className="text-sm text-foreground truncate">{activity.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
