import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  CheckCircle2,
  Bell,
  ExternalLink,
  Clock,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useAgentNotifications } from "@/hooks/useAgentNotifications";
import { useVirtualCardEvents } from "@/hooks/useVirtualCardEvents";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: "Pending", icon: Clock, className: "text-warning bg-warning/10 border-warning/30" },
  processing: { label: "Processing", icon: Loader2, className: "text-primary bg-primary/10 border-primary/30" },
  ready: { label: "Ready", icon: ShieldCheck, className: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950 dark:border-emerald-800" },
  failed: { label: "Failed", icon: AlertCircle, className: "text-destructive bg-destructive/10 border-destructive/30" },
};

function StatusBadge({ status }: { status: string | null }) {
  const config = statusConfig[status || "pending"] || statusConfig.pending;
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", config.className)}>
      <Icon className={cn("h-3 w-3", status === "processing" && "animate-spin")} />
      {config.label}
    </span>
  );
}

/**
 * VirtualCardNotifications
 *
 * Dashboard widget that shows live virtual card events with real-time status.
 * Combines notification data with trip_payment virtual card statuses.
 */
export function VirtualCardNotifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useAgentNotifications();
  const { events, isLoading } = useVirtualCardEvents();
  const navigate = useNavigate();

  // Merge: show card events with live status, plus any unread notifications not yet reflected
  const hasContent = events.length > 0 || notifications.some((n) => n.type === "virtual_card_ready");

  if (!hasContent && !isLoading) return null;

  return (
    <Card className={cn("transition-all", unreadCount > 0 && "ring-2 ring-primary/30")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Virtual Cards
            {unreadCount > 0 && (
              <Badge variant="default" className="text-xs px-1.5 py-0.5 h-5">
                {unreadCount}
              </Badge>
            )}
            {events.some((e) => e.virtual_card_status === "processing") && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground h-7"
              onClick={() => markAllAsRead.mutate()}
            >
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : events.length > 0 ? (
          events.slice(0, 6).map((event) => {
            const notif = notifications.find((n) => n.trip_payment_id === event.id);
            const isUnread = notif ? !notif.is_read : false;

            return (
              <div
                key={event.id}
                className={cn(
                  "p-3 rounded-lg border text-sm cursor-pointer transition-colors",
                  isUnread
                    ? "bg-primary/5 border-primary/20"
                    : "bg-background border-border/50 hover:border-border"
                )}
                onClick={() => {
                  if (notif && !notif.is_read) markAsRead.mutate(notif.id);
                  if (event.trip_id) navigate(`/trips/${event.trip_id}`);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {isUnread ? (
                      <Bell className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn(
                          "font-medium truncate",
                          isUnread ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {event.trip_name || "Payment"}
                        </p>
                        <StatusBadge status={event.virtual_card_status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.payment_method_choice === "affirm" ? "Affirm" : "Stripe"} •{" "}
                        ${Number(event.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                    {formatDistanceToNow(new Date(event.updated_at), { addSuffix: true })}
                  </span>
                </div>
                {event.trip_id && event.virtual_card_status === "ready" && (
                  <div className="mt-2 flex justify-end">
                    <Button variant="ghost" size="sm" className="text-xs h-6 gap-1 text-primary">
                      <ExternalLink className="h-3 w-3" />
                      Retrieve Card
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          // Fallback to notification-only view
          notifications
            .filter((n) => n.type === "virtual_card_ready")
            .slice(0, 5)
            .map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "p-3 rounded-lg border text-sm cursor-pointer transition-colors",
                  notification.is_read
                    ? "bg-background border-border/50"
                    : "bg-primary/5 border-primary/20"
                )}
                onClick={() => {
                  if (!notification.is_read) markAsRead.mutate(notification.id);
                  if (notification.trip_id) navigate(`/trips/${notification.trip_id}`);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {notification.is_read ? (
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    ) : (
                      <Bell className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className={cn("font-medium truncate", notification.is_read ? "text-muted-foreground" : "text-foreground")}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))
        )}
      </CardContent>
    </Card>
  );
}
