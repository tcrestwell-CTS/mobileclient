import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plane, ArrowLeft, AlertTriangle, CheckCircle2, Clock, ArrowRight, Luggage, Armchair } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { FlightOffer, OrderPassenger, SeatMap, AvailableService, ServiceSelection, SeatMapElement } from "@/hooks/useFlightSearch";

interface Props {
  offer: FlightOffer;
  seatMaps: SeatMap[];
  baggageServices: AvailableService[];
  loading: boolean;
  onBack: () => void;
  onConfirm: (passengers: OrderPassenger[], paymentType: "balance" | "arc_bsp_cash", services: ServiceSelection[]) => void;
}

function formatDuration(iso: string) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  const h = match[1] ? `${match[1]}h` : "";
  const m = match[2] ? ` ${match[2]}m` : "";
  return `${h}${m}`.trim();
}

interface PassengerForm {
  id: string;
  type: string;
  given_name: string;
  family_name: string;
  born_on: string;
  gender: "m" | "f" | "";
  title: string;
  email: string;
  phone_number: string;
  infant_passenger_id: string;
}

// ── Seat Selection per segment per passenger ──
// key = `${segmentIdx}-${passengerId}`, value = service id
type SeatSelections = Record<string, string>;
// key = baggage service id, value = quantity
type BaggageSelections = Record<string, number>;

