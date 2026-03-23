import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { ArrowLeft, RefreshCw, Eye, Mail, BookOpen, CheckCircle, Clock, DollarSign, CreditCard, CalendarIcon, Shield, Zap, XCircle, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

type LoanApplication = {
  id: string;
  created_at: string;
  application_number: string;
  status: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  alt_phone: string;
  date_of_birth: string;
  ssn_last_four: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  housing_status: string;
  years_at_address: string;
  employment_status: string;
  employer_name: string;
  job_title: string;
  years_employed: string;
  monthly_income: number;
  other_income: number;
  other_income_source: string;
  loan_amount_requested: number;
  loan_purpose: string;
  trip_description: string;
  travel_date: string;
  down_payment: number;
  preferred_term_months: number;
  monthly_rent_mortgage: number;
  monthly_car_payment: number;
  monthly_other_debt: number;
  checking_account: boolean;
  savings_account: boolean;
  bankruptcy_history: boolean;
  bankruptcy_details: string;
  reference1_name: string;
  reference1_phone: string;
  reference1_relation: string;
  reference2_name: string;
  reference2_phone: string;
  reference2_relation: string;
  ip_address: string;
  consent_credit_check: boolean;
  consent_terms: boolean;
  esignature: string;
  signed_at: string;
  agent_notes: string;
  assigned_to: string;
  decision_date: string;
  decision_notes: string;
  approved_amount: number;
  approved_rate: number;
  approved_term_months: number;
  // Autopay fields
  autopay_method: string | null;
  consent_autopay: boolean | null;
  autopay_esignature: string | null;
  autopay_signed_at: string | null;
  autopay_active: boolean | null;
  autopay_start_date: string | null;
  stripe_payment_method_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  reviewing: "secondary",
  approved: "default",
  denied: "destructive",
  more_info: "outline",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "border-amber-400 text-amber-600 bg-amber-50",
  reviewing: "border-blue-400 text-blue-600 bg-blue-50",
  approved: "border-emerald-400 text-emerald-600 bg-emerald-50",
  denied: "border-red-400 text-red-600 bg-red-50",
  more_info: "border-purple-400 text-purple-600 bg-purple-50",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending Review",
  reviewing: "Under Review",
  approved: "Approved",
  denied: "Denied",
  more_info: "More Info Needed",
};

function fmt$(n: number | null) {
  if (!n && n !== 0) return "—";
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={STATUS_VARIANT[status] || "outline"}
      className={STATUS_CLASS[status] || ""}
    >
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}

// ── Detail Section ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="py-3 px-4 bg-muted/50 border-b">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-1">{children}</CardContent>
    </Card>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-border/50 last:border-0 gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-right ${highlight ? "text-destructive" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────

export default function LoanApplicationsManager() {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LoanApplication | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [syncingQBO, setSyncingQBO] = useState(false);
  const [syncingPaymentStatus, setSyncingPaymentStatus] = useState(false);
  const [paymentSchedule, setPaymentSchedule] = useState<any[]>([]);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [approvedRate, setApprovedRate] = useState("");
  const [approvedTerm, setApprovedTerm] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [showAutopayModal, setShowAutopayModal] = useState(false);
  const [autopayStartDate, setAutopayStartDate] = useState<Date | undefined>(addDays(new Date(), 30));
  const [activatingAutopay, setActivatingAutopay] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchApplications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("loan_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load applications");
      console.error(error);
    }
    setApplications((data as LoanApplication[]) || []);
    setLoading(false);
  };

  const fetchPaymentSchedule = async (loanId: string) => {
    const { data } = await supabase
      .from("loan_payment_schedules")
      .select("*")
      .eq("loan_application_id", loanId)
      .order("payment_number", { ascending: true });
    setPaymentSchedule(data || []);
  };

  const syncToQBO = async () => {
    if (!selected) return;
    setSyncingQBO(true);
    try {
      const { data, error } = await supabase.functions.invoke("qbo-sync", {
        body: { loan_application_id: selected.id },
        headers: { "x-action": "sync-loan-financing" },
      });
      // The qbo-sync function uses query params, so let's call it properly
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/qbo-sync?action=sync-loan-financing`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ loan_application_id: selected.id }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Sync failed");
      toast.success(`Synced to QuickBooks: ${result.invoices_created} invoices created`);
      await fetchPaymentSchedule(selected.id);
    } catch (err: any) {
      console.error("QBO sync error:", err);
      toast.error(err.message || "Failed to sync to QuickBooks");
    } finally {
      setSyncingQBO(false);
    }
  };

  const syncPaymentStatus = async () => {
    if (!selected) return;
    setSyncingPaymentStatus(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/qbo-sync?action=loan-payment-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ loan_application_id: selected.id }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Sync failed");
      toast.success(`Updated ${result.updated} payment(s) from QuickBooks`);
      await fetchPaymentSchedule(selected.id);
    } catch (err: any) {
      console.error("Payment status sync error:", err);
      toast.error(err.message || "Failed to sync payment status");
    } finally {
      setSyncingPaymentStatus(false);
    }
  };

  const markPaymentPaid = async (scheduleId: string) => {
    setMarkingPaid(scheduleId);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/qbo-sync?action=sync-loan-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ schedule_id: scheduleId }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Failed");
      toast.success("Payment recorded & synced to QuickBooks");
      if (selected) await fetchPaymentSchedule(selected.id);
    } catch (err: any) {
      console.error("Mark paid error:", err);
      toast.error(err.message || "Failed to record payment");
    } finally {
      setMarkingPaid(null);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    if (selected) {
      setNotes(selected.agent_notes || "");
      setNewStatus(selected.status);
      setApprovedAmount(selected.approved_amount?.toString() || "");
      setApprovedRate(selected.approved_rate?.toString() || "");
      setApprovedTerm(selected.approved_term_months?.toString() || "");
      setDecisionNotes(selected.decision_notes || "");
      fetchPaymentSchedule(selected.id);
    } else {
      setPaymentSchedule([]);
    }
  }, [selected]);

  const activateAutopay = async () => {
    if (!selected) return;
    setActivatingAutopay(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/activate-autopay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loan_id: selected.id,
            stripe_payment_method_id: selected.stripe_payment_method_id,
            approved_amount: selected.approved_amount,
            approved_rate: selected.approved_rate || 0,
            approved_term_months: selected.approved_term_months,
            autopay_start_date: autopayStartDate ? format(autopayStartDate, "yyyy-MM-dd") : undefined,
            customer_name: `${selected.first_name} ${selected.last_name}`,
            customer_email: selected.email,
          }),
        }
      );
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || "Activation failed");
      toast.success(`Auto-payment activated! Monthly: $${result.monthly_payment_dollars}`);
      setShowAutopayModal(false);
      // Refresh the selected record
      const { data } = await supabase
        .from("loan_applications")
        .select("*")
        .eq("id", selected.id)
        .single();
      if (data) setSelected(data as LoanApplication);
      await fetchApplications();
    } catch (err: any) {
      console.error("Activate autopay error:", err);
      toast.error(err.message || "Failed to activate auto-payment");
    } finally {
      setActivatingAutopay(false);
    }
  };

  const saveDecision = async () => {
    if (!selected) return;
    setSaving(true);
    const update: Record<string, unknown> = {
      status: newStatus,
      agent_notes: notes,
      decision_notes: decisionNotes,
      updated_at: new Date().toISOString(),
    };
    if (newStatus === "approved") {
      update.decision_date = new Date().toISOString();
      update.approved_amount = approvedAmount ? parseFloat(approvedAmount) : null;
      update.approved_rate = approvedRate ? parseFloat(approvedRate) : null;
      update.approved_term_months = approvedTerm ? parseInt(approvedTerm) : null;
    }
    const { error } = await supabase.from("loan_applications").update(update).eq("id", selected.id);
    if (error) {
      toast.error("Failed to save decision");
    } else {
      toast.success("Decision saved");
    }
    await fetchApplications();
    setSelected((prev) => (prev ? ({ ...prev, ...update } as LoanApplication) : prev));
    setSaving(false);
  };

  const sendApprovalEmail = async () => {
    if (!selected || selected.status !== "approved") return;
    if (!selected.approved_amount || !selected.approved_term_months) {
      toast.error("Please save approved amount and term before sending email");
      return;
    }
    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: selected.email,
          subject: `🎉 Your Travel Financing Has Been Approved! — ${selected.application_number}`,
          template: "loan_approval",
          data: {
            clientName: `${selected.first_name} ${selected.last_name}`,
            applicationNumber: selected.application_number,
            approvedAmount: selected.approved_amount.toString(),
            approvedRate: (selected.approved_rate || 4.7).toString(),
            approvedTermMonths: selected.approved_term_months.toString(),
            tripDescription: selected.trip_description || "",
            decisionNotes: selected.decision_notes || "",
          },
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to send");
      toast.success("Approval email sent to " + selected.email);
    } catch (err) {
      console.error("Error sending approval email:", err);
      toast.error("Failed to send approval email");
    } finally {
      setSendingEmail(false);
    }
  };

  const filtered = applications.filter((a) => {
    const matchStatus = filter === "all" || a.status === filter;
    const matchSearch =
      !search ||
      [a.first_name, a.last_name, a.email, a.application_number, a.phone]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === "pending").length,
    reviewing: applications.filter((a) => a.status === "reviewing").length,
    approved: applications.filter((a) => a.status === "approved").length,
    totalRequested: applications.reduce((s, a) => s + (a.loan_amount_requested || 0), 0),
  };

  // ── Detail View ─────────────────────────────────────────────────────────

  if (selected) {
    const obligations =
      (selected.monthly_rent_mortgage || 0) +
      (selected.monthly_car_payment || 0) +
      (selected.monthly_other_debt || 0);
    const dti = selected.monthly_income
      ? ((obligations / selected.monthly_income) * 100).toFixed(1)
      : null;
    const available = selected.monthly_income ? selected.monthly_income - obligations : null;

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pdfLoading}
              onClick={async () => {
                setPdfLoading(true);
                try {
                  const res = await fetch(
                    `https://zbtnulzvwreqzbmxulpv.supabase.co/functions/v1/export-loan-pdf`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(selected),
                    }
                  );
                  if (!res.ok) throw new Error('PDF generation failed');
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selected.application_number}.pdf`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (e: any) {
                  toast.error(e.message || 'Failed to download PDF');
                } finally {
                  setPdfLoading(false);
                }
              }}
            >
              {pdfLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
              {pdfLoading ? 'Generating…' : '⬇ Download PDF'}
            </Button>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {selected.first_name} {selected.last_name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {selected.application_number} · Submitted {fmtDate(selected.created_at)}
              </p>
            </div>
          </div>
          <StatusBadge status={selected.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
          {/* Left — Application details */}
          <div className="space-y-4">
            <Section title="Personal Information">
              <Row label="Full Name" value={`${selected.first_name} ${selected.last_name}`} />
              <Row label="Email" value={selected.email} />
              <Row label="Phone" value={selected.phone} />
              {selected.alt_phone && <Row label="Alt Phone" value={selected.alt_phone} />}
              <Row label="Date of Birth" value={fmtDate(selected.date_of_birth)} />
              <Row label="SSN (last 4)" value={selected.ssn_last_four || "—"} />
            </Section>

            <Section title="Address">
              <Row label="Street" value={`${selected.address_line1}${selected.address_line2 ? ", " + selected.address_line2 : ""}`} />
              <Row label="City / State / Zip" value={`${selected.city}, ${selected.state} ${selected.zip_code}`} />
              <Row label="Housing Status" value={selected.housing_status || "—"} />
              <Row label="Years at Address" value={selected.years_at_address || "—"} />
            </Section>

            <Section title="Employment & Income">
              <Row label="Status" value={selected.employment_status} />
              <Row label="Employer" value={selected.employer_name || "—"} />
              <Row label="Title" value={selected.job_title || "—"} />
              <Row label="Years Employed" value={selected.years_employed || "—"} />
              <Row label="Monthly Income" value={fmt$(selected.monthly_income)} />
              <Row label="Other Income" value={`${fmt$(selected.other_income)}${selected.other_income_source ? " (" + selected.other_income_source + ")" : ""}`} />
            </Section>

            <Section title="Loan Details">
              <Row label="Amount Requested" value={fmt$(selected.loan_amount_requested)} />
              <Row label="Purpose" value={selected.loan_purpose || "—"} />
              <Row label="Down Payment" value={fmt$(selected.down_payment)} />
              <Row label="Preferred Term" value={selected.preferred_term_months ? `${selected.preferred_term_months} months` : "—"} />
              <Row label="Travel Date" value={fmtDate(selected.travel_date)} />
              {selected.trip_description && <Row label="Trip Description" value={selected.trip_description} />}
            </Section>

            <Section title="Financial Obligations">
              <Row label="Rent / Mortgage" value={fmt$(selected.monthly_rent_mortgage)} />
              <Row label="Car Payment" value={fmt$(selected.monthly_car_payment)} />
              <Row label="Other Debt" value={fmt$(selected.monthly_other_debt)} />
              <Row label="Checking Account" value={selected.checking_account ? "Yes" : "No"} />
              <Row label="Savings Account" value={selected.savings_account ? "Yes" : "No"} />
              {selected.bankruptcy_history && (
                <Row label="Bankruptcy" value={selected.bankruptcy_details || "Yes"} highlight />
              )}
            </Section>

            <Section title="References">
              {selected.reference1_name ? (
                <Row
                  label={selected.reference1_relation || "Reference 1"}
                  value={`${selected.reference1_name} — ${selected.reference1_phone || "—"}`}
                />
              ) : (
                <p className="text-xs text-muted-foreground">No references provided</p>
              )}
              {selected.reference2_name && (
                <Row
                  label={selected.reference2_relation || "Reference 2"}
                  value={`${selected.reference2_name} — ${selected.reference2_phone || "—"}`}
                />
              )}
            </Section>

            <Section title="Consent & Signature">
              <Row label="Credit Check Consent" value={selected.consent_credit_check ? "✅ Yes" : "❌ No"} />
              <Row label="Terms Accepted" value={selected.consent_terms ? "✅ Yes" : "❌ No"} />
              {selected.esignature && <Row label="E-Signature" value={selected.esignature} />}
              {selected.signed_at && <Row label="Signed At" value={fmtDate(selected.signed_at)} />}
            </Section>
          </div>

          {/* Right — Decision panel + Quick Analysis */}
          <div className="space-y-4 lg:sticky lg:top-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold">Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newStatus === "approved" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Approved Amount ($)</Label>
                      <Input
                        type="number"
                        value={approvedAmount}
                        onChange={(e) => setApprovedAmount(e.target.value)}
                        placeholder={selected.loan_amount_requested?.toString()}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Interest Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={approvedRate}
                        onChange={(e) => setApprovedRate(e.target.value)}
                        placeholder="e.g. 12.9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Term (months)</Label>
                      <Select value={approvedTerm} onValueChange={setApprovedTerm}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select term" />
                        </SelectTrigger>
                        <SelectContent>
                          {["12", "24", "36", "48", "60"].map((t) => (
                            <SelectItem key={t} value={t}>
                              {t} months
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs">Decision Notes</Label>
                  <Textarea
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    rows={3}
                    placeholder="Notes for the applicant (may be shared)..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Internal Agent Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Internal notes (not shared with applicant)..."
                  />
                </div>

                <Button onClick={saveDecision} disabled={saving} className="w-full">
                  {saving ? "Saving..." : "Save Decision"}
                </Button>

                {(newStatus === "approved" || selected.status === "approved") && (
                  <Button
                    onClick={async () => {
                      if (selected.status !== "approved") {
                        toast.error("Please save the decision first");
                        return;
                      }
                      if (!approvedAmount || !approvedTerm) {
                        toast.error("Please fill in approved amount and term, then save");
                        return;
                      }
                      await sendApprovalEmail();
                    }}
                    disabled={sendingEmail}
                    variant="outline"
                    className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Mail className="h-4 w-4 mr-1.5" />
                    {sendingEmail ? "Sending..." : "Send Approval Email"}
                  </Button>
                )}

                {/* QBO Sync Button */}
                {selected.status === "approved" && (
                  <Button
                    onClick={syncToQBO}
                    disabled={syncingQBO}
                    variant="outline"
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <BookOpen className="h-4 w-4 mr-1.5" />
                    {syncingQBO ? "Syncing..." : paymentSchedule.length > 0 ? "Re-sync to QuickBooks" : "Sync Financing to QuickBooks"}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3 px-4 bg-muted/50 border-b">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-0">
                {[
                  { label: "Requested", value: fmt$(selected.loan_amount_requested) },
                  { label: "Monthly Income", value: fmt$(selected.monthly_income) },
                  { label: "Obligations", value: fmt$(obligations) },
                  { label: "Available (est.)", value: available !== null ? fmt$(available) : "—" },
                  { label: "DTI", value: dti ? `${dti}%` : "—" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between py-1.5 border-b border-border/50 last:border-0"
                  >
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* ── Autopay Panel ─────────────────────────────────────── */}
            {selected.status === "approved" && selected.consent_autopay && selected.stripe_payment_method_id && (
              <Card className={selected.autopay_active ? "border-emerald-300" : "border-amber-300"}>
                <CardHeader className="py-3 px-4 bg-muted/50 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" />
                      Auto-Payment
                    </CardTitle>
                    {selected.autopay_active ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">
                        <CheckCircle className="h-3 w-3 mr-0.5" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">
                        <XCircle className="h-3 w-3 mr-0.5" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-0">
                  {selected.autopay_active ? (
                    <>
                      <Row
                        label="Stripe Customer"
                        value={selected.stripe_customer_id ? selected.stripe_customer_id.slice(0, 8) + "..." : "—"}
                      />
                      <Row
                        label="Subscription"
                        value={selected.stripe_subscription_id ? selected.stripe_subscription_id.slice(0, 8) + "..." : "—"}
                      />
                      <Row
                        label="First Payment"
                        value={fmtDate(selected.autopay_start_date)}
                      />
                      <Row
                        label="Monthly Payment"
                        value={selected.approved_amount && selected.approved_term_months
                          ? fmt$(Math.ceil(selected.approved_amount / selected.approved_term_months))
                          : "—"}
                      />
                      <Row
                        label="Active Since"
                        value={fmtDate(selected.autopay_signed_at)}
                      />
                      <Row
                        label="Payment Method"
                        value={selected.autopay_method === "bank" ? "Bank Account" : "Card"}
                      />
                      <div className="pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs border-destructive/30 text-destructive hover:bg-destructive/5"
                          onClick={async () => {
                            if (!selected.stripe_subscription_id) {
                              toast.error("No subscription ID found for this application.");
                              return;
                            }
                            const confirmed = window.confirm("Are you sure you want to cancel this auto-payment? This will immediately stop all future charges.");
                            if (!confirmed) return;
                            try {
                              toast.loading("Cancelling auto-payment...", { id: "cancel-autopay" });
                              const { data, error } = await supabase.functions.invoke("cancel-autopay", {
                                body: {
                                  subscription_id: selected.stripe_subscription_id,
                                  application_id: selected.id,
                                },
                              });
                              if (error) throw error;
                              if (data?.error) throw new Error(data.error);
                              toast.success("Auto-payment cancelled successfully.", { id: "cancel-autopay" });
                              fetchApplications();
                            } catch (err: any) {
                              toast.error(err.message || "Failed to cancel auto-payment.", { id: "cancel-autopay" });
                            }
                          }}
                        >
                          Cancel Auto-Payment
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Row
                        label="Payment Method"
                        value={selected.autopay_method === "bank" ? "Bank Account" : "Card"}
                      />
                      <Row
                        label="Stripe PM Token"
                        value={selected.stripe_payment_method_id.slice(0, 8) + "..."}
                      />
                      <Row
                        label="Applicant Signed"
                        value={fmtDate(selected.autopay_signed_at)}
                      />
                      <div className="pt-3">
                        <Button
                          className="w-full"
                          size="sm"
                          onClick={() => {
                            setAutopayStartDate(addDays(new Date(), 30));
                            setShowAutopayModal(true);
                          }}
                        >
                          <Zap className="h-3.5 w-3.5 mr-1.5" />
                          Activate Auto-Payment
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Autopay Activation Modal */}
            <Dialog open={showAutopayModal} onOpenChange={setShowAutopayModal}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Activate Auto-Payment
                  </DialogTitle>
                  <DialogDescription>
                    Review the details below and select a start date for automatic payments.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                  <div className="rounded-lg bg-muted/50 p-3 space-y-0">
                    <Row label="Applicant" value={`${selected.first_name} ${selected.last_name}`} />
                    <Row label="Approved Amount" value={fmt$(selected.approved_amount)} />
                    <Row label="Interest Rate" value={selected.approved_rate ? `${selected.approved_rate}%` : "0%"} />
                    <Row label="Term" value={selected.approved_term_months ? `${selected.approved_term_months} months` : "—"} />
                    <Row
                      label="Est. Monthly Payment"
                      value={selected.approved_amount && selected.approved_term_months
                        ? fmt$(Math.ceil(selected.approved_amount / selected.approved_term_months))
                        : "—"}
                    />
                    <Row label="Payment Method" value={selected.autopay_method === "bank" ? "Bank Account" : "Card"} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">First Payment Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !autopayStartDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {autopayStartDate ? format(autopayStartDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={autopayStartDate}
                          onSelect={setAutopayStartDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                    <p className="text-xs text-amber-800">
                      <strong>⚠️ Warning:</strong> This will immediately create a Stripe Customer and Subscription.
                      The applicant's payment method will be charged on the selected start date.
                    </p>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setShowAutopayModal(false)} disabled={activatingAutopay}>
                    Cancel
                  </Button>
                  <Button onClick={activateAutopay} disabled={activatingAutopay || !autopayStartDate}>
                    {activatingAutopay ? "Activating..." : "Confirm & Activate"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Payment Schedule Section */}
        {paymentSchedule.length > 0 && (
          <Card className="mt-5">
            <CardHeader className="py-3 px-4 bg-muted/50 border-b flex-row items-center justify-between">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Repayment Schedule ({paymentSchedule.length} payments)
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={syncPaymentStatus}
                  disabled={syncingPaymentStatus}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncingPaymentStatus ? "animate-spin" : ""}`} />
                  {syncingPaymentStatus ? "Syncing..." : "Sync from QBO"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Summary */}
              {(() => {
                const paid = paymentSchedule.filter((p: any) => p.status === "paid");
                const totalPaid = paid.reduce((s: number, p: any) => s + Number(p.total_payment), 0);
                const totalDue = paymentSchedule.reduce((s: number, p: any) => s + Number(p.total_payment), 0);
                const pctPaid = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;
                return (
                  <div className="mb-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {paid.length} of {paymentSchedule.length} payments complete
                      </span>
                      <span className="font-semibold text-foreground">
                        {fmt$(totalPaid)} / {fmt$(totalDue)}
                      </span>
                    </div>
                    <Progress value={pctPaid} className="h-2" />
                  </div>
                );
              })()}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-12">#</TableHead>
                    <TableHead className="text-xs">Due Date</TableHead>
                    <TableHead className="text-xs text-right">Principal</TableHead>
                    <TableHead className="text-xs text-right">Interest</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                    <TableHead className="text-xs text-center">QBO</TableHead>
                    <TableHead className="text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentSchedule.map((pmt: any) => (
                    <TableRow key={pmt.id}>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {pmt.payment_number}
                      </TableCell>
                      <TableCell className="text-xs">
                        {fmtDate(pmt.due_date)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {fmt$(pmt.principal_amount)}
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">
                        {fmt$(pmt.interest_amount)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold">
                        {fmt$(pmt.total_payment)}
                      </TableCell>
                      <TableCell className="text-center">
                        {pmt.status === "paid" ? (
                          <Badge variant="default" className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">
                            <CheckCircle className="h-3 w-3 mr-0.5" />
                            Paid
                          </Badge>
                        ) : new Date(pmt.due_date) < new Date() ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Overdue
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            <Clock className="h-3 w-3 mr-0.5" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {pmt.qbo_invoice_id ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Synced
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {pmt.status !== "paid" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markPaymentPaid(pmt.id)}
                            disabled={markingPaid === pmt.id}
                          >
                            <DollarSign className="h-3.5 w-3.5 mr-0.5" />
                            {markingPaid === pmt.id ? "..." : "Mark Paid"}
                          </Button>
                        )}
                        {pmt.status === "paid" && pmt.paid_date && (
                          <span className="text-[10px] text-muted-foreground">
                            {fmtDate(pmt.paid_date)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── List View ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Loan Applications</h2>
          <p className="text-sm text-muted-foreground">In-house travel financing applications</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchApplications}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "Pending", value: stats.pending, cls: "text-amber-600" },
          { label: "Under Review", value: stats.reviewing, cls: "text-blue-600" },
          { label: "Approved", value: stats.approved, cls: "text-emerald-600" },
          { label: "Total Requested", value: fmt$(stats.totalRequested) },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${s.cls || "text-foreground"}`}>{s.value}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, application #..."
          className="flex-1 min-w-[200px]"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Loading applications...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">No applications found</div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">App #</TableHead>
                <TableHead className="text-xs">Applicant</TableHead>
                <TableHead className="text-xs">Amount</TableHead>
                <TableHead className="text-xs">Purpose</TableHead>
                <TableHead className="text-xs">Submitted</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((app) => (
                <TableRow key={app.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(app)}>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {app.application_number}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-semibold text-foreground">
                      {app.first_name} {app.last_name}
                    </div>
                    <div className="text-xs text-muted-foreground">{app.email}</div>
                  </TableCell>
                  <TableCell className="font-semibold text-sm">
                    {fmt$(app.loan_amount_requested)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">
                    {app.loan_purpose || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fmtDate(app.created_at)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={app.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(app);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
