import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

// HotelBeds destination codes — [code, city, country]
const DESTINATIONS: [string, string, string][] = [
  // Spain
  ["MAD","Madrid","ES"],["BCN","Barcelona","ES"],["PMI","Palma de Mallorca","ES"],
  ["AGP","Malaga","ES"],["SVQ","Seville","ES"],["VLC","Valencia","ES"],
  ["ALC","Alicante","ES"],["TFS","Tenerife South","ES"],["LPA","Gran Canaria","ES"],
  ["IBZ","Ibiza","ES"],["FUE","Fuerteventura","ES"],["ACE","Lanzarote","ES"],
  // UK & Ireland
  ["LON","London","GB"],["MAN","Manchester","GB"],["EDI","Edinburgh","GB"],
  ["BHX","Birmingham","GB"],["GLA","Glasgow","GB"],["BRS","Bristol","GB"],
  ["LPL","Liverpool","GB"],["DUB","Dublin","IE"],
  // France
  ["PAR","Paris","FR"],["NCE","Nice","FR"],["LYS","Lyon","FR"],
  ["MRS","Marseille","FR"],["TLS","Toulouse","FR"],["BOD","Bordeaux","FR"],
  // Germany
  ["BER","Berlin","DE"],["MUC","Munich","DE"],["FRA","Frankfurt","DE"],
  ["HAM","Hamburg","DE"],["DUS","Dusseldorf","DE"],["CGN","Cologne","DE"],
  // Italy
  ["ROM","Rome","IT"],["MIL","Milan","IT"],["VCE","Venice","IT"],
  ["FLR","Florence","IT"],["NAP","Naples","IT"],["CTA","Catania","IT"],
  // Netherlands / Belgium
  ["AMS","Amsterdam","NL"],["BRU","Brussels","BE"],
  // Portugal
  ["LIS","Lisbon","PT"],["OPO","Porto","PT"],["FAO","Faro","PT"],
  // Greece
  ["ATH","Athens","GR"],["SKG","Thessaloniki","GR"],["JMK","Mykonos","GR"],
  ["JTR","Santorini","GR"],["HER","Heraklion","GR"],["RHO","Rhodes","GR"],
  ["CFU","Corfu","GR"],
  // Turkey
  ["IST","Istanbul","TR"],["AYT","Antalya","TR"],["DLM","Dalaman","TR"],
  ["BJV","Bodrum","TR"],
  // Scandinavia
  ["CPH","Copenhagen","DK"],["ARN","Stockholm","SE"],["OSL","Oslo","NO"],
  ["HEL","Helsinki","FI"],
  // Central Europe
  ["VIE","Vienna","AT"],["PRG","Prague","CZ"],["BUD","Budapest","HU"],
  ["WAW","Warsaw","PL"],["KRK","Krakow","PL"],["ZRH","Zurich","CH"],
  ["GVA","Geneva","CH"],
  // Middle East
  ["DXB","Dubai","AE"],["AUH","Abu Dhabi","AE"],["DOH","Doha","QA"],
  ["RUH","Riyadh","SA"],["JED","Jeddah","SA"],["AMM","Amman","JO"],
  ["BAH","Bahrain","BH"],["MCT","Muscat","OM"],
  // Asia
  ["BKK","Bangkok","TH"],["HKT","Phuket","TH"],["KUL","Kuala Lumpur","MY"],
  ["SIN","Singapore","SG"],["HKG","Hong Kong","HK"],["TPE","Taipei","TW"],
  ["TYO","Tokyo","JP"],["SEL","Seoul","KR"],["DPS","Bali","ID"],
  ["CGK","Jakarta","ID"],["MNL","Manila","PH"],["CEB","Cebu","PH"],
  ["DEL","New Delhi","IN"],["BOM","Mumbai","IN"],["GOI","Goa","IN"],
  ["CMB","Colombo","LK"],["MLE","Maldives","MV"],["DAD","Da Nang","VN"],
  ["SGN","Ho Chi Minh City","VN"],["HAN","Hanoi","VN"],["REP","Siem Reap","KH"],
  // Africa
  ["CAI","Cairo","EG"],["HRG","Hurghada","EG"],["SSH","Sharm el Sheikh","EG"],
  ["CMN","Casablanca","MA"],["RAK","Marrakech","MA"],["TUN","Tunis","TN"],
  ["NBO","Nairobi","KE"],["DAR","Dar es Salaam","TZ"],["ZNZ","Zanzibar","TZ"],
  ["JNB","Johannesburg","ZA"],["CPT","Cape Town","ZA"],["MRU","Mauritius","MU"],
  ["SEZ","Seychelles","SC"],
  // Americas
  ["NYC","New York","US"],["MIA","Miami","US"],["LAX","Los Angeles","US"],
  ["SFO","San Francisco","US"],["LAS","Las Vegas","US"],["ORL","Orlando","US"],
  ["CHI","Chicago","US"],["WAS","Washington DC","US"],["BOS","Boston","US"],
  ["HNL","Honolulu","US"],["SAN","San Diego","US"],
  ["CUN","Cancun","MX"],["MEX","Mexico City","MX"],["SJD","Los Cabos","MX"],
  ["PVR","Puerto Vallarta","MX"],
  ["HAV","Havana","CU"],["PUJ","Punta Cana","DO"],["SDQ","Santo Domingo","DO"],
  ["SJU","San Juan","PR"],["MBJ","Montego Bay","JM"],["NAS","Nassau","BS"],
  ["AUA","Aruba","AW"],["CUR","Curacao","CW"],["SXM","St. Maarten","SX"],
  ["BGI","Barbados","BB"],["UVF","St. Lucia","LC"],["ANU","Antigua","AG"],
  ["GCM","Grand Cayman","KY"],
  ["GRU","Sao Paulo","BR"],["GIG","Rio de Janeiro","BR"],
  ["EZE","Buenos Aires","AR"],["SCL","Santiago","CL"],["LIM","Lima","PE"],
  ["BOG","Bogota","CO"],["CTG","Cartagena","CO"],
  // Oceania
  ["SYD","Sydney","AU"],["MEL","Melbourne","AU"],["AKL","Auckland","NZ"],
  ["NAN","Nadi","FJ"],
  // Canada
  ["YTO","Toronto","CA"],["YVR","Vancouver","CA"],["YMQ","Montreal","CA"],
  ["YOW","Ottawa","CA"],
  // Iceland
  ["REK","Reykjavik","IS"],
];

