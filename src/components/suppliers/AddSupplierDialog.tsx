import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useSuppliers, CreateSupplierData } from "@/hooks/useSuppliers";

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

export function AddSupplierDialog() {
  const [open, setOpen] = useState(false);
  const { createSupplier } = useSuppliers();
  const [formData, setFormData] = useState<CreateSupplierData>({
    name: "",
    supplier_type: "hotel",
    commissionable_percentage: 85,
    commission_rate: 10,
    contact_email: "",
    contact_phone: "",
    website: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createSupplier.mutateAsync(formData);
    setFormData({
      name: "",
      supplier_type: "hotel",
      commissionable_percentage: 85,
      commission_rate: 10,
      contact_email: "",
      contact_phone: "",
      website: "",
      notes: "",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Supplier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Supplier</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Supplier Name *</Label>
              <Input
                id="name"
                value={formData.name}
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
                value={formData.website}
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
                id="multi_line_commission"
                checked={formData.multi_line_commission || false}
                onCheckedChange={(checked) => setFormData({ ...formData, multi_line_commission: checked === true })}
              />
              <div>
                <Label htmlFor="multi_line_commission" className="text-sm font-medium cursor-pointer">
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
                      id="override_commission"
                      checked={formData.override_commission || false}
                      onCheckedChange={(checked) => setFormData({ ...formData, override_commission: checked === true })}
                    />
                    <div>
                      <Label htmlFor="override_commission" className="text-sm font-medium cursor-pointer">
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
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="agent@supplier.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.contact_phone}
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
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this supplier..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSupplier.isPending || !formData.name}>
              {createSupplier.isPending ? "Adding..." : "Add Supplier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
