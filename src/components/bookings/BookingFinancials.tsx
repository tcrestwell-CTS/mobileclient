import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Percent, Building2, TrendingUp } from "lucide-react";
import { useSuppliers, isFlightFlatRate, FLIGHT_FLAT_RATE, FLIGHT_FLAT_PER } from "@/hooks/useSuppliers";
import { useMemo } from "react";

interface BookingFinancialsProps {
  grossSales: number;
  supplierCost: number;
  supplierId?: string | null;
  commissionRate?: number;
  onGrossSalesChange: (value: number) => void;
  onSupplierCostChange: (value: number) => void;
  onSupplierChange?: (supplierId: string | null) => void;
  onCommissionRateChange?: (value: number) => void;
  readOnly?: boolean;
  showSupplierSelect?: boolean;
}

export function BookingFinancials({
  grossSales,
  supplierCost,
  supplierId,
  commissionRate = 10,
  onGrossSalesChange,
  onSupplierCostChange,
  onSupplierChange,
  onCommissionRateChange,
  readOnly = false,
  showSupplierSelect = true,
}: BookingFinancialsProps) {
  const { activeSuppliers, isLoading: suppliersLoading } = useSuppliers();

  const selectedSupplier = useMemo(() => {
    if (!supplierId) return null;
    return activeSuppliers.find((s) => s.id === supplierId) || null;
  }, [supplierId, activeSuppliers]);

  const isFlightFlat = isFlightFlatRate(selectedSupplier);

  // Calculate financials: netSales = gross - supplierCost, commission = netSales * rate
  const financials = useMemo(() => {
    const netSales = grossSales - supplierCost;

    if (isFlightFlat) {
      const commissionRevenue = Math.round(((grossSales / FLIGHT_FLAT_PER) * FLIGHT_FLAT_RATE) * 100) / 100;
      return {
        netSales,
        commissionRevenue,
        effectiveCommissionRate: (FLIGHT_FLAT_RATE / FLIGHT_FLAT_PER) * 100,
      };
    }

    const effectiveCommissionRate = selectedSupplier
      ? selectedSupplier.commission_rate
      : commissionRate;

    const commissionRevenue = netSales * (effectiveCommissionRate / 100);

    return {
      netSales,
      commissionRevenue,
      effectiveCommissionRate,
    };
  }, [grossSales, supplierCost, selectedSupplier, commissionRate, isFlightFlat]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handleSupplierChange = (value: string) => {
    if (!onSupplierChange) return;

    if (value === "none") {
      onSupplierChange(null);
    } else {
      onSupplierChange(value);
      const supplier = activeSuppliers.find((s) => s.id === value);
      if (supplier) {
        onCommissionRateChange?.(supplier.commission_rate);
      }
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Financial Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Supplier Selection */}
        {showSupplierSelect && !readOnly && (
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Select
              value={supplierId || "none"}
              onValueChange={handleSupplierChange}
              disabled={readOnly}
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
            <p className="text-xs text-muted-foreground">
              Selecting a supplier will use their commission rate
            </p>
          </div>
        )}

        {/* Gross Sales */}
        <div className="space-y-2">
          <Label htmlFor="gross_sales">Gross Booking Sales ($)</Label>
          <Input
            id="gross_sales"
            type="number"
            min="0"
            step="0.01"
            value={grossSales}
            onChange={(e) => onGrossSalesChange(parseFloat(e.target.value) || 0)}
            disabled={readOnly}
            className="text-lg font-semibold"
          />
          <p className="text-xs text-muted-foreground">
            Total amount charged to the client
          </p>
        </div>

        {/* Supplier Cost */}
        <div className="space-y-2">
          <Label htmlFor="supplier_cost">Supplier Cost ($)</Label>
          <Input
            id="supplier_cost"
            type="number"
            min="0"
            step="0.01"
            value={supplierCost}
            onChange={(e) => onSupplierCostChange(parseFloat(e.target.value) || 0)}
            disabled={readOnly}
          />
          <p className="text-xs text-muted-foreground">
            Net rate charged by supplier (what you pay to the supplier)
          </p>
        </div>

        {/* Commission Rate (editable if no supplier) */}
        {!selectedSupplier && !readOnly && (
          <div className="space-y-2">
            <Label htmlFor="commission_rate">Commission Rate %</Label>
            <Input
              id="commission_rate"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={commissionRate}
              onChange={(e) => onCommissionRateChange?.(parseFloat(e.target.value) || 10)}
              disabled={readOnly}
            />
          </div>
        )}

        {/* Calculated Values */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Net Sales (Gross − Supplier Cost)
            </div>
            <span className="font-medium">
              {formatCurrency(financials.netSales)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-success">
              <TrendingUp className="h-4 w-4" />
              {isFlightFlat
                ? `Commission ($${FLIGHT_FLAT_RATE}/$${FLIGHT_FLAT_PER})`
                : `Commission (${financials.effectiveCommissionRate}%)`
              }
            </div>
            <span className="font-semibold text-success">
              {formatCurrency(financials.commissionRevenue)}
            </span>
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4" />
              Supplier Payout
            </div>
            <span className="font-semibold">
              {formatCurrency(supplierCost)}
            </span>
          </div>
        </div>

        {/* Info text */}
        {selectedSupplier && (
          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            Using rates from: <strong>{selectedSupplier.name}</strong>
            {isFlightFlat && " (flat rate: $25/$500)"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Display-only version for booking detail
interface BookingFinancialsDisplayProps {
  grossSales: number;
  commissionableAmount: number;
  commissionRevenue: number;
  netSales: number;
  supplierPayout: number;
  supplierName?: string | null;
}

export function BookingFinancialsDisplay({
  grossSales,
  commissionableAmount,
  commissionRevenue,
  netSales,
  supplierPayout,
  supplierName,
}: BookingFinancialsDisplayProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const commissionRate = netSales > 0
    ? ((commissionRevenue / netSales) * 100).toFixed(1)
    : "0";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          Trip Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Gross Booking Sales</p>
          <p className="text-2xl font-semibold text-foreground">
            {formatCurrency(grossSales)}
          </p>
        </div>

        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Supplier Payout</span>
            <span className="font-medium">{formatCurrency(supplierPayout)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Net Sales
            </span>
            <span className="font-medium">{formatCurrency(netSales)}</span>
          </div>

          <div className="flex items-center justify-between bg-success/10 p-2 rounded">
            <span className="text-sm text-success font-medium">
              Commission ({commissionRate}%)
            </span>
            <span className="font-semibold text-success">
              {formatCurrency(commissionRevenue)}
            </span>
          </div>
        </div>

        {supplierName && (
          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            Supplier: <strong>{supplierName}</strong>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
