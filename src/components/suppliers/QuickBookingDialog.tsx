import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Ship, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useClients } from "@/hooks/useClients";
import { useBookings } from "@/hooks/useBookings";
import { toast } from "sonner";
import type { Supplier } from "@/types/supplier";

interface QuickBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
}

export function QuickBookingDialog({
  open,
  onOpenChange,
  supplier,
}: QuickBookingDialogProps) {
  const clientsQuery = useClients();
  const clients = clientsQuery.data;
  const { createBooking, creating } = useBookings();
  
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [clientId, setClientId] = useState("");
  const [destination, setDestination] = useState("");
  const [departDate, setDepartDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [totalAmount, setTotalAmount] = useState("");
  const [travelers, setTravelers] = useState("1");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setConfirmationNumber("");
    setClientId("");
    setDestination("");
    setDepartDate(undefined);
    setReturnDate(undefined);
    setTotalAmount("");
    setTravelers("1");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!confirmationNumber || !clientId || !destination || !departDate || !returnDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const result = await createBooking({
      client_id: clientId,
      destination,
      depart_date: format(departDate, "yyyy-MM-dd"),
      return_date: format(returnDate, "yyyy-MM-dd"),
      total_amount: parseFloat(totalAmount) || 0,
      travelers: parseInt(travelers) || 1,
      notes: notes 
        ? `Confirmation: ${confirmationNumber}. Booked via ${supplier?.name || "external portal"}. ${notes}` 
        : `Confirmation: ${confirmationNumber}. Booked via ${supplier?.name || "external portal"}`,
      trip_name: `${supplier?.name} - ${destination}`,
    });

    if (result) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-primary" />
            Import Booking from {supplier?.name}
          </DialogTitle>
          <DialogDescription>
            Enter the confirmation details from the external booking portal.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Confirmation Number */}
          <div className="space-y-2">
            <Label htmlFor="confirmation">Confirmation Number *</Label>
            <Input
              id="confirmation"
              placeholder="e.g., RC12345678"
              value={confirmationNumber}
              onChange={(e) => setConfirmationNumber(e.target.value)}
            />
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="destination">Destination / Itinerary *</Label>
            <Input
              id="destination"
              placeholder="e.g., Caribbean 7-Night Cruise"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Departure Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !departDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {departDate ? format(departDate, "MMM d, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={departDate}
                    onSelect={setDepartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Return Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !returnDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {returnDate ? format(returnDate, "MMM d, yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={returnDate}
                    onSelect={setReturnDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Amount and Travelers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Total Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="travelers">Number of Travelers</Label>
              <Input
                id="travelers"
                type="number"
                min="1"
                value={travelers}
                onChange={(e) => setTravelers(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Cabin number, special requests, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={creating}>
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Import Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
