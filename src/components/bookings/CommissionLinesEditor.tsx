import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { useBookingCommissionLines, CreateCommissionLine } from "@/hooks/useBookingCommissionLines";

interface CommissionLinesEditorProps {
  bookingId: string;
  readOnly?: boolean;
}

export function CommissionLinesEditor({ bookingId, readOnly = false }: CommissionLinesEditorProps) {
  const { lines, isLoading, addLine, updateLine, deleteLine, totalCommission, totalAmount } = useBookingCommissionLines(bookingId);
  const [newLine, setNewLine] = useState<CreateCommissionLine>({ description: "", amount: 0, commission_rate: 0 });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);

  const handleAdd = async () => {
    if (!newLine.description || !newLine.amount) return;
    await addLine.mutateAsync(newLine);
    setNewLine({ description: "", amount: 0, commission_rate: 0 });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading commission lines...</p>;

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Commission Line Items</Label>

      {/* Header */}
      <div className="grid grid-cols-[1fr_100px_80px_100px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
        <span>Description</span>
        <span>Amount</span>
        <span>Rate %</span>
        <span>Commission</span>
        <span />
      </div>

      {/* Existing lines */}
      {lines.map((line) => (
        <div key={line.id} className="grid grid-cols-[1fr_100px_80px_100px_32px] gap-2 items-center">
          <Input
            value={line.description}
            onChange={(e) => updateLine.mutate({ id: line.id, description: e.target.value })}
            disabled={readOnly}
            className="h-8 text-sm"
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={line.amount}
            onChange={(e) => updateLine.mutate({ id: line.id, amount: parseFloat(e.target.value) || 0 })}
            disabled={readOnly}
            className="h-8 text-sm"
          />
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={line.commission_rate}
            onChange={(e) => updateLine.mutate({ id: line.id, commission_rate: parseFloat(e.target.value) || 0 })}
            disabled={readOnly}
            className="h-8 text-sm"
          />
          <span className="text-sm font-medium px-1">{formatCurrency(line.commission_amount)}</span>
          {!readOnly && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => deleteLine.mutate(line.id)}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      ))}

      {/* Add new line */}
      {!readOnly && (
        <div className="grid grid-cols-[1fr_100px_80px_100px_32px] gap-2 items-center">
          <Input
            placeholder="e.g., Hotel Standard"
            value={newLine.description}
            onChange={(e) => setNewLine(prev => ({ ...prev, description: e.target.value }))}
            className="h-8 text-sm"
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={newLine.amount || ""}
            onChange={(e) => setNewLine(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
            className="h-8 text-sm"
          />
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="0"
            value={newLine.commission_rate || ""}
            onChange={(e) => setNewLine(prev => ({ ...prev, commission_rate: parseFloat(e.target.value) || 0 }))}
            className="h-8 text-sm"
          />
          <span className="text-sm text-muted-foreground px-1">
            {formatCurrency(newLine.amount * (newLine.commission_rate / 100))}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleAdd}
            disabled={!newLine.description || !newLine.amount || addLine.isPending}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Totals */}
      <div className="border-t pt-2 grid grid-cols-[1fr_100px_80px_100px_32px] gap-2 items-center">
        <span className="text-sm font-semibold">Total</span>
        <span className="text-sm font-medium">{formatCurrency(totalAmount)}</span>
        <span />
        <span className="text-sm font-semibold text-primary">{formatCurrency(totalCommission)}</span>
        <span />
      </div>
    </div>
  );
}

/** Inline editor for use in booking creation forms (before booking is saved) */
export interface LocalCommissionLine {
  id: string;
  description: string;
  amount: number;
  commission_rate: number;
  commission_amount: number;
}

interface LocalCommissionLinesEditorProps {
  lines: LocalCommissionLine[];
  onChange: (lines: LocalCommissionLine[]) => void;
}

export function LocalCommissionLinesEditor({ lines, onChange }: LocalCommissionLinesEditorProps) {
  const [newLine, setNewLine] = useState<Omit<LocalCommissionLine, "id" | "commission_amount">>( {
    description: "",
    amount: 0,
    commission_rate: 0,
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);

  const handleAdd = () => {
    if (!newLine.description || !newLine.amount) return;
    const commission_amount = Math.round(newLine.amount * (newLine.commission_rate / 100) * 100) / 100;
    onChange([
      ...lines,
      { ...newLine, id: crypto.randomUUID(), commission_amount },
    ]);
    setNewLine({ description: "", amount: 0, commission_rate: 0 });
  };

  const handleUpdate = (id: string, field: string, value: string | number) => {
    onChange(
      lines.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        updated.commission_amount = Math.round(updated.amount * (updated.commission_rate / 100) * 100) / 100;
        return updated;
      })
    );
  };

  const handleDelete = (id: string) => {
    onChange(lines.filter((l) => l.id !== id));
  };

  const totalAmount = lines.reduce((s, l) => s + l.amount, 0);
  const totalCommission = lines.reduce((s, l) => s + l.commission_amount, 0);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Commission Line Items</Label>

      <div className="grid grid-cols-[1fr_100px_80px_100px_32px] gap-2 text-xs font-medium text-muted-foreground px-1">
        <span>Description</span>
        <span>Amount</span>
        <span>Rate %</span>
        <span>Commission</span>
        <span />
      </div>

      {lines.map((line) => (
        <div key={line.id} className="grid grid-cols-[1fr_100px_80px_100px_32px] gap-2 items-center">
          <Input
            value={line.description}
            onChange={(e) => handleUpdate(line.id, "description", e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={line.amount}
            onChange={(e) => handleUpdate(line.id, "amount", parseFloat(e.target.value) || 0)}
            className="h-8 text-sm"
          />
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={line.commission_rate}
            onChange={(e) => handleUpdate(line.id, "commission_rate", parseFloat(e.target.value) || 0)}
            className="h-8 text-sm"
          />
          <span className="text-sm font-medium px-1">{formatCurrency(line.commission_amount)}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(line.id)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}

      <div className="grid grid-cols-[1fr_100px_80px_100px_32px] gap-2 items-center">
        <Input
          placeholder="e.g., Hotel Standard"
          value={newLine.description}
          onChange={(e) => setNewLine((p) => ({ ...p, description: e.target.value }))}
          className="h-8 text-sm"
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={newLine.amount || ""}
          onChange={(e) => setNewLine((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
          className="h-8 text-sm"
        />
        <Input
          type="number"
          min="0"
          max="100"
          step="0.1"
          placeholder="0"
          value={newLine.commission_rate || ""}
          onChange={(e) => setNewLine((p) => ({ ...p, commission_rate: parseFloat(e.target.value) || 0 }))}
          className="h-8 text-sm"
        />
        <span className="text-sm text-muted-foreground px-1">
          {formatCurrency(newLine.amount * (newLine.commission_rate / 100))}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleAdd} disabled={!newLine.description || !newLine.amount}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="border-t pt-2 grid grid-cols-[1fr_100px_80px_100px_32px] gap-2 items-center">
        <span className="text-sm font-semibold">Total</span>
        <span className="text-sm font-medium">{formatCurrency(totalAmount)}</span>
        <span />
        <span className="text-sm font-semibold text-primary">{formatCurrency(totalCommission)}</span>
        <span />
      </div>
    </div>
  );
}
