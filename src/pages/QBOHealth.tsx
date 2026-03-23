import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQBOConnection } from "@/hooks/useQBOConnection";
import { useQBOSyncLogs } from "@/hooks/useQBOSyncLogs";
import { useIsAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Activity, Clock, Wifi, WifiOff, ShieldAlert, Users, DollarSign, BarChart3, Loader2, CreditCard, Scale, Landmark } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";

interface FinancialSummary {
  profit_and_loss: {
    total_income: number;
    total_expenses: number;
    net_income: number;
  } | null;
  balance_sheet: {
    total_assets: number;
  } | null;
}

type FilterStatus = "all" | "success" | "error";

export default function QBOHealth() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { status, loading: connLoading, refreshStatus, syncing, syncClients, syncPayments, syncStripeDeposits, getFinancialSummary, getStripeReconReport, getFinancialLifecycle, getStripePayouts } = useQBOConnection();
  const { data: logs, isLoading: logsLoading, refetch: refetchLogs } = useQBOSyncLogs(100);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [financials, setFinancials] = useState<FinancialSummary | null>(null);
  const [loadingFinancials, setLoadingFinancials] = useState(false);
  const [reconReport, setReconReport] = useState<any>(null);
  const [loadingRecon, setLoadingRecon] = useState(false);
  const [lifecycle, setLifecycle] = useState<any[] | null>(null);
  const [loadingLifecycle, setLoadingLifecycle] = useState(false);
  const [stripePayouts, setStripePayouts] = useState<any>(null);
  const [loadingPayouts, setLoadingPayouts] = useState(false);

  const loadFinancials = async () => {
    setLoadingFinancials(true);
    const data = await getFinancialSummary();
    setFinancials(data);
    setLoadingFinancials(false);
  };

  const loadLifecycle = async () => {
    setLoadingLifecycle(true);
    const data = await getFinancialLifecycle();
    setLifecycle(data);
    setLoadingLifecycle(false);
  };

  useEffect(() => {
    if (status.connected) {
      loadFinancials();
    }
  }, [status.connected]);

  useEffect(() => {
    loadLifecycle();
    loadStripePayouts();
  }, []);

  const loadStripePayouts = async () => {
    setLoadingPayouts(true);
    const data = await getStripePayouts();
    setStripePayouts(data);
    setLoadingPayouts(false);
  };

  if (adminLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Skeleton className="h-8 w-48" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const filteredLogs = logs?.filter((log) => {
    if (filter === "all") return true;
    return log.status === filter;
  });

  const errorCount = logs?.filter((l) => l.status === "error").length ?? 0;
  const successCount = logs?.filter((l) => l.status === "success").length ?? 0;
  const totalSyncs = logs?.length ?? 0;
  const successRate = totalSyncs > 0 ? Math.round((successCount / totalSyncs) * 100) : 0;

  const lastSync = logs?.[0];
  const tokenExpiry = status.connection?.token_expires_at
    ? new Date(status.connection.token_expires_at)
    : null;
  const tokenExpired = tokenExpiry ? tokenExpiry <= new Date() : false;

  const handleRefresh = () => {
    refreshStatus();
    refetchLogs();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              QuickBooks Integration Health
            </h1>
            <p className="text-muted-foreground">
              Monitor connection status, sync history, and errors
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Connection</CardTitle>
              {status.connected ? (
                <Wifi className="h-4 w-4 text-emerald-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive" />
              )}
            </CardHeader>
            <CardContent>
              {connLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <>
                  <div className="text-xl font-bold">
                    {status.connected ? "Connected" : "Disconnected"}
                  </div>
                  {status.connection?.company_name && (
                    <p className="text-xs text-muted-foreground truncate">
                      {status.connection.company_name}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Token Status</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {connLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : !tokenExpiry ? (
                <div className="text-xl font-bold text-muted-foreground">N/A</div>
              ) : (
                <>
                  <div className={`text-xl font-bold ${tokenExpired ? "text-destructive" : "text-emerald-600"}`}>
                    {tokenExpired ? "Expired" : "Valid"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tokenExpired
                      ? `Expired ${formatDistanceToNow(tokenExpiry)} ago`
                      : `Expires in ${formatDistanceToNow(tokenExpiry)}`}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <>
                  <div className={`text-xl font-bold ${successRate >= 90 ? "text-emerald-600" : successRate >= 70 ? "text-amber-600" : "text-destructive"}`}>
                    {successRate}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {successCount} of {totalSyncs} syncs
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Errors</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${errorCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <>
                  <div className={`text-xl font-bold ${errorCount > 0 ? "text-destructive" : "text-emerald-600"}`}>
                    {errorCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {lastSync
                      ? `Last sync ${formatDistanceToNow(new Date(lastSync.created_at))} ago`
                      : "No syncs yet"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sync Actions */}
        {status.connected && (
          <Card>
            <CardHeader>
              <CardTitle>Sync Actions</CardTitle>
              <CardDescription>Push and pull data between your system and QuickBooks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => syncClients().then(() => refetchLogs())}
                  disabled={!!syncing}
                >
                  {syncing === "clients" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  Sync Clients
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => syncPayments().then(() => refetchLogs())}
                  disabled={!!syncing}
                >
                  {syncing === "payments" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <DollarSign className="h-4 w-4" />
                  )}
                  Sync Payments
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={() => syncStripeDeposits().then(() => refetchLogs())}
                  disabled={!!syncing}
                >
                  {syncing === "stripe-deposits" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Landmark className="h-4 w-4" />
                  )}
                  Sync Stripe Deposits
                </Button>
                <Button
                  variant="outline"
                  className="justify-start gap-2"
                  onClick={loadFinancials}
                  disabled={loadingFinancials}
                >
                  {loadingFinancials ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <BarChart3 className="h-4 w-4" />
                  )}
                  Refresh Financials
                </Button>
              </div>

              {/* Financial Summary */}
              {financials?.profit_and_loss && (
                <div className="bg-muted/30 rounded-lg p-4 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Income (This Month)</p>
                    <p className="text-sm font-semibold text-emerald-600">
                      ${financials.profit_and_loss.total_income.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expenses</p>
                    <p className="text-sm font-semibold text-destructive">
                      ${financials.profit_and_loss.total_expenses.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net Income</p>
                    <p className="text-sm font-semibold text-card-foreground">
                      ${financials.profit_and_loss.net_income.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stripe Payouts (from Stripe API) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5" />
                  Stripe Deposits & Payouts
                </CardTitle>
                <CardDescription>Real-time payout data pulled from your Stripe account</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadStripePayouts} disabled={loadingPayouts}>
                {loadingPayouts ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                {stripePayouts ? "Refresh" : "Load Payouts"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingPayouts ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !stripePayouts ? (
              <div className="text-center py-8 text-muted-foreground">
                <Landmark className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Loading Stripe payout data...</p>
              </div>
            ) : stripePayouts.error ? (
              <div className="text-center py-8 text-destructive">
                <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-60" />
                <p className="text-sm font-medium">{stripePayouts.error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Balance Summary */}
                {stripePayouts.balance && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Available</p>
                      <p className="text-lg font-bold text-emerald-600">
                        ${stripePayouts.balance.available.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="text-lg font-bold text-foreground">
                        ${stripePayouts.balance.pending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Incoming (Recent)</p>
                      <p className="text-lg font-bold text-foreground">
                        ${stripePayouts.summary?.incoming?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Processing Fees</p>
                      <p className="text-lg font-bold text-destructive">
                        ${stripePayouts.summary?.fees?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Payouts Table */}
                {stripePayouts.payouts?.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Arrive By</TableHead>
                          <TableHead>Method</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stripePayouts.payouts.map((payout: any) => (
                          <TableRow key={payout.id}>
                            <TableCell className="font-mono font-semibold text-sm">
                              ${payout.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={payout.status === "paid" ? "default" : payout.status === "in_transit" ? "secondary" : "outline"}
                                className="capitalize text-[10px]"
                              >
                                {payout.status === "in_transit" ? "In Transit" : payout.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {payout.destination || "—"}
                            </TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(payout.arrival_date + "T12:00:00"), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground capitalize">
                              {payout.method || "standard"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-sm">No payouts found</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-right">
                  {stripePayouts.payouts?.length || 0} payout(s) shown
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stripe Reconciliation Report */}
        {status.connected && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    Stripe Clearing Reconciliation
                  </CardTitle>
                  <CardDescription>Verify clearing balances by account and payout date</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setLoadingRecon(true);
                    const data = await getStripeReconReport();
                    setReconReport(data);
                    setLoadingRecon(false);
                  }}
                  disabled={loadingRecon}
                >
                  {loadingRecon ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  {reconReport ? "Refresh" : "Run Report"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRecon ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !reconReport ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Click "Run Report" to query QBO for Stripe Clearing activity</p>
                </div>
              ) : !reconReport.account_exists ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="font-medium">Stripe Clearing account not found</p>
                  <p className="text-sm mt-1">It will be auto-created on your first Stripe deposit sync.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Account Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Clearing Balance</p>
                      <p className={`text-lg font-bold ${
                        reconReport.summary.is_balanced ? "text-emerald-600" : "text-destructive"
                      }`}>
                        ${reconReport.summary.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      {reconReport.summary.is_balanced && (
                        <Badge variant="outline" className="mt-1 text-emerald-600 border-emerald-200 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Balanced
                        </Badge>
                      )}
                      {!reconReport.summary.is_balanced && (
                        <Badge variant="destructive" className="mt-1 text-[10px]">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Unbalanced
                        </Badge>
                      )}
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Total Debits</p>
                      <p className="text-lg font-bold text-foreground">
                        ${reconReport.summary.total_debits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Total Credits</p>
                      <p className="text-lg font-bold text-foreground">
                        ${reconReport.summary.total_credits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Processing Fees</p>
                      <p className="text-lg font-bold text-foreground">
                        {reconReport.fees_account
                          ? `$${reconReport.fees_account.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* By-Date Breakdown */}
                  {reconReport.by_date && Object.keys(reconReport.by_date).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-foreground">By Payout Date</h4>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead className="text-right">Debits</TableHead>
                              <TableHead className="text-right">Credits</TableHead>
                              <TableHead className="text-right">Net</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                              <TableHead className="text-right">Entries</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(reconReport.by_date as Record<string, { debits: number; credits: number; count: number; balanced: boolean }>)
                              .sort(([a], [b]) => b.localeCompare(a))
                              .map(([date, data]) => (
                                <TableRow key={date}>
                                  <TableCell className="text-xs font-medium">
                                    {format(new Date(date + "T12:00:00"), "MMM d, yyyy")}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-xs">
                                    ${data.debits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-xs">
                                    ${data.credits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell className={`text-right font-mono text-xs ${
                                    data.balanced ? "text-emerald-600" : "text-destructive"
                                  }`}>
                                    ${Math.abs(data.debits - data.credits).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {data.balanced ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                                    ) : (
                                      <AlertTriangle className="h-4 w-4 text-destructive mx-auto" />
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right text-xs text-muted-foreground">
                                    {data.count}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Entry Count */}
                  <p className="text-xs text-muted-foreground text-right">
                    {reconReport.summary.entry_count} journal entries found
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Financial Lifecycle per-Trip */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Lifecycle
                </CardTitle>
                <CardDescription>Per-trip money flow: Client Paid → Fees → Supplier → Commission</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadLifecycle} disabled={loadingLifecycle}>
                {loadingLifecycle ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingLifecycle ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !lifecycle?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No trip financial data found</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trip</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Client Paid</TableHead>
                      <TableHead className="text-right">Fees</TableHead>
                      <TableHead className="text-right">Supplier Paid</TableHead>
                      <TableHead className="text-right">Commission Earned</TableHead>
                      <TableHead className="text-right">Commission Paid</TableHead>
                      <TableHead className="text-right">Net Position</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lifecycle.map((row: any) => {
                      const isCompleted = row.status === "completed";
                      const isBalanced = isCompleted && Math.abs(row.netPosition) < 1;
                      const hasDiscrepancy = isCompleted && Math.abs(row.netPosition) >= 1;
                      return (
                        <TableRow key={row.tripId}>
                          <TableCell className="text-xs font-medium max-w-[180px] truncate">{row.tripName}</TableCell>
                          <TableCell>
                            <Badge variant={isCompleted ? "default" : "outline"} className="capitalize text-[10px]">
                              {row.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">${row.clientPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-muted-foreground">${row.stripeFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right font-mono text-xs">${row.supplierPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right font-mono text-xs">${row.commissionEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="text-right font-mono text-xs">${row.commissionPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className={`text-right font-mono text-xs font-semibold ${
                            isBalanced ? "text-emerald-600" : hasDiscrepancy ? "text-destructive" : "text-foreground"
                          }`}>
                            ${row.netPosition.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            {isBalanced && <CheckCircle2 className="h-3 w-3 inline ml-1" />}
                            {hasDiscrepancy && <AlertTriangle className="h-3 w-3 inline ml-1" />}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Journal Entry Audit Trail */}
        {(() => {
          const autoLogs = logs?.filter((l) => l.sync_type.startsWith("auto-")) || [];
          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Automated Journal Entries
                </CardTitle>
                <CardDescription>Audit trail of all auto-generated QBO journal entries</CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : !autoLogs.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No automated journal entries yet</p>
                    <p className="text-xs mt-1">Entries appear when deposits, supplier payments, commissions, or trip completions are processed.</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Records</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {autoLogs.slice(0, 25).map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {format(new Date(log.created_at), "MMM d, h:mm a")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {log.sync_type.replace("auto-", "").replace(/-/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {log.status === "success" ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive" />
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">{log.records_processed}</TableCell>
                            <TableCell className="max-w-[200px]">
                              {log.error_message ? (
                                <span className="text-xs text-destructive truncate block" title={log.error_message}>{log.error_message}</span>
                              ) : log.details ? (
                                <span className="text-xs text-muted-foreground truncate block">
                                  {typeof log.details === 'object' && (log.details as any)?.amount 
                                    ? `$${Number((log.details as any).amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
                                    : "—"}
                                </span>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Unmatched Transactions Alert */}
        {(() => {
          if (!lifecycle?.length || !logs?.length) return null;
          const unmatchedTrips = lifecycle.filter(
            (t: any) => t.supplierPaid > 0 && t.clientPaid > 0 && t.status !== "completed"
          );
          if (!unmatchedTrips.length) return null;
          return (
            <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                  In-Progress Trips with Open Positions
                </CardTitle>
                <CardDescription>These trips have financial activity but aren't completed yet</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {unmatchedTrips.map((t: any) => (
                    <div key={t.tripId} className="flex items-center justify-between p-2 bg-background rounded border text-sm">
                      <span className="font-medium truncate max-w-[200px]">{t.tripName}</span>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Paid: ${t.clientPaid.toLocaleString()}</span>
                        <span>Supplier: ${t.supplierPaid.toLocaleString()}</span>
                        <span className="font-semibold text-amber-600">Net: ${t.netPosition.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sync History</CardTitle>
                <CardDescription>Recent synchronization events and errors</CardDescription>
              </div>
              <div className="flex gap-1">
                {(["all", "success", "error"] as FilterStatus[]).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(f)}
                    className="capitalize"
                  >
                    {f}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !filteredLogs?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No sync logs found</p>
                <p className="text-sm">
                  {filter !== "all"
                    ? `No ${filter} events. Try a different filter.`
                    : "Sync events will appear here after your first QuickBooks sync."}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Records</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM d, h:mm a")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">
                            {log.sync_type.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize text-xs text-muted-foreground">
                          {log.direction}
                        </TableCell>
                        <TableCell>
                          {log.status === "success" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {log.records_processed}
                        </TableCell>
                        <TableCell className="max-w-[250px]">
                          {log.error_message && (
                            <span className="text-xs text-destructive truncate block" title={log.error_message}>
                              {log.error_message}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
