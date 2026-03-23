import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Webhook, Send, Save, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Clock, Loader2, AlertCircle,
  Copy, Check, RefreshCw, ArrowDownToLine, ExternalLink,
  Info,
} from "lucide-react";
import { useGetWebhookConfig, useUpsertWebhookConfig } from "@/hooks/useWebhookConfiguration";
import { useWebhookLeads, type WebhookLead } from "@/hooks/useWebhookLeads";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;

const EXAMPLE_PAYLOAD = {
  lead_id: "abc123",
  name: "John Smith",
  email: "john@example.com",
  phone: "(555) 123-4567",
  location: "Phoenix, AZ",
  budget: "$45k - $60k",
  project_type: "Full Kitchen Remodel",
  timeline: "1-3 Months",
};

const SUCCESS_RESPONSE = { ok: true, received: true, lead_id: "abc123", status: "queued" };
const DUPLICATE_RESPONSE = { ok: true, received: true, lead_id: "abc123", status: "already_exists" };
const ERROR_RESPONSE = { ok: false, error: "email is invalid" };

interface TestResult {
  success: boolean;
  status?: number;
  statusText?: string;
  error?: string;
  latencyMs: number;
  sentAt: string;
  payload: object;
  url: string;
  method: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    new: { label: "New", variant: "default" },
    processed: { label: "Processed", variant: "secondary" },
    duplicate: { label: "Duplicate", variant: "outline" },
    error: { label: "Error", variant: "destructive" },
  };
  const cfg = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={cfg.variant} className="text-[10px] capitalize">{cfg.label}</Badge>;
}

function LeadRow({ lead }: { lead: WebhookLead }) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 px-3 py-2.5 text-sm border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
      <div className="truncate font-medium text-foreground">{lead.name ?? "—"}</div>
      <div className="truncate text-muted-foreground">{lead.email ?? lead.phone ?? "—"}</div>
      <div className="truncate text-muted-foreground">{lead.location ?? lead.project_type ?? "—"}</div>
      <StatusBadge status={lead.status} />
      <div className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(lead.received_at), { addSuffix: true })}
      </div>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 gap-1 text-xs">
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
      {label ?? (copied ? "Copied" : "Copy")}
    </Button>
  );
}

