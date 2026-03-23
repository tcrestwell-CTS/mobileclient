import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CommissionReportItem } from "@/hooks/useCommissionReport";
import { calculateAgentCommission, getTierConfig, CommissionTier } from "@/lib/commissionTiers";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

interface CommissionReportTableProps {
  data: CommissionReportItem[];
  showAgentColumn: boolean;
}

export function CommissionReportTable({ data, showAgentColumn }: CommissionReportTableProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  if (data.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
        <p className="text-muted-foreground">No commissions match your filters</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Booking</TableHead>
            <TableHead>Client</TableHead>
            {showAgentColumn && <TableHead>Agent</TableHead>}
            <TableHead>Supplier</TableHead>
            <TableHead className="text-right">Gross Sales</TableHead>
            <TableHead className="text-right">Commission</TableHead>
            <TableHead className="text-right">Agent Share</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            const tier = (item.agent?.commission_tier || "tier_1") as CommissionTier;
            const agentShare = calculateAgentCommission(item.amount, tier);
            const tierConfig = getTierConfig(tier);

            return (
              <TableRow key={item.id}>
                <TableCell className="text-muted-foreground">
                  {format(parseISO(item.created_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <Link
                    to={`/bookings/${item.booking_id}`}
                    className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {item.booking?.booking_reference || "N/A"}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {item.booking?.destination || "N/A"}
                  </p>
                </TableCell>
                <TableCell>{item.booking?.client?.name || "Unknown"}</TableCell>
                {showAgentColumn && (
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.agent?.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">
                        {tierConfig.description}
                      </p>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  {item.booking?.supplier?.name || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(item.booking?.gross_sales || item.booking?.total_amount || 0)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(item.amount)}
                  <span className="text-xs text-muted-foreground ml-1">({item.rate}%)</span>
                </TableCell>
                <TableCell className="text-right font-mono font-semibold text-success">
                  {formatCurrency(agentShare)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="secondary"
                    className={
                      item.status === "paid"
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                    }
                  >
                    {item.status}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
