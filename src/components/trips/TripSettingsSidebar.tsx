import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Shield, DollarSign, Calendar, Info, Users, Globe, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, subDays, differenceInMonths, addMonths } from "date-fns";

interface TripSettings {
  currency: string;
  pricing_visibility: string;
  tags: string[];
  allow_pdf_downloads: boolean;
  itinerary_style: string;
  deposit_required: boolean;
  deposit_amount: number;
  deposit_override: boolean;
  payment_mode: string;
  upgrade_notes?: string;
  group_landing_enabled?: boolean;
}

interface TripSettingsSidebarProps {
  tripId: string;
  settings: TripSettings;
  agencyName?: string;
  tripTotal?: number;
  departDate?: string;
  tripType?: string;
  shareToken?: string;
  onSettingsChange: () => void;
  onNavigateToLandingPage?: () => void;
}

export function TripSettingsSidebar({
  tripId,
  settings,
  agencyName,
  tripTotal = 0,
  departDate,
  tripType,
  shareToken,
  onSettingsChange,
  onNavigateToLandingPage,
}: TripSettingsSidebarProps) {
  const [localSettings, setLocalSettings] = useState<TripSettings>(settings);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const autoDepositAmount = useMemo(() => Math.round(tripTotal * 0.25 * 100) / 100, [tripTotal]);

  const effectiveDeposit = localSettings.deposit_override
    ? localSettings.deposit_amount
    : autoDepositAmount;

  // Calculate payment schedule preview
  const schedulePreview = useMemo(() => {
    if (localSettings.payment_mode !== "payment_schedule" || !departDate || tripTotal <= 0) return null;

    const finalDueDate = subDays(new Date(departDate), 90);
    const now = new Date();
    const deposit = effectiveDeposit;
    const remaining = tripTotal - deposit;
    if (remaining <= 0) return null;

    const monthsUntilFinal = Math.max(1, differenceInMonths(finalDueDate, now));
    const monthlyAmount = Math.round((remaining / monthsUntilFinal) * 100) / 100;

    const installments: { label: string; amount: number; dueDate: Date }[] = [];
    for (let i = 1; i <= monthsUntilFinal; i++) {
      const dueDate = i === monthsUntilFinal ? finalDueDate : addMonths(now, i);
      const isLast = i === monthsUntilFinal;
      const amount = isLast ? remaining - monthlyAmount * (monthsUntilFinal - 1) : monthlyAmount;
      installments.push({
        label: isLast ? "Final Payment" : `Payment ${i}`,
        amount: Math.round(amount * 100) / 100,
        dueDate,
      });
    }

    return { installments, finalDueDate, monthlyAmount };
  }, [localSettings.payment_mode, departDate, tripTotal, effectiveDeposit]);

  const updateSetting = async (field: string, value: any) => {
    const updated = { ...localSettings, [field]: value };
    setLocalSettings(updated);

    const { error } = await supabase
      .from("trips")
      .update({ [field]: value } as any)
      .eq("id", tripId);

    if (error) {
      toast.error("Failed to update setting");
      setLocalSettings(settings); // revert
    } else {
      onSettingsChange();
    }
  };

  const updateMultipleSettings = async (updates: Record<string, any>) => {
    const updated = { ...localSettings, ...updates };
    setLocalSettings(updated);

    const { error } = await supabase
      .from("trips")
      .update(updates as any)
      .eq("id", tripId);

    if (error) {
      toast.error("Failed to update settings");
      setLocalSettings(settings);
    } else {
      onSettingsChange();
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !localSettings.tags.includes(tag)) {
      updateSetting("tags", [...localSettings.tags, tag]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    updateSetting("tags", localSettings.tags.filter((t) => t !== tag));
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <div className="space-y-4">
      {/* Payment Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Payment Options
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Configure how clients pay for this trip.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Payment Mode */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Payment Mode</Label>
            <Select
              value={localSettings.payment_mode}
              onValueChange={(v) => updateSetting("payment_mode", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deposit_balance">Deposit + Final Balance</SelectItem>
                <SelectItem value="payment_schedule">Payment Schedule (Monthly)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {localSettings.payment_mode === "deposit_balance"
                ? "Client pays deposit, then remaining balance before departure."
                : "Client pays deposit, then equal monthly installments. Final payment due 90 days before departure."}
            </p>
          </div>

          {/* Deposit Section */}
          <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Deposit Required</Label>
              <Switch
                checked={localSettings.deposit_required}
                onCheckedChange={(v) => {
                  if (v) {
                    updateMultipleSettings({
                      deposit_required: true,
                      deposit_amount: localSettings.deposit_override ? localSettings.deposit_amount : autoDepositAmount,
                    });
                  } else {
                    updateSetting("deposit_required", false);
                  }
                }}
              />
            </div>

            {localSettings.deposit_required && (
              <>
                {/* Auto-calculated amount */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">25% of trip total</span>
                  <span className="font-semibold">{formatCurrency(autoDepositAmount)}</span>
                </div>

                {tripTotal <= 0 && (
                  <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 rounded-md p-2">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>Add bookings to auto-calculate the deposit amount.</span>
                  </div>
                )}

                {/* Override checkbox */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="deposit-override"
                    checked={localSettings.deposit_override}
                    onCheckedChange={(checked) => {
                      const isOverride = !!checked;
                      if (isOverride) {
                        updateSetting("deposit_override", true);
                      } else {
                        updateMultipleSettings({
                          deposit_override: false,
                          deposit_amount: autoDepositAmount,
                        });
                      }
                    }}
                  />
                  <Label htmlFor="deposit-override" className="text-sm cursor-pointer">
                    Override deposit amount
                  </Label>
                </div>

                {/* Custom amount input */}
                {localSettings.deposit_override && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Custom Deposit ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={localSettings.deposit_amount || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setLocalSettings((s) => ({ ...s, deposit_amount: val }));
                      }}
                      onBlur={(e) =>
                        updateSetting("deposit_amount", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                )}

                {/* Effective deposit display */}
                <div className="flex items-center justify-between text-sm pt-1 border-t">
                  <span className="font-medium">Deposit Amount</span>
                  <Badge variant="outline" className="font-semibold">
                    {formatCurrency(effectiveDeposit)}
                  </Badge>
                </div>
              </>
            )}
          </div>

          {/* Payment Schedule Preview */}
          {localSettings.payment_mode === "payment_schedule" && localSettings.deposit_required && schedulePreview && (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-3.5 w-3.5" />
                Schedule Preview
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Deposit (due now)</span>
                  <span className="font-semibold">{formatCurrency(effectiveDeposit)}</span>
                </div>
                {schedulePreview.installments.map((inst, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {inst.label} — {format(inst.dueDate, "MMM d, yyyy")}
                    </span>
                    <span className="font-semibold">{formatCurrency(inst.amount)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs pt-1 border-t font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(tripTotal)}</span>
                </div>
              </div>
              {!departDate && (
                <p className="text-xs text-amber-600">Set a departure date to calculate the schedule.</p>
              )}
            </div>
          )}

          {localSettings.payment_mode === "deposit_balance" && localSettings.deposit_required && tripTotal > 0 && (
            <div className="space-y-1.5 rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-3.5 w-3.5" />
                Balance Preview
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Deposit</span>
                <span className="font-semibold">{formatCurrency(effectiveDeposit)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Final Balance
                  {departDate && ` (due by ${format(subDays(new Date(departDate), 90), "MMM d, yyyy")})`}
                </span>
                <span className="font-semibold">{formatCurrency(Math.max(0, tripTotal - effectiveDeposit))}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t font-semibold">
                <span>Total</span>
                <span>{formatCurrency(tripTotal)}</span>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Client always has the option to pay the full amount at once.
          </p>
        </CardContent>
      </Card>

      {/* Trip Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Trip Settings</CardTitle>
          <p className="text-xs text-muted-foreground">
            Set the default options for this trip.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Currency */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Currency</Label>
            <Select
              value={localSettings.currency}
              onValueChange={(v) => updateSetting("currency", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">United States Dollar (USD)</SelectItem>
                <SelectItem value="EUR">Euro (EUR)</SelectItem>
                <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                <SelectItem value="CAD">Canadian Dollar (CAD)</SelectItem>
                <SelectItem value="AUD">Australian Dollar (AUD)</SelectItem>
                <SelectItem value="MXN">Mexican Peso (MXN)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pricing Visibility */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Pricing visibility</Label>
            <Select
              value={localSettings.pricing_visibility}
              onValueChange={(v) => updateSetting("pricing_visibility", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="show_all">Show all prices</SelectItem>
                <SelectItem value="totals_only">Totals only</SelectItem>
                <SelectItem value="hide_all">Hide all prices</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Tags</Label>
            <Input
              placeholder="Search tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            {localSettings.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {localSettings.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Allow PDF Downloads */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Allow PDF Downloads</Label>
            <Switch
              checked={localSettings.allow_pdf_downloads}
              onCheckedChange={(v) => updateSetting("allow_pdf_downloads", v)}
            />
          </div>

          {/* Upgrade Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Optional Upgrades</Label>
            <Textarea
              placeholder="Describe optional upgrades for the client proposal..."
              value={localSettings.upgrade_notes || ""}
              onChange={(e) => setLocalSettings((s) => ({ ...s, upgrade_notes: e.target.value }))}
              onBlur={(e) => updateSetting("upgrade_notes", e.target.value || null)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Shown on the shared trip page</p>
          </div>

          {/* Itinerary Style */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Itinerary Style</Label>
            <Select
              value={localSettings.itinerary_style}
              onValueChange={(v) => updateSetting("itinerary_style", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vertical_list">Vertical list</SelectItem>
                <SelectItem value="day_cards">Day cards</SelectItem>
                <SelectItem value="timeline">Timeline</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>


      {/* Group Landing Page */}
      {tripType === "group" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Group Landing Page
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Build and manage the public signup page for this group trip.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge
                variant="outline"
                className={
                  localSettings.group_landing_enabled
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-muted text-muted-foreground"
                }
              >
                {localSettings.group_landing_enabled ? "Live" : "Draft"}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onNavigateToLandingPage}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-2" />
              Open Landing Page Builder
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Agency Sharing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Agency sharing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Managed by</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{agencyName || "My Agency"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Lock className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Agency-managed trip</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
