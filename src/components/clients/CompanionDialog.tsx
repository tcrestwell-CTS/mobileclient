import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
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
import { Loader2 } from "lucide-react";
import { useCreateCompanion, useUpdateCompanion, Companion, CompanionInsert } from "@/hooks/useCompanions";

interface CompanionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  companion?: Companion | null;
}

const RELATIONSHIPS = [
  { value: "spouse", label: "Spouse" },
  { value: "partner", label: "Partner" },
  { value: "child", label: "Child" },
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
  { value: "grandparent", label: "Grandparent" },
  { value: "grandchild", label: "Grandchild" },
  { value: "friend", label: "Friend" },
  { value: "colleague", label: "Colleague" },
  { value: "other", label: "Other" },
];

export function CompanionDialog({ open, onOpenChange, clientId, companion }: CompanionDialogProps) {
  const createCompanion = useCreateCompanion();
  const updateCompanion = useUpdateCompanion();
  const isEditing = !!companion;

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    relationship: "companion",
    birthday: "",
    email: "",
    phone: "",
    passport_info: "",
    known_traveler_number: "",
    redress_number: "",
    notes: "",
  });

  useEffect(() => {
    if (companion) {
      setFormData({
        first_name: companion.first_name || "",
        last_name: companion.last_name || "",
        relationship: companion.relationship || "companion",
        birthday: companion.birthday || "",
        email: companion.email || "",
        phone: companion.phone || "",
        passport_info: companion.passport_info || "",
        known_traveler_number: companion.known_traveler_number || "",
        redress_number: companion.redress_number || "",
        notes: companion.notes || "",
      });
    } else {
      setFormData({
        first_name: "",
        last_name: "",
        relationship: "companion",
        birthday: "",
        email: "",
        phone: "",
        passport_info: "",
        known_traveler_number: "",
        redress_number: "",
        notes: "",
      });
    }
  }, [companion, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name.trim()) {
      return;
    }

    const companionData: CompanionInsert = {
      client_id: clientId,
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim() || null,
      relationship: formData.relationship,
      birthday: formData.birthday || null,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      passport_info: formData.passport_info.trim() || null,
      known_traveler_number: formData.known_traveler_number.trim() || null,
      redress_number: formData.redress_number.trim() || null,
      notes: formData.notes.trim() || null,
    };

    try {
      if (isEditing && companion) {
        await updateCompanion.mutateAsync({ id: companion.id, ...companionData });
      } else {
        await createCompanion.mutateAsync(companionData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const isPending = createCompanion.isPending || updateCompanion.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Companion" : "Add Travel Companion"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="First name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship *</Label>
            <Select
              value={formData.relationship}
              onValueChange={(value) => setFormData({ ...formData, relationship: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((rel) => (
                  <SelectItem key={rel.value} value={rel.value}>
                    {rel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthday">Birthday</Label>
            <Input
              id="birthday"
              type="date"
              value={formData.birthday}
              onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Travel IDs</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="known_traveler_number" className="text-xs text-muted-foreground">
                  Known Traveler #
                </Label>
                <Input
                  id="known_traveler_number"
                  value={formData.known_traveler_number}
                  onChange={(e) => setFormData({ ...formData, known_traveler_number: e.target.value })}
                  placeholder="KTN"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redress_number" className="text-xs text-muted-foreground">
                  Redress #
                </Label>
                <Input
                  id="redress_number"
                  value={formData.redress_number}
                  onChange={(e) => setFormData({ ...formData, redress_number: e.target.value })}
                  placeholder="Redress number"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="passport_info">Passport Info</Label>
            <Textarea
              id="passport_info"
              value={formData.passport_info}
              onChange={(e) => setFormData({ ...formData, passport_info: e.target.value })}
              placeholder="Passport number, expiry, country..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this companion..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !formData.first_name.trim()}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Companion"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
