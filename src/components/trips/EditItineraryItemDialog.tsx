import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type ItineraryItem } from "@/hooks/useItinerary";

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
  item: ItineraryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (itemId: string, data: any) => Promise<boolean>;
}

export function EditItineraryItemDialog({ item, open, onOpenChange, onUpdate }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: item.title,
    description: item.description || "",
    category: item.category,
    location: item.location || "",
    start_time: item.start_time || "",
    end_time: item.end_time || "",
    notes: item.notes || "",
    flight_number: (item as any).flight_number || "",
    departure_city_code: (item as any).departure_city_code || "",
    arrival_city_code: (item as any).arrival_city_code || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const success = await onUpdate(item.id, {
      title: form.title,
      description: form.description || null,
      category: form.category,
      location: form.location || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      notes: form.notes || null,
      flight_number: form.flight_number || null,
      departure_city_code: form.departure_city_code || null,
      arrival_city_code: form.arrival_city_code || null,
    });
    setSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Itinerary Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
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
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={form.category === "hotel" ? "e.g., Marriott Downtown" : ""} />
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
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
