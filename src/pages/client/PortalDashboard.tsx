import { useState, useEffect } from "react";
import { usePortalDashboard } from "@/hooks/usePortalData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgencyCertifications } from "@/components/shared/AgencyCertifications";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Map, CreditCard, MessageSquare, User, Loader2, WifiOff } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { DepartureCountdown } from "@/components/client/DepartureCountdown";
import { PWAInstallPrompt } from "@/components/client/PWAInstallPrompt";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function PortalDashboard() {
  const { data, isLoading, refetch } = usePortalDashboard();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [payingId, setPayingId] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  // Handle Stripe payment return — show toast once, then clean URL so it
  // doesn't re-fire if the user refreshes the page.
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    if (!paymentStatus) return;

    if (paymentStatus === "success") {
      toast.success("Payment completed successfully!");
      const sessionId = searchParams.get("session_id");
      if (sessionId) {
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-stripe-payment`, {
          method: "POST",
          headers: {
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        }).then(() => refetch());
      } else {
        refetch();
      }
    } else if (paymentStatus === "cancelled") {
      toast.info("Payment was cancelled");
    }

    // Clear ?payment=&session_id= from the URL so toast doesn't re-fire on refresh
    navigate("/client", { replace: true });
  }, []); // intentionally empty — run once on mount only

  const handlePayNow = async (paymentId: string) => {
    setPayingId(paymentId);
    try {
      const portalSession = localStorage.getItem("portal_session");
      const portalToken = portalSession ? JSON.parse(portalSession).token : null;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-stripe-payment`, {
        method: "POST",
        headers: {
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "x-portal-token": portalToken || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId,
          returnUrl: window.location.origin + "/client",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create payment");

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to start payment. Please try again.");
    } finally {
      setPayingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const client = data?.client;
  const trips = data?.trips || [];
  const payments = data?.upcoming_payments || [];
  const agent = data?.agent;
  const unreadMessages = data?.unread_messages || 0;

  return (
    <div className="space-y-6 pb-safe-bottom">

      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <WifiOff className="h-4 w-4 shrink-0" />
          You're offline. Some information may be out of date.
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {client?.first_name || client?.name || "Traveler"}
        </h1>
        <p className="text-muted-foreground">Here's an overview of your travel plans</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Map className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{trips.length}</p>
              <p className="text-sm text-muted-foreground">Active Trips</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{payments.length}</p>
              <p className="text-sm text-muted-foreground">Pending Payments</p>
            </div>
          </CardContent>
        </Card>

        <Link to="/client/messages">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadMessages}</p>
                <p className="text-sm text-muted-foreground">Unread Messages</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Upcoming Trips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Trips</CardTitle>
        </CardHeader>
        <CardContent>
          {trips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active trips yet.</p>
          ) : (
            <div className="space-y-3">
              {trips.slice(0, 5).map((trip: any) => (
                <Link
                  key={trip.id}
                  to={`/client/trips/${trip.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  {trip.cover_image_url ? (
                    <img
                      src={trip.cover_image_url}
                      alt={trip.trip_name}
                      className="h-16 w-24 rounded-md object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-24 rounded-md bg-gradient-to-br from-primary/10 to-muted shrink-0 flex items-center justify-center">
                      <Map className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{trip.trip_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {trip.destination}
                      {trip.depart_date && ` · ${format(new Date(trip.depart_date), "MMM d, yyyy")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <DepartureCountdown departDate={trip.depart_date} returnDate={trip.return_date} compact />
                    <Badge variant={trip.status === "confirmed" ? "default" : "secondary"}>
                      {trip.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Card */}
      {agent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Your Travel Agent
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            {agent.avatar_url ? (
              <img src={agent.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <p className="font-semibold">{agent.full_name}</p>
              {agent.job_title && <p className="text-sm text-muted-foreground">{agent.job_title}</p>}
              {agent.phone && <p className="text-sm text-muted-foreground">{agent.phone}</p>}
              <AgencyCertifications
                cliaNumber={agent.clia_number}
                ccraNumber={agent.ccra_number}
                astaNumber={agent.asta_number}
                embarcNumber={agent.embarc_number}
                compact
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Payments */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">
                      {p.payment_type === "final_balance" ? "Final Balance" :
                       p.payment_type.charAt(0).toUpperCase() + p.payment_type.slice(1)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {p.due_date ? `Due ${format(new Date(p.due_date), "MMM d, yyyy")}` : "Pending"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold">${p.amount.toLocaleString()}</p>
                    <Button
                      size="sm"
                      onClick={() => handlePayNow(p.id)}
                      disabled={payingId === p.id}
                    >
                      {payingId === p.id ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-1" />
                      )}
                      Pay Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
