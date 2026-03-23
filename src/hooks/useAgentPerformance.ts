import { useMemo } from "react";
import { useBookings, isBookingArchived } from "@/hooks/useBookings";
import { useClients } from "@/hooks/useClients";
import { useCommissions } from "@/hooks/useCommissions";
import { useTeamProfiles, TeamProfile } from "@/hooks/useTeamProfiles";
import { useIsAdmin, useIsOfficeAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { parseISO, isWithinInterval, differenceInDays } from "date-fns";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface CloseRateByType {
  total: number;
  closed: number;
  rate: number;
}

export interface AgentStats {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  totalBookings: number;
  totalRevenue: number;
  totalClients: number;
  totalCommissions: number;
  pendingCommissions: number;
  paidCommissions: number;
  avgBookingValue: number;
  conversionRate: number;
  marginPct: number;
  avgLeadResponseDays: number;
  closeRateByType: Record<string, CloseRateByType>;
  totalGrossSales: number;
  totalCommissionRevenue: number;
}

export function useAgentPerformance(dateRange?: DateRange) {
  const { user } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: isOfficeAdmin, isLoading: officeAdminLoading } = useIsOfficeAdmin();
  const { data: profiles, isLoading: profilesLoading } = useTeamProfiles();
  const { bookings, loading: bookingsLoading } = useBookings();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: commissions, isLoading: commissionsLoading } = useCommissions();

  const loading = profilesLoading || bookingsLoading || clientsLoading || commissionsLoading || adminLoading || officeAdminLoading;
  
  // Determine if user can view all agents or just themselves
  const canViewAllAgents = isAdmin || isOfficeAdmin;

  // Filter bookings and clients by date range if provided, and exclude archived
  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    
    // First filter out archived trips
    let filtered = bookings.filter(b => !isBookingArchived(b));
    
    // Then apply date range filter if provided
    if (dateRange) {
      filtered = filtered.filter((booking) => {
        const departDate = parseISO(booking.depart_date);
        return isWithinInterval(departDate, { start: dateRange.from, end: dateRange.to });
      });
    }
    
    return filtered;
  }, [bookings, dateRange]);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!dateRange) return clients;
    
    return clients.filter((client) => {
      const createdDate = parseISO(client.created_at);
      return isWithinInterval(createdDate, { start: dateRange.from, end: dateRange.to });
    });
  }, [clients, dateRange]);

  const agentStats = useMemo(() => {
    if (!profiles || !filteredBookings || !filteredClients || !commissions || !user) {
      return [];
    }

    // For regular agents, only show their own profile
    // For admins/office admins, show all profiles (RLS already filters appropriately)
    const relevantProfiles = canViewAllAgents 
      ? profiles 
      : profiles.filter(p => p.user_id === user.id);

    const stats: AgentStats[] = relevantProfiles.map((profile: TeamProfile) => {
      // Filter data by agent
      const agentBookings = filteredBookings.filter(b => b.user_id === profile.user_id && b.status !== "cancelled");
      const agentClients = filteredClients.filter(c => c.user_id === profile.user_id);
      const agentCommissions = commissions.filter(c => c.user_id === profile.user_id);

      const totalRevenue = agentBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const pendingCommissions = agentCommissions
        .filter(c => c.status === "pending")
        .reduce((sum, c) => sum + (c.amount || 0), 0);
      const paidCommissions = agentCommissions
        .filter(c => c.status === "paid")
        .reduce((sum, c) => sum + (c.amount || 0), 0);

      // Calculate conversion rate (clients with bookings / total clients)
      const clientsWithBookings = new Set(agentBookings.map(b => b.client_id)).size;
      const conversionRate = agentClients.length > 0 
        ? (clientsWithBookings / agentClients.length) * 100 
        : 0;

      // New: Margin calculation
      const totalGrossSales = agentBookings.reduce((sum, b) => sum + (b.gross_sales || 0), 0);
      const totalCommissionRevenue = agentBookings.reduce((sum, b) => sum + (b.commission_revenue || 0), 0);
      const marginPct = totalGrossSales > 0 ? (totalCommissionRevenue / totalGrossSales) * 100 : 0;

      // New: Lead response time (avg days from client created_at to first booking created_at)
      const clientFirstBooking: Record<string, string> = {};
      agentBookings.forEach(b => {
        if (!clientFirstBooking[b.client_id] || b.created_at < clientFirstBooking[b.client_id]) {
          clientFirstBooking[b.client_id] = b.created_at;
        }
      });
      const responseDays: number[] = [];
      agentClients.forEach(c => {
        const firstBooking = clientFirstBooking[c.id];
        if (firstBooking) {
          const days = differenceInDays(parseISO(firstBooking), parseISO(c.created_at));
          responseDays.push(Math.max(0, days));
        }
      });
      const avgLeadResponseDays = responseDays.length > 0
        ? responseDays.reduce((a, b) => a + b, 0) / responseDays.length
        : 0;

      // New: Close rate by trip type
      const closeRateByType: Record<string, { total: number; closed: number; rate: number }> = {};
      agentBookings.forEach(b => {
        const type = b.booking_type || "other";
        if (!closeRateByType[type]) {
          closeRateByType[type] = { total: 0, closed: 0, rate: 0 };
        }
        closeRateByType[type].total += 1;
        if (b.status === "confirmed" || b.status === "completed") {
          closeRateByType[type].closed += 1;
        }
      });
      Object.values(closeRateByType).forEach(v => {
        v.rate = v.total > 0 ? (v.closed / v.total) * 100 : 0;
      });

      return {
        userId: profile.user_id,
        fullName: profile.full_name || "Unknown Agent",
        avatarUrl: profile.avatar_url,
        jobTitle: profile.job_title,
        totalBookings: agentBookings.length,
        totalRevenue,
        totalClients: agentClients.length,
        totalCommissions: pendingCommissions + paidCommissions,
        pendingCommissions,
        paidCommissions,
        avgBookingValue: agentBookings.length > 0 ? totalRevenue / agentBookings.length : 0,
        conversionRate,
        marginPct,
        avgLeadResponseDays,
        closeRateByType,
        totalGrossSales,
        totalCommissionRevenue,
      };
    });

    // Sort by total revenue descending
    return stats.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [profiles, filteredBookings, filteredClients, commissions, user, canViewAllAgents]);

  // Calculate totals for the agency (only meaningful for admins)
  const agencyTotals = useMemo(() => {
    if (!agentStats.length) return null;

    return {
      totalAgents: agentStats.length,
      totalRevenue: agentStats.reduce((sum, a) => sum + a.totalRevenue, 0),
      totalBookings: agentStats.reduce((sum, a) => sum + a.totalBookings, 0),
      totalClients: agentStats.reduce((sum, a) => sum + a.totalClients, 0),
      totalCommissions: agentStats.reduce((sum, a) => sum + a.totalCommissions, 0),
      avgRevenuePerAgent: agentStats.length > 0 
        ? agentStats.reduce((sum, a) => sum + a.totalRevenue, 0) / agentStats.length 
        : 0,
    };
  }, [agentStats]);

  return {
    agentStats,
    agencyTotals,
    loading,
    canViewAllAgents,
  };
}
