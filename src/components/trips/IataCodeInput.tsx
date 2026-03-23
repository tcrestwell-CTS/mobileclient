import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Plane } from "lucide-react";

// Top ~200 airports covering major worldwide hubs
const AIRPORTS: [string, string, string][] = [
  // code, city, country
  ["ATL","Atlanta","US"],["LAX","Los Angeles","US"],["ORD","Chicago O'Hare","US"],
  ["DFW","Dallas/Fort Worth","US"],["DEN","Denver","US"],["JFK","New York JFK","US"],
  ["SFO","San Francisco","US"],["SEA","Seattle","US"],["LAS","Las Vegas","US"],
  ["MCO","Orlando","US"],["EWR","Newark","US"],["CLT","Charlotte","US"],
  ["PHX","Phoenix","US"],["IAH","Houston","US"],["MIA","Miami","US"],
  ["BOS","Boston","US"],["MSP","Minneapolis","US"],["FLL","Fort Lauderdale","US"],
  ["DTW","Detroit","US"],["PHL","Philadelphia","US"],["LGA","New York LaGuardia","US"],
  ["BWI","Baltimore","US"],["SLC","Salt Lake City","US"],["DCA","Washington Reagan","US"],
  ["IAD","Washington Dulles","US"],["SAN","San Diego","US"],["TPA","Tampa","US"],
  ["HNL","Honolulu","US"],["PDX","Portland","US"],["STL","St. Louis","US"],
  ["BNA","Nashville","US"],["AUS","Austin","US"],["RDU","Raleigh/Durham","US"],
  ["MKE","Milwaukee","US"],["CLE","Cleveland","US"],["OAK","Oakland","US"],
  ["SMF","Sacramento","US"],["SJC","San Jose","US"],["IND","Indianapolis","US"],
  ["PIT","Pittsburgh","US"],["CVG","Cincinnati","US"],["CMH","Columbus","US"],
  ["MCI","Kansas City","US"],["SAT","San Antonio","US"],["RSW","Fort Myers","US"],
  ["JAX","Jacksonville","US"],["SNA","Santa Ana","US"],["ABQ","Albuquerque","US"],
  ["OMA","Omaha","US"],["BUF","Buffalo","US"],["ONT","Ontario","US"],
  ["ANC","Anchorage","US"],["CHS","Charleston","US"],["PBI","West Palm Beach","US"],
  ["RNO","Reno","US"],["TUS","Tucson","US"],["SDF","Louisville","US"],
  ["BHM","Birmingham","US"],["OKC","Oklahoma City","US"],["MEM","Memphis","US"],
  ["RIC","Richmond","US"],["ORF","Norfolk","US"],["GRR","Grand Rapids","US"],
  ["CHA","Chattanooga","US"],["MSY","New Orleans","US"],
  // Canada
  ["YYZ","Toronto Pearson","CA"],["YVR","Vancouver","CA"],["YUL","Montreal","CA"],
  ["YYC","Calgary","CA"],["YOW","Ottawa","CA"],["YEG","Edmonton","CA"],
  ["YWG","Winnipeg","CA"],["YHZ","Halifax","CA"],
  // Europe
  ["LHR","London Heathrow","GB"],["LGW","London Gatwick","GB"],["STN","London Stansted","GB"],
  ["MAN","Manchester","GB"],["EDI","Edinburgh","GB"],["BHX","Birmingham","GB"],
  ["CDG","Paris Charles de Gaulle","FR"],["ORY","Paris Orly","FR"],["NCE","Nice","FR"],
  ["LYS","Lyon","FR"],["MRS","Marseille","FR"],
  ["FRA","Frankfurt","DE"],["MUC","Munich","DE"],["BER","Berlin","DE"],
  ["DUS","Düsseldorf","DE"],["HAM","Hamburg","DE"],
  ["AMS","Amsterdam","NL"],["MAD","Madrid","ES"],["BCN","Barcelona","ES"],
  ["PMI","Palma de Mallorca","ES"],["AGP","Malaga","ES"],
  ["FCO","Rome Fiumicino","IT"],["MXP","Milan Malpensa","IT"],["VCE","Venice","IT"],
  ["NAP","Naples","IT"],["FLR","Florence","IT"],
  ["ZRH","Zurich","CH"],["GVA","Geneva","CH"],
  ["VIE","Vienna","AT"],["PRG","Prague","CZ"],["BUD","Budapest","HU"],
  ["WAW","Warsaw","PL"],["KRK","Krakow","PL"],
  ["LIS","Lisbon","PT"],["OPO","Porto","PT"],
  ["ATH","Athens","GR"],["SKG","Thessaloniki","GR"],["JMK","Mykonos","GR"],
  ["JTR","Santorini","GR"],
  ["CPH","Copenhagen","DK"],["ARN","Stockholm","SE"],["OSL","Oslo","NO"],
  ["HEL","Helsinki","FI"],["KEF","Reykjavik","IS"],
  ["DUB","Dublin","IE"],["BRU","Brussels","BE"],
  ["IST","Istanbul","TR"],["SAW","Istanbul Sabiha","TR"],["AYT","Antalya","TR"],
  // Middle East
  ["DXB","Dubai","AE"],["AUH","Abu Dhabi","AE"],["DOH","Doha","QA"],
  ["RUH","Riyadh","SA"],["JED","Jeddah","SA"],["TLV","Tel Aviv","IL"],
  ["AMM","Amman","JO"],["BAH","Bahrain","BH"],["MCT","Muscat","OM"],
  ["KWI","Kuwait City","KW"],
  // Asia
  ["NRT","Tokyo Narita","JP"],["HND","Tokyo Haneda","JP"],["KIX","Osaka Kansai","JP"],
  ["ICN","Seoul Incheon","KR"],["GMP","Seoul Gimpo","KR"],
  ["PEK","Beijing","CN"],["PVG","Shanghai Pudong","CN"],["CAN","Guangzhou","CN"],
  ["HKG","Hong Kong","HK"],["TPE","Taipei","TW"],
  ["SIN","Singapore","SG"],["BKK","Bangkok","TH"],["HKT","Phuket","TH"],
  ["KUL","Kuala Lumpur","MY"],["CGK","Jakarta","ID"],["DPS","Bali Denpasar","ID"],
  ["MNL","Manila","PH"],["CEB","Cebu","PH"],
  ["DEL","New Delhi","IN"],["BOM","Mumbai","IN"],["BLR","Bangalore","IN"],
  ["MAA","Chennai","IN"],["CCU","Kolkata","IN"],["HYD","Hyderabad","IN"],
  ["CMB","Colombo","LK"],["MLE","Male","MV"],["KTM","Kathmandu","NP"],
  ["DAD","Da Nang","VN"],["SGN","Ho Chi Minh City","VN"],["HAN","Hanoi","VN"],
  ["REP","Siem Reap","KH"],["PNH","Phnom Penh","KH"],["RGN","Yangon","MM"],
  // Oceania
  ["SYD","Sydney","AU"],["MEL","Melbourne","AU"],["BNE","Brisbane","AU"],
  ["PER","Perth","AU"],["AKL","Auckland","NZ"],["CHC","Christchurch","NZ"],
  ["NAN","Nadi","FJ"],["PPT","Papeete","PF"],
  // Africa
  ["JNB","Johannesburg","ZA"],["CPT","Cape Town","ZA"],["DUR","Durban","ZA"],
  ["NBO","Nairobi","KE"],["ADD","Addis Ababa","ET"],["LOS","Lagos","NG"],
  ["CAI","Cairo","EG"],["CMN","Casablanca","MA"],["TUN","Tunis","TN"],
  ["DAR","Dar es Salaam","TZ"],["MRU","Mauritius","MU"],["SEZ","Seychelles","SC"],
  // Central & South America
  ["MEX","Mexico City","MX"],["CUN","Cancun","MX"],["GDL","Guadalajara","MX"],
  ["SJD","Los Cabos","MX"],["PVR","Puerto Vallarta","MX"],
  ["GRU","São Paulo","BR"],["GIG","Rio de Janeiro","BR"],["BSB","Brasilia","BR"],
  ["EZE","Buenos Aires","AR"],["SCL","Santiago","CL"],["LIM","Lima","PE"],
  ["BOG","Bogota","CO"],["MDE","Medellin","CO"],["CTG","Cartagena","CO"],
  ["UIO","Quito","EC"],["GYE","Guayaquil","EC"],["CCS","Caracas","VE"],
  ["MVD","Montevideo","UY"],["ASU","Asuncion","PY"],["LPB","La Paz","BO"],
  // Caribbean
  ["SJU","San Juan","PR"],["NAS","Nassau","BS"],["MBJ","Montego Bay","JM"],
  ["KIN","Kingston","JM"],["PUJ","Punta Cana","DO"],["STI","Santiago","DO"],
  ["SDQ","Santo Domingo","DO"],["AUA","Aruba","AW"],["CUR","Curaçao","CW"],
  ["SXM","St. Maarten","SX"],["BGI","Barbados","BB"],["POS","Trinidad","TT"],
  ["GCM","Grand Cayman","KY"],["STT","St. Thomas","VI"],["SBH","St. Barts","BL"],
  ["UVF","St. Lucia","LC"],["ANU","Antigua","AG"],["TAB","Tobago","TT"],
  // Pacific Islands
  ["GUM","Guam","GU"],["SPN","Saipan","MP"],
];

