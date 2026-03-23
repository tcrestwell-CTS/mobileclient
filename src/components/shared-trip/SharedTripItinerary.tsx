import { useState } from "react";
import { Clock, MapPin, CheckCircle2 } from "lucide-react";
import { format, parseISO, addDays } from "date-fns";

interface SharedTripItineraryProps {
  itinerary: any[];
  departDate: string | null;
  primaryColor: string;
  optionBlocks?: any[];
}

const categoryIcons: Record<string, string> = {
  flight: "✈️", hotel: "🏨", cruise: "🚢", transportation: "🚗",
  activity: "🎯", dining: "🍽️", sightseeing: "📸", relaxation: "💆",
  shopping: "🛍️", entertainment: "🎵", meeting: "📋", other: "📌",
};

const optionLabels = ["A", "B", "C", "D", "E", "F"];

function OptionBlockClient({ block, items, primaryColor }: { block: any; items: any[]; primaryColor: string }) {
  const [selected, setSelected] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border-2 border-dashed p-4 space-y-3" style={{ borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}08` }}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">{block.title}</span>
        <span className="text-xs text-gray-400">· {items.length} options</span>
      </div>

      <div className="space-y-2">
        {items.map((item: any, idx: number) => {
          const isSelected = selected === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSelected(item.id)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                isSelected
                  ? "border-current shadow-sm"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              style={isSelected ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
            >
              <div className="flex items-start gap-3">
                <span
                  className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{
                    backgroundColor: isSelected ? primaryColor : "#e5e7eb",
                    color: isSelected ? "white" : "#6b7280",
                  }}
                >
                  {isSelected ? <CheckCircle2 className="h-4 w-4" /> : optionLabels[idx] || (idx + 1).toString()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{categoryIcons[item.category] || "📌"}</span>
                    <h5 className="font-semibold text-gray-900">{item.title}</h5>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                    {item.start_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {item.start_time.slice(0, 5)}
                      </span>
                    )}
                    {item.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {item.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SharedTripItinerary({ itinerary, departDate, primaryColor, optionBlocks = [] }: SharedTripItineraryProps) {
  if (itinerary.length === 0 && optionBlocks.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-400 text-lg">No itinerary items published yet.</p>
      </div>
    );
  }

  // Separate regular items from option block items
  const regularItems: any[] = [];
  const optionBlockItemMap: Record<string, any[]> = {};
  for (const item of itinerary) {
    if (item.option_block_id) {
      if (!optionBlockItemMap[item.option_block_id]) optionBlockItemMap[item.option_block_id] = [];
      optionBlockItemMap[item.option_block_id].push(item);
    } else {
      regularItems.push(item);
    }
  }

  const dayGroups: Record<number, any[]> = {};
  for (const item of regularItems) {
    if (!dayGroups[item.day_number]) dayGroups[item.day_number] = [];
    dayGroups[item.day_number].push(item);
  }

  // Group option blocks by day
  const dayBlocksMap: Record<number, any[]> = {};
  for (const block of optionBlocks) {
    if (!dayBlocksMap[block.day_number]) dayBlocksMap[block.day_number] = [];
    dayBlocksMap[block.day_number].push(block);
  }

  // Collect all days
  const allDays = new Set<number>();
  regularItems.forEach(i => allDays.add(i.day_number));
  optionBlocks.forEach(b => allDays.add(b.day_number));

  return (
    <div className="space-y-10">
      {Array.from(allDays)
        .sort((a, b) => a - b)
        .map((day) => {
          const items = dayGroups[day] || [];
          const blocks = dayBlocksMap[day] || [];
          const dateStr = departDate
            ? format(addDays(parseISO(departDate), day - 1), "EEE, MMM d")
            : null;
          const locationStr = items.find((i: any) => i.location)?.location;

          return (
            <div key={day}>
              <div className="border-b pb-3 mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  Day {day}
                  {dateStr && (
                    <span className="font-normal text-gray-400 ml-2">· {dateStr}</span>
                  )}
                  {locationStr && (
                    <span className="font-normal text-gray-400 ml-2">· {locationStr}</span>
                  )}
                </h3>
              </div>

              <div className="space-y-8">
                {items.map((item: any) => (
                  <div key={item.id} className="pl-4 border-l-2" style={{ borderColor: `${primaryColor}40` }}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">{categoryIcons[item.category] || "📌"}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold text-gray-900">{item.title}</h4>
                        {item.description && (
                          <p className="text-gray-500 mt-1 leading-relaxed">{item.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-400">
                          {item.start_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {item.start_time.slice(0, 5)}
                              {item.end_time && ` – ${item.end_time.slice(0, 5)}`}
                            </span>
                          )}
                          {item.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {item.location}
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-sm text-gray-400 mt-2 italic">{item.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Option blocks */}
                {blocks.map((block: any) => (
                  <OptionBlockClient
                    key={block.id}
                    block={block}
                    items={optionBlockItemMap[block.id] || []}
                    primaryColor={primaryColor}
                  />
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}
