import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X, Clock, AlertTriangle, ListTodo } from "lucide-react";
import { useWorkflowTasks } from "@/hooks/useWorkflowTasks";
import { formatDistanceToNow, isPast, parseISO } from "date-fns";

interface WorkflowTasksProps {
  tripId: string;
}

const taskTypeLabels: Record<string, string> = {
  follow_up: "Follow Up",
  prepare_invoice: "Invoice",
  charge_card: "Payment",
  booking_completion: "Bookings",
  supplier_confirmation: "Suppliers",
};

export function WorkflowTasks({ tripId }: WorkflowTasksProps) {
  const { pendingTasks, isLoading, completeTask, dismissTask } = useWorkflowTasks(tripId);

  if (isLoading || pendingTasks.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          Workflow Tasks
          <Badge variant="secondary" className="ml-auto">{pendingTasks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingTasks.map((task) => {
          const isOverdue = task.due_at && isPast(parseISO(task.due_at));
          return (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                isOverdue ? "border-destructive/50 bg-destructive/5" : "border-border bg-muted/30"
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{task.title}</span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {taskTypeLabels[task.task_type] || task.task_type}
                  </Badge>
                </div>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                )}
                {task.due_at && (
                  <div className={`flex items-center gap-1 mt-1.5 text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                    {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {isOverdue ? "Overdue" : "Due"} {formatDistanceToNow(parseISO(task.due_at), { addSuffix: true })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-primary hover:text-primary"
                  onClick={() => completeTask.mutate(task.id)}
                  title="Complete"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={() => dismissTask.mutate(task.id)}
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
