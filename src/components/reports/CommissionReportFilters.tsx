import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { Supplier } from "@/hooks/useSuppliers";

interface Agent {
  user_id: string;
  full_name: string | null;
}

interface CommissionReportFiltersProps {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  selectedSupplier: string;
  setSelectedSupplier: (id: string) => void;
  selectedAgent: string;
  setSelectedAgent: (id: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  suppliers: Supplier[];
  agents: Agent[];
  showAgentFilter: boolean;
  onClearFilters: () => void;
}

export function CommissionReportFilters({
  dateRange,
  setDateRange,
  selectedSupplier,
  setSelectedSupplier,
  selectedAgent,
  setSelectedAgent,
  selectedStatus,
  setSelectedStatus,
  suppliers,
  agents,
  showAgentFilter,
  onClearFilters,
}: CommissionReportFiltersProps) {
  const hasFilters =
    dateRange?.from ||
    selectedSupplier !== "all" ||
    selectedAgent !== "all" ||
    selectedStatus !== "all";

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex flex-wrap gap-4">
        {/* Date Range Picker */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Date Range</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[260px] justify-start text-left font-normal",
                  !dateRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM d, yyyy")} -{" "}
                      {format(dateRange.to, "MMM d, yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM d, yyyy")
                  )
                ) : (
                  "All dates"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Supplier Filter */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Supplier</Label>
          <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              <SelectItem value="none">No Supplier</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Agent Filter (Admin only) */}
        {showAgentFilter && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Agent</Label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.user_id} value={a.user_id}>
                    {a.full_name || "Unknown Agent"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status Filter */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {hasFilters && (
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={onClearFilters} className="gap-1">
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
