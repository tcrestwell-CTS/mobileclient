import { useAgentNotifications } from "@/hooks/useAgentNotifications";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CreditCard, CheckCircle2, ExternalLink, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } = useAgentNotifications();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = searchParams.get("filter") === "all" ? "all" : "pending";

  const filteredNotifications =
    activeFilter === "pending"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  const getIcon = (type: string) => {
    switch (type) {
      case "itinerary_approved": return CheckCircle2;
      case "payment_reminder": return Clock;
      case "option_selected": return ExternalLink;
      default: return CreditCard;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={activeFilter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchParams({ filter: "pending" })}
            >
              Pending
            </Button>
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchParams({ filter: "all" })}
            >
              All
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => markAllAsRead.mutate()}>
                Mark all as read
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p>{activeFilter === "pending" ? "No pending notifications" : "No notifications yet"}</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map((n) => {
                  const Icon = getIcon(n.type);
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "flex items-start gap-3 px-5 py-4 cursor-pointer transition-colors hover:bg-muted/50",
                        !n.is_read && "bg-primary/5"
                      )}
                      onClick={() => {
                        if (!n.is_read) markAsRead.mutate(n.id);
                        if (n.trip_id) navigate(`/trips/${n.trip_id}`);
                      }}
                    >
                      <div className={cn(
                        "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                        n.is_read ? "bg-muted" : "bg-primary/10"
                      )}>
                        <Icon className={cn("h-4 w-4", n.is_read ? "text-muted-foreground" : "text-primary")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-medium text-sm", n.is_read && "text-muted-foreground")}>{n.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
