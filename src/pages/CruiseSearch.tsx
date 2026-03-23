import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ship, Search, ChevronRight, Loader2, MapPin, Calendar, DollarSign, Check, Eye, Plus, ArrowLeft, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AddToTripSelector } from "@/components/search/AddToTripSelector";
import { format, parseISO } from "date-fns";

interface WidgetySailing {
  holiday_ref: string;
  name: string;
  operator_title: string;
  holiday: string;
  ship_title?: string;
  image_url?: string;
  date_from?: string;
  date_to?: string;
  nights?: number;
}

interface WidgetyCabinPrice {
  availability: string;
  double_price_pp: string;
  single_price_pp: string | null;
  triple_price_pp: string | null;
  quad_price_pp: string | null;
  grade_code: string;
  grade_name: string;
  room_type: string;
  non_comm_charges: string | null;
  onboard_credit: string | null;
  child_price: string | null;
}

interface WidgetyPricingDeal {
  name: string;
  description: string | null;
  prices: WidgetyCabinPrice[];
}

interface WidgetyDate {
  date_ref: string;
  date_from: string;
  date_to: string;
  ship_title: string;
  starts_at?: { name: string; country: string };
  ends_at?: { name: string; country: string };
  itinerary_code: string;
  availability_string?: string;
  headline_prices?: {
    cruise?: {
      double?: {
        from_inside?: string;
        from_outside?: string;
        from_balcony?: string;
        from_suite?: string;
      };
    };
  };
  pricing?: WidgetyPricingDeal[];
}

interface WidgetyItineraryItem {
  day_number: number;
  title: string;
  description: string;
  category: string;
  location: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
}

const AVAILABLE_OPERATORS = [
  { slug: "american-cruise-lines", label: "American Cruise Lines" },
  { slug: "amawaterways", label: "AmaWaterways" },
  { slug: "avalon-waterways", label: "Avalon Waterways" },
  { slug: "carnival-cruise-lines-operator", label: "Carnival Cruise Line" },
  { slug: "celebrity-cruises", label: "Celebrity Cruises" },
  { slug: "celebrity-river-cruises", label: "Celebrity River Cruises" },
  { slug: "cunard-line", label: "Cunard Line" },
  { slug: "disney-cruise-line", label: "Disney Cruise Line" },
  { slug: "explora-journeys", label: "Explora Journeys" },
  { slug: "holland-america-line", label: "Holland America Line" },
  { slug: "msc-cruises", label: "MSC Cruises" },
  { slug: "norwegian-cruise-line", label: "Norwegian Cruise Line" },
  { slug: "princess-cruises", label: "Princess Cruises" },
  { slug: "ritz-carlton-yacht-collection", label: "Ritz-Carlton Yacht Collection" },
  { slug: "royal-caribbean-international", label: "Royal Caribbean International" },
  { slug: "seabourn-cruise-line", label: "Seabourn Cruise Line" },
  { slug: "silversea-cruises", label: "Silversea Cruises" },
  { slug: "tauck", label: "Tauck" },
  { slug: "uniworld-boutique-river-cruises", label: "Uniworld Boutique River Cruises" },
  { slug: "virgin-voyages", label: "Virgin Voyages" },
];

const AVAILABLE_DESTINATIONS = [
  { value: "caribbean", label: "Caribbean" },
  { value: "mediterranean", label: "Mediterranean" },
  { value: "alaska", label: "Alaska" },
  { value: "bahamas", label: "Bahamas" },
  { value: "bermuda", label: "Bermuda" },
  { value: "hawaii", label: "Hawaii" },
  { value: "new-england", label: "New England" },
  { value: "europe", label: "Europe" },
  { value: "asia", label: "Asia" },
  { value: "africa", label: "Africa" },
  { value: "south-america", label: "South America" },
  { value: "central-america", label: "Central America" },
  { value: "pacific", label: "Pacific" },
  { value: "north-america", label: "North America" },
  { value: "middle-east", label: "Middle East" },
  { value: "scandinavia", label: "Scandinavia" },
  { value: "transatlantic", label: "Transatlantic" },
  { value: "indian-ocean", label: "Indian Ocean" },
];
type Step = "search" | "sailings" | "dates" | "pricing" | "itinerary";

