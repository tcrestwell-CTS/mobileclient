import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Trash2,
  UserRound,
  Pencil,
  Crown,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { useClients } from "@/hooks/useClients";
import {
  useTripTravelers,
  useCreateTripTraveler,
  useUpdateTripTraveler,
  useDeleteTripTraveler,
  TripTraveler,
} from "@/hooks/useTripTravelers";

interface Client {
  id: string;
  name: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface TripTravelersCardProps {
  client: Client | null | undefined;
  clientId: string | null | undefined;
  tripId: string;
}

const RELATIONSHIPS = [
  "traveler",
  "spouse",
  "partner",
  "child",
  "parent",
  "sibling",
  "friend",
  "colleague",
  "other",
];

const emptyForm = {
  first_name: "",
  last_name: "",
  relationship: "traveler",
  email: "",
  phone: "",
  birthday: "",
  known_traveler_number: "",
  passport_info: "",
  notes: "",
  is_primary: false,
};

export function TripTravelersCard({ client, clientId, tripId }: TripTravelersCardProps) {
  const { data: travelers = [], isLoading } = useTripTravelers(tripId);
  const { data: allClients = [] } = useClients();
  const createTraveler = useCreateTripTraveler();
  const updateTraveler = useUpdateTripTraveler();
  const deleteTraveler = useDeleteTripTraveler();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTraveler, setEditingTraveler] = useState<TripTraveler | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [nameSearch, setNameSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter clients by typed name (min 2 chars)
  const clientSuggestions = nameSearch.trim().length >= 2
    ? allClients.filter((c) => {
        const full = `${c.first_name || ""} ${c.last_name || ""} ${c.name}`.toLowerCase();
        return full.includes(nameSearch.toLowerCase());
      }).slice(0, 6)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNameChange = (value: string) => {
    setNameSearch(value);
    setForm((f) => ({ ...f, first_name: value }));
    setShowSuggestions(true);
  };

  const selectClientSuggestion = (c: typeof allClients[0]) => {
    const firstName = c.first_name || c.name.split(" ")[0] || "";
    const lastName = c.last_name || c.name.split(" ").slice(1).join(" ") || "";
    setForm((f) => ({
      ...f,
      first_name: firstName,
      last_name: lastName,
      email: c.email || f.email,
      phone: c.phone || f.phone,
      known_traveler_number: (c as any).known_traveler_number || f.known_traveler_number,
      passport_info: (c as any).passport_info || f.passport_info,
    }));
    setNameSearch(firstName);
    setShowSuggestions(false);
  };

  const openAdd = () => {
    setForm(emptyForm);
    setNameSearch("");
    setEditingTraveler(null);
    setShowAddDialog(true);
  };

  const openEdit = (t: TripTraveler) => {
    setForm({
      first_name: t.first_name,
      last_name: t.last_name || "",
      relationship: t.relationship || "traveler",
      email: t.email || "",
      phone: t.phone || "",
      birthday: t.birthday || "",
      known_traveler_number: t.known_traveler_number || "",
      passport_info: t.passport_info || "",
      notes: t.notes || "",
      is_primary: t.is_primary,
    });
    setNameSearch(t.first_name);
    setEditingTraveler(t);
    setShowAddDialog(true);
  };

  const handleSave = async () => {
    if (!form.first_name.trim()) return;
    if (editingTraveler) {
      await updateTraveler.mutateAsync({
        id: editingTraveler.id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        relationship: form.relationship,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        birthday: form.birthday.trim() || null,
        known_traveler_number: form.known_traveler_number.trim() || null,
        passport_info: form.passport_info.trim() || null,
        notes: form.notes.trim() || null,
        is_primary: form.is_primary,
      });
    } else {
      await createTraveler.mutateAsync({
        trip_id: tripId,
        client_id: clientId,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        relationship: form.relationship,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        birthday: form.birthday.trim() || null,
        known_traveler_number: form.known_traveler_number.trim() || null,
        passport_info: form.passport_info.trim() || null,
        notes: form.notes.trim() || null,
        is_primary: form.is_primary,
      });
    }
    setShowAddDialog(false);
    setEditingTraveler(null);
  };

  const getInitials = (first: string, last?: string | null) =>
    `${first[0] || ""}${last?.[0] || ""}`.toUpperCase();

  const isPending = createTraveler.isPending || updateTraveler.isPending;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Travelers
              {travelers.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({travelers.length})
                </span>
              )}
            </CardTitle>
            <Button
              variant="default"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={openAdd}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-2 pt-0">
          {client && (
            <>
              <div className="flex items-center gap-2.5 group">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {getInitials(client.name.split(" ")[0], client.name.split(" ")[1])}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">{client.name}</p>
                    <Crown className="h-3 w-3 text-yellow-500 shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground">Primary client</p>
                </div>
                <Link to={`/contacts/${client.id}`}>
                  <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </Link>
              </div>
              {travelers.length > 0 && <Separator />}
            </>
          )}

