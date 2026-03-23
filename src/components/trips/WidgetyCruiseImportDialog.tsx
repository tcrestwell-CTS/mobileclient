import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ship, Search, ChevronRight, Loader2, Anchor, MapPin, Calendar, DollarSign, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

interface WidgetySailing {
  holiday_ref: string;
  name: string;
  operator_title: string;
  holiday: string;
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

interface Props {
  tripId: string;
  departDate: string | null;
  returnDate: string | null;
  destination: string | null;
  cruiseBookings: Array<{
    id: string;
    trip_name?: string | null;
    destination?: string;
    depart_date?: string;
    return_date?: string;
    suppliers?: { name: string; supplier_type: string } | null;
  }>;
  onImport: (items: WidgetyItineraryItem[]) => Promise<boolean>;
}

type Step = "search" | "sailings" | "dates" | "pricing" | "preview" | "importing";

const AVAILABLE_OPERATORS = [
  { slug: "amawaterways", label: "AmaWaterways" },
  { slug: "avalon-waterways", label: "Avalon Waterways" },
  { slug: "carnival-cruise-lines-operator", label: "Carnival Cruise Line" },
  { slug: "celebrity-cruises", label: "Celebrity Cruises" },
  { slug: "celebrity-river-cruises", label: "Celebrity River Cruises" },
  { slug: "explora-journeys", label: "Explora Journeys" },
  { slug: "holland-america-line", label: "Holland America Line" },
  { slug: "msc-cruises", label: "MSC Cruises" },
  { slug: "norwegian-cruise-line", label: "Norwegian Cruise Line" },
  { slug: "princess-cruises", label: "Princess Cruises" },
  { slug: "royal-caribbean-international", label: "Royal Caribbean International" },
  { slug: "seabourn-cruise-line", label: "Seabourn Cruise Line" },
  { slug: "silversea-cruises", label: "Silversea Cruises" },
  { slug: "tauck", label: "Tauck" },
  { slug: "uniworld-boutique-river-cruises", label: "Uniworld Boutique River Cruises" },
  { slug: "virgin-voyages", label: "Virgin Voyages" },
];

export function WidgetyCruiseImportDialog({ tripId, departDate, returnDate, destination, cruiseBookings, onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("search");
  const [loading, setLoading] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState(departDate || "");
  const [dateTo, setDateTo] = useState(returnDate || "");
  const [sailingYearFilter, setSailingYearFilter] = useState<string>("all");
  const [sailingMonthFilter, setSailingMonthFilter] = useState<string>("all");

  // Results
  const [sailings, setSailings] = useState<WidgetySailing[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedHoliday, setSelectedHoliday] = useState<WidgetySailing | null>(null);
  const [dates, setDates] = useState<WidgetyDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<WidgetyDate | null>(null);
  const [previewItems, setPreviewItems] = useState<WidgetyItineraryItem[]>([]);
  const [meta, setMeta] = useState<{ ship_title?: string; operator_title?: string; holiday_name?: string }>({});
  const [selectedCabin, setSelectedCabin] = useState<{ deal_name: string; cabin: WidgetyCabinPrice; room_type: string } | null>(null);

  // Auto-match on open
  useEffect(() => {
    if (open && cruiseBookings.length > 0) {
      handleAutoMatch();
    } else if (open) {
      setStep("search");
      setDateFrom(departDate || "");
      setDateTo(returnDate || "");
    }
  }, [open]);

  const callWidgety = async (body: Record<string, any>) => {
    const { data, error } = await supabase.functions.invoke("widgety-cruise", { body });
    if (error) throw new Error(error.message || "Failed to call Widgety");
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleAutoMatch = async () => {
    setLoading(true);
    setStep("sailings");
    try {
      // Use the first cruise booking to search
      const cruise = cruiseBookings[0];
      const supplierName = cruise.suppliers?.name?.toLowerCase().replace(/\s+/g, "-") || "";

      const data = await callWidgety({
        action: "search",
        operators: supplierName || undefined,
        date_from: cruise.depart_date,
        date_to: cruise.return_date,
        market: "us",
        limit: 25,
      });

      if (data._date_filter_removed) {
        toast.info("No cruises found for those dates. Showing all available sailings instead.");
      }
      setSailings(data.holidays || []);
      setTotalResults(data.total || 0);
      setSailingYearFilter("all");
      setSailingMonthFilter("all");

      if ((data.holidays || []).length === 0) {
        toast.info("No auto-match found. Try searching manually.");
        setStep("search");
        setSearchQuery(cruise.suppliers?.name || cruise.destination || "");
        setDateFrom(cruise.depart_date);
        setDateTo(cruise.return_date);
      }
    } catch (err) {
      console.error("Auto-match error:", err);
      toast.error("Auto-match failed. Try searching manually.");
      setStep("search");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setStep("sailings");
    try {
      const params: Record<string, any> = {
        action: "search",
        market: "us",
        limit: 25,
      };
      if (searchQuery && searchQuery !== "all") params.operators = searchQuery;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const data = await callWidgety(params);
      if (data._date_filter_removed) {
        toast.info("No cruises found for those dates. Showing all available sailings instead.");
      }
      setSailings(data.holidays || []);
      setTotalResults(data.total || 0);
      setSailingYearFilter("all");
      setSailingMonthFilter("all");

      if ((data.holidays || []).length === 0) {
        toast.info("No cruises found. Try adjusting your search.");
      }
    } catch (err) {
      console.error("Search error:", err);
      toast.error("Search failed: " + (err instanceof Error ? err.message : "Unknown error"));
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

      // Flatten dates from operating_seasons
      const allDates: WidgetyDate[] = [];
      for (const season of data.operating_seasons || []) {
        for (const d of season.dates || []) {
          allDates.push(d);
        }
      }
      setDates(allDates);

      if (allDates.length === 0) {
        toast.info("No sailing dates found for this cruise.");
      }
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
    setStep("pricing");
  };

  const handleContinueToItinerary = async () => {
    if (!selectedDate) return;
    setLoading(true);
    setStep("preview");
    try {
      const data = await callWidgety({
        action: "itinerary",
        date_ref: selectedDate.date_ref,
        market: "us",
      });

      setPreviewItems(data.items || []);
      setMeta({
        ship_title: data.ship_title,
        operator_title: data.operator_title,
        holiday_name: data.holiday_name,
      });

      if ((data.items || []).length === 0) {
        toast.info("No itinerary data available for this sailing.");
      }
    } catch (err) {
      console.error("Itinerary fetch error:", err);
      toast.error("Failed to load itinerary");
      setStep("pricing");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (previewItems.length === 0) return;
    setStep("importing");
    const success = await onImport(previewItems);
    if (success) {
      toast.success(`Imported ${previewItems.length} cruise itinerary days from Cruise Library`);
      setOpen(false);
      resetState();
    } else {
      setStep("preview");
    }
  };

  const resetState = () => {
    setStep("search");
    setSailings([]);
    setDates([]);
    setPreviewItems([]);
    setSelectedHoliday(null);
    setSelectedDate(null);
    setSelectedCabin(null);
    setMeta({});
    setSearchQuery("");
    setSailingYearFilter("all");
    setSailingMonthFilter("all");
  };

  const parseSailingDate = (holidayRef: string): Date | null => {
    const match = holidayRef.match(/(\d{6})/);
    if (!match) return null;

    const compactDate = match[1];
    const year = 2000 + Number(compactDate.slice(0, 2));
    const month = Number(compactDate.slice(2, 4));
    const day = Number(compactDate.slice(4, 6));

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;

    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      return null;
    }

    return parsed;
  };

  const formatSailingDate = (holidayRef: string) => {
    const parsed = parseSailingDate(holidayRef);
    return parsed ? format(parsed, "MMM d, yyyy") : null;
  };

  const sailingYearOptions = useMemo(() => {
    return Array.from(
      new Set(
        sailings
          .map((s) => parseSailingDate(s.holiday_ref)?.getUTCFullYear())
          .filter((year): year is number => typeof year === "number")
      )
    ).sort((a, b) => a - b);
  }, [sailings]);

  const sailingMonthOptions = useMemo(() => {
    const months = new Set<string>();

    for (const sailing of sailings) {
      const sailingDate = parseSailingDate(sailing.holiday_ref);
      if (!sailingDate) continue;

      if (sailingYearFilter !== "all" && String(sailingDate.getUTCFullYear()) !== sailingYearFilter) {
        continue;
      }

      months.add(String(sailingDate.getUTCMonth() + 1).padStart(2, "0"));
    }

    return Array.from(months).sort();
  }, [sailings, sailingYearFilter]);

  const filteredSailings = useMemo(() => {
    return sailings.filter((sailing) => {
      const sailingDate = parseSailingDate(sailing.holiday_ref);

      if (sailingYearFilter !== "all") {
        if (!sailingDate || String(sailingDate.getUTCFullYear()) !== sailingYearFilter) return false;
      }

      if (sailingMonthFilter !== "all") {
        const monthValue = String((sailingDate?.getUTCMonth() ?? -1) + 1).padStart(2, "0");
        if (!sailingDate || monthValue !== sailingMonthFilter) return false;
      }

      return true;
    });
  }, [sailings, sailingYearFilter, sailingMonthFilter]);

  useEffect(() => {
    if (sailingMonthFilter !== "all" && !sailingMonthOptions.includes(sailingMonthFilter)) {
      setSailingMonthFilter("all");
    }
  }, [sailingMonthFilter, sailingMonthOptions]);

  const formatDate = (d: string) => {
    try { return format(parseISO(d), "MMM d, yyyy"); }
    catch { return d; }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Anchor className="h-4 w-4 mr-2" /> Import Cruise Itinerary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            {step === "search" && "Cruise Library"}
            {step === "sailings" && "Select a Cruise"}
            {step === "dates" && `Sailing Dates — ${selectedHoliday?.name || ""}`}
            {step === "pricing" && "Cabin Pricing"}
            {step === "preview" && "Preview Itinerary"}
            {step === "importing" && "Importing..."}
          </DialogTitle>
        </DialogHeader>

        {/* Search Step */}
        {step === "search" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Search for cruise itineraries from MSC Cruises, Norwegian Cruise Line, and Virgin Voyages.
            </p>
            <div>
              <Label>Cruise Line</Label>
              <Select value={searchQuery} onValueChange={setSearchQuery}>
                <SelectTrigger>
                  <SelectValue placeholder="All available cruise lines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cruise Lines</SelectItem>
                  {AVAILABLE_OPERATORS.map((op) => (
                    <SelectItem key={op.slug} value={op.slug}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date From</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <Label>Date To</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-between">
              {cruiseBookings.length > 0 && (
                <Button variant="secondary" onClick={handleAutoMatch} disabled={loading}>
                  Auto-Match from Booking
                </Button>
              )}
              <Button onClick={handleSearch} disabled={loading} className="ml-auto">
                <Search className="h-4 w-4 mr-2" /> Search
              </Button>
            </div>
          </div>
        )}

        {/* Sailings List */}
        {step === "sailings" && (
          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <Button variant="ghost" size="sm" onClick={() => setStep("search")}>
                    ← Back to Search
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {filteredSailings.length}{filteredSailings.length !== totalResults ? ` of ${totalResults}` : ""} results
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Year</Label>
                    <Select
                      value={sailingYearFilter}
                      onValueChange={(value) => {
                        setSailingYearFilter(value);
                        setSailingMonthFilter("all");
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="All years" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All years</SelectItem>
                        {sailingYearOptions.map((year) => (
                          <SelectItem key={year} value={String(year)}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Month</Label>
                    <Select
                      value={sailingMonthFilter}
                      onValueChange={setSailingMonthFilter}
                      disabled={sailingMonthOptions.length === 0}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="All months" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All months</SelectItem>
                        {sailingMonthOptions.map((month) => (
                          <SelectItem key={month} value={month}>
                            {format(new Date(2000, Number(month) - 1, 1), "MMMM")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-3">
                    {filteredSailings.map((s) => {
                      const sailingDate = formatSailingDate(s.holiday_ref);
                      return (
                        <button
                          key={s.holiday_ref}
                          onClick={() => handleSelectHoliday(s)}
                          className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{s.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {s.operator_title}
                                {sailingDate ? ` • ${sailingDate}` : ""}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                          </div>
                        </button>
                      );
                    })}
                    {filteredSailings.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        {sailings.length > 0 ? "No cruises match the selected date filters" : "No cruises found"}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        )}

        {/* Date Selection */}
        {step === "dates" && (
          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <Button variant="ghost" size="sm" onClick={() => setStep("sailings")}>
                    ← Back to Cruises
                  </Button>
                  <span className="text-xs text-muted-foreground">{dates.length} departures</span>
                </div>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-3">
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
                          className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium text-sm">
                                  {formatDate(d.date_from)} — {formatDate(d.date_to)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                {d.ship_title && <span>🚢 {d.ship_title}</span>}
                                {d.starts_at && (
                                  <span className="flex items-center gap-0.5">
                                    <MapPin className="h-3 w-3" />
                                    {d.starts_at.name} → {d.ends_at?.name || ""}
                                  </span>
                                )}
                              </div>
                              {/* Pricing row */}
                              {lowestPrice && lowestPrice < Infinity && (
                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                                    <DollarSign className="h-3 w-3" />
                                    From ${lowestPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} pp
                                  </span>
                                  {prices?.from_inside && parseFloat(prices.from_inside) > 0 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      Inside ${parseFloat(prices.from_inside).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </Badge>
                                  )}
                                  {prices?.from_balcony && parseFloat(prices.from_balcony) > 0 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      Balcony ${parseFloat(prices.from_balcony).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </Badge>
                                  )}
                                  {prices?.from_suite && parseFloat(prices.from_suite) > 0 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      Suite ${parseFloat(prices.from_suite).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {d.availability_string && d.availability_string !== "available" && (
                                <Badge variant="secondary" className="mt-1 text-[10px]">
                                  {d.availability_string}
                                </Badge>
                              )}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                          </div>
                        </button>
                      );
                    })}
                    {dates.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No departures found</p>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        )}

        {/* Pricing Breakdown */}
        {step === "pricing" && selectedDate && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <Button variant="ghost" size="sm" onClick={() => setStep("dates")}>
                ← Back to Dates
              </Button>
            </div>
            <div className="mb-3 p-2 bg-accent/30 rounded-md">
              <p className="text-sm font-medium">
                {formatDate(selectedDate.date_from)} — {formatDate(selectedDate.date_to)}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedDate.ship_title && `🚢 ${selectedDate.ship_title}`}
                {selectedDate.starts_at && ` • ${selectedDate.starts_at.name} → ${selectedDate.ends_at?.name || ""}`}
              </p>
            </div>
            <ScrollArea className="flex-1 h-[320px]">
              {selectedDate.pricing && selectedDate.pricing.length > 0 ? (
                <div className="space-y-4 pr-3">
                  {selectedDate.pricing.map((deal, di) => {
                    // Group prices by room_type
                    const grouped: Record<string, WidgetyCabinPrice[]> = {};
                    for (const p of deal.prices) {
                      const pp = parseFloat(p.double_price_pp || "0");
                      if (pp <= 0) continue;
                      const type = p.room_type || "Other";
                      if (!grouped[type]) grouped[type] = [];
                      grouped[type].push(p);
                    }
                    // Sort each group by price
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
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{deal.name}</p>
                        )}
                        {sortedTypes.map((roomType) => (
                          <div key={roomType} className="mb-3">
                            <p className="text-xs font-medium text-foreground mb-1">{roomType}</p>
                            <div className="space-y-1">
                              {(() => {
                                const cabins = grouped[roomType];
                                const hasSingle = cabins.some(c => c.single_price_pp && parseFloat(c.single_price_pp) > 0);
                                const hasTriple = cabins.some(c => c.triple_price_pp && parseFloat(c.triple_price_pp) > 0);
                                return (
                                  <>
                                    {(hasSingle || hasTriple) && (
                                      <div className="flex items-center justify-end gap-0 mb-0.5 text-[10px] text-muted-foreground px-2">
                                        {hasSingle && <span className="w-16 text-right">Single</span>}
                                        <span className="w-16 text-right">Double</span>
                                        {hasTriple && <span className="w-16 text-right">Triple</span>}
                                        <span className="w-12" />
                                      </div>
                                    )}
                                    {cabins.map((cabin, ci) => {
                                      const dblPrice = parseFloat(cabin.double_price_pp);
                                      const sglPrice = cabin.single_price_pp ? parseFloat(cabin.single_price_pp) : 0;
                                      const trpPrice = cabin.triple_price_pp ? parseFloat(cabin.triple_price_pp) : 0;
                                      const fees = parseFloat(cabin.non_comm_charges || "0");
                                      const fmt = (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
                                      return (
                                        <button
                                          key={ci}
                                          onClick={() => setSelectedCabin({
                                            deal_name: deal.name || "",
                                            cabin,
                                            room_type: roomType,
                                          })}
                                          className={`w-full flex items-center justify-between py-1.5 px-2 rounded border text-xs transition-colors ${
                                            selectedCabin?.cabin.grade_code === cabin.grade_code && selectedCabin?.room_type === roomType
                                              ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                                              : "hover:bg-accent/50"
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            {selectedCabin?.cabin.grade_code === cabin.grade_code && selectedCabin?.room_type === roomType ? (
                                              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                                            ) : (
                                              <span className="w-3.5 shrink-0" />
                                            )}
                                            <span className="font-mono text-muted-foreground">{cabin.grade_code}</span>
                                            <span className="truncate">{cabin.grade_name}</span>
                                            {cabin.availability && cabin.availability !== "available" && (
                                              <Badge variant="secondary" className="text-[9px] px-1 py-0">{cabin.availability}</Badge>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-0 shrink-0">
                                            {hasSingle && (
                                              <span className="w-16 text-right text-muted-foreground">
                                                {sglPrice > 0 ? fmt(sglPrice) : "—"}
                                              </span>
                                            )}
                                            <span className="w-16 text-right font-semibold text-primary">
                                              {fmt(dblPrice)}
                                            </span>
                                            {hasTriple && (
                                              <span className="w-16 text-right text-muted-foreground">
                                                {trpPrice > 0 ? fmt(trpPrice) : "—"}
                                              </span>
                                            )}
                                            <span className="w-12 text-right text-muted-foreground text-[10px]">
                                              {fees > 0 ? `+${fmt(fees)}` : ""}
                                            </span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No detailed cabin pricing available for this sailing</p>
              )}
            </ScrollArea>
            {selectedCabin && (
              <div className="mt-2 p-2 bg-primary/5 border border-primary/20 rounded-md">
                <p className="text-xs font-medium text-primary">
                  Selected: {selectedCabin.room_type} — {selectedCabin.cabin.grade_code} {selectedCabin.cabin.grade_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  ${parseFloat(selectedCabin.cabin.double_price_pp).toLocaleString(undefined, { maximumFractionDigits: 0 })} pp (double)
                  {selectedCabin.cabin.non_comm_charges && parseFloat(selectedCabin.cabin.non_comm_charges) > 0
                    ? ` + $${parseFloat(selectedCabin.cabin.non_comm_charges).toLocaleString(undefined, { maximumFractionDigits: 0 })} port fees`
                    : ""}
                </p>
              </div>
            )}
            <Separator className="my-3" />
            <div className="flex justify-end">
              <Button onClick={handleContinueToItinerary}>
                <Ship className="h-4 w-4 mr-2" /> Continue to Itinerary
              </Button>
            </div>
          </div>
        )}

        {/* Preview */}
        {step === "preview" && (
          <div className="flex-1 min-h-0 flex flex-col">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <Button variant="ghost" size="sm" onClick={() => setStep("pricing")}>
                    ← Back to Pricing
                  </Button>
                </div>
                {meta.operator_title && (
                  <div className="mb-3 p-2 bg-accent/30 rounded-md">
                    <p className="text-sm font-medium">{meta.holiday_name || selectedHoliday?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {meta.operator_title}{meta.ship_title ? ` • ${meta.ship_title}` : ""}
                    </p>
                    {selectedCabin && (
                      <p className="text-xs text-primary mt-1">
                        Cabin: {selectedCabin.room_type} — {selectedCabin.cabin.grade_code} {selectedCabin.cabin.grade_name} • ${parseFloat(selectedCabin.cabin.double_price_pp).toLocaleString(undefined, { maximumFractionDigits: 0 })} pp
                      </p>
                    )}
                  </div>
                )}
                <ScrollArea className="flex-1 h-[300px]">
                  <div className="space-y-1 pr-3">
                    {previewItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 py-1.5">
                        <span className="text-xs font-mono text-muted-foreground w-8 shrink-0 pt-0.5">
                          D{item.day_number}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-muted-foreground/70">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {previewItems.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No itinerary data available for this sailing
                      </p>
                    )}
                  </div>
                </ScrollArea>
                <Separator className="my-3" />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setOpen(false); resetState(); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleImport} disabled={previewItems.length === 0}>
                    <Ship className="h-4 w-4 mr-2" /> Import {previewItems.length} Days
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Importing */}
        {step === "importing" && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-3" />
            <span className="text-muted-foreground">Importing itinerary...</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