interface IataCodeInputProps {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
}

export function IataCodeInput({ value, onChange, placeholder = "City or code", className }: IataCodeInputProps) {
  const [query, setQuery] = useState(() => {
    const match = AIRPORTS.find(([c]) => c === value);
    return match ? `${match[0]} – ${match[1]}` : value;
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes
  useEffect(() => {
    if (!showDropdown) {
      const match = AIRPORTS.find(([c]) => c === value);
      setQuery(match ? `${match[0]} – ${match[1]}` : value);
    }
  }, [value, showDropdown]);

  const searchQuery = query.replace(/^[A-Z]{3}\s–\s.*$/, "").length === 0 ? "" : query;
  const matches = searchQuery.length >= 1
    ? AIRPORTS.filter(([code, city]) => {
        const q = searchQuery.toLowerCase();
        return code.toLowerCase().startsWith(q) || city.toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  const handleSelect = (code: string) => {
    const match = AIRPORTS.find(([c]) => c === code);
    setQuery(match ? `${match[0]} – ${match[1]}` : code);
    onChange(code);
    setShowDropdown(false);
  };

  const handleInputChange = (val: string) => {
    setQuery(val);
    setHighlightIndex(0);
    setShowDropdown(true);
    // If it's exactly a 3-letter code that matches, auto-select
    const upper = val.toUpperCase();
    const exactMatch = AIRPORTS.find(([c]) => c === upper);
    if (exactMatch && val.length === 3) {
      onChange(upper);
    } else if (val.length < 3) {
      onChange(upper);
    }
  };

  const handleFocus = () => {
    // Clear display to allow fresh typing
    const match = AIRPORTS.find(([c]) => c === value);
    if (match && query === `${match[0]} – ${match[1]}`) {
      setQuery("");
    }
    setShowDropdown(true);
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

  // Close on outside click
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
        ref={inputRef}
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={30}
        className={`h-9 uppercase ${className || ""}`}
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
              <Plane className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
