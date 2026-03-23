import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBookings, isBookingArchived } from "@/hooks/useBookings";
import { useClients } from "@/hooks/useClients";
import { useTrips } from "@/hooks/useTrips";
import { useCanViewTeam } from "@/hooks/useAdmin";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, isFuture, isWithinInterval, startOfMonth, endOfMonth, differenceInDays, parseISO, isPast } from "date-fns";
import { cn } from "@/lib/utils";

import { OnboardingWizard } from "@/components/dashboard/OnboardingWizard";
import { AgencyMetrics } from "@/components/dashboard/AgencyMetrics";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { TodayPanel } from "@/components/dashboard/TodayPanel";
import PipelineCards from "@/components/dashboard/PipelineCards";
import { UpcomingTrips } from "@/components/dashboard/UpcomingTrips";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { BusinessSnapshot } from "@/components/dashboard/BusinessSnapshot";
import { TopBar } from "@/components/dashboard/TopBar";
import { NextActions } from "@/components/dashboard/NextActions";
import { AdvisorAssistant } from "@/components/dashboard/AdvisorAssistant";
import { useOnboarding } from "@/hooks/useOnboarding";

export function DashboardContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"my" | "agency">("agency");
  const { canView: canViewAgencyMetrics } = useCanViewTeam();
  const { isComplete: onboardingComplete, isLoading: onboardingLoading } = useOnboarding();

  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  const { bookings, loading: bookingsLoading } = useBookings();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { trips, loading: tripsLoading } = useTrips();

  const { data: pendingPayments } = useQuery({
    queryKey: ["dashboard-pending-payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_payments")
        .select("id, due_date, status")
        .eq("status", "pending")
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["dashboard-recent-activity", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, confirmation_number, status, created_at, updated_at, trip_id, supplier_id, trips(trip_name, destination, client_id, clients!trips_client_id_fkey(name))")
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const loading = bookingsLoading || clientsLoading || tripsLoading;

  const computed = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const sevenDays = addDays(now, 7);
    const thirtyDays = addDays(now, 30);
    const thisMonth = { start: startOfMonth(now), end: endOfMonth(now) };

    const activeBookings = (bookings || []).filter((b) => !isBookingArchived(b));

    const followUps = (trips || []).filter((t) => {
      if (t.status !== "quoted" || !t.proposal_sent_at) return false;
      return differenceInDays(now, parseISO(t.proposal_sent_at)) > 3;
    }).length;

    const paymentsDue = (pendingPayments || []).filter((p) => {
      if (!p.due_date) return false;
      const d = parseISO(p.due_date);
      return isPast(d) || isWithinInterval(d, { start: now, end: sevenDays });
    }).length;

    const departuresSoon = (trips || []).filter((t) => {
      if (!t.depart_date || t.status === "cancelled") return false;
      const d = new Date(t.depart_date);
      return isFuture(d) && isWithinInterval(d, { start: now, end: addDays(now, 14) });
    }).length;

    const quotesSent = (trips || []).filter((t) => t.status === "quoted").length;
    const pendingBookingsCount = activeBookings.filter((b) => b.status === "pending").length;
    const confirmedTrips = (trips || []).filter((t) => t.status === "booked" || t.status === "confirmed").length;

    const upcomingTrips = (trips || [])
      .filter((t) => {
        if (!t.depart_date || t.status === "cancelled" || t.status === "completed") return false;
        const d = new Date(t.depart_date);
        return isFuture(d) && isWithinInterval(d, { start: now, end: thirtyDays });
      })
      .sort((a, b) => new Date(a.depart_date!).getTime() - new Date(b.depart_date!).getTime())
      .slice(0, 5);

    const thisMonthBookings = activeBookings.filter((b) => {
      const d = new Date(b.created_at);
      return isWithinInterval(d, thisMonth) && b.status !== "cancelled";
    });
    const revenueMTD = thisMonthBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const totalClients = (clients || []).length;
    const clientsWithBookings = new Set(activeBookings.map((b) => b.client_id)).size;
    const conversionRate = totalClients > 0 ? Math.round((clientsWithBookings / totalClients) * 100) : 0;

    return { followUps, paymentsDue, departuresSoon, quotesSent, pendingBookingsCount, confirmedTrips, upcomingTrips, revenueMTD, totalClients, conversionRate };
  }, [bookings, clients, trips, pendingPayments]);

  const showOnboarding = !onboardingLoading && !onboardingComplete;

  return (
    <div className="space-y-6">
      {/* Row 1: Greeting + inline stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {firstName}
        </h1>
        <BusinessSnapshot
          revenueMTD={computed.revenueMTD}
          totalClients={computed.totalClients}
          conversionRate={computed.conversionRate}
          loading={loading}
        />
      </div>

      {/* Row 2: Actions + Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <QuickActions />
        <TopBar />
      </div>

      {/* Dashboard Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("my")}
            className={cn(
              "pb-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "my" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            My Dashboard
          </button>
          {canViewAgencyMetrics && (
            <button
              onClick={() => setActiveTab("agency")}
              className={cn(
                "pb-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === "agency" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Agency Metrics
            </button>
          )}
        </div>
      </div>

      {activeTab === "agency" ? (
        <AgencyMetrics />
      ) : (
        <>
          {/* Onboarding (only shown until setup complete) */}
          {showOnboarding && <OnboardingWizard />}

          {/* Today panel */}
          <TodayPanel
            followUps={computed.followUps}
            paymentsDue={computed.paymentsDue}
            departuresSoon={computed.departuresSoon}
            loading={loading}
          />

          {/* Sales Pipeline */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Sales Pipeline</h2>
            <PipelineCards
              loading={loading}
              data={{
                quotes: computed.quotesSent,
                pending: computed.pendingBookingsCount,
                confirmed: computed.confirmedTrips,
              }}
            />
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Upcoming Trips (2 cols) */}
            <div className="lg:col-span-2">
              <UpcomingTrips trips={computed.upcomingTrips} loading={loading} />
            </div>

            {/* Right: Next Actions + Activity + Assistant */}
            <div className="space-y-5">
              {!showOnboarding && (
                <NextActions
                  followUps={computed.followUps}
                  paymentsDue={computed.paymentsDue}
                  departuresSoon={computed.departuresSoon}
                  loading={loading}
                />
              )}
              <ActivityFeed items={(recentActivity || []) as any} />
              <AdvisorAssistant
                followUps={computed.followUps}
                paymentsDue={computed.paymentsDue}
                confirmedTrips={computed.confirmedTrips}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
