import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X } from "lucide-react";
import { usePendingOverrides, useApproveOverride, useRejectOverride } from "@/hooks/usePendingOverrides";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

export function PendingOverridesCard() {
  const { data: pendingOverrides, isLoading } = usePendingOverrides();
  const approveOverride = useApproveOverride();
  const rejectOverride = useRejectOverride();

  const hasOverrides = pendingOverrides && pendingOverrides.length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pending Approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hasOverrides) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Pending Approvals</CardTitle>
          <Badge variant="secondary">{pendingOverrides.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingOverrides.map((override) => (
            <div key={override.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link to={`/bookings/${override.id}`} className="font-medium text-primary hover:underline">
                    {override.confirmation_number}
                  </Link>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Agent: {override.agent?.full_name || "Unknown"}</span>
                  <span>{format(parseISO(override.created_at), "MMM d, yyyy")}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm text-muted-foreground line-through">{formatCurrency(override.calculated_commission)}</div>
                <div className="font-semibold text-warning">{formatCurrency(override.commission_estimate)}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={() => approveOverride.mutate(override.id)} disabled={approveOverride.isPending} className="gap-1">
                  <Check className="h-3 w-3" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => rejectOverride.mutate(override.id)} disabled={rejectOverride.isPending} className="gap-1 text-destructive">
                  <X className="h-3 w-3" /> Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
