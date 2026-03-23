import { ExternalLink, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function FareBuzzCard() {
  return (
    <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
      {/* Header stripe */}
      <div className="bg-primary/10 border-b border-primary/20 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wide">Flight Booking Portal</span>
        </div>
        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
          Agent Access
        </Badge>
      </div>

      <div className="p-6 space-y-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Plane className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-card-foreground leading-tight">FareBuzz</h3>
            <p className="text-xs text-muted-foreground">Agent Home Portal</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          Access exclusive agent fares, search flights, and book air travel for your clients through the FareBuzz agent portal.
        </p>

        {/* Feature highlights */}
        <div className="grid grid-cols-2 gap-2">
          {[
            "Net Agent Fares",
            "Multi-City Search",
            "Group Bookings",
            "Commission Tracking",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              {feature}
            </div>
          ))}
        </div>

        {/* CTA */}
        <Button
          className="w-full"
          onClick={() => window.open("https://www.farebuzz.com/default.aspx", "_blank")}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open FareBuzz Portal
        </Button>
      </div>
    </div>
  );
}
