import { MapPin } from "lucide-react";

interface ItineraryLocationTimelineProps {
  items: { location?: string | null; day_number: number }[];
}

export function ItineraryLocationTimeline({ items }: ItineraryLocationTimelineProps) {
  // Extract unique locations in day order
  const locations = items
    .filter(i => i.location)
    .sort((a, b) => a.day_number - b.day_number)
    .reduce<{ location: string; day: number }[]>((acc, item) => {
      if (!acc.length || acc[acc.length - 1].location !== item.location) {
        acc.push({ location: item.location!, day: item.day_number });
      }
      return acc;
    }, []);

  if (locations.length < 2) return null;

  return (
    <div className="py-2">
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {locations.map((loc, i) => (
          <div key={i} className="flex items-center shrink-0">
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <p className="text-[11px] font-medium text-foreground mt-1 text-center max-w-[80px] leading-tight">
                {loc.location}
              </p>
              <p className="text-[10px] text-muted-foreground">Day {loc.day}</p>
            </div>
            {i < locations.length - 1 && (
              <div className="h-0.5 w-8 bg-primary/20 mx-1 self-start mt-4" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
