import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Supplier } from "@/types/supplier";

interface SupplierNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  onSave: (id: string, notes: string) => void;
}

export function SupplierNotesDialog({
  open,
  onOpenChange,
  supplier,
  onSave,
}: SupplierNotesDialogProps) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (supplier) {
      setNotes(supplier.notes);
    }
  }, [supplier]);

  const handleSave = () => {
    if (supplier) {
      onSave(supplier.id, notes);
    }
  };

  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Notes for {supplier.name}</DialogTitle>
          <DialogDescription>
            Save login credentials, tips, or any helpful information for this supplier.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Username: myagent@email.com&#10;Portal tips: Use 'Advanced Search' for group rates..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[200px] resize-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            💡 Tip: Store your username here, but keep passwords in a secure password manager.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Notes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
