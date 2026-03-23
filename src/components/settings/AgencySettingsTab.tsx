import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ShieldCheck, DollarSign, TrendingUp, Percent } from "lucide-react";
import { useAgencySettings, useUpdateAgencySettings } from "@/hooks/useAgencySettings";

export function AgencySettingsTab() {
  const { data: settings, isLoading } = useAgencySettings();
  const updateSettings = useUpdateAgencySettings();

  const [formData, setFormData] = useState({
    approval_threshold: 10000,
    commission_holdback_pct: 10,
    tier_auto_promote: false,
    tier_1_threshold: 100000,
    tier_2_threshold: 250000,
    evaluation_period_months: 12,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        approval_threshold: settings.approval_threshold,
        commission_holdback_pct: settings.commission_holdback_pct,
        tier_auto_promote: settings.tier_auto_promote,
        tier_1_threshold: settings.tier_1_threshold,
        tier_2_threshold: settings.tier_2_threshold,
        evaluation_period_months: settings.evaluation_period_months,
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Approval Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Approval Thresholds
          </CardTitle>
          <CardDescription>
            Bookings above this amount will require admin approval before being confirmed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="approval_threshold">High-Value Booking Threshold ($)</Label>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Input
                id="approval_threshold"
                type="number"
                value={formData.approval_threshold}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    approval_threshold: Number(e.target.value),
                  }))
                }
                min={0}
                step={1000}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Bookings with gross sales ≥ this amount require admin approval. Set to 0 to disable.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Commission Holdback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            Commission Holdback Reserve
          </CardTitle>
          <CardDescription>
            Percentage of commission withheld until the trip is completed. Automatically released when
            the trip status changes to "completed."
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="holdback_pct">Holdback Percentage (%)</Label>
            <Input
              id="holdback_pct"
              type="number"
              value={formData.commission_holdback_pct}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  commission_holdback_pct: Number(e.target.value),
                }))
              }
              min={0}
              max={100}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Set to 0 to disable holdback. Typical range: 5-15%.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tier Auto-Promotion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Automatic Tier Promotion
          </CardTitle>
          <CardDescription>
            Automatically promote agents to higher commission tiers based on their gross sales performance.
            Agents are never auto-demoted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-card-foreground">Enable Auto-Promotion</p>
              <p className="text-sm text-muted-foreground">
                Promote agents when they meet gross sales thresholds
              </p>
            </div>
            <Switch
              checked={formData.tier_auto_promote}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, tier_auto_promote: checked }))
              }
            />
          </div>

          {formData.tier_auto_promote && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tier_1_threshold">
                    Tier 1 → Tier 2 Threshold ($)
                  </Label>
                  <Input
                    id="tier_1_threshold"
                    type="number"
                    value={formData.tier_1_threshold}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tier_1_threshold: Number(e.target.value),
                      }))
                    }
                    min={0}
                    step={10000}
                  />
                  <p className="text-xs text-muted-foreground">
                    Gross sales needed to promote from Tier 1 (70/30) to Tier 2 (80/20)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier_2_threshold">
                    Tier 2 → Tier 3 Threshold ($)
                  </Label>
                  <Input
                    id="tier_2_threshold"
                    type="number"
                    value={formData.tier_2_threshold}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        tier_2_threshold: Number(e.target.value),
                      }))
                    }
                    min={0}
                    step={10000}
                  />
                  <p className="text-xs text-muted-foreground">
                    Gross sales needed to promote from Tier 2 (80/20) to Tier 3 (95/5)
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eval_period">Evaluation Period (months)</Label>
                <Input
                  id="eval_period"
                  type="number"
                  value={formData.evaluation_period_months}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      evaluation_period_months: Number(e.target.value),
                    }))
                  }
                  min={1}
                  max={36}
                />
                <p className="text-xs text-muted-foreground">
                  Rolling period over which gross sales are evaluated for tier promotion
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={updateSettings.isPending}>
        {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save Agency Settings
      </Button>
    </div>
  );
}
