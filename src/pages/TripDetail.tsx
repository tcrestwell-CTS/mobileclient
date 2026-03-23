import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  Users,
  MapPin,
  DollarSign,
  ExternalLink,
  Plus,
  Trash2,
  Edit,
  Building2,
  CreditCard,
  Map,
  Link2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Globe,
  Plane,
  Ship,
  ShieldCheck,
} from "lucide-react";
import { TripPayments } from "@/components/trips/TripPayments";
import { TripBookings } from "@/components/trips/TripBookings";
import { TripCoverImage } from "@/components/trips/TripCoverImage";
import { TripStatusWorkflow, CancellationOptions } from "@/components/trips/TripStatusWorkflow";
import { TripCloseoutChecklist } from "@/components/trips/TripCloseoutChecklist";
import { TripReadinessScore } from "@/components/trips/TripReadinessScore";
import { SupplierPaymentStatus } from "@/components/trips/SupplierPaymentStatus";
import { PublishTripButton } from "@/components/trips/PublishTripButton";
import { SubTrips } from "@/components/trips/SubTrips";
import { TripSettingsSidebar } from "@/components/trips/TripSettingsSidebar";
import { TripTravelersCard } from "@/components/trips/TripTravelersCard";
import { WorkflowTasks } from "@/components/trips/WorkflowTasks";

import { WidgetyCruiseImportDialog } from "@/components/trips/WidgetyCruiseImportDialog";
import { EditTripDialog } from "@/components/trips/EditTripDialog";
import { TripSidebar } from "@/components/trips/TripSidebar";
import { useWorkflowAutomation } from "@/hooks/useWorkflowAutomation";
import { useItinerary } from "@/hooks/useItinerary";
import { useTrip, useTrips } from "@/hooks/useTrips";
import { useTripTravelers } from "@/hooks/useTripTravelers";
import { useTripPayments } from "@/hooks/useTripPayments";
import { useProfile } from "@/hooks/useProfile";
import { format } from "date-fns";
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

