import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Star, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const TRIP_TYPES = [
  "Caribbean",
  "Mediterranean",
  "Alaska",
  "All-Inclusive",
  "Family",
  "Europe",
  "Mexico",
  "North America",
];

type FeaturedTrip = {
  id: string;
  created_at: string | null;
  trip_name: string;
  destination: string;
  trip_type: string | null;
  duration: string | null;
  starting_from: string | null;
  highlights: string[] | null;
  description: string | null;
  popular: boolean | null;
  cover_image_url: string | null;
  published: boolean | null;
  slug: string | null;
};

const emptyForm = {
  trip_name: "",
  destination: "",
  trip_type: "",
  duration: "",
  starting_from: "",
  highlight_1: "",
  highlight_2: "",
  highlight_3: "",
  description: "",
  popular: false,
  cover_image_url: "",
  published: false,
  slug: "",
};

export default function FeaturedTrips() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["featured_trips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_trips")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FeaturedTrip[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const highlights = [values.highlight_1, values.highlight_2, values.highlight_3]
        .map((h) => h.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        trip_name: values.trip_name,
        destination: values.destination,
        trip_type: values.trip_type || null,
        duration: values.duration || null,
        starting_from: values.starting_from || null,
        highlights: highlights.length > 0 ? highlights : null,
        description: values.description || null,
        popular: values.popular,
        cover_image_url: values.cover_image_url || null,
        published: values.published,
        slug: values.slug || null,
      };
      if (values.id) payload.id = values.id;

      const { error } = await supabase.from("featured_trips").upsert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featured_trips"] });
      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? "Trip updated" : "Trip created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("featured_trips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featured_trips"] });
      setDeleteId(null);
      toast({ title: "Trip deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const togglePublished = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("featured_trips").update({ published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["featured_trips"] }),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (trip: FeaturedTrip) => {
    setEditingId(trip.id);
    setForm({
      trip_name: trip.trip_name,
      destination: trip.destination,
      trip_type: trip.trip_type || "",
      duration: trip.duration || "",
      starting_from: trip.starting_from || "",
      highlight_1: trip.highlights?.[0] || "",
      highlight_2: trip.highlights?.[1] || "",
      highlight_3: trip.highlights?.[2] || "",
      description: trip.description || "",
      popular: trip.popular ?? false,
      cover_image_url: trip.cover_image_url || "",
      published: trip.published ?? false,
      slug: trip.slug || "",
    });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    if (!form.trip_name || !form.destination) {
      toast({ title: "Trip name and destination are required", variant: "destructive" });
      return;
    }
    upsertMutation.mutate({ ...form, id: editingId ?? undefined });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Star className="h-6 w-6 text-primary" />
              Featured Trips
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage marketing trips that appear on crestwellgetaways.com
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> New Trip
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : trips.length === 0 ? (
          <div className="border border-dashed rounded-lg p-12 text-center text-muted-foreground">
            <Star className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No featured trips yet</p>
            <p className="text-sm mt-1">Create your first marketing trip to attract leads on your public website.</p>
            <Button className="mt-4" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Trip</Button>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Trip Name</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Starting From</TableHead>
                  <TableHead>Popular</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell>
                      {trip.cover_image_url ? (
                        <img
                          src={trip.cover_image_url}
                          alt={trip.trip_name}
                          className="w-12 h-8 rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-8 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">—</div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{trip.trip_name}</TableCell>
                    <TableCell>{trip.destination}</TableCell>
                    <TableCell>{trip.trip_type || "—"}</TableCell>
                    <TableCell>{trip.duration || "—"}</TableCell>
                    <TableCell>{trip.starting_from || "—"}</TableCell>
                    <TableCell>
                      {trip.popular ? (
                        <TrendingUp className="h-4 w-4 text-primary" />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={trip.published ?? false}
                        onCheckedChange={(val) => togglePublished.mutate({ id: trip.id, published: val })}
                      />
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(trip)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(trip.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Featured Trip" : "New Featured Trip"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update the details for this marketing trip." : "Add a new trip to your public website."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trip Name *</Label>
                <Input value={form.trip_name} onChange={(e) => setForm({ ...form, trip_name: e.target.value })} placeholder="e.g. Western Caribbean Cruise" />
              </div>
              <div className="space-y-2">
                <Label>Destination *</Label>
                <Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="e.g. Caribbean" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>URL Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') })} placeholder="e.g. western-caribbean-cruise" />
              <p className="text-xs text-muted-foreground">Used in the trip detail page URL. Auto-generated from trip name if left blank.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trip Type</Label>
                <Select value={form.trip_type} onValueChange={(v) => setForm({ ...form, trip_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {TRIP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input placeholder='e.g. "7–10 nights"' value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Starting From</Label>
              <Input placeholder='e.g. "$699"' value={form.starting_from} onChange={(e) => setForm({ ...form, starting_from: e.target.value })} />
              <p className="text-xs text-muted-foreground">Displays as "From $699 / person" on the card</p>
            </div>

            <div className="space-y-2">
              <Label>Highlights (up to 3 port/feature tags)</Label>
              <div className="grid grid-cols-3 gap-3">
                <Input placeholder="e.g. Cozumel" value={form.highlight_1} onChange={(e) => setForm({ ...form, highlight_1: e.target.value })} />
                <Input placeholder="e.g. Belize City" value={form.highlight_2} onChange={(e) => setForm({ ...form, highlight_2: e.target.value })} />
                <Input placeholder="e.g. Roatan" value={form.highlight_3} onChange={(e) => setForm({ ...form, highlight_3: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cover Image URL</Label>
              <Input placeholder="https://images.unsplash.com/..." value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} />
              {form.cover_image_url && (
                <img src={form.cover_image_url} alt="Preview" className="mt-2 rounded-lg max-h-40 object-cover w-full" onError={(e) => (e.currentTarget.style.display = "none")} />
              )}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={4} placeholder="Card body text shown on the public website…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Switch checked={form.popular} onCheckedChange={(v) => setForm({ ...form, popular: v })} />
                <Label>Popular — shows gold badge on card</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
                <Label>Published — visible on public website</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "Saving…" : editingId ? "Update Trip" : "Create Trip"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete featured trip?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this trip from the marketing listings. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
