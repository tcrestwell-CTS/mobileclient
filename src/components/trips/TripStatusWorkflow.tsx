import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, ChevronRight, Loader2, CheckCircle2, XCircle, AlertTriangle, Send, BookOpen, BadgeCheck, Inbox, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface CancellationOptions {
  unpublish: boolean;
  deactivateAutomations: boolean;
  completeTasks: boolean;
}

interface TripStatusWorkflowProps {
  currentStatus: string;
  tripName?: string;
  onStatusChange: (newStatus: string, cancellationOptions?: CancellationOptions) => Promise<boolean>;
  disabled?: boolean;
  readinessComplete?: boolean;
  validationError?: string | null;
}

const WORKFLOW_STATUSES = [
  { key: "lead", label: "Lead", icon: Inbox, description: "New lead or inquiry" },
  { key: "quoted", label: "Quoted", icon: FileText, description: "Quote sent to client" },
  { key: "booked", label: "Booked", icon: BookOpen, description: "Bookings confirmed" },
  { key: "confirmed", label: "Confirmed", icon: BadgeCheck, description: "Trip fully confirmed" },
  { key: "completed", label: "Completed", icon: CheckCircle2, description: "Trip completed" },
] as const;

export function TripStatusWorkflow({ currentStatus, tripName, onStatusChange, disabled, readinessComplete = true, validationError }: TripStatusWorkflowProps) {
  const [updating, setUpdating] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [showReadinessWarning, setShowReadinessWarning] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [cleanupOptions, setCleanupOptions] = useState<CancellationOptions>({
    unpublish: true,
    deactivateAutomations: true,
    completeTasks: true,
  });

  const currentIndex = WORKFLOW_STATUSES.findIndex((s) => s.key === currentStatus);
  const isCancelled = currentStatus === "cancelled";

  const handleStatusChange = async (newStatus: string, options?: CancellationOptions) => {
    if (disabled || updating) return;
    
    setUpdating(true);
    setPendingStatus(newStatus);
    try {
      await onStatusChange(newStatus, options);
    } finally {
      setUpdating(false);
      setPendingStatus(null);
    }
  };

  const openCleanupDialog = () => {
    setCleanupOptions({ unpublish: true, deactivateAutomations: true, completeTasks: true });
    setShowCleanupDialog(true);
  };

  const handleCleanupSubmit = async () => {
    setShowCleanupDialog(false);
    await handleStatusChange("cancelled", cleanupOptions);
  };

  const getNextStatus = () => {
    if (isCancelled) return null;
    const nextIndex = currentIndex + 1;
    return nextIndex < WORKFLOW_STATUSES.length ? WORKFLOW_STATUSES[nextIndex] : null;
  };

  const getPreviousStatus = () => {
    if (isCancelled) return WORKFLOW_STATUSES[0];
    const prevIndex = currentIndex - 1;
    return prevIndex >= 0 ? WORKFLOW_STATUSES[prevIndex] : null;
  };

  const nextStatus = getNextStatus();
  const previousStatus = getPreviousStatus();

  return (
    <Card className="max-w-3xl">
      <CardContent className="pt-6">
        {/* Status Progress Bar */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[400px]">
            {WORKFLOW_STATUSES.map((status, index) => {
              const Icon = status.icon;
              const isCompleted = !isCancelled && index < currentIndex;
              const isCurrent = !isCancelled && status.key === currentStatus;
              const isPending = pendingStatus === status.key;

              return (
                <div key={status.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                        isCompleted
                          ? "bg-primary border-primary text-primary-foreground"
                          : isCurrent
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-muted border-muted-foreground/30 text-muted-foreground"
                      )}
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] mt-1.5 font-medium text-center leading-tight max-w-[60px]",
                        isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {status.label}
                    </span>
                  </div>
                  {index < WORKFLOW_STATUSES.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 mx-1",
                        !isCancelled && index < currentIndex ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p>{validationError}</p>
            </div>
          </div>
        )}

        {/* Cancelled State */}
        {isCancelled && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 justify-center text-destructive">
              <XCircle className="h-5 w-5" />
              <p className="font-medium">This trip has been cancelled</p>
            </div>
            <div className="flex justify-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("lead")}
                disabled={updating}
              >
                {updating && pendingStatus === "lead" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Reactivate Trip
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isCancelled && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {previousStatus && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(previousStatus.key)}
                  disabled={updating || disabled}
                >
                  {updating && pendingStatus === previousStatus.key ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Back to {previousStatus.label}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50 hover:bg-destructive/5"
                onClick={openCleanupDialog}
                disabled={updating || disabled}
              >
                <XCircle className="h-4 w-4" />
                Cancel Trip
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {nextStatus ? (
                <Button
                  onClick={() => {
                    if (currentStatus === "lead" && nextStatus.key === "quoted" && !readinessComplete) {
                      setShowReadinessWarning(true);
                    } else {
                      handleStatusChange(nextStatus.key);
                    }
                  }}
                  disabled={updating || disabled}
                  className="gap-2"
                >
                  {updating && pendingStatus === nextStatus.key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Mark as {nextStatus.label}
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Trip Completed</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Readiness Warning */}
        {showReadinessWarning && (
          <Dialog open={showReadinessWarning} onOpenChange={setShowReadinessWarning}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Incomplete Trip Readiness
                </DialogTitle>
                <DialogDescription>
                  This trip has incomplete readiness items. Sending a quote without all items checked may result in an incomplete proposal. Proceed anyway?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReadinessWarning(false)}>Go Back</Button>
                <Button onClick={() => { setShowReadinessWarning(false); handleStatusChange("quoted"); }}>
                  Proceed Anyway
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Cleanup Dialog for Cancel */}
        <Dialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cancel {tripName ? `"${tripName}"` : "trip"}</DialogTitle>
              <DialogDescription>
                Choose what happens with this trip's automations, tasks, and publishing.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={cleanupOptions.unpublish}
                  onCheckedChange={(checked) =>
                    setCleanupOptions((prev) => ({ ...prev, unpublish: checked === true }))
                  }
                />
                <span className="text-sm font-medium">Unpublish Trip</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={cleanupOptions.deactivateAutomations}
                  onCheckedChange={(checked) =>
                    setCleanupOptions((prev) => ({ ...prev, deactivateAutomations: checked === true }))
                  }
                />
                <span className="text-sm font-medium">Deactivate Automations</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={cleanupOptions.completeTasks}
                  onCheckedChange={(checked) =>
                    setCleanupOptions((prev) => ({ ...prev, completeTasks: checked === true }))
                  }
                />
                <span className="text-sm font-medium">Complete Tasks</span>
              </label>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowCleanupDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCleanupSubmit} disabled={updating}>
                {updating && pendingStatus === "cancelled" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