export function LeadsWebhookConfig() {
  const { data: config, isLoading } = useGetWebhookConfig();
  const upsert = useUpsertWebhookConfig();
  const { data: leads = [], isLoading: leadsLoading, refetch: refetchLeads } = useWebhookLeads();
  const { toast } = useToast();

  const [webhookUrl, setWebhookUrl] = useState("");
  const [httpMethod, setHttpMethod] = useState("POST");
  const [dataFormat, setDataFormat] = useState("JSON");
  const [isActive, setIsActive] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (config) {
      setWebhookUrl(config.webhook_url ?? "");
      setHttpMethod(config.http_method);
      setDataFormat(config.data_format);
      setIsActive(config.is_active);
    }
  }, [config]);

  const inboundUrl = userId
    ? `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/receive-lead?agent=${userId}`
    : "";

  const handleSave = () => {
    upsert.mutate({
      webhook_url: webhookUrl || null,
      http_method: httpMethod,
      data_format: dataFormat,
      is_active: isActive,
    });
  };

  const handleTest = async () => {
    if (!webhookUrl) {
      toast({ title: "No URL configured", description: "Please enter a webhook URL first.", variant: "destructive" });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    const sentAt = new Date().toISOString();
    const t0 = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke("test-webhook", {
        body: { webhook_url: webhookUrl, http_method: httpMethod },
      });
      const latencyMs = Date.now() - t0;
      if (error) throw error;
      const result: TestResult = {
        success: data?.success ?? false,
        status: data?.status,
        statusText: data?.statusText,
        error: data?.error,
        latencyMs,
        sentAt,
        payload: { ...EXAMPLE_PAYLOAD, test: true, sent_at: sentAt },
        url: webhookUrl,
        method: httpMethod,
      };
      setTestResult(result);
    } catch (err: any) {
      const latencyMs = Date.now() - t0;
      setTestResult({
        success: false,
        error: err.message,
        latencyMs,
        sentAt,
        payload: { ...EXAMPLE_PAYLOAD, test: true, sent_at: sentAt },
        url: webhookUrl,
        method: httpMethod,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Webhook className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Webhook Integration</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Receive & forward lead data via webhook
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
              {isActive ? "Active" : "Inactive"}
            </Badge>
            {leads.length > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <ArrowDownToLine className="h-3 w-3" />
                {leads.length} received
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => setCollapsed((c) => !c)}>
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-0 p-0">
          <Tabs defaultValue="inbound" className="w-full">
            <TabsList className="w-full rounded-none border-b border-border/50 bg-transparent h-9 px-4 gap-4 justify-start">
              <TabsTrigger value="inbound" className="text-xs h-8 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <ArrowDownToLine className="h-3 w-3 mr-1.5" />
                Receive Leads
              </TabsTrigger>
              <TabsTrigger value="outbound" className="text-xs h-8 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <Send className="h-3 w-3 mr-1.5" />
                Forward to CRM
              </TabsTrigger>
              <TabsTrigger value="log" className="text-xs h-8 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                Lead Log
                {leads.length > 0 && (
                  <span className="ml-1.5 text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5">{leads.length}</span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── INBOUND TAB ── */}
            <TabsContent value="inbound" className="p-5 space-y-5 mt-0">
              <div className="rounded-lg bg-muted/40 border border-border/50 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Share your <strong className="text-foreground">Inbound Webhook URL</strong> with lead partners or lead forms. When they POST a lead payload, it's validated, deduplicated, and stored automatically.
                  </p>
                </div>
              </div>

              {/* Inbound URL */}
              <div className="space-y-1.5">
                <Label>Your Inbound Webhook URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={inboundUrl}
                    className="font-mono text-xs bg-muted/50"
                  />
                  <CopyButton text={inboundUrl} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Give this URL to lead sources — they POST to it, you receive the leads here.
                </p>
              </div>

              <Separator />

              {/* Expected payload */}
              <div className="space-y-2">
                <Label className="text-xs">Expected Payload (JSON — POST body)</Label>
                <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto text-foreground leading-relaxed">
{JSON.stringify(EXAMPLE_PAYLOAD, null, 2)}
                </pre>
              </div>

              {/* Response spec */}
              <div className="space-y-2">
                <Label className="text-xs">Endpoint Responses</Label>
                <div className="grid gap-3">
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border-b border-border/40">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary">200 OK — Lead queued</span>
                    </div>
                    <pre className="p-3 text-xs font-mono text-foreground leading-relaxed">{JSON.stringify(SUCCESS_RESPONSE, null, 2)}</pre>
                  </div>
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/60 border-b border-border/40">
                      <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground">200 OK — Duplicate (safe retry)</span>
                    </div>
                    <pre className="p-3 text-xs font-mono text-foreground leading-relaxed">{JSON.stringify(DUPLICATE_RESPONSE, null, 2)}</pre>
                  </div>
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border-b border-border/40">
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-xs font-semibold text-destructive">400 — Validation error</span>
                    </div>
                    <pre className="p-3 text-xs font-mono text-foreground leading-relaxed">{JSON.stringify(ERROR_RESPONSE, null, 2)}</pre>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── OUTBOUND TAB ── */}
            <TabsContent value="outbound" className="p-5 space-y-5 mt-0">
              <div className="rounded-lg bg-muted/40 border border-border/50 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Optionally forward received leads to an <strong className="text-foreground">external CRM or system</strong>. Configure the target endpoint below.
                  </p>
                </div>
              </div>

              {/* Webhook URL */}
              <div className="space-y-1.5">
                <Label htmlFor="webhook-url">Forwarding Webhook URL</Label>
                <Input
                  id="webhook-url"
                  placeholder="https://your-crm.com/api/leads"
                  value={webhookUrl}
                  onChange={(e) => { setWebhookUrl(e.target.value); setTestResult(null); }}
                />
                <p className="text-xs text-muted-foreground">The endpoint where received lead data will be forwarded automatically</p>
              </div>

              {/* HTTP Method + Data Format */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>HTTP Method</Label>
                  <Select value={httpMethod} onValueChange={(v) => { setHttpMethod(v); setTestResult(null); }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">HTTP POST</SelectItem>
                      <SelectItem value="GET">HTTP GET</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {httpMethod === "POST" ? "POST sends data in body" : "GET sends as query params"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Data Format</Label>
                  <Select value={dataFormat} onValueChange={setDataFormat}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JSON">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Format of the lead data sent to your endpoint</p>
                </div>
              </div>

              {/* Example Payload */}
              <div className="space-y-1.5">
                <Label className="text-xs">Example Payload ({dataFormat})</Label>
                <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto text-foreground leading-relaxed">
{JSON.stringify(EXAMPLE_PAYLOAD, null, 2)}
                </pre>
              </div>

              {/* Active Toggle + Actions */}
              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <Switch id="webhook-active" checked={isActive} onCheckedChange={setIsActive} />
                  <Label htmlFor="webhook-active" className="cursor-pointer">
                    {isActive ? "Forwarding active" : "Forwarding inactive"}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleTest} disabled={isTesting || !webhookUrl}>
                    {isTesting
                      ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      : <Send className="h-4 w-4 mr-1.5" />}
                    {isTesting ? "Sending..." : "Test Webhook"}
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={upsert.isPending || isLoading}>
                    <Save className="h-4 w-4 mr-1.5" />
                    {upsert.isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>

              {/* ── Test Result Panel ── */}
              {testResult && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2.5",
                      testResult.success
                      ? "bg-primary/10 border border-primary/20"
                        : "bg-destructive/10 border border-destructive/20"
                    )}>
                      {testResult.success
                        ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                      <span className={cn("text-sm font-medium", testResult.success ? "text-primary" : "text-destructive")}>
                        {testResult.success ? "Payload delivered successfully" : "Delivery failed"}
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {testResult.latencyMs}ms
                      </span>
                    </div>

                    <div className="rounded-lg border border-border/50 overflow-hidden text-xs">
                      <div className="bg-muted/50 px-3 py-1.5 font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Request Details</div>
                      <div className="divide-y divide-border/40">
                        <div className="flex items-center px-3 py-2 gap-3">
                          <span className="text-muted-foreground w-24 shrink-0">Method</span>
                          <Badge variant="outline" className="text-[10px] font-mono">{testResult.method}</Badge>
                        </div>
                        <div className="flex items-start px-3 py-2 gap-3">
                          <span className="text-muted-foreground w-24 shrink-0">Endpoint</span>
                          <span className="font-mono break-all text-foreground">{testResult.url}</span>
                        </div>
                        <div className="flex items-center px-3 py-2 gap-3">
                          <span className="text-muted-foreground w-24 shrink-0">Sent at</span>
                          <span className="font-mono text-foreground">{new Date(testResult.sentAt).toLocaleString()}</span>
                        </div>
                        {testResult.status != null && (
                          <div className="flex items-center px-3 py-2 gap-3">
                            <span className="text-muted-foreground w-24 shrink-0">Response</span>
                            <Badge variant={testResult.success ? "default" : "destructive"} className="text-[10px] font-mono">
                              {testResult.status} {testResult.statusText}
                            </Badge>
                          </div>
                        )}
                        {testResult.error && (
                          <div className="flex items-start px-3 py-2 gap-3">
                            <span className="text-muted-foreground w-24 shrink-0">Error</span>
                            <span className="font-mono text-destructive break-all">{testResult.error}</span>
                          </div>
                        )}
                        <div className="flex items-center px-3 py-2 gap-3">
                          <span className="text-muted-foreground w-24 shrink-0">Latency</span>
                          <span className={cn(
                            "font-mono",
                            testResult.latencyMs < 500 ? "text-primary" : testResult.latencyMs < 2000 ? "text-muted-foreground" : "text-destructive"
                          )}>
                            {testResult.latencyMs}ms {testResult.latencyMs < 500 ? "(fast)" : testResult.latencyMs < 2000 ? "(ok)" : "(slow)"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                        <AlertCircle className="h-3 w-3" />
                        Payload Sent
                      </div>
                      <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto text-foreground leading-relaxed">
{JSON.stringify(testResult.payload, null, 2)}
                      </pre>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── LEAD LOG TAB ── */}
            <TabsContent value="log" className="mt-0">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <div className="text-xs text-muted-foreground">
                  {leads.length === 0 ? "No leads received yet" : `${leads.length} leads received`}
                </div>
                <Button variant="ghost" size="sm" onClick={() => refetchLeads()} className="h-7 gap-1.5 text-xs">
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </Button>
              </div>

              {leadsLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading leads…
                </div>
              ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <ArrowDownToLine className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">No leads yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      Once a lead partner POSTs to your inbound URL, leads will appear here with full audit details.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Header row */}
                  <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 px-3 py-2 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold bg-muted/30 border-b border-border/40">
                    <span>Name</span>
                    <span>Contact</span>
                    <span>Details</span>
                    <span>Status</span>
                    <span>Received</span>
                  </div>
                  {leads.map((lead) => <LeadRow key={lead.id} lead={lead} />)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