export default function CruiseSearch() {
  const [step, setStep] = useState<Step>("search");
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [destination, setDestination] = useState("");
  const [cruiseType, setCruiseType] = useState("");
  const [shipFilter, setShipFilter] = useState("");
  const [availableShips, setAvailableShips] = useState<{ title: string; slug: string }[]>([]);
  const [shipsLoading, setShipsLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [sailings, setSailings] = useState<WidgetySailing[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedHoliday, setSelectedHoliday] = useState<WidgetySailing | null>(null);
  const [dates, setDates] = useState<WidgetyDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<WidgetyDate | null>(null);
  const [selectedCabin, setSelectedCabin] = useState<{ deal_name: string; cabin: WidgetyCabinPrice; room_type: string } | null>(null);
  const [previewItems, setPreviewItems] = useState<WidgetyItineraryItem[]>([]);
  const [meta, setMeta] = useState<{ ship_title?: string; operator_title?: string; holiday_name?: string }>({});

  const callWidgety = async (body: Record<string, any>) => {
    const { data, error } = await supabase.functions.invoke("widgety-cruise", { body });
    if (error) throw new Error(error.message || "Failed to call Widgety");
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const extractShipSlug = (ship: any) => {
    const href = ship?.href || ship?.ship || ship?.url || ship?._links?.self?.href;
    if (typeof href === "string") {
      const match = href.match(/\/ships\/([^.\/?]+)\.json/i);
      if (match?.[1]) return match[1];
    }
    return ship?.slug || "";
  };

  // Fetch ships only when a specific operator is selected
  useEffect(() => {
    if (!searchQuery || searchQuery === "all") {
      setAvailableShips([]);
      setShipFilter("");
      setShipsLoading(false);
      return;
    }
    let cancelled = false;
    const fetchShips = async () => {
      setShipsLoading(true);
      setShipFilter("");
      try {
        const data = await callWidgety({ action: "ships", operator: searchQuery });
        if (cancelled) return;
        const ships = (data.ships || [])
          .map((s: any) => ({
            title: s.title || s.name || "",
            slug: extractShipSlug(s),
          }))
          .filter((s: any) => s.title && s.slug);
        const uniqueShips: { title: string; slug: string }[] = Array.from(
          new Map<string, { title: string; slug: string }>(ships.map((s: { title: string; slug: string }) => [s.slug, s])).values(),
        );
        setAvailableShips(uniqueShips);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch ships:", err);
          setAvailableShips([]);
        }
      } finally {
        if (!cancelled) setShipsLoading(false);
      }
    };
    fetchShips();
    return () => { cancelled = true; };
  }, [searchQuery]);

  const formatDate = (d: string) => {
    try { return format(parseISO(d), "MM/dd/yyyy"); }
    catch { return d; }
  };

  const formatDateLong = (d: string) => {
    try { return format(parseISO(d), "MMM d, yyyy"); }
    catch { return d; }
  };

  const handleSearch = async () => {
    if (dateFrom && dateTo && dateTo < dateFrom) {
      toast.error("'Date To' cannot be before 'Date From'.");
      return;
    }
    setLoading(true);
    setStep("sailings");
    try {
      const params: Record<string, any> = { action: "search", market: "us", limit: 50 };
      if (searchQuery && searchQuery !== "all") params.operators = searchQuery;

      const normalizedDestination = destination?.trim().toLowerCase();
      if (
        normalizedDestination &&
        normalizedDestination !== "all" &&
        AVAILABLE_DESTINATIONS.some((d) => d.value === normalizedDestination)
      ) {
        params.regions = normalizedDestination;
      }

      if (cruiseType && cruiseType !== "all") params.holiday_type = cruiseType.toLowerCase();
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const data = await callWidgety(params);
      let results: WidgetySailing[] = data.holidays || [];
      if (shipFilter && shipFilter !== "all" && results.length) {
        const filtered = await Promise.all(
          results.map(async (holiday) => {
            try {
              const details = await callWidgety({
                action: "holiday",
                holiday_ref: holiday.holiday_ref,
                market: "us",
              });
              const seasonDates = (details.operating_seasons || []).flatMap((season: any) => season.dates || []);
              const matchesShip = seasonDates.some((d: any) =>
                typeof d.ship === "string" && d.ship.includes(`/ships/${shipFilter}.json`),
              );
              return matchesShip ? holiday : null;
            } catch {
              return null;
            }
          }),
        );
        results = filtered.filter((holiday): holiday is WidgetySailing => holiday !== null);
      }
      setSailings(results);
      setTotalResults(shipFilter && shipFilter !== "all" ? results.length : (data.total || results.length));
      if (!results.length) toast.info("No cruises found. Try adjusting your search.");
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Search failed: " + (err instanceof Error ? err.message : "Unknown error"));
      setStep("search");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHoliday = async (holiday: WidgetySailing) => {
    setSelectedHoliday(holiday);
    setLoading(true);
    setStep("dates");
    try {
      const data = await callWidgety({
        action: "holiday",
        holiday_ref: holiday.holiday_ref,
        market: "us",
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      const allDates: WidgetyDate[] = [];
      for (const season of data.operating_seasons || []) {
        for (const d of season.dates || []) allDates.push(d);
      }
      setDates(allDates);
      if (!allDates.length) toast.info("No sailing dates found for this cruise.");
    } catch (err) {
      console.error("Holiday fetch error:", err);
      toast.error("Failed to load sailing dates");
      setStep("sailings");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDate = (dateInfo: WidgetyDate) => {
    setSelectedDate(dateInfo);
    setSelectedCabin(null);
    setStep("pricing");
  };

  const handleViewItinerary = async () => {
    if (!selectedDate) return;
    setLoading(true);
    setStep("itinerary");
    try {
      const data = await callWidgety({ action: "itinerary", date_ref: selectedDate.date_ref, market: "us" });
      setPreviewItems(data.items || []);
      setMeta({ ship_title: data.ship_title, operator_title: data.operator_title, holiday_name: data.holiday_name });
      if (!(data.items || []).length) toast.info("No itinerary data available for this sailing.");
    } catch (err) {
      console.error("Itinerary fetch error:", err);
      toast.error("Failed to load itinerary");
      setStep("pricing");
    } finally {
      setLoading(false);
    }
  };

  const resetSearch = () => {
    setStep("search");
    setSailings([]);
    setDates([]);
    setPreviewItems([]);
    setSelectedHoliday(null);
    setSelectedDate(null);
    setSelectedCabin(null);
    setMeta({});
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDestination("");
    setCruiseType("");
    setShipFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const fmt = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const getOperatorLabel = (slug: string) => {
    const op = AVAILABLE_OPERATORS.find((o) => o.slug === slug);
    return op?.label || slug;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Back button on sub-steps */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step !== "search" && step !== "sailings" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (step === "dates") setStep("sailings");
                  else if (step === "pricing") setStep("dates");
                  else if (step === "itinerary") setStep("pricing");
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Find a Cruise</h1>
              {step === "dates" && selectedHoliday && (
                <p className="text-muted-foreground text-sm">{selectedHoliday.name}</p>
              )}
              {step === "pricing" && selectedHoliday && (
                <p className="text-muted-foreground text-sm">{selectedHoliday.name} — Select cabin</p>
              )}
              {step === "itinerary" && (
                <p className="text-muted-foreground text-sm">Itinerary Preview</p>
              )}
            </div>
          </div>
          {step === "sailings" && (
            <Button variant="ghost" size="sm" onClick={resetSearch}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
        </div>

        {/* Inline Search Bar — visible on search + sailings */}
        {(step === "search" || step === "sailings") && (
          <div className="flex flex-col sm:flex-row items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Cruise Line</Label>
              <Select value={searchQuery} onValueChange={setSearchQuery}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All cruise lines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cruise Lines</SelectItem>
                  {AVAILABLE_OPERATORS.map((op) => (
                    <SelectItem key={op.slug} value={op.slug}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Destination</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All destinations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Destinations</SelectItem>
                  {AVAILABLE_DESTINATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Ship</Label>
              <Select
                value={shipFilter}
                onValueChange={setShipFilter}
                disabled={shipsLoading || (!searchQuery || searchQuery === "all")}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={
                    !searchQuery || searchQuery === "all"
                      ? "Select cruise line first"
                      : shipsLoading
                        ? "Loading ships…"
                        : "All ships"
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ships</SelectItem>
                  {availableShips.map((s) => (
                    <SelectItem key={s.slug} value={s.slug}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-36">
              <Label className="text-xs text-muted-foreground">Cruise Type</Label>
              <Select value={cruiseType} onValueChange={setCruiseType}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ocean">Ocean</SelectItem>
                  <SelectItem value="river">River</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-40">
              <Label className="text-xs text-muted-foreground">Min Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-background" />
            </div>
            <div className="w-full sm:w-40">
              <Label className="text-xs text-muted-foreground">Max Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-background" />
            </div>
            <Button onClick={handleSearch} disabled={loading} className="shrink-0">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Filter className="h-4 w-4 mr-2" />}
              Filter
            </Button>
            {(searchQuery || destination || cruiseType || shipFilter || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0 text-muted-foreground">
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Sailings Results — Card Grid */}
        {step === "sailings" && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{totalResults} cruises found</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {sailings.map((s) => (
                    <Card key={s.holiday_ref} className="overflow-hidden group hover:shadow-md transition-shadow">
                      {/* Cruise image placeholder */}
                      <div className="relative h-44 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
                        {s.image_url ? (
                          <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          <Ship className="h-16 w-16 text-primary/20" />
                        )}
                      </div>
                      <CardContent className="p-4 space-y-2">
                        <h3 className="font-semibold text-sm leading-snug line-clamp-2">{s.name}</h3>
                        {s.ship_title && (
                          <p className="text-sm text-muted-foreground italic">{s.ship_title}</p>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Ship className="h-3 w-3" />
                          <span>{s.operator_title}</span>
                        </div>
                        {s.date_from && s.date_to && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(s.date_from)} - {formatDate(s.date_to)}</span>
                          </div>
                        )}
                        <div className="flex flex-col gap-1.5 pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => handleSelectHoliday(s)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            Preview Sailings
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs text-primary"
                            onClick={() => handleSelectHoliday(s)}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Add to Itinerary
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {sailings.length === 0 && (
                  <p className="text-muted-foreground text-center py-12">No cruises found. Try adjusting your filters.</p>
                )}
              </>
            )}
          </>
        )}

        {/* Date Selection */}
        {step === "dates" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" /> Sailing Dates
                </CardTitle>
                <span className="text-sm text-muted-foreground">{dates.length} departures</span>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {dates.map((d) => {
                    const prices = d.headline_prices?.cruise?.double;
                    const lowestPrice = prices
                      ? Math.min(
                          ...[prices.from_inside, prices.from_outside, prices.from_balcony, prices.from_suite]
                            .map(p => parseFloat(p || "0"))
                            .filter(p => p > 0)
                        )
                      : null;

                    return (
                      <button
                        key={d.date_ref}
                        onClick={() => handleSelectDate(d)}
                        className="w-full text-left p-4 rounded-lg border hover:bg-accent/50 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium">{formatDateLong(d.date_from)} — {formatDateLong(d.date_to)}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              {d.ship_title && <span>🚢 {d.ship_title}</span>}
                              {d.starts_at && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {d.starts_at.name} → {d.ends_at?.name || ""}
                                </span>
                              )}
                            </div>
                            {lowestPrice && lowestPrice < Infinity && (
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                                  <DollarSign className="h-3 w-3" />
                                  From {fmt(lowestPrice)} pp
                                </span>
                                {prices?.from_inside && parseFloat(prices.from_inside) > 0 && (
                                  <Badge variant="outline" className="text-xs">Inside {fmt(parseFloat(prices.from_inside))}</Badge>
                                )}
                                {prices?.from_balcony && parseFloat(prices.from_balcony) > 0 && (
                                  <Badge variant="outline" className="text-xs">Balcony {fmt(parseFloat(prices.from_balcony))}</Badge>
                                )}
                                {prices?.from_suite && parseFloat(prices.from_suite) > 0 && (
                                  <Badge variant="outline" className="text-xs">Suite {fmt(parseFloat(prices.from_suite))}</Badge>
                                )}
                              </div>
                            )}
                            {d.availability_string && d.availability_string !== "available" && (
                              <Badge variant="secondary" className="mt-1 text-xs">{d.availability_string}</Badge>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                  {dates.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">No departures found</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pricing */}
        {step === "pricing" && selectedDate && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" /> Cabin Pricing
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 bg-accent/30 rounded-md">
                <p className="font-medium">{selectedHoliday?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDateLong(selectedDate.date_from)} — {formatDateLong(selectedDate.date_to)}
                  {selectedDate.ship_title && ` • 🚢 ${selectedDate.ship_title}`}
                  {selectedDate.starts_at && ` • ${selectedDate.starts_at.name} → ${selectedDate.ends_at?.name || ""}`}
                </p>
              </div>

              {selectedDate.pricing && selectedDate.pricing.length > 0 ? (
                <div className="space-y-4">
                  {selectedDate.pricing.map((deal, di) => {
                    const grouped: Record<string, WidgetyCabinPrice[]> = {};
                    for (const p of deal.prices) {
                      const pp = parseFloat(p.double_price_pp || "0");
                      if (pp <= 0) continue;
                      const type = p.room_type || "Other";
                      if (!grouped[type]) grouped[type] = [];
                      grouped[type].push(p);
                    }
                    for (const type of Object.keys(grouped)) {
                      grouped[type].sort((a, b) => parseFloat(a.double_price_pp) - parseFloat(b.double_price_pp));
                    }
                    const roomOrder = ["Inside", "Outside", "Balcony", "Suite", "Other"];
                    const sortedTypes = Object.keys(grouped).sort(
                      (a, b) => (roomOrder.indexOf(a) === -1 ? 99 : roomOrder.indexOf(a)) - (roomOrder.indexOf(b) === -1 ? 99 : roomOrder.indexOf(b))
                    );

                    return (
                      <div key={di}>
                        {deal.name && (
                          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{deal.name}</p>
                        )}
                        {sortedTypes.map((roomType) => (
                          <div key={roomType} className="mb-3">
                            <p className="text-sm font-medium mb-1">{roomType}</p>
                            <div className="space-y-1">
                              {grouped[roomType].map((cabin, ci) => {
                                const dblPrice = parseFloat(cabin.double_price_pp);
                                const fees = parseFloat(cabin.non_comm_charges || "0");
                                const isSelected = selectedCabin?.cabin.grade_code === cabin.grade_code && selectedCabin?.room_type === roomType;
                                return (
                                  <button
                                    key={ci}
                                    onClick={() => setSelectedCabin({ deal_name: deal.name || "", cabin, room_type: roomType })}
                                    className={`w-full flex items-center justify-between py-2 px-3 rounded border text-sm transition-colors ${
                                      isSelected
                                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                                        : "hover:bg-accent/50"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {isSelected ? (
                                        <Check className="h-4 w-4 text-primary shrink-0" />
                                      ) : (
                                        <span className="w-4 shrink-0" />
                                      )}
                                      <span className="font-mono text-muted-foreground">{cabin.grade_code}</span>
                                      <span className="truncate">{cabin.grade_name}</span>
                                      {cabin.availability && cabin.availability !== "available" && (
                                        <Badge variant="secondary" className="text-xs">{cabin.availability}</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-semibold text-primary">{fmt(dblPrice)} pp</span>
                                      {fees > 0 && (
                                        <span className="text-muted-foreground text-xs">+{fmt(fees)} fees</span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No detailed cabin pricing available for this sailing</p>
              )}

              {selectedCabin && (
                <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
                  <p className="text-sm font-medium text-primary">
                    Selected: {selectedCabin.room_type} — {selectedCabin.cabin.grade_code} {selectedCabin.cabin.grade_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {fmt(parseFloat(selectedCabin.cabin.double_price_pp))} pp (double)
                    {selectedCabin.cabin.non_comm_charges && parseFloat(selectedCabin.cabin.non_comm_charges) > 0
                      ? ` + ${fmt(parseFloat(selectedCabin.cabin.non_comm_charges))} port fees`
                      : ""}
                  </p>
                </div>
              )}

              <Separator className="my-4" />
              <div className="flex justify-end">
                <Button onClick={handleViewItinerary} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ship className="h-4 w-4 mr-2" />}
                  View Itinerary
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Itinerary Preview */}
        {step === "itinerary" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Ship className="h-5 w-5" /> Itinerary Preview
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {meta.operator_title && (
                    <div className="mb-4 p-3 bg-accent/30 rounded-md">
                      <p className="font-medium">{meta.holiday_name || selectedHoliday?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {meta.operator_title}{meta.ship_title ? ` • ${meta.ship_title}` : ""}
                      </p>
                      {selectedCabin && (
                        <p className="text-sm text-primary mt-1">
                          Cabin: {selectedCabin.room_type} — {selectedCabin.cabin.grade_code} {selectedCabin.cabin.grade_name} • {fmt(parseFloat(selectedCabin.cabin.double_price_pp))} pp
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-1">
                    {previewItems.map((item, idx) => (
                      <div key={idx} className="flex gap-3 py-2 border-b last:border-0">
                        <span className="text-sm font-mono text-muted-foreground w-10 shrink-0 pt-0.5">D{item.day_number}</span>
                        <div className="min-w-0">
                          <p className="font-medium">{item.title}</p>
                          {item.location && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {item.location}
                            </p>
                          )}
                          {item.description && <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>}
                          {item.notes && <p className="text-xs text-muted-foreground/70 mt-0.5">{item.notes}</p>}
                        </div>
                      </div>
                    ))}
                    {previewItems.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">No itinerary data available for this sailing</p>
                    )}
                  </div>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <AddToTripSelector
                      label="Add to Trip"
                      items={previewItems.map((item) => ({
                        day_number: item.day_number,
                        title: item.title,
                        description: item.description || undefined,
                        category: item.category || "cruise",
                        location: item.location || undefined,
                        start_time: item.start_time || undefined,
                        end_time: item.end_time || undefined,
                        notes: [
                          item.notes,
                          selectedCabin ? `Cabin: ${selectedCabin.room_type} ${selectedCabin.cabin.grade_code} — ${fmt(parseFloat(selectedCabin.cabin.double_price_pp))} pp` : null,
                          meta.ship_title ? `Ship: ${meta.ship_title}` : null,
                        ].filter(Boolean).join(" • ") || undefined,
                      }))}
                    />
                    <Button variant="outline" onClick={resetSearch}>
                      <Search className="h-4 w-4 mr-2" /> New Search
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Initial search prompt */}
        {step === "search" && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Ship className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-semibold text-muted-foreground">Search Cruise Itineraries</h2>
            <p className="text-sm text-muted-foreground/70 max-w-md mt-1">
              Select a cruise line and date range above, then click Filter to browse available sailings from 16+ operators.
            </p>
            <Button onClick={handleSearch} className="mt-6" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Search All Cruises
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
