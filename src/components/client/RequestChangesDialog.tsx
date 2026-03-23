import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface RequestChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itineraryName: string;
  onSubmit: (message: string) => Promise<void>;
}

export function RequestChangesDialog({
  open,
  onOpenChange,
  itineraryName,
  onSubmit,
}: RequestChangesDialogProps) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Please describe the changes you'd like.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(`Change request for "${itineraryName}": ${message.trim()}`);
      toast.success("Your change request has been sent to your advisor.");
      setMessage("");
      onOpenChange(false);
    } catch {
      toast.error("Failed to send. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Request Changes
          </DialogTitle>
          <DialogDescription>
            Let your advisor know what you'd like changed on <strong>"{itineraryName}"</strong>.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Describe the changes you'd like to make..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="mt-2"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !message.trim()}>
            {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
