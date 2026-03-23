import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

const categories = [
  { value: "flight", label: "✈️ Flight" },
  { value: "hotel", label: "🏨 Hotel" },
  { value: "cruise", label: "🚢 Cruise" },
  { value: "transportation", label: "🚗 Transportation" },
  { value: "dining", label: "🍽️ Dining" },
  { value: "activity", label: "🎯 Activity" },
  { value: "sightseeing", label: "📸 Sightseeing" },
  { value: "relaxation", label: "🧘 Relaxation" },
  { value: "shopping", label: "🛍️ Shopping" },
  { value: "entertainment", label: "🎭 Entertainment" },
];

interface Props {
  tripId: string;
  dayNumber: number;
  onAdd: (data: any) => Promise<boolean>;
  defaultCategory?: string;
  controlledOpen?: boolean;
  onControlledOpenChange?: (open: boolean) => void;
}

export function AddItineraryItemDialog({ tripId, dayNumber, onAdd, defaultCategory, controlledOpen, onControlledOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (v: boolean) => onControlledOpenChange?.(v) : setInternalOpen;

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", category: defaultCategory || "activity", location: "",
    start_time: "", end_time: "", notes: "",
    flight_number: "", departure_city_code: "", arrival_city_code: "",
  });

  // Sync defaultCategory when controlled dialog opens
  useEffect(() => {
    if (open && defaultCategory) {
      setForm(prev => ({ ...prev, category: defaultCategory }));
    }
  }, [open, defaultCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const success = await onAdd({
      trip_id: tripId,
      day_number: dayNumber,
      title: form.title,
      description: form.description || undefined,
      category: form.category,
      location: form.location || undefined,
      start_time: form.start_time || undefined,
      end_time: form.end_time || undefined,
      notes: form.notes || undefined,
      flight_number: form.flight_number || undefined,
      departure_city_code: form.departure_city_code || undefined,
      arrival_city_code: form.arrival_city_code || undefined,
    });
    setSaving(false);
    if (success) {
      setForm({ title: "", description: "", category: "activity", location: "", start_time: "", end_time: "", notes: "", flight_number: "", departure_city_code: "", arrival_city_code: "" });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Plus className="h-3 w-3 mr-1" /> Add Item
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Itinerary Item — Day {dayNumber}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Check-in at hotel" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{form.category === "hotel" ? "Hotel / Property" : "Location"}</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={form.category === "hotel" ? "e.g., Marriott Downtown" : "Place name"} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Time</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <Label>End Time</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          {form.category === "flight" && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Flight #</Label>
                <Input value={form.flight_number} onChange={(e) => setForm({ ...form, flight_number: e.target.value })} placeholder="AA 1234" />
              </div>
              <div>
                <Label>From (Code)</Label>
                <Input value={form.departure_city_code} onChange={(e) => setForm({ ...form, departure_city_code: e.target.value.toUpperCase() })} placeholder="JFK" maxLength={4} />
              </div>
              <div>
                <Label>To (Code)</Label>
                <Input value={form.arrival_city_code} onChange={(e) => setForm({ ...form, arrival_city_code: e.target.value.toUpperCase() })} placeholder="LAX" maxLength={4} />
              </div>
            </div>
          )}
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details about this activity" rows={2} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes" rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
