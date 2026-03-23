import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Layers, Plus, Trash2, Pencil, Check, X,
  Clock, MapPin, Plane, Hotel, Ship, Car,
  UtensilsCrossed, Camera, Target, Heart, ShoppingBag, Music,
} from "lucide-react";
import { OptionBlock } from "@/hooks/useOptionBlocks";
import { ItineraryItem } from "@/hooks/useItinerary";

const categoryIcons: Record<string, any> = {
  flight: Plane, hotel: Hotel, cruise: Ship, transportation: Car,
  dining: UtensilsCrossed, activity: Target, sightseeing: Camera,
  relaxation: Heart, shopping: ShoppingBag, entertainment: Music,
};

const categoryColors: Record<string, string> = {
  flight: "bg-blue-100 text-blue-700 border-blue-200",
  hotel: "bg-amber-100 text-amber-700 border-amber-200",
  cruise: "bg-cyan-100 text-cyan-700 border-cyan-200",
  transportation: "bg-slate-100 text-slate-700 border-slate-200",
  dining: "bg-orange-100 text-orange-700 border-orange-200",
  activity: "bg-green-100 text-green-700 border-green-200",
  sightseeing: "bg-purple-100 text-purple-700 border-purple-200",
  relaxation: "bg-pink-100 text-pink-700 border-pink-200",
  shopping: "bg-rose-100 text-rose-700 border-rose-200",
  entertainment: "bg-indigo-100 text-indigo-700 border-indigo-200",
};

const optionLabels = ["A", "B", "C", "D", "E", "F"];

interface OptionBlockCardProps {
  block: OptionBlock;
  items: ItineraryItem[];
  onAddItem: (blockId: string, dayNumber: number) => void;
  onEditItem: (item: ItineraryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateBlock: (id: string, updates: { title?: string }) => Promise<boolean>;
  onDeleteBlock: (id: string) => Promise<boolean>;
}

export function OptionBlockCard({
  block,
  items,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onUpdateBlock,
  onDeleteBlock,
}: OptionBlockCardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(block.title);

  const handleSaveTitle = async () => {
    if (title.trim() && title !== block.title) {
      await onUpdateBlock(block.id, { title: title.trim() });
    }
    setEditing(false);
  };

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            {editing ? (
              <div className="flex items-center gap-1">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-7 w-48 text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveTitle}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditing(false); setTitle(block.title); }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {block.title}
                <Badge variant="secondary" className="text-[10px]">
                  {items.length} option{items.length !== 1 ? "s" : ""}
                </Badge>
              </CardTitle>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDeleteBlock(block.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, idx) => {
          const Icon = categoryIcons[item.category] || Target;
          return (
            <div
              key={item.id}
              className="flex gap-2 p-2 rounded-md bg-background border cursor-pointer hover:bg-muted/50 transition-colors group"
              onClick={() => onEditItem(item)}
            >
              <div className="flex items-center gap-2 shrink-0">
                <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {optionLabels[idx] || (idx + 1).toString()}
                </span>
                <div className={`h-6 w-6 rounded flex items-center justify-center ${categoryColors[item.category] || categoryColors.activity}`}>
                  <Icon className="h-3 w-3" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm">{item.title}</span>
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  {item.start_time && (
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" /> {item.start_time.slice(0, 5)}
                    </span>
                  )}
                  {item.location && (
                    <span className="flex items-center gap-0.5 truncate">
                      <MapPin className="h-2.5 w-2.5" /> {item.location}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost" size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive shrink-0"
                onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed text-muted-foreground"
          onClick={() => onAddItem(block.id, block.day_number)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Option {optionLabels[items.length] || (items.length + 1).toString()}
        </Button>
      </CardContent>
    </Card>
  );
}
