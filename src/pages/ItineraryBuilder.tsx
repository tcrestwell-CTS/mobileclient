import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Rows3, Columns3, PanelLeft, Plus, MoreVertical, Pencil, Trash2, Settings2, CheckCircle2, Plane } from "lucide-react";

import { WidgetyCruiseImportDialog } from "@/components/trips/WidgetyCruiseImportDialog";
import { useItinerary } from "@/hooks/useItinerary";
import { TripItinerary, type ItinerarySidebarCallbacks } from "@/components/trips/TripItinerary";
import { PublishTripButton } from "@/components/trips/PublishTripButton";
import { ItinerarySidebar } from "@/components/trips/ItinerarySidebar";
import { CreateItinerarySheet } from "@/components/trips/CreateItinerarySheet";
import { TripSidebar } from "@/components/trips/TripSidebar";
import { useTrip } from "@/hooks/useTrips";
import { useItineraries } from "@/hooks/useItineraries";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ItineraryBuilder = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { trip, bookings, loading, fetchTrip } = useTrip(tripId);
  const { itineraries, activeId, setActiveId, createItinerary, updateItinerary, renameItinerary, deleteItinerary } = useItineraries(tripId);
  const [layout, setLayout] = useState<"vertical" | "horizontal">("horizontal");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCallbacks, setSidebarCallbacks] = useState<ItinerarySidebarCallbacks | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [editingItinerary, setEditingItinerary] = useState<import("@/hooks/useItineraries").Itinerary | null>(null);
  
  
  const { addItem: addItineraryItem } = useItinerary(tripId);

  const activeItinerary = useMemo(
    () => itineraries.find((i) => i.id === activeId),
    [itineraries, activeId]
  );

  const handleSidebarReady = useCallback((callbacks: ItinerarySidebarCallbacks) => {
    setSidebarCallbacks(callbacks);
  }, []);

  const handleRenameStart = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const handleRenameSubmit = async () => {
    if (renamingId && renameValue.trim()) {
      await renameItinerary(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteItinerary(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  if (!trip) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-destructive font-medium">Trip not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/trips")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Trips
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="lg:hidden">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/trips/${tripId}`)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{trip.trip_name}</h1>
              <p className="text-muted-foreground text-sm">
                Itinerary Builder
                {trip.destination && ` · ${trip.destination}`}
              </p>
            </div>
          </div>

          <TooltipProvider>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/flights?tripId=${trip.id}`)}>
                <Plane className="h-4 w-4 mr-2" />
                Search Flights
              </Button>
              <WidgetyCruiseImportDialog
                tripId={trip.id}
                departDate={trip.depart_date}
                returnDate={trip.return_date}
                destination={trip.destination}
                cruiseBookings={bookings?.filter((b: any) => b.suppliers?.supplier_type?.toLowerCase() === "cruise") || []}
                onImport={async (items) => {
                  let success = true;
                  for (const item of items) {
                    const res = await addItineraryItem({
                      trip_id: trip.id,
                      day_number: item.day_number || 1,
                      title: item.title,
                      description: item.description || undefined,
                      category: item.category || "cruise",
                      location: item.location || undefined,
                      start_time: item.start_time || undefined,
                      end_time: item.end_time || undefined,
                      notes: item.notes || undefined,
                      sort_order: items.indexOf(item),
                      itinerary_id: activeId || undefined,
                    });
                    if (!res) { success = false; break; }
                  }
                  return success;
                }}
              />
              <PublishTripButton
                tripId={tripId!}
                shareToken={trip.share_token}
                publishedAt={trip.published_at}
                updatedAt={trip.updated_at}
                onPublished={fetchTrip}
              />
              <div className="flex items-center rounded-lg border bg-muted p-1 gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={layout === "vertical" ? "secondary" : "ghost"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setLayout("vertical")}
                    >
                      <Rows3 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Vertical layout</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={layout === "horizontal" ? "secondary" : "ghost"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setLayout("horizontal")}
                    >
                      <Columns3 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Horizontal layout</TooltipContent>
                </Tooltip>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                  >
                    <PanelLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{sidebarOpen ? "Hide sidebar" : "Show sidebar"}</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        {/* Main content with left sidebar */}
        <div className="grid gap-6 lg:grid-cols-[200px_1fr] items-start">
          <TripSidebar
            tripId={tripId!}
            parentTripId={trip.parent_trip_id}
            clientId={trip.client_id}
            clientEmail={trip.clients?.email}
            tripStatus={trip.status}
            hasPayments={false}
            onFlightSearch={() => navigate(`/flights?tripId=${trip.id}`)}
          />

          <div className="space-y-4">

        {/* Itinerary Tabs */}
        <div className="flex items-center gap-1 border-b">
          {itineraries.map((itin) => (
            <div key={itin.id} className="flex items-center group">
              {renamingId === itin.id ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); handleRenameSubmit(); }}
                  className="flex items-center px-1 pb-2"
                >
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="h-7 w-40 text-sm"
                    autoFocus
                    onBlur={handleRenameSubmit}
                  />
                </form>
              ) : (
                <button
                  onClick={() => setActiveId(itin.id)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeId === itin.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                  }`}
                >
                  {itin.name}
                  {trip.approved_itinerary_id === itin.id && (
                    <CheckCircle2 className="inline h-3.5 w-3.5 ml-1 text-primary" />
                  )}
                </button>
              )}
              {/* Tab menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  <DropdownMenuItem onClick={() => { setEditingItinerary(itin); setCreateSheetOpen(true); }}>
                    <Settings2 className="h-3.5 w-3.5 mr-2" /> Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRenameStart(itin.id, itin.name)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                  </DropdownMenuItem>
                  {itineraries.length > 1 && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteConfirmId(itin.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          <button
            onClick={() => { setEditingItinerary(null); setCreateSheetOpen(true); }}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Client approval banner */}
        {trip.approved_itinerary_id && (
          <div className="flex items-center gap-2 text-sm rounded-lg border px-4 py-2.5 bg-primary/10 text-primary">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-medium">
              Client approved: {itineraries.find(i => i.id === trip.approved_itinerary_id)?.name || "an itinerary"}
            </span>
            {trip.itinerary_approved_at && (
              <span className="text-xs text-muted-foreground ml-auto">
                {format(new Date(trip.itinerary_approved_at), "MMM d, yyyy 'at' h:mm a")}
              </span>
            )}
          </div>
        )}

        {/* Cover photo banner */}
        {activeItinerary?.cover_image_url && (
          <div className="relative rounded-lg overflow-hidden border">
            <img
              src={activeItinerary.cover_image_url}
              alt={`${activeItinerary.name} cover`}
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-4 left-6">
              <h2 className="text-white text-lg font-semibold drop-shadow-md">{activeItinerary.name}</h2>
            </div>
          </div>
        )}

        {/* Overview statement */}
        {activeItinerary?.overview && (
          <div className="rounded-lg border bg-muted/30 px-5 py-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{activeItinerary.overview}</p>
          </div>
        )}

        {/* Content with sidebar */}
        <div className="flex gap-0 rounded-lg border bg-background overflow-hidden" style={{ minHeight: "calc(100vh - 280px)" }}>
          {/* Main content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeId && (
              <TripItinerary
                tripId={tripId!}
                itineraryId={activeId}
                destination={trip.destination}
                departDate={trip.depart_date}
                returnDate={trip.return_date}
                tripName={trip.trip_name}
                bookings={bookings}
                layout={layout}
                hideToolbar={sidebarOpen}
                onSidebarReady={handleSidebarReady}
              />
            )}
          </div>

          {/* Sidebar — right side */}
          {sidebarOpen && sidebarCallbacks && (
            <ItinerarySidebar
              tripId={tripId!}
              destination={trip.destination}
              departDate={trip.depart_date}
              returnDate={trip.return_date}
              tripName={trip.trip_name}
              bookings={bookings}
              generating={sidebarCallbacks.generating}
              hasItems={sidebarCallbacks.hasItems}
              unimportedBookings={sidebarCallbacks.unimportedBookings}
              onAIGenerate={sidebarCallbacks.onAIGenerate}
              onImportBookings={sidebarCallbacks.onImportBookings}
              onExportPDF={sidebarCallbacks.onExportPDF}
              onClearAll={sidebarCallbacks.onClearAll}
              onAddCategory={sidebarCallbacks.onAddCategory}
              onWidgetyImport={sidebarCallbacks.onWidgetyImport}
            />
          )}
        </div>
          </div>
        </div>
        <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Itinerary?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this itinerary and all its items. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create / Edit Itinerary Sheet */}
        <CreateItinerarySheet
          open={createSheetOpen}
          onOpenChange={(open) => {
            setCreateSheetOpen(open);
            if (!open) setEditingItinerary(null);
          }}
          tripDepartDate={trip.depart_date}
          tripReturnDate={trip.return_date}
          onCreate={createItinerary}
          editingItinerary={editingItinerary}
          onUpdate={updateItinerary}
        />

      </div>
    </DashboardLayout>
  );
};

export default ItineraryBuilder;
