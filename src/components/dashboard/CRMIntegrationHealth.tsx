import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  ArrowUpDown,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useQBOConnection } from "@/hooks/useQBOConnection";
import { useQBOSyncLogs, QBOSyncLog } from "@/hooks/useQBOSyncLogs";
import { formatDistanceToNow, isPast, parseISO, differenceInHours } from "date-fns";
import { useNavigate } from "react-router-dom";

function tokenHealthStatus(expiresAt: string | undefined) {
  if (!expiresAt) return { label: "Unknown", color: "muted", icon: AlertTriangle };
  const exp = parseISO(expiresAt);
  if (isPast(exp)) return { label: "Expired", color: "destructive", icon: XCircle };
  const hoursLeft = differenceInHours(exp, new Date());
  if (hoursLeft < 24) return { label: "Expiring Soon", color: "warning", icon: AlertTriangle };
  return { label: "Healthy", color: "success", icon: CheckCircle2 };
}

function SyncLogRow({ log }: { log: QBOSyncLog }) {
  const isError = log.status === "error" || log.status === "failed";
  return (
    <div className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2 min-w-0">
        {isError ? (
          <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
        )}
        <span className="text-sm text-card-foreground truncate capitalize">
          {log.sync_type.replace(/-/g, " ")}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground">
          {log.records_processed} rec
        </span>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(parseISO(log.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

export function CRMIntegrationHealth() {
  const { status, loading: connLoading, refreshStatus } = useQBOConnection();
  const { data: logs, isLoading: logsLoading } = useQBOSyncLogs(5);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const loading = connLoading || logsLoading;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshStatus();
    setRefreshing(false);
  };

  const token = status.connection
    ? tokenHealthStatus(status.connection.token_expires_at)
    : null;

  const recentErrors = logs?.filter(
    (l) => l.status === "error" || l.status === "failed"
  ).length ?? 0;

  const overallHealth = !status.connected
    ? { label: "Disconnected", variant: "destructive" as const }
    : token?.color === "destructive"
    ? { label: "Token Expired", variant: "destructive" as const }
    : token?.color === "warning"
    ? { label: "Needs Attention", variant: "outline" as const }
    : recentErrors > 0
    ? { label: "Sync Errors", variant: "outline" as const }
    : { label: "All Systems Go", variant: "secondary" as const };

  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-card-foreground">
            CRM Integration
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={overallHealth.variant}
            className={
              overallHealth.variant === "secondary"
                ? "bg-success/10 text-success border-0"
                : overallHealth.variant === "destructive"
                ? ""
                : "border-warning text-warning"
            }
          >
            {overallHealth.label}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !status.connected && status.needs_reconnect ? (
        <div className="p-4 space-y-3">
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-2">
            <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-destructive">Connection Expired</p>
              <p className="text-xs text-destructive/80">
                Token refresh failed. Please reconnect QuickBooks.
              </p>
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={() => navigate("/settings?tab=integrations")}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Reconnect in Settings
          </Button>
        </div>
      ) : !status.connected ? (
        <div className="p-4 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            QuickBooks is not connected.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/settings?tab=integrations")}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Connect in Settings
          </Button>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Connection Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Company</span>
            <span className="font-medium text-card-foreground truncate ml-2">
              {status.connection?.company_name || "—"}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Token</span>
            {token && (
              <span
                className={`flex items-center gap-1 font-medium ${
                  token.color === "success"
                    ? "text-success"
                    : token.color === "destructive"
                    ? "text-destructive"
                    : "text-warning"
                }`}
              >
                <token.icon className="h-3.5 w-3.5" />
                {token.label}
              </span>
            )}
          </div>

          {/* Recent Sync Activity */}
          {logs && logs.length > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Recent Syncs
              </p>
              <div className="divide-y divide-border/50">
                {logs.slice(0, 4).map((log) => (
                  <SyncLogRow key={log.id} log={log} />
                ))}
              </div>
            </div>
          )}

          {/* Footer link */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/qbo-health")}
          >
            View Full Health Dashboard →
          </Button>
        </div>
      )}
    </div>
  );
}
