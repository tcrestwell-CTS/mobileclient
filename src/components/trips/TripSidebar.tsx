import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Link2,
  Loader2,
  Map,
  Plane,
  Send,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { SendInviteLinkDialog } from "@/components/trips/SendInviteLinkDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface TripSidebarProps {
  tripId: string;
  parentTripId?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  tripName?: string | null;
  tripStatus: string;
  hasPayments: boolean;
  tripTotalAmount?: number;
  depositRequired?: boolean;
  depositAmount?: number;
  isSendingPortalLink?: boolean;
  onSendPortalLink?: () => void;
  onFlightSearch?: () => void;
  onDelete?: () => void;
}

export function TripSidebar({
  tripId,
  parentTripId,
  clientId,
  clientName,
  clientEmail,
  tripName,
  tripStatus,
  hasPayments,
  tripTotalAmount,
  depositRequired,
  depositAmount,
  isSendingPortalLink = false,
  onSendPortalLink,
  onFlightSearch,
  onDelete,
}: TripSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const currentSearch = location.search;
  const fullPath = currentPath + currentSearch;

  const isActive = (path: string) => {
    // For paths with query params (e.g., /trips/xxx?tab=bookings)
    if (path.includes("?")) {
      return fullPath === path || fullPath.startsWith(path + "&");
    }
    // For plain paths, match exactly but NOT if there's a tab param
    // (so Overview doesn't highlight when on ?tab=payments)
    return currentPath === path && !currentSearch.includes("tab=");
  };

  const navItem = (path: string, icon: React.ReactNode, label: string) => (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "w-full justify-start",
        isActive(path) && "bg-muted"
      )}
      onClick={() => navigate(path)}
    >
      {icon}
      {label}
    </Button>
  );

  return (
    <nav className="hidden lg:block sticky top-6">
      <div className="rounded-lg border bg-card p-3 space-y-4">
        {/* Back to Trips */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => navigate(parentTripId ? `/trips/${parentTripId}` : "/trips")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Trips
        </Button>

        {/* General Section */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">General</p>
          {navItem(`/trips/${tripId}`, <Map className="h-4 w-4 mr-2" />, "Overview")}
          {navItem(`/trips/${tripId}/itinerary`, <Map className="h-4 w-4 mr-2" />, "Itinerary")}
        </div>

        {/* Finances Section */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">Finances</p>
          {navItem(`/trips/${tripId}?tab=bookings`, <Building2 className="h-4 w-4 mr-2" />, "Bookings")}
          {navItem(`/trips/${tripId}?tab=payments`, <CreditCard className="h-4 w-4 mr-2" />, "Payments")}
          {navItem(`/trips/${tripId}/insurance`, <ShieldCheck className="h-4 w-4 mr-2" />, "Insurance")}
        </div>

        {/* Communication Section */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">Communication</p>
          {clientId && (
            <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
              <Link to={`/contacts/${clientId}`}>
                <Users className="h-4 w-4 mr-2" />
                Client Profile
              </Link>
            </Button>
          )}
          {clientEmail && onSendPortalLink && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={onSendPortalLink}
              disabled={isSendingPortalLink}
            >
              {isSendingPortalLink ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="mr-2 h-4 w-4" />
              )}
              Portal Link
            </Button>
          )}
          <SendInviteLinkDialog
            defaultClientName={clientName || ""}
            defaultClientEmail={clientEmail || ""}
            defaultTripName={tripName || ""}
            tripTotalAmount={tripTotalAmount}
            depositRequired={depositRequired}
            depositAmount={depositAmount}
          />
        </div>

        {/* Advisor Tools Section */}
        {onFlightSearch && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">Advisor Tools</p>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onFlightSearch}>
              <Plane className="h-4 w-4 mr-2" />
              Flights
            </Button>
          </div>
        )}

        {/* Delete Trip */}
        {(tripStatus === "cancelled" || tripStatus === "archived") && onDelete && (
          <div className="pt-2 border-t">
            {hasPayments ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="w-full">
                      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" disabled>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Trip
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Remove all payments before deleting</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Trip
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Trip?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this trip. Bookings will be unlinked but not deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
