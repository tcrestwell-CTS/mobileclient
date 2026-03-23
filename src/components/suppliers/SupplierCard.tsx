import { Star, ExternalLink, StickyNote, Clock, Plus, Zap, Link2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Supplier } from "@/types/supplier";
import { formatDistanceToNow } from "date-fns";

interface SupplierCardProps {
  supplier: Supplier;
  onToggleFavorite: (id: string) => void;
  onOpenSite: (supplier: Supplier) => void;
  onOpenNotes: (supplier: Supplier) => void;
  onQuickBook?: (supplier: Supplier) => void;
  compact?: boolean;
}

const integrationTypeLabels: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  api: { label: "API", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: Zap },
  redirect: { label: "Portal", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Link2 },
  hybrid: { label: "Hybrid", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Zap },
};

const categoryColors: Record<string, string> = {
  flights: "bg-primary/10 text-primary border-primary/20",
  cruises: "bg-accent/50 text-accent-foreground border-accent",
  hotels: "bg-secondary text-secondary-foreground border-secondary",
  transportation: "bg-muted text-muted-foreground border-border",
  "all-inclusive": "bg-primary/5 text-primary border-primary/10",
};

export function SupplierCard({ 
  supplier, 
  onToggleFavorite, 
  onOpenSite, 
  onOpenNotes,
  onQuickBook,
  compact = false 
}: SupplierCardProps) {
  const integrationType = integrationTypeLabels[supplier.integrationType || "redirect"];
  if (compact) {
    return (
      <Card 
        className="group cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
        onClick={() => onOpenSite(supplier)}
      >
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-primary">
                {supplier.name.charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{supplier.name}</p>
              <p className="text-xs text-muted-foreground">
                {supplier.visitCount} visits
              </p>
            </div>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </CardContent>
      </Card>
    );
  }

  const IntegrationIcon = integrationType.icon;

  return (
    <Card className="group hover:shadow-lg transition-all hover:border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-primary">
                {supplier.name.charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg truncate">{supplier.name}</CardTitle>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs capitalize", categoryColors[supplier.category])}
                >
                  {supplier.category}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", integrationType.color)}
                >
                  <IntegrationIcon className="h-3 w-3 mr-1" />
                  {integrationType.label}
                </Badge>
                {supplier.apiStatus === "coming_soon" && (
                  <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20">
                    API Soon
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(supplier.id);
                }}
              >
                <Star 
                  className={cn(
                    "h-5 w-5 transition-colors",
                    supplier.isFavorite 
                      ? "fill-primary text-primary" 
                      : "text-muted-foreground hover:text-primary"
                  )} 
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {supplier.isFavorite ? "Remove from favorites" : "Add to favorites"}
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="line-clamp-2">
          {supplier.description}
        </CardDescription>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>{supplier.visitCount} visits</span>
          </div>
          {supplier.lastVisited && (
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDistanceToNow(supplier.lastVisited, { addSuffix: true })}</span>
            </div>
          )}
          {supplier.notes && (
            <div className="flex items-center gap-1">
              <StickyNote className="h-3.5 w-3.5" />
              <span>Has notes</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            className="flex-1" 
            onClick={() => onOpenSite(supplier)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Portal
          </Button>
          {onQuickBook && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="icon"
                  onClick={() => onQuickBook(supplier)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Import Booking</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => onOpenNotes(supplier)}
              >
                <StickyNote className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add/Edit Notes</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}
