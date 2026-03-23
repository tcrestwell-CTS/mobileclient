import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Loader2, Ship, Plane, Hotel, Car, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useClients } from "@/hooks/useClients";
import { useTripTravelers } from "@/hooks/useTripTravelers";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LocalCommissionLinesEditor, LocalCommissionLine } from "@/components/bookings/CommissionLinesEditor";

// Booking types with their icons and supplier type mappings
const BOOKING_TYPES = [
  { value: "cruise", label: "Cruise", icon: Ship, supplierType: "cruise" },
  { value: "flight", label: "Flight", icon: Plane, supplierType: "airline" },
  { value: "lodging", label: "Lodging", icon: Hotel, supplierType: "hotel" },
  { value: "transportation", label: "Transportation", icon: Car, supplierType: "transfer" },
] as const;

type BookingType = typeof BOOKING_TYPES[number]["value"];

interface AddTripBookingDialogProps {
  tripId: string;
  clientId: string | null;
  destination?: string;
  departDate?: string;
  returnDate?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingCreated?: () => void;
}

export function AddTripBookingDialog({
  tripId,
  clientId,
  destination,
  departDate,
  returnDate,
  open,
  onOpenChange,
  onBookingCreated,
}: AddTripBookingDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { activeSuppliers, isLoading: suppliersLoading } = useSuppliers();
  const { data: clients = [] } = useClients();
  const { data: tripTravelers = [] } = useTripTravelers(tripId);
  const [creating, setCreating] = useState(false);
  const [showFinancials, setShowFinancials] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [commissionLines, setCommissionLines] = useState<LocalCommissionLine[]>([]);

  const effectiveClientId = clientId || selectedClientId;

  const [formData, setFormData] = useState({
    booking_type: "" as BookingType | "",
    destination: destination || "",
    depart_date: departDate || "",
    return_date: returnDate || "",
    booking_reference: "",
    travelers: 1,
    gross_sales: 0,
    supplier_payout: 0,
    commission_rate: 10,
    supplier_id: "",
    trip_name: "",
    notes: "",
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        booking_type: "",
        destination: destination || "",
        depart_date: departDate || "",
        return_date: returnDate || "",
        booking_reference: "",
        travelers: 1,
        gross_sales: 0,
        supplier_payout: 0,
        commission_rate: 10,
        supplier_id: "",
        trip_name: "",
        notes: "",
      });
      setShowFinancials(false);
      setCommissionLines([]);
    }
  }, [open, destination, departDate, returnDate]);

  // Filter suppliers based on selected booking type
  const filteredSuppliers = activeSuppliers.filter((supplier) => {
    if (!formData.booking_type) return true;
    const bookingTypeConfig = BOOKING_TYPES.find((bt) => bt.value === formData.booking_type);
    if (!bookingTypeConfig) return true;
    
    // Map booking types to supplier types
    const supplierTypeMatches: Record<string, string[]> = {
      cruise: ["cruise"],
      flight: ["airline", "flight"],
      lodging: ["hotel", "lodging"],
      transportation: ["transfer", "car_rental", "transportation"],
    };
    
    const matchingTypes = supplierTypeMatches[formData.booking_type] || [];
    return matchingTypes.includes(supplier.supplier_type.toLowerCase());
  });

  // Check if selected supplier uses multi-line commission
  const selectedSupplier = activeSuppliers.find(s => s.id === formData.supplier_id);
  const isMultiLine = selectedSupplier?.multi_line_commission === true;

  // Calculate financials: netSales = gross - supplierCost, commission = netSales * rate
  const calculatedFinancials = (() => {
    if (isMultiLine) {
      const totalLineCommission = commissionLines.reduce((s, l) => s + l.commission_amount, 0);
      const netSales = formData.gross_sales - formData.supplier_payout;
      return { commissionableAmount: formData.gross_sales, commissionRevenue: totalLineCommission, netSales };
    }
    const gross = formData.gross_sales;
    const netSales = gross - formData.supplier_payout;
    const commissionRevenue = netSales * (formData.commission_rate / 100);
    return { commissionableAmount: netSales, commissionRevenue, netSales };
  })();

  const handleSupplierChange = (supplierId: string) => {
    if (supplierId === "none") {
      setFormData((prev) => ({
        ...prev,
        supplier_id: "",
        commission_rate: 10,
      }));
    } else {
      const supplier = activeSuppliers.find((s) => s.id === supplierId);
      if (supplier) {
        setFormData((prev) => ({
          ...prev,
          supplier_id: supplierId,
          commission_rate: supplier.commission_rate,
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !formData.booking_type || !formData.destination || !formData.depart_date || !formData.return_date) {
      toast.error("Please fill in all required fields");
      return;
    }


    if (formData.return_date < formData.depart_date) {
      toast.error("Return date must be after departure date");
      return;
    }

    setCreating(true);

    try {
      const netSales = formData.gross_sales - formData.supplier_payout;
      const commissionRevenue = isMultiLine
        ? commissionLines.reduce((s, l) => s + l.commission_amount, 0)
        : netSales * (formData.commission_rate / 100);

      const bookingData = {
        user_id: user.id,
        trip_id: tripId,
        confirmation_number: formData.booking_reference || `BK-${Date.now()}`,
        gross_sales: formData.gross_sales,
        total_price: formData.gross_sales,
        commissionable_amount: isMultiLine ? formData.gross_sales : netSales,
        commission_revenue: Math.round(commissionRevenue * 100) / 100,
        net_sales: netSales,
        commission_estimate: formData.commission_rate || 0,
        supplier_id: formData.supplier_id || null,
        status: "pending",
      };

      const { data: newBooking, error } = await supabase.from("bookings").insert(bookingData).select().single();

      if (error) throw error;

      // Save commission lines if multi-line supplier
      if (isMultiLine && commissionLines.length > 0 && newBooking) {
        const lineInserts = commissionLines.map((line, idx) => ({
          booking_id: newBooking.id,
          user_id: user.id,
          description: line.description,
          amount: line.amount,
          commission_rate: line.commission_rate,
          commission_amount: line.commission_amount,
          sort_order: idx,
        }));
        await supabase.from("booking_commission_lines").insert(lineInserts);
      }

      toast.success("Booking added to trip");
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      onOpenChange(false);
      onBookingCreated?.();
    } catch (error: any) {
      if (error?.code === "23505" || error?.message?.includes("unique constraint")) {
        toast.error("A booking with that confirmation number already exists. Please use a different one.");
      } else {
        toast.error("Failed to create booking: " + error.message);
      }
    } finally {
      setCreating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const selectedBookingType = BOOKING_TYPES.find((bt) => bt.value === formData.booking_type);
  const BookingIcon = selectedBookingType?.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Booking to Trip</DialogTitle>
          <DialogDescription>
            Create a new booking line item for this trip
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Booking Type Selection */}
          <div className="space-y-2">
            <Label>Booking Type *</Label>
            <Select
              value={formData.booking_type}
              onValueChange={(value: BookingType) => setFormData((prev) => ({ ...prev, booking_type: value, supplier_id: "" }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select booking type">
                  {formData.booking_type && (
                    <div className="flex items-center gap-2">
                      {BookingIcon && <BookingIcon className="h-4 w-4" />}
                      {selectedBookingType?.label}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {BOOKING_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Trip Name / Description */}
          <div className="space-y-2">
            <Label htmlFor="trip_name">Description</Label>
            <Input
              id="trip_name"
              value={formData.trip_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, trip_name: e.target.value }))}
              placeholder={formData.booking_type ? `e.g., ${selectedBookingType?.label} to ${formData.destination || "destination"}` : "e.g., Caribbean Cruise"}
            />
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="destination">Destination *</Label>
            <Input
              id="destination"
              value={formData.destination}
              onChange={(e) => setFormData((prev) => ({ ...prev, destination: e.target.value }))}
              placeholder="e.g., Miami, Florida"
              required
            />
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Dates *</Label>
            <DateRangePicker
              dateRange={
                formData.depart_date && formData.return_date
                  ? { from: parseISO(formData.depart_date), to: parseISO(formData.return_date) }
                  : formData.depart_date
                  ? { from: parseISO(formData.depart_date), to: undefined }
                  : undefined
              }
              onDateRangeChange={(range) => {
                setFormData((prev) => ({
                  ...prev,
                  depart_date: range?.from ? format(range.from, "yyyy-MM-dd") : "",
                  return_date: range?.to ? format(range.to, "yyyy-MM-dd") : "",
                }));
              }}
            />
          </div>

          {/* Booking Reference & Travelers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="booking_reference">Confirmation #</Label>
              <Input
                id="booking_reference"
                value={formData.booking_reference}
                onChange={(e) => setFormData((prev) => ({ ...prev, booking_reference: e.target.value }))}
                placeholder="ABC123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="travelers">Travelers</Label>
              <Input
                id="travelers"
                type="number"
                min="1"
                value={formData.travelers}
                onChange={(e) => setFormData((prev) => ({ ...prev, travelers: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          {/* Gross Sales */}
          <div className="space-y-2">
            <Label htmlFor="gross_sales">Gross Booking Sales ($) *</Label>
            <Input
              id="gross_sales"
              type="number"
              min="0"
              step="0.01"
              value={formData.gross_sales || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, gross_sales: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
            />
          </div>

          {/* Supplier Cost */}
          <div className="space-y-2">
            <Label htmlFor="supplier_cost">Supplier Cost ($)</Label>
            <Input
              id="supplier_cost"
              type="number"
              min="0"
              step="0.01"
              value={formData.supplier_payout || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, supplier_payout: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">What you pay to the supplier</p>
          </div>

          {/* Commission Details Collapsible */}
          <Collapsible open={showFinancials} onOpenChange={setShowFinancials}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-3 h-auto bg-muted/50 hover:bg-muted">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm font-medium">Commission Details</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-primary font-medium">
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
                <Select value={formData.supplier_id || "none"} onValueChange={handleSupplierChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={suppliersLoading ? "Loading..." : "Select supplier (optional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No supplier (manual rates)</SelectItem>
                    {filteredSuppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.commission_rate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Multi-line commission editor */}
              {isMultiLine ? (
                <LocalCommissionLinesEditor lines={commissionLines} onChange={setCommissionLines} />
              ) : (
                <>
                  {/* Manual Rate */}
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
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            commission_rate: parseFloat(e.target.value) || 10,
                          }))
                        }
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
                      <span className="text-muted-foreground">Commission Revenue</span>
                      <span className="font-medium text-primary">{formatCurrency(calculatedFinancials.commissionRevenue)}</span>
                    </div>
                  </div>
                </>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional notes about this booking..."
              rows={2}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || !formData.booking_type}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Booking
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
