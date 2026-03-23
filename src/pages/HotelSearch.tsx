import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Hotel,
  Search,
  Star,
  MapPin,
  Loader2,
  BedDouble,
  DollarSign,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useHotelSearch, HotelResult, HotelRate } from "@/hooks/useHotelSearch";
import { HotelDestinationInput } from "@/components/trips/HotelDestinationInput";
import { AddToTripSelector } from "@/components/search/AddToTripSelector";
import { format } from "date-fns";

function getStars(categoryName: string): number {
  const match = categoryName?.match(/(\d)/);
  return match ? parseInt(match[1]) : 0;
}

export default function HotelSearch() {
  const {
    hotels,
    loading,
    searchHotels,
    checkRate,
    checkingRate,
    checkedRate,
    confirmBooking,
    booking,
  } = useHotelSearch();

  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);

  // Rate check / booking dialog
  const [selectedRate, setSelectedRate] = useState<{
    hotel: HotelResult;
    rate: HotelRate;
    roomName: string;
  } | null>(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [holderName, setHolderName] = useState("");
  const [holderSurname, setHolderSurname] = useState("");
  const [remark, setRemark] = useState("");

  // Expanded hotels
  const [expandedHotels, setExpandedHotels] = useState<Set<number>>(new Set());

  const handleSearch = () => {
    const dest = destination.trim().toUpperCase();
    if (!dest || dest.length > 3 || !checkIn || !checkOut) {
      return;
    }
    searchHotels({
      checkIn,
      checkOut,
      destination: dest,
      occupancies: [{ rooms, adults, children }],
    });
  };

  const handleSelectRate = async (hotel: HotelResult, rate: HotelRate, roomName: string) => {
    setSelectedRate({ hotel, rate, roomName });
    setBookingDialogOpen(true);
    await checkRate([rate.rateKey]);
  };

  const handleConfirmBooking = async () => {
    if (!selectedRate || !holderName || !holderSurname) return;

    const paxes: { roomId: number; type: string; name: string; surname: string }[] = [];
    for (let r = 1; r <= (selectedRate.rate.rooms || 1); r++) {
      for (let a = 0; a < (selectedRate.rate.adults || 1); a++) {
        paxes.push({
          roomId: r,
          type: "AD",
          name: a === 0 ? holderName : `Guest ${a + 1}`,
          surname: holderSurname,
        });
      }
      for (let c = 0; c < (selectedRate.rate.children || 0); c++) {
        paxes.push({
          roomId: r,
          type: "CH",
          name: `Child ${c + 1}`,
          surname: holderSurname,
        });
      }
    }

    const result = await confirmBooking({
      holder: { name: holderName, surname: holderSurname },
      rooms: [{ rateKey: selectedRate.rate.rateKey, paxes }],
      remark: remark || undefined,
    });

    if (result) {
      setBookingDialogOpen(false);
      setSelectedRate(null);
      setHolderName("");
      setHolderSurname("");
      setRemark("");
    }
  };

  const toggleHotel = (code: number) => {
    setExpandedHotels((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Hotel className="h-6 w-6 text-primary" />
            Hotel Search
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Search and book hotels powered by HotelBeds
          </p>
        </div>

        {/* Search Form */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="space-y-2 lg:col-span-2">
                <Label>Destination</Label>
                <HotelDestinationInput
                  value={destination}
                  onChange={setDestination}
                  placeholder="Search city or code..."
                />
              </div>
              <div className="space-y-2">
                <Label>Check-in</Label>
                <Input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Check-out</Label>
                <Input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Adults</Label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={adults}
                  onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>Rooms</Label>
                <Input
                  type="number"
                  min={1}
                  max={9}
                  value={rooms}
                  onChange={(e) => setRooms(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <div className="space-y-2 w-24">
                <Label>Children</Label>
                <Input
                  type="number"
                  min={0}
                  max={4}
                  value={children}
                  onChange={(e) => setChildren(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex-1" />
              <Button
                onClick={handleSearch}
                disabled={loading || !destination || !checkIn || !checkOut}
                className="mt-6"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search Hotels
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Searching hotels...</span>
          </div>
        )}

        {!loading && hotels.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {hotels.length} Hotel{hotels.length !== 1 ? "s" : ""} Found
              </h2>
              <Badge variant="secondary">
                {checkIn} → {checkOut}
              </Badge>
            </div>

            {hotels.map((hotel) => {
              const stars = getStars(hotel.categoryName);
              const expanded = expandedHotels.has(hotel.code);

              return (
                <Card key={hotel.code} className="overflow-hidden">
                  <CardHeader
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleHotel(hotel.code)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {hotel.name}
                          <div className="flex gap-0.5">
                            {Array.from({ length: stars }).map((_, i) => (
                              <Star
                                key={i}
                                className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                              />
                            ))}
                          </div>
                        </CardTitle>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {hotel.destinationName} · {hotel.zoneName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {hotel.categoryName}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">From</p>
                          <p className="text-lg font-bold text-primary">
                            {hotel.currency} {hotel.minRate}
                          </p>
                        </div>
                        {expanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {expanded && (
                    <CardContent className="border-t pt-4 space-y-3">
                      {hotel.rooms.map((room) => (
                        <div key={room.code} className="space-y-2">
                          <h4 className="font-medium text-sm flex items-center gap-2">
                            <BedDouble className="h-4 w-4 text-muted-foreground" />
                            {room.name}
                          </h4>
                          <div className="grid gap-2">
                            {room.rates.map((rate, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Badge variant="secondary" className="text-xs">
                                      {rate.boardName}
                                    </Badge>
                                    <span className="text-muted-foreground">
                                      {rate.rooms} room{rate.rooms > 1 ? "s" : ""} · {rate.adults} adult{rate.adults > 1 ? "s" : ""}
                                      {rate.children > 0 && ` · ${rate.children} child${rate.children > 1 ? "ren" : ""}`}
                                    </span>
                                    {rate.rateType === "RECHECK" && (
                                      <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">
                                        Rate check required
                                      </Badge>
                                    )}
                                  </div>
                                  {rate.cancellationPolicies && rate.cancellationPolicies.length > 0 && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      Cancel by {format(new Date(rate.cancellationPolicies[0].from), "MMM d, yyyy")} — {hotel.currency} {rate.cancellationPolicies[0].amount} penalty
                                    </p>
                                  )}
                                  {rate.discount && parseFloat(rate.discount) > 0 && (
                                    <p className="text-xs text-primary font-medium">
                                      {rate.discountPCT}% discount — save {hotel.currency} {rate.discount}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    {rate.sellingRate && rate.sellingRate !== rate.net && (
                                      <p className="text-xs text-muted-foreground line-through">
                                        {hotel.currency} {rate.sellingRate}
                                      </p>
                                    )}
                                    <p className="text-base font-bold text-foreground">
                                      {hotel.currency} {rate.net}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">net rate</p>
                                  </div>
                                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <AddToTripSelector
                                      label="Add"
                                      items={[{
                                        day_number: 1,
                                        title: `${hotel.name} — ${room.name}`,
                                        description: `${rate.boardName} • ${rate.rooms} room${rate.rooms > 1 ? "s" : ""} • ${rate.adults} adult${rate.adults > 1 ? "s" : ""}${rate.children > 0 ? ` • ${rate.children} child${rate.children > 1 ? "ren" : ""}` : ""}`,
                                        category: "hotel",
                                        location: `${hotel.destinationName}, ${hotel.zoneName}`,
                                        notes: `Net rate: ${hotel.currency} ${rate.net}${rate.cancellationPolicies?.[0] ? ` • Cancel by ${format(new Date(rate.cancellationPolicies[0].from), "MMM d, yyyy")}` : ""}`,
                                      }]}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleSelectRate(hotel, rate, room.name)}
                                    >
                                      Book
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Booking Dialog */}
        <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Confirm Hotel Booking
              </DialogTitle>
            </DialogHeader>

            {selectedRate && (
              <div className="space-y-4">
                {/* Hotel summary */}
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="font-medium">{selectedRate.hotel.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedRate.roomName}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary">{selectedRate.rate.boardName}</Badge>
                    <span>{selectedRate.rate.rooms} room · {selectedRate.rate.adults} adults</span>
                  </div>
                </div>

                {/* Rate check status */}
                {checkingRate ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying latest rate...
                  </div>
                ) : checkedRate ? (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                    <p className="text-sm text-primary flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Rate verified — {selectedRate.hotel.currency} {selectedRate.rate.net}
                    </p>
                  </div>
                ) : null}

                <Separator />

                {/* Guest info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Holder First Name</Label>
                    <Input
                      value={holderName}
                      onChange={(e) => setHolderName(e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Holder Last Name</Label>
                    <Input
                      value={holderSurname}
                      onChange={(e) => setHolderSurname(e.target.value)}
                      placeholder="Smith"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Booking Remarks (optional)</Label>
                  <Input
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="Late check-in, extra pillows, etc."
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmBooking}
                disabled={booking || !holderName || !holderSurname || checkingRate}
              >
                {booking ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <DollarSign className="h-4 w-4 mr-2" />
                )}
                Confirm Booking
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