const statusColors: Record<string, string> = {
  lead: "bg-amber-100 text-amber-700 border-amber-200",
  quoted: "bg-orange-100 text-orange-700 border-orange-200",
  booked: "bg-blue-100 text-blue-700 border-blue-200",
  confirmed: "bg-green-100 text-green-700 border-green-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const TripDetail = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "bookings";
  const { trip, bookings, subTrips, loading, removeBookingFromTrip, updateTripStatus, updatingStatus, fetchTrip } = useTrip(tripId);
  const { deleteTrip } = useTrips();
  const { payments } = useTripPayments(tripId);
  const { profile } = useProfile();
  const { data: tripTravelers = [] } = useTripTravelers(tripId);
  const hasPayments = payments.length > 0;
  const [isSendingPortalLink, setIsSendingPortalLink] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const { processStatusChange } = useWorkflowAutomation();
  const { addItem: addItineraryItem } = useItinerary(tripId);

  // Fetch insurance data for financials display
  const { data: insuranceData } = useQuery({
    queryKey: ["trip-insurance-financials", tripId],
    queryFn: async () => {
      // Get responses
      const { data: responses } = await supabase
        .from("trip_insurance_responses")
        .select("*")
        .eq("trip_id", tripId!)
        .eq("response_type", "accepted");
      
      if (!responses || responses.length === 0) {
        // Check if there are quotes (pending)
        const { data: quotes } = await supabase
          .from("trip_insurance_quotes")
          .select("id, premium_amount, is_recommended")
          .eq("trip_id", tripId!);
        
        const recommendedQuote = quotes?.find((q: any) => q.is_recommended) || quotes?.[0];
        return {
          status: quotes && quotes.length > 0 ? "pending" as const : "none" as const,
          premium: recommendedQuote?.premium_amount || 0,
          quoteCount: quotes?.length || 0,
        };
      }
      
      // Client accepted - get the selected quote
      const acceptedResponse = responses[0];
      if (acceptedResponse.selected_quote_id) {
        const { data: quote } = await supabase
          .from("trip_insurance_quotes")
          .select("premium_amount, provider_name, plan_name")
          .eq("id", acceptedResponse.selected_quote_id)
          .single();
        return {
          status: "accepted" as const,
          premium: quote?.premium_amount || 0,
          providerName: quote?.provider_name,
          planName: quote?.plan_name,
        };
      }
      return { status: "accepted" as const, premium: 0 };
    },
    enabled: !!tripId,
  });

  const handleWorkflowStatusChange = async (newStatus: string, cancellationOptions?: CancellationOptions) => {
    if (!trip) return false;
    setWorkflowError(null);
    const result = await processStatusChange(newStatus, { trip, bookings }, cancellationOptions);
    if (!result.allowed) {
      setWorkflowError(result.error || "Cannot transition to this status");
      return false;
    }
    return updateTripStatus(newStatus);
  };

  // Refresh trip data when page gains focus
  useEffect(() => {
    const handleFocus = () => {
      fetchTrip();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchTrip]);

  const handleSendPortalLink = async () => {
    if (!trip?.clients?.email) {
      toast.error("Client has no email address");
      return;
    }
    setIsSendingPortalLink(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-auth`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action: "send-magic-link", email: trip.clients.email }),
        }
      );
      if (!res.ok) throw new Error("Failed to send");
      toast.success(`Portal access link sent to ${trip.clients.email}`);
    } catch {
      toast.error("Failed to send portal link");
    } finally {
      setIsSendingPortalLink(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handleDelete = async () => {
    if (trip) {
      const success = await deleteTrip(trip.id);
      if (success) {
        navigate("/trips");
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-48 lg:col-span-2" />
            <Skeleton className="h-48" />
          </div>
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
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/trips")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Trips
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isGroupTrip = trip.trip_type === "group";

  const tripSettings = {
    currency: (trip as any).currency || "USD",
    pricing_visibility: (trip as any).pricing_visibility || "show_all",
    tags: (trip as any).tags || [],
    allow_pdf_downloads: (trip as any).allow_pdf_downloads || false,
    itinerary_style: (trip as any).itinerary_style || "vertical_list",
    deposit_required: (trip as any).deposit_required || false,
    deposit_amount: (trip as any).deposit_amount || 0,
    deposit_override: (trip as any).deposit_override || false,
    payment_mode: (trip as any).payment_mode || "deposit_balance",
    upgrade_notes: (trip as any).upgrade_notes || "",
    group_landing_enabled: (trip as any).group_landing_enabled || false,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <h1 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Trip Details</h1>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(trip.parent_trip_id ? `/trips/${trip.parent_trip_id}` : "/trips")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{trip.trip_name}</h2>
                <Badge
                  variant="outline"
                  className={statusColors[trip.status] || statusColors.planning}
                >
                  {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                </Badge>
                {trip.trip_type && (
                  <Badge variant="secondary">
                    {trip.trip_type.charAt(0).toUpperCase() + trip.trip_type.slice(1).replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1">
                {trip.clients?.name ||
                  (() => {
                    const primary = tripTravelers.find((t) => t.is_primary) || tripTravelers[0];
                    return primary
                      ? `${primary.first_name}${primary.last_name ? " " + primary.last_name : ""}`
                      : "No client assigned";
                  })()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <WidgetyCruiseImportDialog
              tripId={trip.id}
              departDate={trip.depart_date}
              returnDate={trip.return_date}
              destination={trip.destination}
              cruiseBookings={bookings.filter((b: any) => b.suppliers?.supplier_type?.toLowerCase() === "cruise")}
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
                  });
                  if (!res) { success = false; break; }
                }
                return success;
              }}
            />
            <PublishTripButton
              tripId={trip.id}
              shareToken={(trip as any).share_token}
              publishedAt={(trip as any).published_at}
              updatedAt={trip.updated_at}
              onPublished={fetchTrip}
            />
          </div>
        </div>

        {/* Mobile Action Bar */}
        <div className="lg:hidden flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
          {trip.client_id && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/contacts/${trip.client_id}`}>
                <Users className="h-4 w-4 mr-2" />
                Client
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`/trips/${tripId}/itinerary`)}>
            <Map className="h-4 w-4 mr-2" />
            Itinerary
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/trips/${tripId}/insurance`)}>
            <ShieldCheck className="h-4 w-4 mr-2" />
            Insurance
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/flights?tripId=${tripId}`)}>
            <Plane className="h-4 w-4 mr-2" />
            Flights
          </Button>
        </div>

        {/* Main content with left sidebar */}
        <div className="grid gap-6 lg:grid-cols-[200px_1fr_280px] items-start">
          <TripSidebar
            tripId={tripId!}
            parentTripId={trip.parent_trip_id}
            clientId={trip.client_id}
            clientName={trip.clients?.name}
            clientEmail={trip.clients?.email}
            tripName={trip.trip_name}
            tripStatus={trip.status}
            hasPayments={hasPayments}
            tripTotalAmount={trip.total_gross_sales || 0}
            depositRequired={(trip as any).deposit_required || false}
            depositAmount={(trip as any).deposit_amount || 0}
            isSendingPortalLink={isSendingPortalLink}
            onSendPortalLink={handleSendPortalLink}
            onFlightSearch={() => navigate(`/flights?tripId=${tripId}`)}
            onDelete={handleDelete}
          />


          {/* Center / main content */}
          <div className="space-y-6">
            {/* Status Workflow */}
            <TripStatusWorkflow
              currentStatus={trip.status}
              tripName={trip.trip_name}
              onStatusChange={handleWorkflowStatusChange}
              disabled={updatingStatus}
              readinessComplete={
                !!(trip as any).budget_range &&
                !!trip.depart_date &&
                !!trip.return_date &&
                bookings.some((b: any) => b.supplier_id) &&
                trip.total_commission_revenue > 0
              }
              validationError={workflowError}
            />

            {/* Workflow Tasks */}
            <WorkflowTasks tripId={trip.id} />

            {/* Cover Image */}
            <TripCoverImage
              tripId={trip.id}
              coverImageUrl={(trip as any).cover_image_url}
              onUpdated={fetchTrip}
            />

            {/* Trip Details & Financials */}

            {/* Trip Details & Financials */}
            <div className={isGroupTrip ? "grid gap-6 md:grid-cols-2" : "grid gap-6 lg:grid-cols-3"}>
              <Card className={isGroupTrip ? "" : "lg:col-span-2"}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-lg">Trip Details</CardTitle>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => setEditDialogOpen(true)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {trip.destination && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <span className="text-muted-foreground">Destination:</span>{" "}
                          {trip.destination}
                        </span>
                      </div>
                    )}
                    {trip.depart_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <span className="text-muted-foreground">Dates:</span>{" "}
                          {format(new Date(trip.depart_date), "MMM d, yyyy")}
                          {trip.return_date && (
                            <> - {format(new Date(trip.return_date), "MMM d, yyyy")}</>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  {trip.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{trip.notes}</p>
                    </div>
                  )}
                  {/* Budget Confirmation Status */}
                  {(trip as any).budget_range && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Budget</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{(trip as any).budget_range}</span>
                        {(trip as any).budget_confirmed ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Client Confirmed
                          </Badge>
                        ) : (trip as any).budget_change_requested ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                            <MessageSquare className="h-3 w-3" />
                            Change Requested
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Pending Approval
                          </Badge>
                        )}
                      </div>
                      {(trip as any).budget_change_requested && (trip as any).budget_change_request_message && (
                        <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-3">
                          <p className="text-xs text-amber-800 italic">
                            "{(trip as any).budget_change_request_message}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Trip Financials
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Gross Sales</span>
                    <span className="font-semibold">
                      {formatCurrency(trip.total_gross_sales)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Supplier Payout</span>
                    <span className="font-medium">
                      {formatCurrency(trip.total_supplier_payout)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Net Sales</span>
                    <span className="font-medium">
                      {formatCurrency(trip.total_net_sales)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Total Commission</span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(trip.total_commission_revenue)}
                    </span>
                  </div>

                  {/* Insurance Premium */}
                  {insuranceData && insuranceData.status !== "none" && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Insurance
                          {insuranceData.status === "accepted" && insuranceData.providerName && (
                            <span className="text-xs ml-1">({insuranceData.providerName})</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatCurrency(insuranceData.premium)}
                        </span>
                        {insuranceData.status === "accepted" ? (
                          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                            Approved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Total with Insurance */}
                  {insuranceData?.status === "accepted" && insuranceData.premium > 0 && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm font-medium">Total incl. Insurance</span>
                      <span className="font-bold">
                        {formatCurrency(trip.total_gross_sales + insuranceData.premium)}
                      </span>
                    </div>
                  )}

                  {trip.total_commission_revenue > 0 && profile && (() => {
                    const tierKey = profile.commission_tier || "tier_1";
                    const tierConfig = {
                      none: { label: "None", agentSplit: 0, agencySplit: 100 },
                      tier_1: { label: "Tier 1", agentSplit: 70, agencySplit: 30 },
                      tier_2: { label: "Tier 2", agentSplit: 80, agencySplit: 20 },
                      tier_3: { label: "Tier 3", agentSplit: 95, agencySplit: 5 },
                    }[tierKey] || { label: "Tier 1", agentSplit: 70, agencySplit: 30 };

                    const agentCommissionBase = trip.total_commission_revenue;
                    const advisorPayout = agentCommissionBase * (tierConfig.agentSplit / 100);
                    const agencyRetained = agentCommissionBase * (tierConfig.agencySplit / 100);

                    return (
                      <div className="pt-2 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Commission Split ({tierConfig.label}: {tierConfig.agentSplit}/{tierConfig.agencySplit})
                        </p>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm text-muted-foreground">Advisor Payout</span>
                          <span className="font-semibold text-success">
                            {formatCurrency(advisorPayout)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm text-muted-foreground">Agency Retains</span>
                          <span className="font-medium">
                            {formatCurrency(agencyRetained)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {trip.total_gross_sales > 0 && (
                    <div className="flex justify-between items-center py-2 border-t">
                      <span className="text-sm text-muted-foreground">Margin %</span>
                      <span className="font-semibold text-primary">
                        {((trip.total_commission_revenue / trip.total_gross_sales) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sub-Trips — GROUP TRIPS: primary section, prominent placement */}
            {isGroupTrip && (
              <SubTrips
                parentTripId={trip.id}
                subTrips={subTrips}
                onDataChange={fetchTrip}
              />
            )}




            {/* Tabs for Bookings and Payments */}
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList>
                <TabsTrigger value="bookings" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Bookings
                </TabsTrigger>
                <TabsTrigger value="payments" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payments
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bookings" className="mt-6 space-y-6">
                <TripBookings
                  tripId={tripId!}
                  clientId={trip.client_id}
                  bookings={bookings}
                  tripTotal={trip.total_gross_sales}
                  totalCommission={trip.total_commission_revenue}
                  destination={trip.destination || undefined}
                  departDate={trip.depart_date || undefined}
                  returnDate={trip.return_date || undefined}
                  onDataChange={fetchTrip}
                />
                <SupplierPaymentStatus
                  bookings={bookings as any}
                  payments={payments}
                />
              </TabsContent>

              <TabsContent value="payments" className="mt-6">
                <TripPayments
                  tripId={tripId!}
                  clientId={trip.client_id}
                  bookings={bookings}
                  tripTotal={trip.total_gross_sales}
                  tripName={trip.trip_name}
                  clientName={trip.clients?.name}
                  clientEmail={trip.clients?.email || undefined}
                  clientPhone={trip.clients?.phone || undefined}
                  destination={trip.destination || undefined}
                  departDate={trip.depart_date || undefined}
                  returnDate={trip.return_date || undefined}
                  tripStatus={trip.status}
                  onDataChange={fetchTrip}
                  onStatusChange={handleWorkflowStatusChange}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4 lg:block">
            <div className="sticky top-6 space-y-4">
              <TripReadinessScore
                departDate={trip.depart_date}
                returnDate={trip.return_date}
                hasSupplierBooking={bookings.some((b: any) => b.supplier_id)}
                totalCommissionRevenue={trip.total_commission_revenue}
              />
              <TripTravelersCard
                client={trip.clients}
                clientId={trip.client_id}
                tripId={trip.id}
              />
              <TripSettingsSidebar
                tripId={trip.id}
                settings={tripSettings}
                agencyName={profile?.agency_name || undefined}
                tripTotal={trip.total_gross_sales}
                departDate={trip.depart_date || undefined}
                tripType={trip.trip_type || undefined}
                shareToken={(trip as any).share_token || undefined}
                onSettingsChange={fetchTrip}
                onNavigateToLandingPage={() => navigate(`/trips/${tripId}/landing-page`)}
              />
              <TripCloseoutChecklist
                bookings={bookings}
                payments={payments}
                tripTotal={trip.total_gross_sales}
                tripStatus={trip.status}
              />
            </div>
          </div>
        </div>
      </div>

      <EditTripDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        trip={trip}
        onUpdated={fetchTrip}
      />
    </DashboardLayout>
  );
};

export default TripDetail;
