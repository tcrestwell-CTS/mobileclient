import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Plane, Search, Clock, ArrowRight, Users, Loader2, CreditCard } from "lucide-react";
import { IataCodeInput } from "@/components/trips/IataCodeInput";
import { useFlightSearch, FlightOffer, OrderPassenger, SeatMap, AvailableService, ServiceSelection } from "@/hooks/useFlightSearch";
import { AddToTripSelector } from "@/components/search/AddToTripSelector";
import { FlightBookingCheckout } from "@/components/trips/FlightBookingCheckout";
import { format, parseISO } from "date-fns";

function formatDuration(iso: string) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  const h = match[1] ? `${match[1]}h` : "";
  const m = match[2] ? ` ${match[2]}m` : "";
  return `${h}${m}`.trim();
}

// ── Helpers for slice grouping ──
function sliceKey(slice: FlightOffer["slices"][0]) {
  return slice.segments
    .map(
      (seg) =>
        `${seg.operating_carrier.iata_code}${seg.operating_carrier_flight_number}-${seg.origin.iata_code}-${seg.destination.iata_code}-${seg.departing_at}`
    )
    .join("|");
}

interface SliceGroup {
  key: string;
  slice: FlightOffer["slices"][0];
  minPrice: number;
  currency: string;
  offerIds: string[];
}

