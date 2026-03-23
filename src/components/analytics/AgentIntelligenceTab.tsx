import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAgentPerformance, AgentStats, DateRange } from "@/hooks/useAgentPerformance";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, BarChart3, Radar } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// Color scale for heatmap cells
function getHeatmapColor(rate: number): string {
  if (rate >= 80) return "bg-green-500/20 text-green-700 dark:text-green-400";
  if (rate >= 60) return "bg-green-500/10 text-green-600 dark:text-green-500";
  if (rate >= 40) return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
  if (rate >= 20) return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
  if (rate > 0) return "bg-red-500/10 text-red-700 dark:text-red-400";
  return "text-muted-foreground";
}

// Sortable scorecard
function IntelligenceScorecard({ agentStats }: { agentStats: AgentStats[] }) {
  const [sortKey, setSortKey] = useState<string>("totalRevenue");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    return [...agentStats].sort((a, b) => {
      const aVal = (a as any)[sortKey] ?? 0;
      const bVal = (b as any)[sortKey] ?? 0;
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [agentStats, sortKey, sortAsc]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const sortIndicator = (key: string) => sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Intelligence Scorecard
        </CardTitle>
        <CardDescription>Click column headers to sort</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort("totalRevenue")}>
                Revenue{sortIndicator("totalRevenue")}
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort("totalGrossSales")}>
                Gross Sales{sortIndicator("totalGrossSales")}
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort("marginPct")}>
                Margin %{sortIndicator("marginPct")}
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort("avgBookingValue")}>
                Avg Value{sortIndicator("avgBookingValue")}
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort("conversionRate")}>
                Conversion{sortIndicator("conversionRate")}
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort("avgLeadResponseDays")}>
                Avg Response (days){sortIndicator("avgLeadResponseDays")}
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort("totalBookings")}>
                Bookings{sortIndicator("totalBookings")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((agent) => (
              <TableRow key={agent.userId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={agent.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">{getInitials(agent.fullName)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{agent.fullName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(agent.totalRevenue)}</TableCell>
                <TableCell className="text-right">{formatCurrency(agent.totalGrossSales)}</TableCell>
                <TableCell className="text-right">{agent.marginPct.toFixed(1)}%</TableCell>
                <TableCell className="text-right">{formatCurrency(agent.avgBookingValue)}</TableCell>
                <TableCell className="text-right">{agent.conversionRate.toFixed(0)}%</TableCell>
                <TableCell className="text-right">{agent.avgLeadResponseDays.toFixed(1)}</TableCell>
                <TableCell className="text-right">{agent.totalBookings}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Trip type heatmap
function TripTypeHeatmap({ agentStats }: { agentStats: AgentStats[] }) {
  const allTypes = useMemo(() => {
    const types = new Set<string>();
    agentStats.forEach((a) => Object.keys(a.closeRateByType).forEach((t) => types.add(t)));
    return Array.from(types).sort();
  }, [agentStats]);

  if (allTypes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Close Rate by Trip Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-6">No trip type data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Close Rate by Trip Type
        </CardTitle>
        <CardDescription>Confirmed/completed vs total bookings per type</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              {allTypes.map((type) => (
                <TableHead key={type} className="text-center capitalize">{type}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {agentStats.map((agent) => (
              <TableRow key={agent.userId}>
                <TableCell className="font-medium text-sm">{agent.fullName}</TableCell>
                {allTypes.map((type) => {
                  const data = agent.closeRateByType[type];
                  return (
                    <TableCell key={type} className="text-center">
                      {data ? (
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getHeatmapColor(data.rate)}`}>
                          {data.rate.toFixed(0)}%
                          <span className="text-[10px] ml-1 opacity-70">({data.closed}/{data.total})</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Radar comparison chart
function AgentComparisonChart({ agentStats }: { agentStats: AgentStats[] }) {
  const [agent1Id, setAgent1Id] = useState<string>("");
  const [agent2Id, setAgent2Id] = useState<string>("");

  const agent1 = agentStats.find((a) => a.userId === agent1Id);
  const agent2 = agentStats.find((a) => a.userId === agent2Id);

  // Normalize values 0-100 based on max across all agents
  const maxValues = useMemo(() => ({
    revenue: Math.max(...agentStats.map((a) => a.totalRevenue), 1),
    margin: Math.max(...agentStats.map((a) => a.marginPct), 1),
    conversion: 100,
    avgValue: Math.max(...agentStats.map((a) => a.avgBookingValue), 1),
    // Invert response time (lower is better)
    responseTime: Math.max(...agentStats.map((a) => a.avgLeadResponseDays), 1),
  }), [agentStats]);

  const normalize = (agent: AgentStats) => ({
    Revenue: (agent.totalRevenue / maxValues.revenue) * 100,
    Margin: (agent.marginPct / maxValues.margin) * 100,
    Conversion: agent.conversionRate,
    "Avg Value": (agent.avgBookingValue / maxValues.avgValue) * 100,
    "Speed": maxValues.responseTime > 0 ? Math.max(0, 100 - (agent.avgLeadResponseDays / maxValues.responseTime) * 100) : 50,
  });

  const radarData = useMemo(() => {
    if (!agent1 && !agent2) return [];
    const dimensions = ["Revenue", "Margin", "Conversion", "Avg Value", "Speed"];
    const n1 = agent1 ? normalize(agent1) : null;
    const n2 = agent2 ? normalize(agent2) : null;
    return dimensions.map((d) => ({
      dimension: d,
      ...(n1 ? { [agent1!.fullName]: (n1 as any)[d] } : {}),
      ...(n2 ? { [agent2!.fullName]: (n2 as any)[d] } : {}),
    }));
  }, [agent1, agent2, maxValues]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radar className="h-5 w-5" />
          Agent Comparison
        </CardTitle>
        <CardDescription>Select two agents to compare across 5 dimensions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-6">
          <Select value={agent1Id} onValueChange={setAgent1Id}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Agent 1" />
            </SelectTrigger>
            <SelectContent>
              {agentStats.map((a) => (
                <SelectItem key={a.userId} value={a.userId} disabled={a.userId === agent2Id}>
                  {a.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={agent2Id} onValueChange={setAgent2Id}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Agent 2" />
            </SelectTrigger>
            <SelectContent>
              {agentStats.map((a) => (
                <SelectItem key={a.userId} value={a.userId} disabled={a.userId === agent1Id}>
                  {a.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="h-[350px]">
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                {agent1 && (
                  <RechartsRadar
                    name={agent1.fullName}
                    dataKey={agent1.fullName}
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                )}
                {agent2 && (
                  <RechartsRadar
                    name={agent2.fullName}
                    dataKey={agent2.fullName}
                    stroke="hsl(var(--chart-2))"
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                )}
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Select agents above to compare
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface AgentIntelligenceTabProps {
  dateRange?: DateRange;
}

export function AgentIntelligenceTab({ dateRange }: AgentIntelligenceTabProps) {
  const { agentStats, loading } = useAgentPerformance(dateRange);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-96" />
        <Skeleton className="h-64" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (agentStats.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No agent performance data available for the selected period.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <IntelligenceScorecard agentStats={agentStats} />
      <TripTypeHeatmap agentStats={agentStats} />
      <AgentComparisonChart agentStats={agentStats} />
    </div>
  );
}
