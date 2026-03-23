import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Plane, Search, Plus, Trash2, MoreHorizontal, Loader2,
  Clock, ArrowRight, Users, ChevronDown, ChevronUp, PenLine,
} from "lucide-react";
import { useFlightSearch, type FlightOffer } from "@/hooks/useFlightSearch";
import { format, parseISO } from "date-fns";
import type { ItineraryItem } from "@/hooks/useItinerary";

interface FlightLeg {
  id: string;
  flightDate: string;
  origin: string;
  destination: string;
  airlineCode: string;
  flightNumber: string;
}

interface Props {
  tripId: string;
  flightItems: ItineraryItem[];
  onAddFlightToItinerary: (data: any) => Promise<boolean>;
  onDeleteItem: (id: string) => Promise<boolean>;
}

function formatDuration(iso: string) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  const h = match[1] ? `${match[1]}h` : "";
  const m = match[2] ? ` ${match[2]}m` : "";
  return `${h}${m}`.trim();
}

let legCounter = 0;

export function FlightLegsSection({ tripId, flightItems, onAddFlightToItinerary, onDeleteItem }: Props) {
  const { offers, loading, searchFlights } = useFlightSearch();
  const [legs, setLegs] = useState<FlightLeg[]>([
    { id: `leg-${++legCounter}`, flightDate: "", origin: "", destination: "", airlineCode: "", flightNumber: "" },
  ]);
  const [expanded, setExpanded] = useState(true);
  const [manualOpen, setManualOpen] = useState<string | null>(null);
  const [searchResultsOpen, setSearchResultsOpen] = useState(false);
  const [activeLegId, setActiveLegId] = useState<string | null>(null);
  const [itineraryDisplay, setItineraryDisplay] = useState<"single" | "multi">("single");

  // Manual add form state
  const [manualForm, setManualForm] = useState({
    title: "", departure_city_code: "", arrival_city_code: "",
    flight_number: "", start_time: "", end_time: "",
    item_date: "", description: "", day_number: 1,
  });

  const addLeg = () => {
    setLegs([...legs, { id: `leg-${++legCounter}`, flightDate: "", origin: "", destination: "", airlineCode: "", flightNumber: "" }]);
  };

  const removeLeg = (id: string) => {
    if (legs.length <= 1) return;
    setLegs(legs.filter((l) => l.id !== id));
  };

  const updateLeg = (id: string, field: keyof FlightLeg, value: string) => {
    setLegs(legs.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const handleSearch = (legId: string) => {
    const leg = legs.find((l) => l.id === legId);
    if (!leg || !leg.flightDate || !leg.origin || !leg.destination) return;

    setActiveLegId(legId);

    const slices = [
      {
        origin: leg.origin.toUpperCase(),
        destination: leg.destination.toUpperCase(),
        departure_date: leg.flightDate,
      },
    ];
    const passengers = [{ type: "adult" as const }];
    searchFlights({ slices, passengers, cabin_class: "economy" });
    setSearchResultsOpen(true);
  };

  const handleSelectOffer = async (offer: FlightOffer) => {
    for (const slice of offer.slices) {
      const seg = slice.segments[0];
      const lastSeg = slice.segments[slice.segments.length - 1];
      await onAddFlightToItinerary({
        trip_id: tripId,
        day_number: 1,
        title: `${seg.operating_carrier.name} ${seg.operating_carrier_flight_number}`,
        description: `${slice.origin.city_name} → ${slice.destination.city_name} • ${formatDuration(slice.duration)}${slice.segments.length > 1 ? ` • ${slice.segments.length - 1} stop(s)` : " • Direct"}`,
        category: "flight",
        location: `${slice.origin.iata_code} → ${slice.destination.iata_code}`,
        start_time: format(parseISO(seg.departing_at), "HH:mm"),
        end_time: format(parseISO(lastSeg.arriving_at), "HH:mm"),
        item_date: format(parseISO(seg.departing_at), "yyyy-MM-dd"),
        flight_number: seg.operating_carrier_flight_number,
        departure_city_code: slice.origin.iata_code,
        arrival_city_code: slice.destination.iata_code,
      });
    }
    setSearchResultsOpen(false);
  };

  const handleManualSubmit = async () => {
    if (!manualForm.title.trim()) return;
    const success = await onAddFlightToItinerary({
      trip_id: tripId,
      day_number: manualForm.day_number,
      title: manualForm.title,
      description: manualForm.description || undefined,
      category: "flight",
      start_time: manualForm.start_time || undefined,
      end_time: manualForm.end_time || undefined,
      item_date: manualForm.item_date || undefined,
      flight_number: manualForm.flight_number || undefined,
      departure_city_code: manualForm.departure_city_code || undefined,
      arrival_city_code: manualForm.arrival_city_code || undefined,
    });
    if (success) {
      setManualOpen(null);
      setManualForm({
        title: "", departure_city_code: "", arrival_city_code: "",
        flight_number: "", start_time: "", end_time: "",
        item_date: "", description: "", day_number: 1,
      });
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            Flights
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground text-xs">Itinerary Display:</span>
              <Select value={itineraryDisplay} onValueChange={(v: "single" | "multi") => setItineraryDisplay(v)}>
                <SelectTrigger className="h-7 w-[90px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="multi">Multi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          {/* Existing flight items */}
          {flightItems.length > 0 && (
            <div className="space-y-2">
              {flightItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 group"
                >
                  <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                    <Plane className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.title}</span>
                      {item.flight_number && (
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                          {item.flight_number}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {item.departure_city_code && item.arrival_city_code && (
                        <span className="font-medium">
                          {item.departure_city_code} → {item.arrival_city_code}
                        </span>
                      )}
                      {item.start_time && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {item.start_time.slice(0, 5)}
                          {item.end_time && ` – ${item.end_time.slice(0, 5)}`}
                        </span>
                      )}
                      {item.item_date && (
                        <span>{format(parseISO(item.item_date), "MMM d, yyyy")}</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={() => onDeleteItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Separator />
            </div>
          )}

          {/* Flight Legs */}
          {legs.map((leg, idx) => (
            <div key={leg.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Flight Leg</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground"
                  onClick={() => removeLeg(leg.id)}
                  disabled={legs.length <= 1}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs text-primary font-semibold">From (IATA)</Label>
                  <Input
                    value={leg.origin}
                    onChange={(e) => updateLeg(leg.id, "origin", e.target.value.toUpperCase())}
                    placeholder="e.g. JFK"
                    className="h-9 text-sm uppercase"
                    maxLength={3}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-primary font-semibold">To (IATA)</Label>
                  <Input
                    value={leg.destination}
                    onChange={(e) => updateLeg(leg.id, "destination", e.target.value.toUpperCase())}
                    placeholder="e.g. LAX"
                    className="h-9 text-sm uppercase"
                    maxLength={3}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-primary font-semibold">Flight Date</Label>
                  <Input
                    type="date"
                    value={leg.flightDate}
                    onChange={(e) => updateLeg(leg.id, "flightDate", e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-primary font-semibold">Airline Code</Label>
                  <Input
                    value={leg.airlineCode}
                    onChange={(e) => updateLeg(leg.id, "airlineCode", e.target.value.toUpperCase())}
                    placeholder="e.g. AA"
                    className="h-9 text-sm uppercase"
                    maxLength={3}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-primary font-semibold">Flight Number</Label>
                  <Input
                    value={leg.flightNumber}
                    onChange={(e) => updateLeg(leg.id, "flightNumber", e.target.value)}
                    placeholder="e.g. 1234"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Button
                    onClick={() => handleSearch(leg.id)}
                    disabled={loading || !leg.flightDate || !leg.origin || !leg.destination}
                    className="w-full h-9 gap-2"
                    size="sm"
                  >
                    {loading && activeLegId === leg.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Search
                  </Button>
                </div>
              </div>

              <Button
                variant="link"
                size="sm"
                className="text-xs text-muted-foreground px-0 h-auto"
                onClick={() => setManualOpen(leg.id)}
              >
                <PenLine className="h-3 w-3 mr-1" />
                Add Manually
              </Button>

              {idx < legs.length - 1 && <Separator className="mt-2" />}
            </div>
          ))}

          {/* Add Flight Button */}
          <Button
            variant="ghost"
            size="sm"
            className="text-primary gap-1.5"
            onClick={addLeg}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Flight
          </Button>

          {/* Search Results Dialog */}
          <Dialog open={searchResultsOpen} onOpenChange={setSearchResultsOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-primary" />
                  Flight Results
                </DialogTitle>
              </DialogHeader>
              {loading ? (
                <div className="flex flex-col items-center py-12 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Searching flights...</p>
                </div>
              ) : offers.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Plane className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No flights found. Try different search criteria.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {offers.length} flight{offers.length !== 1 ? "s" : ""} found
                  </p>
                  {offers
                    .sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount))
                    .map((offer) => (
                      <OfferResultCard
                        key={offer.id}
                        offer={offer}
                        onSelect={() => handleSelectOffer(offer)}
                      />
                    ))}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Manual Add Dialog */}
          <Dialog open={!!manualOpen} onOpenChange={(o) => { if (!o) setManualOpen(null); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Flight Manually</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Flight Title *</Label>
                  <Input
                    value={manualForm.title}
                    onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                    placeholder="e.g., American Airlines AA 1234"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Flight #</Label>
                    <Input
                      value={manualForm.flight_number}
                      onChange={(e) => setManualForm({ ...manualForm, flight_number: e.target.value })}
                      placeholder="AA 1234"
                    />
                  </div>
                  <div>
                    <Label>From</Label>
                    <Input
                      value={manualForm.departure_city_code}
                      onChange={(e) => setManualForm({ ...manualForm, departure_city_code: e.target.value.toUpperCase() })}
                      placeholder="JFK"
                      maxLength={4}
                      className="uppercase"
                    />
                  </div>
                  <div>
                    <Label>To</Label>
                    <Input
                      value={manualForm.arrival_city_code}
                      onChange={(e) => setManualForm({ ...manualForm, arrival_city_code: e.target.value.toUpperCase() })}
                      placeholder="LAX"
                      maxLength={4}
                      className="uppercase"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={manualForm.item_date}
                      onChange={(e) => setManualForm({ ...manualForm, item_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Depart Time</Label>
                    <Input
                      type="time"
                      value={manualForm.start_time}
                      onChange={(e) => setManualForm({ ...manualForm, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Arrive Time</Label>
                    <Input
                      type="time"
                      value={manualForm.end_time}
                      onChange={(e) => setManualForm({ ...manualForm, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={manualForm.description}
                    onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                    placeholder="Additional details"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setManualOpen(null)}>Cancel</Button>
                  <Button onClick={handleManualSubmit} disabled={!manualForm.title.trim()}>
                    Add Flight
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      )}
    </Card>
  );
}

function OfferResultCard({ offer, onSelect }: { offer: FlightOffer; onSelect: () => void }) {
  return (
    <div className="p-4 rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 space-y-2">
          {offer.slices.map((slice, idx) => (
            <div key={slice.id}>
              {idx > 0 && <Separator className="my-2" />}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 min-w-[100px]">
                  {slice.segments[0]?.operating_carrier?.logo_symbol_url ? (
                    <img
                      src={slice.segments[0].operating_carrier.logo_symbol_url}
                      alt={slice.segments[0].operating_carrier.name}
                      className="h-5 w-5 rounded"
                    />
                  ) : (
                    <Plane className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-xs text-muted-foreground truncate">
                    {slice.segments[0]?.operating_carrier?.name}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="font-semibold text-sm">
                      {format(parseISO(slice.segments[0].departing_at), "HH:mm")}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {slice.origin.iata_code}
                    </p>
                  </div>
                  <div className="flex flex-col items-center px-1">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDuration(slice.duration)}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <div className="h-px w-8 bg-border" />
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                    </div>
                    {slice.segments.length > 1 ? (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">
                        {slice.segments.length - 1} stop{slice.segments.length > 2 ? "s" : ""}
                      </Badge>
                    ) : (
                      <span className="text-[9px] text-green-600 font-medium">Direct</span>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">
                      {format(parseISO(slice.segments[slice.segments.length - 1].arriving_at), "HH:mm")}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {slice.destination.iata_code}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-end gap-1">
          <p className="text-lg font-bold">
            ${parseFloat(offer.total_amount).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <span className="text-[10px] text-muted-foreground">{offer.total_currency}</span>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Users className="h-2.5 w-2.5" />
            {offer.passengers.length} pax
          </div>
          <Button size="sm" variant="outline" className="mt-1 text-xs h-7">
            Add to Itinerary
          </Button>
        </div>
      </div>
    </div>
  );
}
