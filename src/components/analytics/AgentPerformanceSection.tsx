import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentPerformance, AgentStats, DateRange } from "@/hooks/useAgentPerformance";
import { Trophy, Users, DollarSign, Briefcase, TrendingUp, Target, Clock, Percent } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

function getRankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return rank.toString();
}

interface AgentPerformanceTableProps {
  agentStats: AgentStats[];
  maxRevenue: number;
}

function AgentPerformanceTable({ agentStats, maxRevenue }: AgentPerformanceTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Agent Performance Rankings
        </CardTitle>
        <CardDescription>
          Detailed performance metrics for all agents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Bookings</TableHead>
              <TableHead className="text-right">Clients</TableHead>
              <TableHead className="text-right">Avg. Value</TableHead>
              <TableHead className="text-right">Conversion</TableHead>
              <TableHead className="w-32">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agentStats.map((agent, index) => (
              <TableRow key={agent.userId}>
                <TableCell className="font-medium text-center">
                  {getRankBadge(index + 1)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={agent.avatarUrl || undefined} alt={agent.fullName} />
                      <AvatarFallback className="text-xs">{getInitials(agent.fullName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{agent.fullName}</p>
                      <p className="text-xs text-muted-foreground">{agent.jobTitle || "Agent"}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(agent.totalRevenue)}
                </TableCell>
                <TableCell className="text-right">{agent.totalBookings}</TableCell>
                <TableCell className="text-right">{agent.totalClients}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(agent.avgBookingValue)}
                </TableCell>
                <TableCell className="text-right">
                  {agent.conversionRate.toFixed(0)}%
                </TableCell>
                <TableCell>
                  <Progress 
                    value={maxRevenue > 0 ? (agent.totalRevenue / maxRevenue) * 100 : 0} 
                    className="h-2" 
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface AgentRevenueChartProps {
  agentStats: AgentStats[];
}

function AgentRevenueChart({ agentStats }: AgentRevenueChartProps) {
  const chartData = agentStats.slice(0, 10).map(agent => ({
    name: agent.fullName.split(" ")[0],
    revenue: agent.totalRevenue,
    bookings: agent.totalBookings,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-md">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name === "revenue" ? formatCurrency(entry.value) : `${entry.value} bookings`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Agent Revenue Comparison
        </CardTitle>
        <CardDescription>
          Revenue generated by top agents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No agent data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface AgentCommissionsChartProps {
  agentStats: AgentStats[];
}

function AgentCommissionsChart({ agentStats }: AgentCommissionsChartProps) {
  const chartData = agentStats.slice(0, 10).map(agent => ({
    name: agent.fullName.split(" ")[0],
    pending: agent.pendingCommissions,
    paid: agent.paidCommissions,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-md">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Agent Commissions
        </CardTitle>
        <CardDescription>
          Pending vs paid commissions by agent
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pending" name="Pending" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="paid" name="Paid" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No commission data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface AgentPerformanceSectionProps {
  dateRange?: DateRange;
}

export function AgentPerformanceSection({ dateRange }: AgentPerformanceSectionProps) {
  const { agentStats, agencyTotals, loading, canViewAllAgents } = useAgentPerformance(dateRange);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (agentStats.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No performance data available for the selected period.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxRevenue = Math.max(...agentStats.map(a => a.totalRevenue));

  // Single agent view (for regular agents viewing their own data)
  if (!canViewAllAgents && agentStats.length === 1) {
    const myStats = agentStats[0];
    return (
      <div className="space-y-6">
        {/* Personal Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              My Performance
            </CardTitle>
            <CardDescription>
              Your personal performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{formatCurrency(myStats.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{myStats.totalBookings}</p>
                <p className="text-xs text-muted-foreground">Bookings</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{myStats.totalClients}</p>
                <p className="text-xs text-muted-foreground">Clients</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{formatCurrency(myStats.avgBookingValue)}</p>
                <p className="text-xs text-muted-foreground">Avg Booking Value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commission Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(myStats.totalCommissions)}</p>
                  <p className="text-xs text-muted-foreground">Total Commissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-chart-4/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(myStats.pendingCommissions)}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-chart-2/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(myStats.paidCommissions)}</p>
                  <p className="text-xs text-muted-foreground">Paid</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conversion Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Conversion Rate
            </CardTitle>
            <CardDescription>
              Percentage of clients with bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Progress value={myStats.conversionRate} className="h-3" />
              </div>
              <span className="text-2xl font-bold">{myStats.conversionRate.toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>

        {/* New: Margin & Lead Response Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Percent className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{myStats.marginPct.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Commission Margin</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatCurrency(myStats.totalCommissionRevenue)} / {formatCurrency(myStats.totalGrossSales)} gross
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{myStats.avgLeadResponseDays.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Avg Lead Response (days)</p>
                  <p className="text-[10px] text-muted-foreground">From client creation to first booking</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* New: Close Rate by Trip Type */}
        {Object.keys(myStats.closeRateByType).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Close Rate by Trip Type
              </CardTitle>
              <CardDescription>Confirmed/completed vs total per booking type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(myStats.closeRateByType).map(([type, data]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-sm font-medium capitalize w-24">{type}</span>
                    <div className="flex-1">
                      <Progress value={data.rate} className="h-2" />
                    </div>
                    <span className="text-sm font-semibold w-16 text-right">{data.rate.toFixed(0)}%</span>
                    <span className="text-xs text-muted-foreground w-16 text-right">({data.closed}/{data.total})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Admin/Office Admin view - show all agents
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{agencyTotals?.totalAgents || 0}</p>
                <p className="text-xs text-muted-foreground">Total Agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(agencyTotals?.avgRevenuePerAgent || 0)}</p>
                <p className="text-xs text-muted-foreground">Avg Revenue/Agent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{agencyTotals?.totalBookings || 0}</p>
                <p className="text-xs text-muted-foreground">Total Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(agencyTotals?.totalCommissions || 0)}</p>
                <p className="text-xs text-muted-foreground">Total Commissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AgentRevenueChart agentStats={agentStats} />
        <AgentCommissionsChart agentStats={agentStats} />
      </div>

      {/* Full Table */}
      <AgentPerformanceTable agentStats={agentStats} maxRevenue={maxRevenue} />
    </div>
  );
}