interface HotelDestinationInputProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
}

export function HotelDestinationInput({ value, onChange, placeholder = "City or code", className }: HotelDestinationInputProps) {
  const [query, setQuery] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const matches = query.length >= 1
    ? DESTINATIONS.filter(([code, city]) => {
        const q = query.toLowerCase();
        return code.toLowerCase().startsWith(q) || city.toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  const handleSelect = (code: string) => {
    setQuery(code);
    onChange(code);
    setShowDropdown(false);
  };

  const handleInputChange = (val: string) => {
    setQuery(val.toUpperCase());
    setHighlightIndex(0);
    setShowDropdown(true);
    const exactMatch = DESTINATIONS.find(([c]) => c === val.toUpperCase());
    if (exactMatch && val.length === 3) {
      onChange(val.toUpperCase());
    } else if (val.length < 3) {
      onChange(val.toUpperCase());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(matches[highlightIndex][0]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => query.length >= 1 && setShowDropdown(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={30}
        className={`h-10 uppercase ${className || ""}`}
        autoComplete="off"
      />
      {showDropdown && matches.length > 0 && (
        <div className="absolute z-[100] top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {matches.map(([code, city, country], idx) => (
            <button
              key={code}
              type="button"
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                idx === highlightIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              }`}
              onClick={() => handleSelect(code)}
              onMouseEnter={() => setHighlightIndex(idx)}
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-mono font-bold text-xs w-8">{code}</span>
              <span className="truncate">{city}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{country}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
