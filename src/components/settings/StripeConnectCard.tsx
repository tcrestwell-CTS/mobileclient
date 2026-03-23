import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, CheckCircle2, AlertCircle, Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useStripeConnect } from "@/hooks/useStripeConnect";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function StripeConnectCard() {
  const { status, loading, creating, fetchStatus, createAccount } = useStripeConnect();
  const [showForm, setShowForm] = useState(false);
  const [formOpen, setFormOpen] = useState(true);
  
  const [formData, setFormData] = useState({
    business_type: "company",
    business_name: "",
    tax_id: "",
    address_line1: "",
    address_city: "",
    address_state: "",
    address_postal_code: "",
    business_url: "",
    representative_first_name: "",
    representative_last_name: "",
    representative_dob_day: "",
    representative_dob_month: "",
    representative_dob_year: "",
    representative_ssn_last_4: "",
    representative_address_line1: "",
    representative_address_city: "",
    representative_address_state: "",
    representative_address_postal_code: "",
  });

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSubmit = async () => {
    // Get user's IP for TOS acceptance
    let tos_ip = "0.0.0.0";
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      tos_ip = data.ip;
    } catch { /* fallback IP is fine */ }

    await createAccount({ ...formData, tos_ip });
    setShowForm(false);
  };

  const getStatusBadge = () => {
    if (!status?.exists) return null;
    
    switch (status.onboardingStatus) {
      case "complete":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Active</Badge>;
      case "action_required":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Action Required</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> In Progress</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getCapabilityBadge = (status: string | undefined) => {
    if (status === "active") return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">Active</Badge>;
    if (status === "pending") return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">Pending</Badge>;
    return <Badge variant="secondary" className="text-xs">Inactive</Badge>;
  };

  if (loading && !status) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-base">Stripe Connect & Issuing</CardTitle>
              <CardDescription>Issue virtual cards for supplier payments</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {status?.exists && (
              <Button variant="ghost" size="icon" onClick={fetchStatus} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.exists ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground mb-1">Card Issuing</p>
                {getCapabilityBadge(status.cardIssuingStatus)}
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs text-muted-foreground mb-1">Transfers</p>
                {getCapabilityBadge(status.transfersStatus)}
              </div>
            </div>

            {status.businessName && (
              <p className="text-sm text-muted-foreground">
                Business: <span className="text-foreground font-medium">{status.businessName}</span>
              </p>
            )}

            {(status.requirementsPastDue?.length ?? 0) > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-medium text-destructive mb-1">Past Due Requirements</p>
                <ul className="text-xs text-destructive/80 space-y-1">
                  {status.requirementsPastDue?.map((req) => (
                    <li key={req}>• {req.replace(/_/g, " ").replace(/\./g, " → ")}</li>
                  ))}
                </ul>
              </div>
            )}

            {(status.requirementsDue?.length ?? 0) > 0 && status.onboardingStatus !== "complete" && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">Pending Requirements</p>
                <ul className="text-xs text-amber-600 dark:text-amber-500 space-y-1">
                  {status.requirementsDue?.map((req) => (
                    <li key={req}>• {req.replace(/_/g, " ").replace(/\./g, " → ")}</li>
                  ))}
                </ul>
              </div>
            )}

            {status.onboardingStatus === "complete" && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Your account is fully set up. Virtual cards will be issued on your connected account.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Set up Stripe Connect to issue virtual cards on your own connected account. This enables card issuing for supplier payments after client checkout.
            </p>

            {!showForm ? (
              <Button onClick={() => setShowForm(true)}>
                <CreditCard className="h-4 w-4 mr-2" />
                Set Up Stripe Connect
              </Button>
            ) : (
              <Collapsible open={formOpen} onOpenChange={setFormOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-sm font-medium">
                    Business Information
                    {formOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Business Type</Label>
                    <Select
                      value={formData.business_type}
                      onValueChange={(v) => setFormData(p => ({ ...p, business_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="individual">Individual / Sole Proprietor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <Input
                      value={formData.business_name}
                      onChange={(e) => setFormData(p => ({ ...p, business_name: e.target.value }))}
                      placeholder="Your agency name"
                    />
                  </div>

                  {formData.business_type === "company" && (
                    <div className="space-y-2">
                      <Label>Tax ID (EIN)</Label>
                      <Input
                        value={formData.tax_id}
                        onChange={(e) => setFormData(p => ({ ...p, tax_id: e.target.value }))}
                        placeholder="XX-XXXXXXX"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Business URL</Label>
                    <Input
                      value={formData.business_url}
                      onChange={(e) => setFormData(p => ({ ...p, business_url: e.target.value }))}
                      placeholder="https://youragency.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Street Address</Label>
                      <Input
                        value={formData.address_line1}
                        onChange={(e) => setFormData(p => ({ ...p, address_line1: e.target.value }))}
                        placeholder="123 Main St"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={formData.address_city}
                        onChange={(e) => setFormData(p => ({ ...p, address_city: e.target.value }))}
                        placeholder="City"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        value={formData.address_state}
                        onChange={(e) => setFormData(p => ({ ...p, address_state: e.target.value }))}
                        placeholder="CA"
                        maxLength={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Zip Code</Label>
                      <Input
                        value={formData.address_postal_code}
                        onChange={(e) => setFormData(p => ({ ...p, address_postal_code: e.target.value }))}
                        placeholder="90210"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <h4 className="text-sm font-medium">Representative / Owner</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>First Name</Label>
                        <Input
                          value={formData.representative_first_name}
                          onChange={(e) => setFormData(p => ({ ...p, representative_first_name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input
                          value={formData.representative_last_name}
                          onChange={(e) => setFormData(p => ({ ...p, representative_last_name: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>DOB Month</Label>
                        <Input
                          value={formData.representative_dob_month}
                          onChange={(e) => setFormData(p => ({ ...p, representative_dob_month: e.target.value }))}
                          placeholder="MM" maxLength={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>DOB Day</Label>
                        <Input
                          value={formData.representative_dob_day}
                          onChange={(e) => setFormData(p => ({ ...p, representative_dob_day: e.target.value }))}
                          placeholder="DD" maxLength={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>DOB Year</Label>
                        <Input
                          value={formData.representative_dob_year}
                          onChange={(e) => setFormData(p => ({ ...p, representative_dob_year: e.target.value }))}
                          placeholder="YYYY" maxLength={4}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>SSN Last 4</Label>
                      <Input
                        value={formData.representative_ssn_last_4}
                        onChange={(e) => setFormData(p => ({ ...p, representative_ssn_last_4: e.target.value }))}
                        placeholder="XXXX" maxLength={4} type="password"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Home Address</Label>
                        <Input
                          value={formData.representative_address_line1}
                          onChange={(e) => setFormData(p => ({ ...p, representative_address_line1: e.target.value }))}
                          placeholder="123 Home St"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input
                          value={formData.representative_address_city}
                          onChange={(e) => setFormData(p => ({ ...p, representative_address_city: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input
                          value={formData.representative_address_state}
                          onChange={(e) => setFormData(p => ({ ...p, representative_address_state: e.target.value }))}
                          maxLength={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Zip</Label>
                        <Input
                          value={formData.representative_address_postal_code}
                          onChange={(e) => setFormData(p => ({ ...p, representative_address_postal_code: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
                    By clicking "Create Account," you agree to Stripe's{" "}
                    <a href="https://stripe.com/legal/issuing" target="_blank" rel="noopener" className="text-primary underline">
                      Issuing Terms of Service
                    </a>{" "}
                    on behalf of this business entity.
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSubmit} disabled={creating}>
                      {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Account
                    </Button>
                    <Button variant="outline" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