          {travelers.length === 0 && !isLoading && (
            <p className="text-xs text-muted-foreground text-center py-3">
              {client ? "No additional travelers yet" : "No travelers added yet"}
            </p>
          )}

          <div className="space-y-2">
            {travelers.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 group">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  {t.is_primary ? (
                    <Crown className="h-4 w-4 text-amber-500" />
                  ) : (
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {t.first_name} {t.last_name || ""}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{t.relationship}</p>
                  {t.email && (
                    <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={() => openEdit(t)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Traveler?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove {t.first_name} from this trip.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteTraveler.mutate({ id: t.id, tripId })}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) setShowAddDialog(false); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              {editingTraveler ? "Edit Traveler" : "Add Traveler"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name row with autocomplete on First Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">First Name *</Label>
                <div className="relative" ref={suggestionsRef}>
                  <Input
                    placeholder="Jane"
                    value={nameSearch}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onFocus={() => nameSearch.trim().length >= 2 && setShowSuggestions(true)}
                    autoComplete="off"
                  />
                  {showSuggestions && clientSuggestions.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
                      {clientSuggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex flex-col gap-0.5"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectClientSuggestion(c);
                          }}
                        >
                          <span className="font-medium">{c.name}</span>
                          {c.email && (
                            <span className="text-xs text-muted-foreground">{c.email}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Last Name</Label>
                <Input
                  placeholder="Doe"
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                />
              </div>
            </div>

            {/* Relationship */}
            <div className="space-y-1.5">
              <Label className="text-xs">Relationship</Label>
              <Select
                value={form.relationship}
                onValueChange={(v) => setForm((f) => ({ ...f, relationship: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input
                  type="tel"
                  placeholder="+1 555 000 0000"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>

            {/* Travel info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Birthday</Label>
                <Input
                  type="date"
                  value={form.birthday}
                  onChange={(e) => setForm((f) => ({ ...f, birthday: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Known Traveler # (TSA)</Label>
                <Input
                  placeholder="KTN..."
                  value={form.known_traveler_number}
                  onChange={(e) => setForm((f) => ({ ...f, known_traveler_number: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Passport Info</Label>
              <Input
                placeholder="Passport number, expiry, etc."
                value={form.passport_info}
                onChange={(e) => setForm((f) => ({ ...f, passport_info: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                placeholder="Dietary needs, accessibility, etc."
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {/* Primary toggle */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="is_primary"
                type="checkbox"
                className="h-4 w-4 rounded border border-input"
                checked={form.is_primary}
                onChange={(e) => setForm((f) => ({ ...f, is_primary: e.target.checked }))}
              />
              <Label htmlFor="is_primary" className="text-sm cursor-pointer">
                Mark as primary traveler
              </Label>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.first_name.trim() || isPending}
            >
              {isPending ? "Saving..." : editingTraveler ? "Save Changes" : "Add Traveler"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
