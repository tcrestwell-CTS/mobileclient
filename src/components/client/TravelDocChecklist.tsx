import { useState, useEffect, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardCheck, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const DOC_ITEMS = [
  { key: "passport", label: "Passport valid for travel", description: "Ensure passport is valid for at least 6 months past your return date" },
  { key: "insurance", label: "Travel insurance obtained", description: "Confirm coverage for medical, trip cancellation, and baggage" },
  { key: "visa", label: "Visa requirements reviewed", description: "Check entry requirements for all destinations on your itinerary" },
  { key: "emergency_contacts", label: "Emergency contacts provided", description: "Share emergency contact information with your travel agent" },
];

interface TravelDocChecklistProps {
  tripId: string;
}

export function TravelDocChecklist({ tripId }: TravelDocChecklistProps) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const getToken = () => {
    try {
      const stored = localStorage.getItem("portal_session");
      return stored ? JSON.parse(stored).token : null;
    } catch { return null; }
  };

  const fetchChecklist = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-data?resource=doc-checklist&tripId=${tripId}`;
      const res = await fetch(url, {
        headers: {
          "x-portal-token": token,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, boolean> = {};
        for (const item of data.items || []) {
          map[item.item_key] = item.is_checked;
        }
        setChecklist(map);
      }
    } catch (err) {
      console.error("Failed to fetch checklist:", err);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => { fetchChecklist(); }, [fetchChecklist]);

  const toggleItem = async (key: string, checked: boolean) => {
    const token = getToken();
    if (!token) return;
    setUpdating(key);
    setChecklist(prev => ({ ...prev, [key]: checked }));
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-data?resource=doc-checklist`;
      await fetch(url, {
        method: "POST",
        headers: {
          "x-portal-token": token,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tripId, itemKey: key, isChecked: checked }),
      });
    } catch {
      setChecklist(prev => ({ ...prev, [key]: !checked }));
    } finally {
      setUpdating(null);
    }
  };

  const completed = DOC_ITEMS.filter(i => checklist[i.key]).length;
  const progress = (completed / DOC_ITEMS.length) * 100;
  const allDone = completed === DOC_ITEMS.length;

  return (
    <Card className={allDone ? "border-green-200 bg-green-50/30" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {allDone ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <ClipboardCheck className="h-4 w-4" />
          )}
          Travel Documents
          <span className={`text-xs font-normal ml-auto ${allDone ? "text-green-600" : "text-muted-foreground"}`}>
            {loading ? "..." : allDone ? "All complete ✓" : `${completed}/${DOC_ITEMS.length} complete`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Progress value={progress} className="h-2" />
            <div className="space-y-1">
              {DOC_ITEMS.map(item => {
                const isChecked = !!checklist[item.key];
                return (
                  <label
                    key={item.key}
                    className={`flex items-start gap-3 cursor-pointer rounded-lg p-3 transition-colors ${
                      isChecked
                        ? "bg-green-50/50"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(v) => toggleItem(item.key, !!v)}
                      disabled={updating === item.key}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium transition-colors ${
                        isChecked
                          ? "text-green-700 line-through"
                          : "text-foreground"
                      }`}>
                        {item.label}
                      </span>
                      <p className={`text-xs mt-0.5 ${
                        isChecked ? "text-green-600/60" : "text-muted-foreground"
                      }`}>
                        {item.description}
                      </p>
                    </div>
                    {updating === item.key && (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mt-1" />
                    )}
                  </label>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