function groupSlices(offers: FlightOffer[], sliceIndex: number): SliceGroup[] {
  const map = new Map<string, SliceGroup>();
  for (const offer of offers) {
    const slice = offer.slices[sliceIndex];
    if (!slice) continue;
    const key = sliceKey(slice);
    const existing = map.get(key);
    const price = parseFloat(offer.total_amount);
    if (existing) {
      existing.offerIds.push(offer.id);
      if (price < existing.minPrice) existing.minPrice = price;
    } else {
      map.set(key, {
        key,
        slice,
        minPrice: price,
        currency: offer.total_currency,
        offerIds: [offer.id],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.minPrice - b.minPrice);
}

type SelectionStep = "all" | "outbound" | "return";

export default function FlightSearch() {
  const [searchParams] = useSearchParams();
  const tripIdFromQuery = searchParams.get("tripId") || undefined;
  const { offers, loading, bookingLoading, searchFlights, getOffer, getSeatMaps, createOrder } = useFlightSearch();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [cabinClass, setCabinClass] = useState("economy");
  const [adults, setAdults] = useState(1);
  const [childAges, setChildAges] = useState<number[]>([]);
  const [infants, setInfants] = useState(0);
  const [tripType, setTripType] = useState<"roundtrip" | "oneway" | "multicity">("roundtrip");
  const [multiCityLegs, setMultiCityLegs] = useState([
    { origin: "", destination: "", date: "" },
    { origin: "", destination: "", date: "" },
  ]);
  const [selectedOffer, setSelectedOffer] = useState<FlightOffer | null>(null);
  const [checkoutOffer, setCheckoutOffer] = useState<FlightOffer | null>(null);
  const [checkoutSeatMaps, setCheckoutSeatMaps] = useState<SeatMap[]>([]);
  const [checkoutBaggage, setCheckoutBaggage] = useState<AvailableService[]>([]);
  const [stopFilters, setStopFilters] = useState<Set<number>>(new Set([0, 1, 2]));

  // ── Slice-based selection for round trips ──
  const [selectionStep, setSelectionStep] = useState<SelectionStep>("all");
  const [selectedOutboundKey, setSelectedOutboundKey] = useState<string | null>(null);

  const isRoundTrip = tripType === "roundtrip" && offers.length > 0 && offers[0]?.slices?.length === 2;

  const toggleStopFilter = (stops: number) => {
    setStopFilters((prev) => {
      const next = new Set(prev);
      if (next.has(stops)) next.delete(stops);
      else next.add(stops);
      return next;
    });
  };

  const getOfferMaxStops = (offer: FlightOffer) =>
    Math.max(...offer.slices.map((s) => s.segments.length - 1));

  const filteredOffers = offers.filter((offer) => {
    const maxStops = getOfferMaxStops(offer);
    if (stopFilters.size === 0) return true;
    if (maxStops >= 2) return stopFilters.has(2);
    return stopFilters.has(maxStops);
  });

  // Offers filtered by selected outbound
  const offersMatchingOutbound = selectedOutboundKey
    ? filteredOffers.filter((o) => sliceKey(o.slices[0]) === selectedOutboundKey)
    : filteredOffers;

  const addChild = () => setChildAges((prev) => [...prev, 10]);
  const removeChild = (idx: number) => setChildAges((prev) => prev.filter((_, i) => i !== idx));
  const updateMultiCityLeg = (idx: number, field: string, value: string) => {
    setMultiCityLegs((prev) => prev.map((leg, i) => (i === idx ? { ...leg, [field]: value } : leg)));
  };
  const addMultiCityLeg = () => setMultiCityLegs((prev) => [...prev, { origin: "", destination: "", date: "" }]);
  const removeMultiCityLeg = (idx: number) => setMultiCityLegs((prev) => prev.filter((_, i) => i !== idx));

  const updateChildAge = (idx: number, age: number) =>
    setChildAges((prev) => prev.map((a, i) => (i === idx ? age : a)));

  const handleSearch = () => {
    const today = new Date().toISOString().split("T")[0];
    let slices: { origin: string; destination: string; departure_date: string }[];

    if (tripType === "multicity") {
      slices = multiCityLegs
        .filter((l) => l.origin && l.destination && l.date)
        .map((l) => ({ origin: l.origin.toUpperCase(), destination: l.destination.toUpperCase(), departure_date: l.date }));
      if (slices.length < 2) return;
    } else {
      slices = [
        { origin: origin.toUpperCase(), destination: destination.toUpperCase(), departure_date: departDate },
      ];
      if (tripType === "roundtrip" && returnDate) {
        slices.push({
          origin: destination.toUpperCase(),
          destination: origin.toUpperCase(),
          departure_date: returnDate,
        });
      }
    }

    const invalidSlice = slices.find((s) => s.departure_date < today);
    if (invalidSlice) {
      toast.error("All departure dates must be today or later.");
      return;
    }

    const passengers = [
      ...Array(adults).fill({ type: "adult" as const }),
      ...childAges.map((age) => ({ type: "child" as const, age })),
      ...Array(infants).fill({ type: "infant_without_seat" as const, age: 0 }),
    ];

    // Reset slice selection
    setSelectionStep(tripType === "roundtrip" ? "outbound" : "all");
    setSelectedOutboundKey(null);
    setSelectedOffer(null);

    searchFlights({ slices, passengers, cabin_class: cabinClass });
  };

  const handleSelectOutbound = (group: SliceGroup) => {
    setSelectedOutboundKey(group.key);
    setSelectionStep("return");
    setSelectedOffer(null);
  };

  const handleSelectReturn = (offer: FlightOffer) => {
    setSelectedOffer(offer);
  };

  const handleBackToOutbound = () => {
    setSelectionStep("outbound");
    setSelectedOutboundKey(null);
    setSelectedOffer(null);
  };

  const handleBookOffer = async (offerId: string) => {
    const [freshOffer, seatMaps] = await Promise.all([
      getOffer(offerId, true),
      getSeatMaps(offerId),
    ]);
    if (freshOffer) {
      setCheckoutOffer(freshOffer);
      setCheckoutSeatMaps(seatMaps);
      setCheckoutBaggage(
        (freshOffer.available_services || []).filter((s) => s.type === "baggage")
      );
    }
  };

  const handleConfirmBooking = async (passengers: OrderPassenger[], paymentType: "balance" | "arc_bsp_cash", services: ServiceSelection[]) => {
    if (!checkoutOffer) return;
    const baseCost = parseFloat(checkoutOffer.total_amount);
    const ancillaryCost = services.reduce((sum, svc) => {
      for (const sm of checkoutSeatMaps) {
        for (const cabin of sm.cabins) {
          for (const row of cabin.rows) {
            for (const section of row.sections) {
              for (const el of section.elements) {
                const found = el.available_services?.find((s) => s.id === svc.id);
                if (found) return sum + parseFloat(found.total_amount) * svc.quantity;
              }
            }
          }
        }
      }
      const bagSvc = checkoutBaggage.find((b) => b.id === svc.id);
      if (bagSvc) return sum + parseFloat(bagSvc.total_amount) * svc.quantity;
      return sum;
    }, 0);
    const totalAmount = (baseCost + ancillaryCost).toFixed(2);

    await createOrder({
      selected_offers: [checkoutOffer.id],
      passengers,
      payments: [{
        type: paymentType,
        currency: checkoutOffer.total_currency,
        amount: totalAmount,
      }],
      services: services.length > 0 ? services : undefined,
    });
    setCheckoutOffer(null);
  };

  // Show checkout if an offer is being booked
  if (checkoutOffer) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <FlightBookingCheckout
            offer={checkoutOffer}
            seatMaps={checkoutSeatMaps}
            baggageServices={checkoutBaggage}
            loading={bookingLoading}
            onBack={() => setCheckoutOffer(null)}
            onConfirm={handleConfirmBooking}
          />
        </div>
      </DashboardLayout>
    );
  }

  // ── Outbound slice groups for round-trip step selection ──
  const outboundGroups = isRoundTrip ? groupSlices(filteredOffers, 0) : [];
  const returnGroups = isRoundTrip && selectedOutboundKey
    ? groupSlices(offersMatchingOutbound, 1)
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary" />
            Flight Search
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Search, compare, and book flights powered by Duffel
          </p>
        </div>

        {/* Search Form */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Row 1: Trip type, Passengers, Cabin class */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex rounded-md border border-input overflow-hidden">
                {[
                  { value: "roundtrip" as const, label: "Round trip" },
                  { value: "oneway" as const, label: "One way" },
                  { value: "multicity" as const, label: "Multi-city" },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTripType(value)}
                    className={`px-4 h-9 text-sm font-medium transition-colors ${
                      tripType === value
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <Select value={String(adults)} onValueChange={(v) => setAdults(Number(v))}>
                <SelectTrigger className="w-[130px] h-9 text-sm">
                  <Users className="h-4 w-4 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="1 passenger" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} passenger{n > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={cabinClass} onValueChange={setCabinClass}>
                <SelectTrigger className="w-[160px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="economy">Economy</SelectItem>
                  <SelectItem value="premium_economy">Premium Economy</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="first">First</SelectItem>
                </SelectContent>
              </Select>

              <Select value={String(infants)} onValueChange={(v) => setInfants(Number(v))}>
                <SelectTrigger className="w-[120px] h-9 text-sm">
                  <SelectValue placeholder="Infants" />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} infant{n !== 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" className="h-9 text-xs" onClick={addChild}>
                + Child
              </Button>
            </div>

            {/* Children ages inline */}
            {childAges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {childAges.map((age, idx) => (
                  <div key={idx} className="flex items-center gap-1 border rounded-md px-2 py-1 bg-muted/50">
                    <span className="text-xs text-muted-foreground">Child {idx + 1} age:</span>
                    <Select value={String(age)} onValueChange={(v) => updateChildAge(idx, Number(v))}>
                      <SelectTrigger className="h-6 w-14 text-xs border-0 p-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 16 }, (_, i) => i + 2).map(a => (
                          <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeChild(idx)}>
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Row 2: Origin, Destination, Dates, Search */}
            {tripType === "multicity" ? (
              <div className="space-y-2">
                {multiCityLegs.map((leg, idx) => (
                  <div key={idx} className="flex items-end gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground w-6 pb-2.5">{idx + 1}.</span>
                    <div className="flex-1 min-w-[120px] space-y-1">
                      <Label className="text-xs text-muted-foreground">From</Label>
                      <IataCodeInput placeholder="e.g. JFK" value={leg.origin} onChange={(code) => updateMultiCityLeg(idx, "origin", code)} className="h-10" />
                    </div>
                    <div className="flex-1 min-w-[120px] space-y-1">
                      <Label className="text-xs text-muted-foreground">To</Label>
                      <IataCodeInput placeholder="e.g. LAX" value={leg.destination} onChange={(code) => updateMultiCityLeg(idx, "destination", code)} className="h-10" />
                    </div>
                    <div className="flex-1 min-w-[140px] space-y-1">
                      <Label className="text-xs text-muted-foreground">Date</Label>
                      <Input type="date" value={leg.date} onChange={(e) => updateMultiCityLeg(idx, "date", e.target.value)} className="h-10" />
                    </div>
                    {multiCityLegs.length > 2 && (
                      <Button variant="ghost" size="sm" className="h-10 px-2 text-muted-foreground hover:text-destructive" onClick={() => removeMultiCityLeg(idx)}>×</Button>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={addMultiCityLeg}>
                    + Add flight
                  </Button>
                  <Button
                    onClick={handleSearch}
                    disabled={loading || multiCityLegs.filter((l) => l.origin && l.destination && l.date).length < 2}
                    size="lg"
                    className="gap-2 h-10 px-6 rounded-full"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {loading ? "Searching..." : "Search"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-2 flex-wrap">
                <div className="flex-1 min-w-[140px] space-y-1">
                  <Label className="text-xs text-muted-foreground">Where from?</Label>
                  <IataCodeInput placeholder="e.g. JFK" value={origin} onChange={setOrigin} className="h-10" />
                </div>
                <div className="flex-1 min-w-[140px] space-y-1">
                  <Label className="text-xs text-muted-foreground">Where to?</Label>
                  <IataCodeInput placeholder="e.g. LAX" value={destination} onChange={setDestination} className="h-10" />
                </div>
                <div className="flex-1 min-w-[140px] space-y-1">
                  <Label className="text-xs text-muted-foreground">Departure</Label>
                  <Input type="date" value={departDate} onChange={(e) => setDepartDate(e.target.value)} className="h-10" />
                </div>
                {tripType === "roundtrip" && (
                  <div className="flex-1 min-w-[140px] space-y-1">
                    <Label className="text-xs text-muted-foreground">Return</Label>
                    <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="h-10" />
                  </div>
                )}
                <Button
                  onClick={handleSearch}
                  disabled={loading || !origin || !destination || !departDate || (tripType === "roundtrip" && !returnDate)}
                  size="lg"
                  className="gap-2 h-10 px-6 rounded-full"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {loading ? "Searching..." : "Search"}
                </Button>
              </div>
            )}

            {/* Row 3: Stop filters */}
            <div className="flex items-center gap-5 pt-1 flex-wrap">
              {[
                { value: 0, label: "Non-stop" },
                { value: 1, label: "1 stop" },
                { value: 2, label: "2+ stops" },
              ].map(({ value, label }) => (
                <label key={value} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    checked={stopFilters.has(value)}
                    onCheckedChange={() => toggleStopFilter(value)}
                  />
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Results ── */}
        {offers.length > 0 && (
          <div className="space-y-3">

            {/* ── Round-trip: Step-based slice selection ── */}
            {isRoundTrip && selectionStep === "outbound" && (
              <>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground">Step 1</Badge>
                      Select Outbound Flight
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {origin.toUpperCase()} → {destination.toUpperCase()} · {outboundGroups.length} option{outboundGroups.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {outboundGroups.map((group) => (
                  <SliceCard
                    key={group.key}
                    slice={group.slice}
                    priceLabel={`from $${group.minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    currency={group.currency}
                    isSelected={false}
                    onSelect={() => handleSelectOutbound(group)}
                    buttonLabel="Select Outbound"
                  />
                ))}
              </>
            )}

            {isRoundTrip && selectionStep === "return" && (
              <>
                {/* Booking actions when return is selected — at top */}
                {selectedOffer && (
                  <Card className="bg-muted/30 border-primary/30">
                    <CardContent className="py-4 px-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">Round trip selected</p>
                          <p className="text-2xl font-bold text-foreground mt-1">
                            ${parseFloat(selectedOffer.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-sm font-normal text-muted-foreground ml-2">{selectedOffer.total_currency} total</span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <AddToTripSelector
                            defaultTripId={tripIdFromQuery}
                            label="Add to Trip"
                            items={selectedOffer.slices.map((slice, idx) => ({
                              day_number: idx + 1,
                              title: `${slice.segments[0]?.operating_carrier?.name || "Flight"} ${slice.segments[0]?.operating_carrier_flight_number || ""}: ${slice.origin.iata_code} → ${slice.destination.iata_code}`,
                              description: `${format(parseISO(slice.segments[0].departing_at), "MMM d, HH:mm")} – ${format(parseISO(slice.segments[slice.segments.length - 1].arriving_at), "HH:mm")} • ${formatDuration(slice.duration)}${slice.segments.length > 1 ? ` • ${slice.segments.length - 1} stop${slice.segments.length > 2 ? "s" : ""}` : " • Direct"}`,
                              category: "flight",
                              location: `${slice.origin.city_name} → ${slice.destination.city_name}`,
                              start_time: format(parseISO(slice.segments[0].departing_at), "HH:mm"),
                              end_time: format(parseISO(slice.segments[slice.segments.length - 1].arriving_at), "HH:mm"),
                              flight_number: `${slice.segments[0]?.operating_carrier?.iata_code || ""}${slice.segments[0]?.operating_carrier_flight_number || ""}`,
                              departure_city_code: slice.origin.iata_code,
                              arrival_city_code: slice.destination.iata_code,
                              notes: `Total: $${parseFloat(selectedOffer.total_amount).toFixed(2)} ${selectedOffer.total_currency}`,
                            }))}
                          />
                          <Button onClick={() => handleBookOffer(selectedOffer.id)} className="gap-2">
                            <CreditCard className="h-4 w-4" />
                            Book This Flight
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Selected outbound summary */}
                {selectedOutboundKey && offersMatchingOutbound[0] && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-accent text-accent-foreground">✓ Outbound</Badge>
                          <SliceInline slice={offersMatchingOutbound[0].slices[0]} />
                        </div>
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleBackToOutbound}>
                          Change
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground">Step 2</Badge>
                      Select Return Flight
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {destination.toUpperCase()} → {origin.toUpperCase()} · {returnGroups.length} option{returnGroups.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {returnGroups.map((group) => {
                  const matchingOffer = offersMatchingOutbound.find(
                    (o) => sliceKey(o.slices[1]) === group.key
                  );
                  return (
                    <SliceCard
                      key={group.key}
                      slice={group.slice}
                      priceLabel={`$${group.minPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total`}
                      currency={group.currency}
                      isSelected={selectedOffer ? sliceKey(selectedOffer.slices[1]) === group.key : false}
                      onSelect={() => matchingOffer && handleSelectReturn(matchingOffer)}
                      buttonLabel="Select Return"
                    />
                  );
                })}
              </>
            )}

            {/* ── Non-round-trip: standard list ── */}
            {(!isRoundTrip || selectionStep === "all") && (
              <>
                {/* Booking card at top */}
                {selectedOffer && (
                  <Card className="bg-muted/30 border-primary/30">
                    <CardContent className="py-4 px-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">Flight selected</p>
                          <p className="text-2xl font-bold text-foreground mt-1">
                            ${parseFloat(selectedOffer.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-sm font-normal text-muted-foreground ml-2">{selectedOffer.total_currency} total</span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <AddToTripSelector
                            defaultTripId={tripIdFromQuery}
                            label="Add to Trip"
                            items={selectedOffer.slices.map((slice, idx) => ({
                              day_number: idx + 1,
                              title: `${slice.segments[0]?.operating_carrier?.name || "Flight"} ${slice.segments[0]?.operating_carrier_flight_number || ""}: ${slice.origin.iata_code} → ${slice.destination.iata_code}`,
                              description: `${format(parseISO(slice.segments[0].departing_at), "MMM d, HH:mm")} – ${format(parseISO(slice.segments[slice.segments.length - 1].arriving_at), "HH:mm")} • ${formatDuration(slice.duration)}${slice.segments.length > 1 ? ` • ${slice.segments.length - 1} stop${slice.segments.length > 2 ? "s" : ""}` : " • Direct"}`,
                              category: "flight",
                              location: `${slice.origin.city_name} → ${slice.destination.city_name}`,
                              start_time: format(parseISO(slice.segments[0].departing_at), "HH:mm"),
                              end_time: format(parseISO(slice.segments[slice.segments.length - 1].arriving_at), "HH:mm"),
                              flight_number: `${slice.segments[0]?.operating_carrier?.iata_code || ""}${slice.segments[0]?.operating_carrier_flight_number || ""}`,
                              departure_city_code: slice.origin.iata_code,
                              arrival_city_code: slice.destination.iata_code,
                              notes: `Total: $${parseFloat(selectedOffer.total_amount).toFixed(2)} ${selectedOffer.total_currency}`,
                            }))}
                          />
                          <Button onClick={() => handleBookOffer(selectedOffer.id)} className="gap-2">
                            <CreditCard className="h-4 w-4" />
                            Book This Flight
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h2 className="text-lg font-semibold text-foreground">
                    {filteredOffers.length} of {offers.length} flight{offers.length !== 1 ? "s" : ""}
                  </h2>
                </div>

                {filteredOffers
                  .sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount))
                  .map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      isSelected={selectedOffer?.id === offer.id}
                      onSelect={() => setSelectedOffer(offer)}
                    />
                  ))}
              </>
            )}
          </div>
        )}

        {!loading && offers.length === 0 && origin && destination && departDate && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Plane className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Search for flights to see results here.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

// ── Inline slice summary (for the selected outbound banner) ──
function SliceInline({ slice }: { slice: FlightOffer["slices"][0] }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {slice.segments[0]?.operating_carrier?.logo_symbol_url && (
        <img src={slice.segments[0].operating_carrier.logo_symbol_url} alt="" className="h-5 w-5 rounded" />
      )}
      <span className="font-medium">{slice.origin.iata_code}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground" />
      <span className="font-medium">{slice.destination.iata_code}</span>
      <span className="text-xs text-muted-foreground">
        {format(parseISO(slice.segments[0].departing_at), "MMM d, HH:mm")}
      </span>
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {formatDuration(slice.duration)}
      </span>
      <span className="text-xs text-muted-foreground">
        {slice.segments[0]?.operating_carrier?.name} {slice.segments[0]?.operating_carrier_flight_number}
      </span>
    </div>
  );
}

// ── Slice card for step-based selection ──
function SliceCard({
  slice,
  priceLabel,
  currency,
  isSelected,
  onSelect,
  buttonLabel,
}: {
  slice: FlightOffer["slices"][0];
  priceLabel: string;
  currency: string;
  isSelected: boolean;
  onSelect: () => void;
  buttonLabel: string;
}) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-primary border-primary" : ""
      }`}
      onClick={onSelect}
    >
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2 min-w-[120px]">
              {slice.segments[0]?.operating_carrier?.logo_symbol_url ? (
                <img
                  src={slice.segments[0].operating_carrier.logo_symbol_url}
                  alt={slice.segments[0].operating_carrier.name}
                  className="h-6 w-6 rounded"
                />
              ) : (
                <Plane className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground truncate">
                {slice.segments[0]?.operating_carrier?.name}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="font-semibold text-foreground">
                  {format(parseISO(slice.segments[0].departing_at), "HH:mm")}
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  {slice.origin.iata_code}
                </p>
              </div>

              <div className="flex flex-col items-center px-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(slice.duration)}
                </span>
                <div className="flex items-center gap-1">
                  <div className="h-px w-12 bg-border" />
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
                {slice.segments.length > 1 ? (
                  <Badge variant="secondary" className="text-[10px] mt-0.5">
                    {slice.segments.length - 1} stop{slice.segments.length > 2 ? "s" : ""}
                  </Badge>
                ) : (
                  <span className="text-[10px] text-green-600 font-medium">Direct</span>
                )}
              </div>

              <div className="text-center">
                <p className="font-semibold text-foreground">
                  {format(parseISO(slice.segments[slice.segments.length - 1].arriving_at), "HH:mm")}
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  {slice.destination.iata_code}
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground ml-2">
              {format(parseISO(slice.segments[0].departing_at), "MMM d, yyyy")}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 min-w-[140px]">
            <p className="text-lg font-bold text-foreground">{priceLabel}</p>
            <span className="text-xs text-muted-foreground">{currency}</span>
            <Button size="sm" variant={isSelected ? "default" : "outline"} className="mt-1">
              {isSelected ? "Selected" : buttonLabel}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Standard offer card (for one-way / multi-city) ──
function OfferCard({
  offer,
  isSelected,
  onSelect,
}: {
  offer: FlightOffer;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "ring-2 ring-primary border-primary" : ""
      }`}
      onClick={onSelect}
    >
      <CardContent className="py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 space-y-3">
            {offer.slices.map((slice, idx) => (
              <div key={slice.id}>
                {idx > 0 && <Separator className="my-2" />}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 min-w-[120px]">
                    {slice.segments[0]?.operating_carrier?.logo_symbol_url ? (
                      <img
                        src={slice.segments[0].operating_carrier.logo_symbol_url}
                        alt={slice.segments[0].operating_carrier.name}
                        className="h-6 w-6 rounded"
                      />
                    ) : (
                      <Plane className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground truncate">
                      {slice.segments[0]?.operating_carrier?.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="font-semibold text-foreground">
                        {format(parseISO(slice.segments[0].departing_at), "HH:mm")}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {slice.origin.iata_code}
                      </p>
                    </div>

                    <div className="flex flex-col items-center px-2">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(slice.duration)}
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="h-px w-12 bg-border" />
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                      {slice.segments.length > 1 && (
                        <Badge variant="secondary" className="text-[10px] mt-0.5">
                          {slice.segments.length - 1} stop{slice.segments.length > 2 ? "s" : ""}
                        </Badge>
                      )}
                      {slice.segments.length === 1 && (
                        <span className="text-[10px] text-green-600 font-medium">Direct</span>
                      )}
                    </div>

                    <div className="text-center">
                      <p className="font-semibold text-foreground">
                        {format(
                          parseISO(slice.segments[slice.segments.length - 1].arriving_at),
                          "HH:mm"
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {slice.destination.iata_code}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-end gap-1 min-w-[120px]">
            <p className="text-2xl font-bold text-foreground">
              ${parseFloat(offer.total_amount).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <span className="text-xs text-muted-foreground">{offer.total_currency}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {offer.passengers.length} passenger{offer.passengers.length > 1 ? "s" : ""}
            </div>
            <Button size="sm" variant={isSelected ? "default" : "outline"} className="mt-1">
              {isSelected ? "Selected" : "Select"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}