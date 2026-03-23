import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  DollarSign,
  AlertTriangle,
  FileText,
  ExternalLink,
  Ban,
} from "lucide-react";
import { format } from "date-fns";
import { useComplianceAuditLog, useRefundedPayments, useCancelledBookings } from "@/hooks/useComplianceAudit";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), "MMM d, yyyy h:mm a");
  } catch {
    return dateStr;
  }
};

const eventTypeBadge = (type: string) => {
  const map: Record<string, { label: string; className: string }> = {
    terms_accepted: { label: "Terms Accepted", className: "bg-success/10 text-success" },
    proposal_approved: { label: "Proposal Approved", className: "bg-primary/10 text-primary" },
    cc_authorized: { label: "CC Authorized", className: "bg-info/10 text-info" },
    refund_issued: { label: "Refund Issued", className: "bg-accent/10 text-accent" },
    dispute_opened: { label: "Dispute", className: "bg-destructive/10 text-destructive" },
    cancellation_recorded: { label: "Cancellation", className: "bg-warning/10 text-warning" },
  };
  const cfg = map[type] || { label: type, className: "bg-muted text-muted-foreground" };
  return <Badge variant="secondary" className={cfg.className}>{cfg.label}</Badge>;
};

const RiskCompliance = () => {
  const { data: auditLog = [], isLoading: auditLoading } = useComplianceAuditLog();
  const { data: refunds = [], isLoading: refundsLoading } = useRefundedPayments();
  const { data: cancellations = [], isLoading: cancellationsLoading } = useCancelledBookings();

  const totalRefundAmount = refunds.reduce((sum, r) => sum + r.amount, 0);
  const disputedPayments = refunds.filter((r) => r.status === "disputed");
  const totalCancellationPenalty = cancellations.reduce((sum, c) => sum + (c.cancellation_penalty || 0), 0);
  const totalCancellationRefunds = cancellations.reduce((sum, c) => sum + (c.cancellation_refund_amount || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Risk & Compliance
          </h1>
          <p className="text-muted-foreground mt-1">
            Audit trail, refund tracking, disputes, and supplier cancellations
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Audit Events</p>
                  <p className="text-2xl font-semibold text-foreground">{auditLog.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Refunds</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {refunds.filter((r) => r.status === "refunded").length}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(totalRefundAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Disputes</p>
                  <p className="text-2xl font-semibold text-foreground">{disputedPayments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Ban className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cancellations</p>
                  <p className="text-2xl font-semibold text-foreground">{cancellations.length}</p>
                  <p className="text-xs text-muted-foreground">
                    Penalties: {formatCurrency(totalCancellationPenalty)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="refunds" className="space-y-4">
          <TabsList>
            <TabsTrigger value="refunds">Refund Tracking</TabsTrigger>
            <TabsTrigger value="cancellations">Supplier Cancellations</TabsTrigger>
            <TabsTrigger value="audit">Compliance Audit Trail</TabsTrigger>
          </TabsList>

          {/* Refunds Tab */}
          <TabsContent value="refunds">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  Refunded & Disputed Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {refundsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : refunds.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No refunds or disputes found.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Trip</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Receipt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {refunds.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm">{formatDate(r.created_at)}</TableCell>
                          <TableCell className="text-sm font-medium">
                            {r.trip?.trip_name || "—"}
                          </TableCell>
                          <TableCell className="text-sm font-semibold">{formatCurrency(r.amount)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                r.status === "disputed"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-accent/10 text-accent"
                              }
                            >
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {r.details || r.notes || "—"}
                          </TableCell>
                          <TableCell>
                            {r.stripe_receipt_url ? (
                              <a
                                href={r.stripe_receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                View
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cancellations Tab */}
          <TabsContent value="cancellations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ban className="h-5 w-5 text-muted-foreground" />
                  Supplier Cancellations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cancellationsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : cancellations.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No cancelled bookings found.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Penalties</p>
                        <p className="text-xl font-semibold text-warning">{formatCurrency(totalCancellationPenalty)}</p>
                      </div>
                      <div className="p-4 bg-success/5 border border-success/20 rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Refunded to Clients</p>
                        <p className="text-xl font-semibold text-success">{formatCurrency(totalCancellationRefunds)}</p>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Gross Sales</TableHead>
                          <TableHead>Penalty</TableHead>
                          <TableHead>Refund</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Cancelled</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cancellations.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="text-sm font-mono">{c.booking_reference}</TableCell>
                            <TableCell className="text-sm font-medium">{c.clients?.name || "—"}</TableCell>
                            <TableCell className="text-sm">{c.destination}</TableCell>
                            <TableCell className="text-sm">{formatCurrency(c.gross_sales || c.total_amount)}</TableCell>
                            <TableCell className="text-sm font-semibold text-warning">
                              {formatCurrency(c.cancellation_penalty || 0)}
                            </TableCell>
                            <TableCell className="text-sm font-semibold text-success">
                              {formatCurrency(c.cancellation_refund_amount || 0)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                              {c.cancellation_reason || "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {c.cancelled_at ? format(new Date(c.cancelled_at), "MMM d, yyyy") : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Trail Tab */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  Compliance Audit Trail
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : auditLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No compliance events recorded yet. Events will appear here as clients accept terms, authorize payments, and more.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Signature</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLog.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-sm">{formatDate(entry.created_at)}</TableCell>
                          <TableCell>{eventTypeBadge(entry.event_type)}</TableCell>
                          <TableCell className="text-sm font-medium">{entry.client_name || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {entry.entity_type}
                          </TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">
                            {entry.ip_address || "—"}
                          </TableCell>
                          <TableCell className="text-sm italic">
                            {entry.signature || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default RiskCompliance;
