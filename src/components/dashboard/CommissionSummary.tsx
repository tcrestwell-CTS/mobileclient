import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Loader2, Users, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CommissionTier, getTierConfig, calculateAgentCommission, calculateAgencyCommission } from "@/lib/commissionTiers";
import { useIsAdmin, useIsOfficeAdmin } from "@/hooks/useAdmin";

interface CommissionData {
  totalCommission: number;
  agentShare: number;
  agencyShare: number;
  pendingCommission: number;
  paidCommission: number;
}

export function CommissionSummary() {
  const { data: isAdmin } = useIsAdmin();
  const { data: isOfficeAdmin } = useIsOfficeAdmin();
  const showAgencySplit = isAdmin || isOfficeAdmin;
  
  const [data, setData] = useState<CommissionData>({
    totalCommission: 0,
    agentShare: 0,
    agencyShare: 0,
    pendingCommission: 0,
    paidCommission: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommissionData();
  }, []);

  const fetchCommissionData = async () => {
    try {
      // Fetch commissions with their booking info
      const { data: commissions } = await supabase
        .from("commissions")
        .select(`
          id,
          amount,
          status,
          user_id
        `);

      if (!commissions || commissions.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch profiles to get commission tiers for each user
      const userIds = [...new Set(commissions.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, commission_tier")
        .in("user_id", userIds);

      const profileMap = new Map(
        profiles?.map(p => [p.user_id, p.commission_tier as CommissionTier | null]) || []
      );

      // Calculate totals with tier-based splits
      let totalCommission = 0;
      let agentShare = 0;
      let agencyShare = 0;
      let pendingCommission = 0;
      let paidCommission = 0;

      commissions.forEach((commission) => {
        const tier = profileMap.get(commission.user_id);
        const amount = commission.amount || 0;
        
        totalCommission += amount;
        agentShare += calculateAgentCommission(amount, tier);
        agencyShare += calculateAgencyCommission(amount, tier);
        
        if (commission.status === "pending") {
          pendingCommission += amount;
        } else if (commission.status === "paid") {
          paidCommission += amount;
        }
      });

      setData({
        totalCommission,
        agentShare,
        agencyShare,
        pendingCommission,
        paidCommission,
      });
    } catch (error) {
      console.error("Error fetching commission data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const agentPercentage = data.totalCommission > 0 
    ? Math.round((data.agentShare / data.totalCommission) * 100) 
    : 0;
  const agencyPercentage = data.totalCommission > 0 
    ? Math.round((data.agencyShare / data.totalCommission) * 100) 
    : 0;

  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">
            Commission Summary
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Tier-based splits</p>
        </div>
        {data.totalCommission > 0 && (
          <div className="flex items-center gap-2 text-success">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Active</span>
          </div>
        )}
      </div>

      {/* Total Commission */}
      <div className="flex items-center justify-between mb-6 p-3 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-card-foreground">Total Commissions</span>
        </div>
        <span className="text-xl font-semibold text-card-foreground">
          {formatCurrency(data.totalCommission)}
        </span>
      </div>

      {/* Agent vs Agency Split Visual - Only show for admins */}
      {showAgencySplit && data.totalCommission > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Agent Share</span>
            <span>Agency Share</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden flex">
            <div 
              className="bg-success transition-all" 
              style={{ width: `${agentPercentage}%` }}
            />
            <div 
              className="bg-primary transition-all" 
              style={{ width: `${agencyPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Split Details */}
      <div className={showAgencySplit ? "grid grid-cols-2 gap-4 mb-4" : "mb-4"}>
        <div className="p-3 bg-success/10 rounded-lg border border-success/20">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-success" />
            <span className="text-xs text-muted-foreground">Your Earnings</span>
          </div>
          <p className="text-lg font-semibold text-success">
            {formatCurrency(data.agentShare)}
          </p>
          {showAgencySplit && data.totalCommission > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              ~{agentPercentage}% of total
            </p>
          )}
        </div>
        {showAgencySplit && (
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Agency Split</span>
            </div>
            <p className="text-lg font-semibold text-primary">
              {formatCurrency(data.agencyShare)}
            </p>
            {data.totalCommission > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                ~{agencyPercentage}% of total
              </p>
            )}
          </div>
        )}
      </div>

      {/* Status Breakdown */}
      <div className="pt-4 border-t border-border space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Pending</span>
          <span className="font-medium text-warning">{formatCurrency(data.pendingCommission)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Paid</span>
          <span className="font-medium text-success">{formatCurrency(data.paidCommission)}</span>
        </div>
      </div>
    </div>
  );
}