export function FlightBookingCheckout({ offer, seatMaps, baggageServices, loading, onBack, onConfirm }: Props) {
  const [passengers, setPassengers] = useState<PassengerForm[]>([]);
  const [paymentType, setPaymentType] = useState<"balance" | "arc_bsp_cash">("balance");
  const [seatSelections, setSeatSelections] = useState<SeatSelections>({});
  const [baggageSelections, setBaggageSelections] = useState<BaggageSelections>({});

  useEffect(() => {
    setPassengers(
      offer.passengers.map((p) => ({
        id: p.id,
        type: p.type,
        given_name: "",
        family_name: "",
        born_on: "",
        gender: "" as "m" | "f" | "",
        title: "",
        email: "",
        phone_number: "",
        infant_passenger_id: "",
      }))
    );
  }, [offer]);

  const updatePassenger = (index: number, field: keyof PassengerForm, value: string) => {
    setPassengers((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const infantPassengers = passengers.filter((p) => p.type === "infant_without_seat");
  const adultPassengers = passengers.filter((p) => p.type === "adult");

  const isValid = passengers.every(
    (p) =>
      p.given_name.trim() &&
      p.family_name.trim() &&
      p.born_on &&
      p.gender &&
      p.title &&
      p.email.trim() &&
      p.phone_number.trim()
  ) && infantPassengers.every((inf) => inf.infant_passenger_id);

  // Calculate ancillary costs
  const seatCost = Object.values(seatSelections).reduce((sum, serviceId) => {
    // Find the service in seat maps to get its price
    for (const sm of seatMaps) {
      for (const cabin of sm.cabins) {
        for (const row of cabin.rows) {
          for (const section of row.sections) {
            for (const el of section.elements) {
              const svc = el.available_services?.find((s) => s.id === serviceId);
              if (svc) return sum + parseFloat(svc.total_amount);
            }
          }
        }
      }
    }
    return sum;
  }, 0);

  const bagCost = Object.entries(baggageSelections).reduce((sum, [svcId, qty]) => {
    const svc = baggageServices.find((s) => s.id === svcId);
    return svc ? sum + parseFloat(svc.total_amount) * qty : sum;
  }, 0);

  const baseAmount = parseFloat(offer.total_amount);
  const totalAmount = baseAmount + seatCost + bagCost;

  const handleConfirm = () => {
    const mapped: OrderPassenger[] = passengers.map((p) => ({
      id: p.id,
      given_name: p.given_name.trim(),
      family_name: p.family_name.trim(),
      born_on: p.born_on,
      gender: p.gender as "m" | "f",
      title: p.title,
      email: p.email.trim(),
      phone_number: p.phone_number.trim(),
      ...(p.infant_passenger_id ? { infant_passenger_id: p.infant_passenger_id } : {}),
    }));

    // Combine seat + baggage services
    const services: ServiceSelection[] = [];
    Object.values(seatSelections).forEach((id) => {
      services.push({ id, quantity: 1 });
    });
    Object.entries(baggageSelections).forEach(([id, qty]) => {
      if (qty > 0) services.push({ id, quantity: qty });
    });

    onConfirm(mapped, paymentType, services);
  };

  // ── Helper: get all available seats for a seat map, per passenger ──
  function getAvailableSeats(seatMap: SeatMap, passengerId: string) {
    const seats: Array<{ designator: string; serviceId: string; amount: string; currency: string }> = [];
    for (const cabin of seatMap.cabins) {
      for (const row of cabin.rows) {
        for (const section of row.sections) {
          for (const el of section.elements) {
            if (el.type !== "seat") continue;
            const svc = el.available_services?.find((s) => s.passenger_id === passengerId);
            if (svc) {
              seats.push({
                designator: el.designator || "?",
                serviceId: svc.id,
                amount: svc.total_amount,
                currency: svc.total_currency,
              });
            }
          }
        }
      }
    }
    return seats;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h3 className="text-base font-semibold">Complete Booking</h3>
      </div>

      {/* Offer summary */}
      <Card className="bg-muted/30">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="space-y-1">
              {offer.slices.map((slice, idx) => (
                <div key={slice.id} className="flex items-center gap-2 text-sm">
                  {idx > 0 && <Separator className="my-1" />}
                  <Plane className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium">{slice.origin.iata_code}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{slice.destination.iata_code}</span>
                  <span className="text-muted-foreground text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(slice.duration)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {format(parseISO(slice.segments[0].departing_at), "MMM d, HH:mm")}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">
                ${baseAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-muted-foreground">{offer.total_currency} base fare</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Passenger details */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          Passenger Details
          <Badge variant="secondary">{passengers.length} passenger{passengers.length !== 1 ? "s" : ""}</Badge>
        </h4>

        {passengers.map((pax, idx) => (
          <Card key={pax.id}>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                Passenger {idx + 1}
                <Badge variant="outline" className="text-xs capitalize">
                  {pax.type.replace("_", " ")}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Title *</Label>
                  <Select value={pax.title} onValueChange={(v) => updatePassenger(idx, "title", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mr">Mr</SelectItem>
                      <SelectItem value="mrs">Mrs</SelectItem>
                      <SelectItem value="ms">Ms</SelectItem>
                      <SelectItem value="miss">Miss</SelectItem>
                      <SelectItem value="dr">Dr</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Given Name *</Label>
                  <Input className="h-8 text-xs" value={pax.given_name} onChange={(e) => updatePassenger(idx, "given_name", e.target.value)} placeholder="First name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Family Name *</Label>
                  <Input className="h-8 text-xs" value={pax.family_name} onChange={(e) => updatePassenger(idx, "family_name", e.target.value)} placeholder="Last name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Gender *</Label>
                  <Select value={pax.gender} onValueChange={(v) => updatePassenger(idx, "gender", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m">Male</SelectItem>
                      <SelectItem value="f">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Date of Birth *</Label>
                  <Input type="date" className="h-8 text-xs" value={pax.born_on} onChange={(e) => updatePassenger(idx, "born_on", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email *</Label>
                  <Input type="email" className="h-8 text-xs" value={pax.email} onChange={(e) => updatePassenger(idx, "email", e.target.value)} placeholder="email@example.com" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone *</Label>
                  <Input className="h-8 text-xs" value={pax.phone_number} onChange={(e) => updatePassenger(idx, "phone_number", e.target.value)} placeholder="+1234567890" />
                </div>
              </div>

              {pax.type === "infant_without_seat" && (
                <div className="space-y-1">
                  <Label className="text-xs">Responsible Adult *</Label>
                  <Select value={pax.infant_passenger_id} onValueChange={(v) => updatePassenger(idx, "infant_passenger_id", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select responsible adult" /></SelectTrigger>
                    <SelectContent>
                      {adultPassengers.map((adult) => (
                        <SelectItem key={adult.id} value={adult.id}>
                          {adult.given_name || adult.family_name
                            ? `${adult.given_name} ${adult.family_name}`.trim()
                            : `Adult ${passengers.indexOf(adult) + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Seat Selection ── */}
      {seatMaps.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Armchair className="h-4 w-4 text-primary" />
              Seat Selection
              <Badge variant="secondary" className="text-xs">Optional</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {seatMaps.map((sm, smIdx) => {
              // Find segment info from offer
              const segment = offer.slices
                .flatMap((s) => s.segments)
                .find((seg) => seg.id === sm.segment_id);
              const segLabel = segment
                ? `${segment.origin.iata_code} → ${segment.destination.iata_code}`
                : `Segment ${smIdx + 1}`;

              return (
                <div key={sm.id} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{segLabel}</p>
                  {offer.passengers
                    .filter((p) => p.type !== "infant_without_seat")
                    .map((pax) => {
                      const seats = getAvailableSeats(sm, pax.id);
                      if (seats.length === 0) return null;
                      const selKey = `${smIdx}-${pax.id}`;
                      const paxForm = passengers.find((p) => p.id === pax.id);
                      const paxLabel = paxForm?.given_name
                        ? `${paxForm.given_name} ${paxForm.family_name}`.trim()
                        : `Passenger ${offer.passengers.indexOf(pax) + 1}`;

                      return (
                        <div key={selKey} className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs min-w-[100px] truncate">{paxLabel}</span>
                          <Select
                            value={seatSelections[selKey] || "none"}
                            onValueChange={(v) => {
                              setSeatSelections((prev) => {
                                const next = { ...prev };
                                if (v === "none") {
                                  delete next[selKey];
                                } else {
                                  next[selKey] = v;
                                }
                                return next;
                              });
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs w-[200px]">
                              <SelectValue placeholder="No seat preference" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              <SelectItem value="none">No seat preference</SelectItem>
                              {seats.map((seat) => (
                                <SelectItem key={seat.serviceId} value={seat.serviceId}>
                                  Seat {seat.designator} — {parseFloat(seat.amount) === 0 ? "Free" : `$${parseFloat(seat.amount).toFixed(2)}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                </div>
              );
            })}
            {seatCost > 0 && (
              <p className="text-xs text-primary font-medium">
                Seat total: +${seatCost.toFixed(2)} {offer.total_currency}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Baggage Options ── */}
      {baggageServices.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Luggage className="h-4 w-4 text-primary" />
              Extra Baggage
              <Badge variant="secondary" className="text-xs">Optional</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {baggageServices.map((svc) => {
              const pax = passengers.find((p) => p.id === svc.passenger_ids?.[0]);
              const paxLabel = pax?.given_name
                ? `${pax.given_name} ${pax.family_name}`.trim()
                : `Passenger`;
              const weight = svc.metadata?.maximum_weight_kg;
              const bagType = svc.metadata?.type || "checked";
              const qty = baggageSelections[svc.id] || 0;

              return (
                <div key={svc.id} className="flex items-center justify-between gap-3 flex-wrap border rounded-lg p-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium capitalize">
                      {bagType} bag{weight ? ` (${weight}kg)` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      For {paxLabel} • ${parseFloat(svc.total_amount).toFixed(2)} {svc.total_currency} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={qty <= 0}
                      onClick={() => setBaggageSelections((prev) => ({ ...prev, [svc.id]: Math.max(0, qty - 1) }))}
                    >
                      −
                    </Button>
                    <span className="text-sm font-medium w-6 text-center">{qty}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={qty >= svc.maximum_quantity}
                      onClick={() => setBaggageSelections((prev) => ({ ...prev, [svc.id]: Math.min(svc.maximum_quantity, qty + 1) }))}
                    >
                      +
                    </Button>
                  </div>
                </div>
              );
            })}
            {bagCost > 0 && (
              <p className="text-xs text-primary font-medium">
                Baggage total: +${bagCost.toFixed(2)} {offer.total_currency}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Type */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Select value={paymentType} onValueChange={(v: "balance" | "arc_bsp_cash") => setPaymentType(v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="balance">Duffel Balance</SelectItem>
              <SelectItem value="arc_bsp_cash">ARC/BSP Cash</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            {paymentType === "balance"
              ? "Payment will be charged to your Duffel balance."
              : "For IATA-registered agents using their own airline relationships."}
          </p>
        </CardContent>
      </Card>

      {/* Legal notice */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-200">
          By confirming this booking, you agree that passenger details are accurate and acknowledge
          the airline's terms, conditions, and fare rules.
        </p>
      </div>

      {/* Confirm button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {(seatCost > 0 || bagCost > 0) && (
          <div className="text-sm space-y-0.5">
            <p className="text-muted-foreground">Base: ${baseAmount.toFixed(2)}</p>
            {seatCost > 0 && <p className="text-muted-foreground">Seats: +${seatCost.toFixed(2)}</p>}
            {bagCost > 0 && <p className="text-muted-foreground">Bags: +${bagCost.toFixed(2)}</p>}
            <p className="font-semibold">Total: ${totalAmount.toFixed(2)} {offer.total_currency}</p>
          </div>
        )}
        <div className="flex gap-3 ml-auto">
          <Button variant="outline" onClick={onBack}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!isValid || loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {loading ? "Booking..." : `Confirm — $${totalAmount.toFixed(2)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
