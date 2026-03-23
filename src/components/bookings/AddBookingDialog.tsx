import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Mail, Users, DollarSign, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useCompanions } from "@/hooks/useCompanions";
import { useAddBookingTravelers } from "@/hooks/useBookingTravelers";
import { useSuppliers } from "@/hooks/useSuppliers";
import { CreateBookingData } from "@/hooks/useBookings";
import { Booking } from "@/hooks/useBookings";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DateRangePicker } from "@/components/ui/date-range-picker";

interface AddBookingDialogProps {
  onSubmit: (data: CreateBookingData) => Promise<Booking | null>;
  creating: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddBookingDialog({ onSubmit, creating, open: controlledOpen, onOpenChange }: AddBookingDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { activeSuppliers, isLoading: suppliersLoading } = useSuppliers();
  const addBookingTravelers = useAddBookingTravelers();
  const [showFinancials, setShowFinancials] = useState(false);
  
  const [formData, setFormData] = useState({
    client_id: "",
    destination: "",
    depart_date: "",
    return_date: "",
    travelers: 1,
    total_amount: 0,
    gross_sales: 0,
    supplier_payout: 0,
    commission_rate: 10,
    supplier_id: "",
    trip_name: "",
    notes: "",
    send_confirmation_email: true,
    commission_override_amount: undefined as number | undefined,
    override_notes: "",
  });

  const [selectedCompanionIds, setSelectedCompanionIds] = useState<string[]>([]);

  // Fetch companions for the selected client
  const { data: companions = [], isLoading: companionsLoading } = useCompanions(
    formData.client_id || undefined
  );

  const [selectedClientEmail, setSelectedClientEmail] = useState<string | null>(null);

  // Update selected client email when client changes
  // Reset selected companions when client changes
  useEffect(() => {
    setSelectedCompanionIds([]);
  }, [formData.client_id]);

  useEffect(() => {
    if (formData.client_id) {
      const client = clients.find(c => c.id === formData.client_id);
      setSelectedClientEmail(client?.email || null);
    } else {
      setSelectedClientEmail(null);
    }
  }, [formData.client_id, clients]);

  const toggleCompanion = (companionId: string) => {
    setSelectedCompanionIds(prev =>
      prev.includes(companionId)
        ? prev.filter(id => id !== companionId)
        : [...prev, companionId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.destination || !formData.depart_date || !formData.return_date) {
      return;
    }

    // Validate that return date is after departure date
    if (formData.return_date < formData.depart_date) {
      return;
    }

    const result = await onSubmit(formData);
    if (result) {
      // Add selected companions as travelers
      if (selectedCompanionIds.length > 0) {
        await addBookingTravelers.mutateAsync({
          bookingId: result.id,
          companionIds: selectedCompanionIds,
        });
      }

      setOpen(false);
      setFormData({
        client_id: "",
        destination: "",
        depart_date: "",
        return_date: "",
        travelers: 1,
        total_amount: 0,
        gross_sales: 0,
        supplier_payout: 0,
        commission_rate: 10,
        supplier_id: "",
        trip_name: "",
        notes: "",
        send_confirmation_email: true,
        commission_override_amount: undefined,
        override_notes: "",
      });
      setSelectedCompanionIds([]);
      setShowFinancials(false);
    }
  };

  // Calculate financials when gross sales or rates change
  const calculatedFinancials = (() => {
    const gross = formData.gross_sales || formData.total_amount;
    const netSales = gross - formData.supplier_payout;
    const commissionRevenue = netSales * (formData.commission_rate / 100);
    return { commissionableAmount: netSales, commissionRevenue, netSales };
  })();

  // Check if override requires approval
  const overrideRequiresApproval = formData.commission_override_amount !== undefined && 
    formData.commission_override_amount > calculatedFinancials.commissionRevenue;

  // Get effective commission (override or calculated)
  const effectiveCommission = formData.commission_override_amount !== undefined 
    ? formData.commission_override_amount 
    : calculatedFinancials.commissionRevenue;

  const handleSupplierChange = (supplierId: string) => {
    if (supplierId === "none") {
      setFormData(prev => ({ ...prev, supplier_id: "", commission_rate: 10 }));
    } else {
      const supplier = activeSuppliers.find(s => s.id === supplierId);
      if (supplier) {
        setFormData(prev => ({
          ...prev,
          supplier_id: supplierId,
          commission_rate: supplier.commission_rate,
        }));
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Booking
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
          <DialogDescription>
            Add a new travel booking for a client
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={clientsLoading ? "Loading clients..." : "Select a client"} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name} {client.email ? `(${client.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trip_name">Trip Name</Label>
            <Input
              id="trip_name"
              value={formData.trip_name}
              onChange={(e) => setFormData(prev => ({ ...prev, trip_name: e.target.value }))}
              placeholder="e.g., European Adventure"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="destination">Destination *</Label>
            <Input
              id="destination"
              value={formData.destination}
              onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
              placeholder="e.g., Paris, France"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Trip Dates *</Label>
            <DateRangePicker
              dateRange={
                formData.depart_date && formData.return_date
                  ? { from: parseISO(formData.depart_date), to: parseISO(formData.return_date) }
                  : formData.depart_date
                  ? { from: parseISO(formData.depart_date), to: undefined }
                  : undefined
              }
              onDateRangeChange={(range) => {
                setFormData(prev => ({
                  ...prev,
                  depart_date: range?.from ? format(range.from, "yyyy-MM-dd") : "",
                  return_date: range?.to ? format(range.to, "yyyy-MM-dd") : "",
                }));
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="travelers">Travelers</Label>
              <Input
                id="travelers"
                type="number"
                min="1"
                value={formData.travelers}
                onChange={(e) => setFormData(prev => ({ ...prev, travelers: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gross_sales">Gross Booking Sales ($) *</Label>
              <Input
                id="gross_sales"
                type="number"
                min="0"
                step="0.01"
                value={formData.gross_sales || formData.total_amount}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setFormData(prev => ({ ...prev, gross_sales: value, total_amount: value }));
                }}
              />
            </div>
          </div>
          {/* Supplier Cost */}
          <div className="space-y-2">
            <Label htmlFor="supplier_cost">Supplier Cost ($)</Label>
            <Input
              id="supplier_cost"
              type="number"
              min="0"
              step="0.01"
              value={formData.supplier_payout}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier_payout: parseFloat(e.target.value) || 0 }))}
            />
            <p className="text-xs text-muted-foreground">What you pay to the supplier</p>
          </div>


          <Collapsible open={showFinancials} onOpenChange={setShowFinancials}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-3 h-auto bg-muted/50 hover:bg-muted">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm font-medium">Commission Details</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-success font-medium">
                    {formatCurrency(calculatedFinancials.commissionRevenue)}
                  </span>
                  {showFinancials ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              {/* Supplier Selection */}
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Select
                  value={formData.supplier_id || "none"}
                  onValueChange={handleSupplierChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={suppliersLoading ? "Loading..." : "Select supplier (optional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No supplier (manual rates)</SelectItem>
                    {activeSuppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.commission_rate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Manual Rate (if no supplier) */}
              {!formData.supplier_id && (
                <div className="space-y-2">
                  <Label htmlFor="commission_rate">Commission Rate %</Label>
                  <Input
                    id="commission_rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, commission_rate: parseFloat(e.target.value) || 10 }))}
                  />
                </div>
              )}

              {/* Calculated Values */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Net Sales</span>
                  <span>{formatCurrency(calculatedFinancials.netSales)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Calculated Commission</span>
                  <span className="font-medium">{formatCurrency(calculatedFinancials.commissionRevenue)}</span>
                </div>
              </div>

              {/* Commission Override */}
              <div className="space-y-2">
                <Label htmlFor="commission_override" className="flex items-center gap-2">
                  Commission Override
                  <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="commission_override"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={`Auto: ${formatCurrency(calculatedFinancials.commissionRevenue)}`}
                  value={formData.commission_override_amount ?? ""}
                  onChange={(e) => {
                    const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                    setFormData(prev => ({ ...prev, commission_override_amount: value }));
                  }}
                />
                {overrideRequiresApproval && (
                  <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning/20 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-xs text-warning">
                      Higher than calculated - requires admin approval
                    </span>
                  </div>
                )}
              </div>

              {overrideRequiresApproval && (
                <div className="space-y-2">
                  <Label htmlFor="override_notes">Override Reason</Label>
                  <Input
                    id="override_notes"
                    placeholder="Explain why override is needed..."
                    value={formData.override_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, override_notes: e.target.value }))}
                  />
                </div>
              )}

              {/* Effective Commission Display */}
              {formData.commission_override_amount !== undefined && (
                <div className="bg-primary/10 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-primary font-medium">
                      {overrideRequiresApproval ? "Pending Commission" : "Final Commission"}
                    </span>
                    <span className="font-semibold text-primary">
                      {formatCurrency(effectiveCommission)}
                    </span>
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Travel Companions Selection */}
          {formData.client_id && companions.length > 0 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Travel Companions
              </Label>
              <p className="text-xs text-muted-foreground">
                Select companions who will be traveling on this trip
              </p>
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-3">
                {companionsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading companions...</p>
                ) : (
                  companions.map((companion) => (
                    <div key={companion.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`companion-${companion.id}`}
                        checked={selectedCompanionIds.includes(companion.id)}
                        onCheckedChange={() => toggleCompanion(companion.id)}
                      />
                      <label
                        htmlFor={`companion-${companion.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {companion.first_name} {companion.last_name}
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({companion.relationship})
                        </span>
                      </label>
                    </div>
                  ))
                )}
              </div>
              {selectedCompanionIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedCompanionIds.length} companion{selectedCompanionIds.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional booking notes..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Send Confirmation Email</p>
                <p className="text-xs text-muted-foreground">
                  {selectedClientEmail 
                    ? `Email will be sent to ${selectedClientEmail}`
                    : "Select a client with email to enable"}
                </p>
              </div>
            </div>
            <Switch
              checked={formData.send_confirmation_email && !!selectedClientEmail}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, send_confirmation_email: checked }))}
              disabled={!selectedClientEmail}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Booking
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
