import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Supplier, UpdateSupplierData, useSuppliers } from "@/hooks/useSuppliers";

const supplierTypes = [
  { value: "hotel", label: "Hotel" },
  { value: "cruise", label: "Cruise Line" },
  { value: "airline", label: "Airline" },
  { value: "tour_operator", label: "Tour Operator" },
  { value: "car_rental", label: "Car Rental" },
  { value: "transportation", label: "Transportation" },
  { value: "all_inclusive", label: "All-Inclusive Resort" },
  { value: "other", label: "Other" },
];

interface EditSupplierDialogProps {
  supplier: Supplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSupplierDialog({ supplier, open, onOpenChange }: EditSupplierDialogProps) {
  const { updateSupplier } = useSuppliers();
  const [formData, setFormData] = useState<UpdateSupplierData>({});

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        supplier_type: supplier.supplier_type,
        commissionable_percentage: supplier.commissionable_percentage,
        commission_rate: supplier.commission_rate,
        contact_email: supplier.contact_email || "",
        contact_phone: supplier.contact_phone || "",
        website: supplier.website || "",
        notes: supplier.notes || "",
        is_active: supplier.is_active,
        override_commission: supplier.override_commission,
        multi_line_commission: supplier.multi_line_commission,
      });
    }
  }, [supplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) return;
    await updateSupplier.mutateAsync({ id: supplier.id, data: formData });
    onOpenChange(false);
  };

  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Supplier</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="active">Active Status</Label>
              <p className="text-xs text-muted-foreground">Inactive suppliers won't appear in booking forms</p>
            </div>
            <Switch
              id="active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Supplier Name *</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Marriott Hotels"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Supplier Type</Label>
              <Select
                value={formData.supplier_type}
                onValueChange={(value) => setFormData({ ...formData, supplier_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supplierTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website || ""}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-sm text-muted-foreground mb-3">Commission Settings</h4>
            
            {/* Multi-line commission toggle */}
            <div className="flex items-center space-x-2 mb-4 p-3 bg-muted/50 rounded-lg">
              <Checkbox
                id="edit_multi_line_commission"
                checked={formData.multi_line_commission || false}
                onCheckedChange={(checked) => setFormData({ ...formData, multi_line_commission: checked === true })}
              />
              <div>
                <Label htmlFor="edit_multi_line_commission" className="text-sm font-medium cursor-pointer">
                  Multi-line commission
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable per-line-item commission rates (e.g., price agencies with mixed rates)
                </p>
              </div>
            </div>

            {!formData.multi_line_commission && (
              <>
                {formData.supplier_type === "airline" && (
                  <div className="flex items-center space-x-2 mb-4 p-3 bg-muted/50 rounded-lg">
                    <Checkbox
                      id="edit_override_commission"
                      checked={formData.override_commission || false}
                      onCheckedChange={(checked) => setFormData({ ...formData, override_commission: checked === true })}
                    />
                    <div>
                      <Label htmlFor="edit_override_commission" className="text-sm font-medium cursor-pointer">
                        Override default flight commission
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Default: $25 per $500 flat rate. Check to use custom percentage rates instead.
                      </p>
                    </div>
                  </div>
                )}
                {(formData.supplier_type !== "airline" || formData.override_commission) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="commissionable">Commissionable %</Label>
                      <div className="relative">
                        <Input
                          id="commissionable"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={formData.commissionable_percentage}
                          onChange={(e) => setFormData({ ...formData, commissionable_percentage: parseFloat(e.target.value) || 0 })}
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Portion of booking eligible for commission</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rate">Commission Rate</Label>
                      <div className="relative">
                        <Input
                          id="rate"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={formData.commission_rate}
                          onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Rate applied to commissionable amount</p>
                    </div>
                  </div>
                )}
                {formData.supplier_type === "airline" && !formData.override_commission && (
                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mt-2">
                    Using flat rate: <strong>$25.00 per $500</strong> of gross sales
                  </p>
                )}
              </>
            )}

            {formData.multi_line_commission && (
              <p className="text-xs text-muted-foreground bg-primary/10 p-2 rounded mt-2">
                Commission will be calculated per line item when creating bookings with this supplier.
              </p>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-sm text-muted-foreground mb-3">Contact Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.contact_email || ""}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="agent@supplier.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.contact_phone || ""}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this supplier..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateSupplier.isPending || !formData.name}>
              {updateSupplier.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
