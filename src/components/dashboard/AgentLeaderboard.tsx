import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentPerformance, AgentStats } from "@/hooks/useAgentPerformance";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />;
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />;
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />;
    default:
      return <span className="text-sm font-medium text-muted-foreground w-5 text-center">{rank}</span>;
  }
}

function AgentRow({ agent, rank }: { agent: AgentStats; rank: number }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <div className="flex items-center justify-center w-6">
        {getRankIcon(rank)}
      </div>
      <Avatar className="h-9 w-9">
        <AvatarImage src={agent.avatarUrl || undefined} alt={agent.fullName} />
        <AvatarFallback className="text-xs">{getInitials(agent.fullName)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{agent.fullName}</p>
        <p className="text-xs text-muted-foreground">
          {agent.totalBookings} bookings · {agent.totalClients} clients
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold">{formatCurrency(agent.totalRevenue)}</p>
        <p className="text-xs text-muted-foreground">revenue</p>
      </div>
    </div>
  );
}

export function AgentLeaderboard() {
  const navigate = useNavigate();
  const { agentStats, agencyTotals, loading } = useAgentPerformance();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show top 5 agents
  const topAgents = agentStats.slice(0, 5);

  if (topAgents.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No agent performance data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top Performers
          </CardTitle>
          <button
            onClick={() => navigate("/analytics")}
            className="text-sm text-primary hover:underline"
          >
            View All →
          </button>
        </div>
        {agencyTotals && (
          <p className="text-xs text-muted-foreground mt-1">
            {agencyTotals.totalAgents} agents · {formatCurrency(agencyTotals.totalRevenue)} total revenue
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y">
          {topAgents.map((agent, index) => (
            <AgentRow key={agent.userId} agent={agent} rank={index + 1} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
