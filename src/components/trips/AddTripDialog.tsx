import { useState } from "react";
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
import { useTrips } from "@/hooks/useTrips";
import { useClients } from "@/hooks/useClients";
import { DateRange } from "react-day-picker";

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

interface AddTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTripCreated?: () => void;
  parentTripId?: string;
}

export function AddTripDialog({ open, onOpenChange, onTripCreated, parentTripId }: AddTripDialogProps) {
  const { createTrip, creating } = useTrips();
  const { data: clients = [], isLoading: clientsLoading } = useClients();

  const [formData, setFormData] = useState({
    trip_type: "regular",
    trip_name: "",
    destination: "",
    notes: "",
    client_id: "",
    budget_range: "",
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.trip_name) {
      return;
    }

    const result = await createTrip({
      ...formData,
      client_id: formData.client_id || undefined,
      depart_date: dateRange?.from?.toISOString().split("T")[0],
      return_date: dateRange?.to?.toISOString().split("T")[0],
      ...(parentTripId ? { parent_trip_id: parentTripId } : {}),
    } as any);

    if (result) {
      setFormData({
        trip_type: "regular",
        trip_name: "",
        destination: "",
        notes: "",
        client_id: "",
        budget_range: "",
      });
      setDateRange(undefined);
      onOpenChange(false);
      onTripCreated?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Trip</DialogTitle>
          <DialogDescription>
            Create a trip to organize bookings for your client.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Selector */}
          <div className="space-y-2">
            <Label>Client</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) =>
                setFormData({ ...formData, client_id: value === "none" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={clientsLoading ? "Loading clients..." : "Select a client (optional)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client yet</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} {client.email ? `(${client.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trip_type">Trip Type *</Label>
            <Select
              value={formData.trip_type}
              onValueChange={(value) =>
                setFormData({ ...formData, trip_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select trip type" />
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
            <Label htmlFor="trip_name">Trip Name *</Label>
            <Input
              id="trip_name"
              value={formData.trip_name}
              onChange={(e) =>
                setFormData({ ...formData, trip_name: e.target.value })
              }
              placeholder="e.g., Smith Family Vacation 2026"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">Destination</Label>
            <Input
              id="destination"
              value={formData.destination}
              onChange={(e) =>
                setFormData({ ...formData, destination: e.target.value })
              }
              placeholder="e.g., New York, Hawaii, Europe"
            />
          </div>

          <div className="space-y-2">
            <Label>Trip Dates</Label>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget_range">Estimated Budget</Label>
            <Select
              value={formData.budget_range}
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Any additional notes about this trip..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating || !formData.trip_name}
            >
              {creating ? "Creating..." : "Create Trip"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
