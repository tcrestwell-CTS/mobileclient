import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
  startLabel?: string;
  endLabel?: string;
  disabled?: boolean;
  id?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
  startLabel = "Trip Start",
  endLabel = "Trip End",
  disabled = false,
  id = "date-range-picker",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Generate accessible label for screen readers
  const getAriaLabel = () => {
    if (!dateRange?.from) {
      return "Select trip dates. Press Enter to open calendar.";
    }
    if (!dateRange.to) {
      return `${startLabel}: ${format(dateRange.from, "PPPP")}. End date not selected. Press Enter to open calendar.`;
    }
    return `${startLabel}: ${format(dateRange.from, "PPPP")}. ${endLabel}: ${format(dateRange.to, "PPPP")}. Press Enter to change dates.`;
  };

  // Handle keyboard shortcuts within the popover
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Close on Escape (handled by Radix, but adding for clarity)
    if (e.key === "Escape") {
      setIsOpen(false);
    }
    // Clear selection with Delete or Backspace when popover is closed
    if (!isOpen && (e.key === "Delete" || e.key === "Backspace")) {
      e.preventDefault();
      onDateRangeChange(undefined);
    }
  };

  return (
    <div className={cn("grid gap-2", className)} role="group" aria-labelledby={`${id}-label`}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            aria-label={getAriaLabel()}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "MMM d, yyyy")} –{" "}
                  {format(dateRange.to, "MMM d, yyyy")}
                </>
              ) : (
                format(dateRange.from, "MMM d, yyyy")
              )
            ) : (
              <span>Select trip dates</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0" 
          align="start"
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-label="Date range picker calendar"
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
            className="pointer-events-auto"
          />
          <div className="border-t p-3 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{startLabel}: {dateRange?.from ? format(dateRange.from, "PP") : "Not selected"}</span>
              <span>{endLabel}: {dateRange?.to ? format(dateRange.to, "PP") : "Not selected"}</span>
            </div>
            <div className="text-[10px] text-muted-foreground/70 space-y-0.5" aria-label="Keyboard shortcuts">
              <p><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">←</kbd> <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">→</kbd> <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">↑</kbd> <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">↓</kbd> Navigate days</p>
              <p><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Enter</kbd> Select date • <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Esc</kbd> Close</p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
