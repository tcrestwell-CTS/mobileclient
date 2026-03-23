import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  ShieldCheck,
  Star,
  ExternalLink,
  DollarSign,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Globe,
} from "lucide-react";
import { useTrip } from "@/hooks/useTrips";
import { useTripInsurance, InsuranceQuote } from "@/hooks/useTripInsurance";
import { useTripTravelers } from "@/hooks/useTripTravelers";
import { TripSidebar } from "@/components/trips/TripSidebar";
import { format } from "date-fns";

const DECLINE_NO_INSURANCE_TEXT =
  "I acknowledge that my travel advisor has recommended or offered travel insurance protection to me. I am choosing not to purchase such a policy. I accept all responsibility for declining to secure coverage and understand that if I purchase through a third party, my advisor will not be able to provide support in the event of a claim.";

const DECLINE_BUYING_ELSEWHERE_TEXT =
  "I acknowledge that my travel advisor has recommended or offered travel insurance protection to me. I am choosing to purchase a policy through another entity. I understand that my advisor will not be able to provide support in the event of a claim. I understand that purchasing such a policy is my responsibility.";

export default function TripInsurance() {
  const { tripId } = useParams<{ tripId: string }>();
  const { trip, bookings, loading: tripLoading } = useTrip(tripId);
  const { settings, quotes, responses, isLoading, upsertSettings, addQuote, updateQuote, deleteQuote } =
    useTripInsurance(tripId);
  const travelersQuery = useTripTravelers(tripId);
  const travelers = travelersQuery.data || [];

  // Fetch full client record for insurance readiness validation
  const clientId = trip?.client_id;
  const clientQuery = useQuery({
    queryKey: ["client-insurance-check", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, first_name, last_name, birthday, address_line_1, address_city, address_state, address_zip_code")
        .eq("id", clientId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
  const client = clientQuery.data;

  const missingClientFields = useMemo(() => {
    const missing: string[] = [];
    if (!client) {
      if (clientId) missing.push("Client data not loaded");
      return missing;
    }
    const hasName = !!(client.first_name && client.last_name) || !!client.name;
    if (!hasName) missing.push("Full Name");
    if (!client.birthday) missing.push("Date of Birth");
    const hasAddress = !!(client.address_line_1 && client.address_city && client.address_state && client.address_zip_code);
    if (!hasAddress) missing.push("Address");
    return missing;
  }, [client, clientId]);

  const canToggleReady = missingClientFields.length === 0 && !!clientId;

  const [showAddQuote, setShowAddQuote] = useState(false);
  const [editingQuote, setEditingQuote] = useState<InsuranceQuote | null>(null);

  // Quote form state
  const [formProvider, setFormProvider] = useState("");
  const [formPlan, setFormPlan] = useState("");
  const [formPremium, setFormPremium] = useState("");
  const [formCoverage, setFormCoverage] = useState("");
  const [formDetails, setFormDetails] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formRecommended, setFormRecommended] = useState(false);

  const resetForm = () => {
    setFormProvider("");
    setFormPlan("");
    setFormPremium("");
    setFormCoverage("");
    setFormDetails("");
    setFormUrl("");
    setFormRecommended(false);
  };

  const openEdit = (q: InsuranceQuote) => {
    setEditingQuote(q);
    setFormProvider(q.provider_name);
    setFormPlan(q.plan_name || "");
    setFormPremium(String(q.premium_amount));
    setFormCoverage(String(q.coverage_amount));
    setFormDetails(q.coverage_details || "");
    setFormUrl(q.quote_url || "");
    setFormRecommended(q.is_recommended);
  };

  const handleSaveQuote = async () => {
    const payload = {
      provider_name: formProvider,
      plan_name: formPlan || null,
      premium_amount: parseFloat(formPremium) || 0,
      coverage_amount: parseFloat(formCoverage) || 0,
      coverage_details: formDetails || null,
      quote_url: formUrl || null,
      is_recommended: formRecommended,
    };

    if (editingQuote) {
      await updateQuote.mutateAsync({ id: editingQuote.id, ...payload });
      setEditingQuote(null);
    } else {
      await addQuote.mutateAsync(payload);
      setShowAddQuote(false);
    }
    resetForm();
  };

  const tripCost = bookings.reduce((sum: number, b: any) => sum + (b.gross_sales || 0), 0);
  const amountToInsure = settings?.use_full_trip_cost !== false ? tripCost : (settings?.amount_to_insure || 0);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  if (tripLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!trip) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center text-muted-foreground">Trip not found.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/trips">Trips</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/trips/${tripId}`}>{trip.trip_name}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Insurance</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="lg:hidden">
            <Link to={`/trips/${tripId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Travel Insurance</h1>
            <p className="text-sm text-muted-foreground">
              Provide your clients insurance options for the trip here.
            </p>
          </div>
        </div>

        {/* Main content with left sidebar */}
        <div className="grid gap-6 lg:grid-cols-[200px_1fr] items-start">
          <TripSidebar
            tripId={tripId!}
            parentTripId={(trip as any).parent_trip_id}
            clientId={trip.client_id}
            clientEmail={(trip as any).clients?.email}
            tripStatus={trip.status}
            hasPayments={false}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ─── Main Content (2 cols) ─── */}
            <div className="lg:col-span-2 space-y-6">
            {/* Agency Disclaimer */}
            <Card className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800">
              <CardContent className="flex gap-3 pt-5">
                <AlertTriangle className="h-5 w-5 text-accent-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">
                    You are responsible for knowing travel insurance rules and regulations
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {settings?.agency_disclaimer ||
                      "This is the technology platform used by agents to book trips and is not responsible for knowing travel insurance rules and regulations."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Manage Options */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Manage Options</h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setShowAddQuote(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Manual Quote
                  </Button>
                </div>
              </div>

              {quotes.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No insurance quotes added yet</p>
                    <p className="text-sm mt-1">Add a manual quote to get started.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {quotes.map((q) => (
                    <Card key={q.id} className={q.is_recommended ? "ring-2 ring-primary/40" : ""}>
                      <CardContent className="flex items-start justify-between gap-4 pt-5">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-base">{q.provider_name}</span>
                            {q.plan_name && (
                              <span className="text-sm text-muted-foreground">— {q.plan_name}</span>
                            )}
                            {q.is_recommended && (
                              <Badge variant="secondary" className="gap-1">
                                <Star className="h-3 w-3" /> Recommended
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <span>
                              Premium: <strong>{fmt(q.premium_amount)}</strong>
                            </span>
                            {q.coverage_amount > 0 && (
                              <span>
                                Coverage: <strong>{fmt(q.coverage_amount)}</strong>
                              </span>
                            )}
                          </div>
                          {q.coverage_details && (
                            <p className="text-xs text-muted-foreground mt-1">{q.coverage_details}</p>
                          )}
                          {q.quote_url && (
                            <a
                              href={q.quote_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                            >
                              View Quote <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(q)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteQuote.mutate(q.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Client Decline Options Preview */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Client Decline Options</h3>
              <p className="text-sm text-muted-foreground">
                These are the acknowledgment options clients will see if they choose not to purchase insurance.
              </p>

              <Card>
                <CardContent className="pt-5 space-y-1">
                  <h4 className="font-semibold">No, I'm choosing not to insure my trip</h4>
                  <p className="text-xs text-muted-foreground italic">
                    {DECLINE_NO_INSURANCE_TEXT}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 space-y-1">
                  <h4 className="font-semibold">No, I'm buying insurance elsewhere</h4>
                  <p className="text-xs text-muted-foreground italic">
                    {DECLINE_BUYING_ELSEWHERE_TEXT}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Client Responses */}
            {responses.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Client Responses</h3>
                  {responses.map((r) => (
                    <Card key={r.id}>
                      <CardContent className="flex items-center gap-3 pt-4 pb-4">
                        {r.response_type === "accepted" ? (
                          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive shrink-0" />
                        )}
                        <div className="text-sm">
                          <span className="font-medium capitalize">
                            {r.response_type.replace(/_/g, " ")}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            {format(new Date(r.responded_at), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ─── Right Sidebar ─── */}
          <div className="space-y-6">
            {/* Insurance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  Insurance Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ready-review" className="text-sm">
                      Ready for client review
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Switch
                              id="ready-review"
                              checked={settings?.ready_for_client_review || false}
                              disabled={!canToggleReady && !(settings?.ready_for_client_review)}
                              onCheckedChange={(val) => {
                                if (val && !canToggleReady) return;
                                upsertSettings.mutate({ ready_for_client_review: val });
                              }}
                            />
                          </span>
                        </TooltipTrigger>
                        {!canToggleReady && !(settings?.ready_for_client_review) && (
                          <TooltipContent side="left" className="max-w-[220px]">
                            <p className="text-xs">Missing required client info: {missingClientFields.join(", ")}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {!canToggleReady && !(settings?.ready_for_client_review) && (
                    <div className="flex items-start gap-1.5 text-xs text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>
                        Client is missing: {missingClientFields.join(", ")}. 
                        {clientId && (
                          <Link to={`/contacts/${clientId}`} className="underline ml-1 font-medium">
                            Update client profile →
                          </Link>
                        )}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allow-skip" className="text-sm">
                    Allow clients to skip selection
                  </Label>
                  <Switch
                    id="allow-skip"
                    checked={settings?.allow_skip_selection || false}
                    onCheckedChange={(val) =>
                      upsertSettings.mutate({ allow_skip_selection: val })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Trip Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trip Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Trip Dates
                  </span>
                  <span className="font-medium">
                    {trip.depart_date && trip.return_date
                      ? `${format(new Date(trip.depart_date), "MMM d")} – ${format(new Date(trip.return_date), "MMM d, yyyy")}`
                      : "Not set"}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" /> Trip Cost
                  </span>
                  <span className="font-medium">{fmt(tripCost)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Amount to Insure
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{fmt(amountToInsure)}</span>
                      {settings?.use_full_trip_cost !== false && (
                        <span className="text-xs text-muted-foreground">(full trip cost)</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      const custom = prompt("Enter custom amount to insure:", String(amountToInsure));
                      if (custom !== null) {
                        const val = parseFloat(custom);
                        if (!isNaN(val)) {
                          upsertSettings.mutate({
                            amount_to_insure: val,
                            use_full_trip_cost: false,
                          });
                        }
                      }
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {trip.destination && (
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> Destinations
                    </span>
                    <span className="font-medium">{trip.destination}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Traveler Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Traveler Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {travelers && travelers.length > 0 ? (
                  travelers.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary uppercase">
                        {(t.clients?.name || "?").charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{t.clients?.name || "Unknown"}</p>
                        {t.clients?.email && (
                          <p className="text-xs text-muted-foreground">{t.clients.email}</p>
                        )}
                      </div>
                      {t.is_primary && (
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          Primary
                        </Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-xs">No travelers assigned yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Quote Dialog */}
      <Dialog
        open={showAddQuote || !!editingQuote}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddQuote(false);
            setEditingQuote(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingQuote ? "Edit Quote" : "Add Manual Quote"}</DialogTitle>
            <DialogDescription>
              Enter the insurance quote details from your provider.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Provider Name *</Label>
              <Input
                placeholder="e.g. Allianz, Travel Guard"
                value={formProvider}
                onChange={(e) => setFormProvider(e.target.value)}
              />
            </div>
            <div>
              <Label>Plan Name</Label>
              <Input
                placeholder="e.g. OneTrip Prime"
                value={formPlan}
                onChange={(e) => setFormPlan(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Premium ($) *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formPremium}
                  onChange={(e) => setFormPremium(e.target.value)}
                />
              </div>
              <div>
                <Label>Coverage ($)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formCoverage}
                  onChange={(e) => setFormCoverage(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Coverage Details</Label>
              <Textarea
                placeholder="Brief description of what's covered…"
                value={formDetails}
                onChange={(e) => setFormDetails(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label>Quote URL</Label>
              <Input
                placeholder="https://..."
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formRecommended}
                onCheckedChange={setFormRecommended}
              />
              <Label>Mark as recommended</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddQuote(false);
                setEditingQuote(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!formProvider || !formPremium || addQuote.isPending || updateQuote.isPending}
              onClick={handleSaveQuote}
            >
              {editingQuote ? "Update" : "Add Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
