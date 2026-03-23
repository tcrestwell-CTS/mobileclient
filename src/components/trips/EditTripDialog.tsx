import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useClients } from "@/hooks/useClients";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import { Loader2 } from "lucide-react";

const TRIP_TYPES = [
  { value: "regular", label: "Regular Trip" },
  { value: "group", label: "Group Trip" },
  { value: "honeymoon", label: "Honeymoon" },
  { value: "family", label: "Family Vacation" },
  { value: "luxury", label: "Luxury" },
  { value: "cruise", label: "Cruise" },
  { value: "adventure", label: "Adventure" },
  { value: "corporate", label: "Corporate / Business" },
];

interface EditTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: {
    id: string;
    trip_name: string;
    destination: string | null;
    depart_date: string | null;
    return_date: string | null;
    trip_type: string | null;
    notes: string | null;
    client_id: string | null;
    budget_range?: string | null;
  };
  onUpdated: () => void;
}

export function EditTripDialog({ open, onOpenChange, trip, onUpdated }: EditTripDialogProps) {
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    trip_name: "",
    destination: "",
    trip_type: "regular",
    notes: "",
    client_id: "",
    budget_range: "",
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    if (open && trip) {
      setFormData({
        trip_name: trip.trip_name || "",
        destination: trip.destination || "",
        trip_type: trip.trip_type || "regular",
        notes: trip.notes || "",
        client_id: trip.client_id || "",
        budget_range: (trip as any).budget_range || "",
      });
      setDateRange(
        trip.depart_date
          ? {
              from: new Date(trip.depart_date + "T00:00:00"),
              to: trip.return_date ? new Date(trip.return_date + "T00:00:00") : undefined,
            }
          : undefined
      );
    }
  }, [open, trip]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.trip_name) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("trips")
        .update({
          trip_name: formData.trip_name,
          destination: formData.destination || null,
          trip_type: formData.trip_type,
          notes: formData.notes || null,
          client_id: formData.client_id || null,
          budget_range: formData.budget_range || null,
          depart_date: dateRange?.from?.toISOString().split("T")[0] || null,
          return_date: dateRange?.to?.toISOString().split("T")[0] || null,
        } as any)
        .eq("id", trip.id);

      if (error) throw error;
      toast.success("Trip updated");
      onOpenChange(false);
      onUpdated();
    } catch (err) {
      console.error("Error updating trip:", err);
      toast.error("Failed to update trip");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Trip Details</DialogTitle>
          <DialogDescription>
            Update the details for this trip.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Client</Label>
            <Select
              value={formData.client_id || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, client_id: value === "none" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={clientsLoading ? "Loading clients..." : "Select a client (optional)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} {client.email ? `(${client.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Trip Type</Label>
            <Select
              value={formData.trip_type}
              onValueChange={(value) => setFormData({ ...formData, trip_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIP_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_trip_name">Trip Name *</Label>
            <Input
              id="edit_trip_name"
              value={formData.trip_name}
              onChange={(e) => setFormData({ ...formData, trip_name: e.target.value })}
              placeholder="e.g., Smith Family Vacation 2026"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_destination">Destination</Label>
            <Input
              id="edit_destination"
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              placeholder="e.g., New York, Hawaii, Europe"
            />
          </div>

          <div className="space-y-2">
            <Label>Trip Dates</Label>
            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>

          <div className="space-y-2">
            <Label>Estimated Budget</Label>
            <Select
              value={formData.budget_range || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, budget_range: value === "none" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select budget range (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                <SelectItem value="under_5k">Under $5,000</SelectItem>
                <SelectItem value="5k_10k">$5,000 – $10,000</SelectItem>
                <SelectItem value="10k_25k">$10,000 – $25,000</SelectItem>
                <SelectItem value="25k_50k">$25,000 – $50,000</SelectItem>
                <SelectItem value="50k_100k">$50,000 – $100,000</SelectItem>
                <SelectItem value="over_100k">$100,000+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_notes">Notes</Label>
            <Textarea
              id="edit_notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes about this trip..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !formData.trip_name}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
