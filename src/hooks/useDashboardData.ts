import { useMemo } from "react";
import { useBookings, isBookingArchived } from "@/hooks/useBookings";
import { useClients } from "@/hooks/useClients";
import { useCommissions } from "@/hooks/useCommissions";
import { useIsAdmin, useIsOfficeAdmin } from "@/hooks/useAdmin";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  addDays,
  isWithinInterval,
  isFuture,
  subDays,
  startOfMonth,
  endOfMonth,
  isPast,
  parseISO,
  differenceInDays,
} from "date-fns";

export interface DashboardSection {
  id: string;
  priority: number; // Lower = higher priority
  hasData: boolean;
  urgentCount: number; // Number of urgent items (affects sizing)
  dataCount: number; // Total items
}

export function useDashboardData() {
  const { user } = useAuth();
  const { bookings, loading: bookingsLoading } = useBookings();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: commissions, isLoading: commissionsLoading } = useCommissions();
  const { data: isAdmin } = useIsAdmin();
  const { data: isOfficeAdmin } = useIsOfficeAdmin();

  // FIX: Added explicit staleTime and select to this query.
  // Previously it re-fetched on every mount (staleTime: 0) and pulled all columns.
  // Now it fetches only the 3 fields we actually use, and caches for 5 minutes.
  const { data: pendingPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["dashboard-pending-payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_payments")
        .select("id, due_date, status")   // Only fetch columns we use
        .eq("status", "pending")
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })
        .limit(50);                        // Cap results — no need for 1000s of payments

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,             // Fresh for 5 minutes
    gcTime: 1000 * 60 * 10,               // Cache for 10 minutes
    refetchOnWindowFocus: false,           // Don't re-fetch on tab switch
  });

  const loading = bookingsLoading || clientsLoading || commissionsLoading || paymentsLoading;
  const isAgencyView = isAdmin || isOfficeAdmin;

  const sections = useMemo(() => {
    if (!bookings || !clients || !commissions) {
      return {
        upcomingDepartures: { id: "upcomingDepartures", priority: 1, hasData: false, urgentCount: 0, dataCount: 0 },
        upcomingCommissions: { id: "upcomingCommissions", priority: 2, hasData: false, urgentCount: 0, dataCount: 0 },
        upcomingPayments: { id: "upcomingPayments", priority: 2, hasData: false, urgentCount: 0, dataCount: 0 },
        recentBookings: { id: "recentBookings", priority: 3, hasData: false, urgentCount: 0, dataCount: 0 },
        kpis: { id: "kpis", priority: 4, hasData: false, urgentCount: 0, dataCount: 0 },
        leaderboard: { id: "leaderboard", priority: 5, hasData: false, urgentCount: 0, dataCount: 0 },
        commissionSummary: { id: "commissionSummary", priority: 6, hasData: false, urgentCount: 0, dataCount: 0 },
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = addDays(today, 30);
    const thisMonth = { start: startOfMonth(today), end: endOfMonth(today) };

    // Filter out archived trips from reporting
    const activeBookings = bookings.filter(b => !isBookingArchived(b));

    // Calculate upcoming departures (exclude archived)
    const upcomingDeps = activeBookings.filter((booking) => {
      const departDate = new Date(booking.depart_date);
      return (
        booking.status !== "cancelled" &&
        isFuture(departDate) &&
        isWithinInterval(departDate, { start: today, end: thirtyDaysFromNow })
      );
    });
    const urgentDepartures = upcomingDeps.filter((b) => {
      const days = Math.ceil((new Date(b.depart_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return days <= 7;
    });

    // Calculate upcoming commissions (exclude archived)
    const upcomingComms = activeBookings.filter((booking) => {
      if (booking.status === "cancelled" || booking.status === "completed") return false;
      const expectedDate = subDays(new Date(booking.depart_date), 30);
      return isWithinInterval(expectedDate, { start: today, end: thirtyDaysFromNow });
    });
    const urgentCommissions = upcomingComms.filter((b) => {
      const expectedDate = subDays(new Date(b.depart_date), 30);
      const days = Math.ceil((expectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return days <= 7;
    });

    // Calculate upcoming payments
    const upcomingPmts = (pendingPayments || []).filter((p) => {
      if (!p.due_date) return false;
      const dueDate = parseISO(p.due_date);
      return isPast(dueDate) || isWithinInterval(dueDate, { start: today, end: thirtyDaysFromNow });
    });
    const urgentPayments = upcomingPmts.filter((p) => {
      const dueDate = parseISO(p.due_date!);
      const daysUntil = differenceInDays(dueDate, today);
      return daysUntil <= 7 || isPast(dueDate);
    });
    const overduePayments = upcomingPmts.filter((p) => {
      const dueDate = parseISO(p.due_date!);
      return isPast(dueDate);
    });

    // Recent/active bookings (exclude archived)
    const recentActiveBookings = activeBookings.filter(b =>
      b.status === "confirmed" || b.status === "pending" || b.status === "traveling"
    );

    // This month activity for KPIs (exclude archived)
    const thisMonthBookings = activeBookings.filter((b) => {
      const departDate = new Date(b.depart_date);
      return isWithinInterval(departDate, thisMonth) && b.status !== "cancelled";
    });

    // Commission data
    const pendingCommissionsData = commissions.filter(c => c.status === "pending");
    const hasCommissionData = commissions.length > 0;

    // Determine priorities based on urgency
    let departurePriority = 3;
    let commissionPriority = 4;
    let paymentPriority = 4;

    if (urgentDepartures.length > 0) departurePriority = 1;
    else if (upcomingDeps.length > 0) departurePriority = 2;

    if (urgentCommissions.length > 0) commissionPriority = 1;
    else if (upcomingComms.length > 0) commissionPriority = 2;

    if (overduePayments.length > 0) paymentPriority = 0;
    else if (urgentPayments.length > 0) paymentPriority = 1;
    else if (upcomingPmts.length > 0) paymentPriority = 2;

    return {
      upcomingDepartures: {
        id: "upcomingDepartures",
        priority: departurePriority,
        hasData: upcomingDeps.length > 0,
        urgentCount: urgentDepartures.length,
        dataCount: upcomingDeps.length,
      },
      upcomingCommissions: {
        id: "upcomingCommissions",
        priority: commissionPriority,
        hasData: upcomingComms.length > 0,
        urgentCount: urgentCommissions.length,
        dataCount: upcomingComms.length,
      },
      upcomingPayments: {
        id: "upcomingPayments",
        priority: paymentPriority,
        hasData: upcomingPmts.length > 0,
        urgentCount: urgentPayments.length,
        overdueCount: overduePayments.length,
        dataCount: upcomingPmts.length,
      },
      recentBookings: {
        id: "recentBookings",
        priority: 3,
        hasData: recentActiveBookings.length > 0,
        urgentCount: 0,
        dataCount: recentActiveBookings.length,
      },
      kpis: {
        id: "kpis",
        priority: 5,
        hasData: thisMonthBookings.length > 0 || clients.length > 0,
        urgentCount: 0,
        dataCount: thisMonthBookings.length,
      },
      leaderboard: {
        id: "leaderboard",
        priority: isAgencyView ? 4 : 10,
        hasData: isAgencyView,
        urgentCount: 0,
        dataCount: 0,
      },
      commissionSummary: {
        id: "commissionSummary",
        priority: pendingCommissionsData.length > 0 ? 3 : 6,
        hasData: hasCommissionData,
        urgentCount: pendingCommissionsData.length,
        dataCount: commissions.length,
      },
    };
  }, [bookings, clients, commissions, pendingPayments, isAgencyView]);

  // Sort sections by priority
  const sortedSections = useMemo(() => {
    return Object.values(sections).sort((a, b) => a.priority - b.priority);
  }, [sections]);

  // Calculate stats for the header (exclude archived trips from revenue)
  const stats = useMemo(() => {
    if (!bookings || !clients) {
      return {
        activeBookings: 0,
        totalClients: 0,
        totalRevenue: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        completedBookings: 0,
      };
    }

    const nonArchivedBookings = bookings.filter(b => !isBookingArchived(b));

    const activeBookingsCount = nonArchivedBookings.filter(
      (b) => b.status === "confirmed" || b.status === "pending"
    ).length;
    const pendingBookings = nonArchivedBookings.filter((b) => b.status === "pending").length;
    const confirmedBookings = nonArchivedBookings.filter((b) => b.status === "confirmed").length;
    const completedBookings = nonArchivedBookings.filter((b) => b.status === "completed").length;
    const totalRevenue = nonArchivedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

    return {
      activeBookings: activeBookingsCount,
      totalClients: clients.length,
      totalRevenue,
      pendingBookings,
      confirmedBookings,
      completedBookings,
    };
  }, [bookings, clients]);

  return {
    sections,
    sortedSections,
    stats,
    loading,
    isAgencyView,
  };
}
