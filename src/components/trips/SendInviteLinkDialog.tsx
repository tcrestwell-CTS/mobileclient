import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SendInviteLinkDialogProps {
  defaultClientName?: string;
  defaultClientEmail?: string;
  defaultTripName?: string;
  defaultBookingRef?: string;
  tripTotalAmount?: number;
  depositRequired?: boolean;
  depositAmount?: number;
  trigger?: React.ReactNode;
}

export function SendInviteLinkDialog({
  defaultClientName = "",
  defaultClientEmail = "",
  defaultTripName = "",
  defaultBookingRef = "",
  tripTotalAmount = 0,
  depositRequired = false,
  depositAmount = 0,
  trigger,
}: SendInviteLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const [clientName, setClientName] = useState(defaultClientName);
  const [clientEmail, setClientEmail] = useState(defaultClientEmail);
  const [linkType, setLinkType] = useState<string>("payment");
  const [bookingRef, setBookingRef] = useState(defaultBookingRef);
  const [tripName, setTripName] = useState(defaultTripName);
  const [amount, setAmount] = useState("");
  const [expiresHours, setExpiresHours] = useState("72");
  const [notes, setNotes] = useState("");

  const getDefaultAmount = (type: string): string => {
    if (type === "deposit" && depositRequired && depositAmount > 0) {
      return depositAmount.toFixed(2);
    }
    if (type === "payment" && tripTotalAmount > 0) {
      return tripTotalAmount.toFixed(2);
    }
    return "";
  };

  // Reset form with defaults when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setClientName(defaultClientName);
      setClientEmail(defaultClientEmail);
      setTripName(defaultTripName);
      setBookingRef(defaultBookingRef);
      const defaultType = depositRequired ? "deposit" : "payment";
      setLinkType(defaultType);
      setAmount(getDefaultAmount(defaultType));
      setExpiresHours("72");
      setNotes("");
    }
    setOpen(isOpen);
  };

  const handleLinkTypeChange = (type: string) => {
    setLinkType(type);
    setAmount(getDefaultAmount(type));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim() || !clientEmail.trim()) {
      toast.error("Client name and email are required");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invite-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            link_type: linkType,
            client_name: clientName.trim(),
            client_email: clientEmail.trim(),
            booking_ref: bookingRef.trim() || undefined,
            trip_name: tripName.trim() || undefined,
            amount: amount ? parseFloat(amount) : undefined,
            notes: notes.trim() || undefined,
            expires_hours: parseInt(expiresHours) || 72,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to send invite link");
      }

      const typeLabel = linkType === "financing" ? "Financing" : linkType === "deposit" ? "Deposit" : "Payment";
      toast.success(`${typeLabel} link sent to ${clientEmail}`);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send invite link");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <Send className="h-4 w-4 mr-2" />
            Send Invite Link
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Invite Link</DialogTitle>
          <DialogDescription>
            Send a secure payment or financing link to your client via email.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Client Email *</Label>
              <Input
                id="clientEmail"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="john@example.com"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="linkType">Link Type</Label>
              <Select value={linkType} onValueChange={handleLinkTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment">Full Payment</SelectItem>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="financing">Financing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tripName">Trip Name</Label>
              <Input
                id="tripName"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="Caribbean Cruise"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingRef">Booking Ref</Label>
              <Input
                id="bookingRef"
                value={bookingRef}
                onChange={(e) => setBookingRef(e.target.value)}
                placeholder="BK-12345"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresHours">Link Expires In</Label>
            <Select value={expiresHours} onValueChange={setExpiresHours}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="48">48 hours</SelectItem>
                <SelectItem value="72">72 hours (default)</SelectItem>
                <SelectItem value="168">7 days</SelectItem>
                <SelectItem value="336">14 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes for internal tracking..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Link
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
