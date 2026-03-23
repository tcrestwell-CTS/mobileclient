import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Users, MapPin, Loader2 } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Trip } from "@/hooks/useTrips";
import type { CancellationOptions } from "@/components/trips/TripStatusWorkflow";

type KanbanTrip = Trip & { kanbanStatus?: string };

export interface KanbanColumn {
  id: string;
  label: string;
  color: string;
}

interface TripsKanbanProps {
  trips: KanbanTrip[];
  columns: KanbanColumn[];
  onStatusChange: (tripId: string, newStatus: string, cancellationOptions?: CancellationOptions) => Promise<boolean>;
}

// Convert hex color to a Tailwind-compatible border style
function columnBorderStyle(hexColor: string) {
  return { borderTopColor: hexColor };
}

export function TripsKanban({ trips, columns, onStatusChange }: TripsKanbanProps) {
  const navigate = useNavigate();
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [pendingDrag, setPendingDrag] = useState<{ tripId: string; newStatus: "cancelled" | "archived"; tripName: string } | null>(null);
  const [cleanupOptions, setCleanupOptions] = useState<CancellationOptions>({
    unpublish: true,
    deactivateAutomations: true,
    completeTasks: true,
  });

  const tripsByStatus = columns.reduce((acc, col) => {
    acc[col.id] = trips.filter((t) => (t.kanbanStatus || t.status) === col.id);
    return acc;
  }, {} as Record<string, KanbanTrip[]>);

  // Also collect trips with statuses not in any column (orphaned) — place in lead
  const knownIds = new Set(columns.map((c) => c.id));
  const orphanedTrips = trips.filter((t) => !knownIds.has(t.kanbanStatus || t.status));
  if (orphanedTrips.length > 0 && tripsByStatus["lead"]) {
    tripsByStatus["lead"] = [...tripsByStatus["lead"], ...orphanedTrips];
  }

  const handleDragEnd = async (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStatus = destination.droppableId;
    const trip = trips.find((t) => t.id === draggableId);
    if (!trip || trip.status === newStatus) return;

    // Intercept cancelled/archived to show cleanup dialog
    if (newStatus === "cancelled" || newStatus === "archived") {
      setPendingDrag({ tripId: trip.id, newStatus, tripName: trip.trip_name });
      setCleanupOptions({ unpublish: true, deactivateAutomations: true, completeTasks: true });
      setShowCleanupDialog(true);
      return;
    }

    await onStatusChange(draggableId, newStatus);
  };

  const handleCleanupSubmit = async () => {
    if (!pendingDrag) return;
    setShowCleanupDialog(false);
    await onStatusChange(pendingDrag.tripId, pendingDrag.newStatus, cleanupOptions);
    setPendingDrag(null);
  };

  const handleCleanupCancel = () => {
    setShowCleanupDialog(false);
    setPendingDrag(null);
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-220px)]">
          {columns.map((col) => (
            <Droppable droppableId={col.id} key={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={columnBorderStyle(col.color)}
                  className={`flex-shrink-0 w-[320px] flex flex-col rounded-lg border-t-4 ${
                    snapshot.isDraggingOver ? "bg-accent/40" : "bg-muted/30"
                  } transition-colors`}
                >
                  <div className="px-3.5 py-3 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-foreground">{col.label}</h3>
                    <span className="text-sm text-muted-foreground bg-muted rounded-full px-2.5 py-0.5">
                      {tripsByStatus[col.id]?.length || 0}
                    </span>
                  </div>
                  <div className="flex-1 px-2.5 pb-2.5 space-y-2.5 overflow-y-auto">
                    {tripsByStatus[col.id]?.map((trip, index) => (
                      <Draggable
                        key={trip.id}
                        draggableId={trip.id}
                        index={index}
                        isDragDisabled={trip.isOptimistic}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => !trip.isOptimistic && navigate(`/trips/${trip.id}`)}
                            className={`cursor-pointer ${snapshot.isDragging ? "rotate-2 shadow-lg" : ""}`}
                          >
                            <KanbanTripCard trip={trip} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}


        </div>
      </DragDropContext>

      {/* Cleanup Dialog for Cancel / Archive from Kanban */}
      <Dialog open={showCleanupDialog} onOpenChange={(open) => { if (!open) handleCleanupCancel(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Move {pendingDrag?.tripName ? `"${pendingDrag.tripName}"` : "trip"} to{" "}
              {pendingDrag?.newStatus === "cancelled" ? "Cancelled" : "Archived"}
            </DialogTitle>
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
            <Button variant="outline" onClick={handleCleanupCancel}>
              Cancel
            </Button>
            <Button onClick={handleCleanupSubmit}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function KanbanTripCard({ trip }: { trip: Trip }) {
  return (
    <Card className={`overflow-hidden transition-shadow hover:shadow-md ${trip.isOptimistic ? "opacity-60 animate-pulse" : ""}`}>
      {trip.cover_image_url && (
        <div className="h-32 w-full overflow-hidden">
          <img
            src={trip.cover_image_url}
            alt={trip.trip_name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-4.5 space-y-3">
        <h4 className="font-semibold text-[18px] leading-snug line-clamp-2">
          {trip.isOptimistic && <Loader2 className="inline h-4 w-4 animate-spin mr-1" />}
          {trip.trip_name}
        </h4>
        {trip.trip_type && trip.trip_type !== "regular" && (
          <p className="text-[14px] text-muted-foreground italic">{trip.trip_type}</p>
        )}
        {trip.clients?.name && (
          <p className="text-[14px] text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {trip.clients.name}
          </p>
        )}
        {trip.depart_date && (
          <p className="text-[14px] text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(trip.depart_date), "MMM d")}
            {trip.return_date && ` - ${format(new Date(trip.return_date), "MMM d, yyyy")}`}
          </p>
        )}
        {trip.destination && (
          <p className="text-[14px] text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {trip.destination}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
