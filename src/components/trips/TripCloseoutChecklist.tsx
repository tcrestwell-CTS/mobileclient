import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { TripBooking } from "@/hooks/useTrips";

interface TripCloseoutChecklistProps {
  bookings: TripBooking[];
  payments: { status: string; amount: number }[];
  tripTotal: number;
  tripStatus: string;
}

interface CheckItem {
  label: string;
  checked: boolean;
}

export function TripCloseoutChecklist({
  bookings,
  payments,
  tripTotal,
  tripStatus,
}: TripCloseoutChecklistProps) {
  const totalPaid = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  const allBookingsConfirmed =
    bookings.length > 0 && bookings.every((b) => b.status === "confirmed" || b.status === "completed");

  const balanceSettled = tripTotal > 0 && totalPaid >= tripTotal;

  const hasBookings = bookings.length > 0;

  const items: CheckItem[] = [
    { label: "All bookings added", checked: hasBookings },
    { label: "All supplier payments confirmed", checked: allBookingsConfirmed },
    { label: "Client balance fully paid", checked: balanceSettled },
    { label: "Trip marked completed", checked: tripStatus === "completed" || tripStatus === "archived" },
  ];

  const completedCount = items.filter((i) => i.checked).length;
  const allDone = completedCount === items.length;

  // Only show checklist when trip is in booked/traveling/completed state
  if (tripStatus === "planning" || tripStatus === "cancelled") return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          Closeout Checklist
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {completedCount}/{items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {item.checked ? (
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            )}
            <span className={cn(item.checked && "text-muted-foreground line-through")}>
              {item.label}
            </span>
          </div>
        ))}
        {allDone && (
          <p className="text-xs text-primary font-medium pt-2 border-t mt-3">
            ✓ Ready to archive
          </p>
        )}
      </CardContent>
    </Card>
  );
}
