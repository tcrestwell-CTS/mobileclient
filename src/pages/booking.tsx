import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Filter, Download, Eye, Pencil, Trash2, ExternalLink, Loader2, Search, X, LayoutGrid, List, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useBookings, Booking } from "@/hooks/useBookings";
import { AddBookingDialog } from "@/components/bookings/AddBookingDialog";
import { EditBookingDialog } from "@/components/bookings/EditBookingDialog";
import { BookingCard } from "@/components/bookings/BookingCard";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BookingsCalendar } from "@/components/bookings/BookingsCalendar";
import { exportToCSV, formatCurrencyForExport, formatDateForExport } from "@/lib/csvExport";

const ITEMS_PER_PAGE = 25;

const Bookings = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { bookings, loading, creating, updating, updatingStatusId, isAdmin, createBooking, updateBooking, updateBookingStatus, deleteBooking } = useBookings();
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [deletingBooking, setDeletingBooking] = useState<Booking | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Search, filter, and view state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "cards" | "calendar">(() => {
    return (localStorage.getItem("bookings-view-mode") as "table" | "cards" | "calendar") || "table";
  });

  // Persist view mode
  useEffect(() => {
    localStorage.setItem("bookings-view-mode", viewMode);
  }, [viewMode]);

  // Handle URL action parameter to open Add Booking dialog
  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setIsAddDialogOpen(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Get unique agents for the filter dropdown (only for admins)
  const uniqueAgents = useMemo(() => {
    const agents = new Set<string>();
    bookings.forEach((booking) => {
      if (booking.owner_agent) {
        agents.add(booking.owner_agent);
      }
    });
    return Array.from(agents).sort();
  }, [bookings]);

  // Timezone-safe date parsing
  const parseDate = (dateStr: string) => {
    // Dates like "2025-06-15" should be treated as local, not UTC
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return parseISO(dateStr + "T00:00:00");
    }
    return new Date(dateStr);
  };

  // Filter bookings based on search and filters
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          booking.destination?.toLowerCase().includes(query) ||
          booking.trip_name?.toLowerCase().includes(query) ||
          booking.booking_reference?.toLowerCase().includes(query) ||
          booking.clients?.name?.toLowerCase().includes(query) ||
          booking.owner_agent?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      if (statusFilter !== "all" && booking.status !== statusFilter) {
        return false;
      }

      if (agentFilter !== "all" && booking.owner_agent !== agentFilter) {
        return false;
      }

      if (dateFilter !== "all") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const departDate = parseDate(booking.depart_date);
        const returnDate = parseDate(booking.return_date);

        switch (dateFilter) {
          case "upcoming":
            if (departDate < today) return false;
            break;
          case "ongoing":
            if (departDate > today || returnDate < today) return false;
            break;
          case "past":
            if (returnDate >= today) return false;
            break;
        }
      }

      return true;
    });
  }, [bookings, searchQuery, statusFilter, dateFilter, agentFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter, agentFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBookings, currentPage]);

  const activeFiltersCount = [
    statusFilter !== "all",
    dateFilter !== "all",
    agentFilter !== "all",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setStatusFilter("all");
    setDateFilter("all");
    setAgentFilter("all");
    setSearchQuery("");
  };

  const stats = useMemo(() => ({
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    pending: bookings.filter((b) => b.status === "pending").length,
    traveling: bookings.filter((b) => b.status === "traveling").length,
    traveled: bookings.filter((b) => b.status === "traveled").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
    totalRevenue: bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
  }), [bookings]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseDate(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-success/10 text-success";
      case "pending":
        return "bg-accent/10 text-accent";
      case "traveling":
        return "bg-info/10 text-info";
      case "traveled":
        return "bg-primary/10 text-primary";
      case "cancelled":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleExport = () => {
    if (filteredBookings.length === 0) return;
    exportToCSV(
      filteredBookings.map((b) => ({
        booking_reference: b.booking_reference,
        trip_name: b.trip_name || "",
        client: b.clients?.name || "",
        destination: b.destination,
        depart_date: formatDateForExport(b.depart_date),
        return_date: formatDateForExport(b.return_date),
        travelers: b.travelers,
        status: b.status,
        total_amount: formatCurrencyForExport(b.total_amount),
        gross_sales: formatCurrencyForExport(b.gross_sales),
        commission_revenue: formatCurrencyForExport(b.commission_revenue),
        agent: b.owner_agent || "",
      })),
      `bookings-export-${format(new Date(), "yyyy-MM-dd")}`,
      [
        { key: "booking_reference", header: "Reference" },
        { key: "trip_name", header: "Trip Name" },
        { key: "client", header: "Client" },
        { key: "destination", header: "Destination" },
        { key: "depart_date", header: "Depart Date" },
        { key: "return_date", header: "Return Date" },
        { key: "travelers", header: "Travelers" },
        { key: "status", header: "Status" },
        { key: "total_amount", header: "Total Amount" },
        { key: "gross_sales", header: "Gross Sales" },
        { key: "commission_revenue", header: "Commission" },
        { key: "agent", header: "Agent" },
      ]
    );
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Booking Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all your travel bookings in one place</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={filteredBookings.length === 0}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <AddBookingDialog 
            onSubmit={createBooking} 
            creating={creating} 
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <div className="bg-card rounded-lg p-4 shadow-card border border-border/50">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-semibold text-card-foreground">{stats.total}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-card border border-border/50">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-semibold text-accent">{stats.pending}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-card border border-border/50">
          <p className="text-sm text-muted-foreground">Confirmed</p>
          <p className="text-2xl font-semibold text-success">{stats.confirmed}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-card border border-border/50">
          <p className="text-sm text-muted-foreground">Traveling</p>
          <p className="text-2xl font-semibold text-info">{stats.traveling}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-card border border-border/50">
          <p className="text-sm text-muted-foreground">Traveled</p>
          <p className="text-2xl font-semibold text-primary">{stats.traveled}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-card border border-border/50">
          <p className="text-sm text-muted-foreground">Cancelled</p>
          <p className="text-2xl font-semibold text-destructive">{stats.cancelled}</p>
        </div>
        <div className="bg-card rounded-lg p-4 shadow-card border border-border/50">
          <p className="text-sm text-muted-foreground">Revenue</p>
          <p className="text-2xl font-semibold text-card-foreground">
            {formatCurrency(stats.totalRevenue)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bookings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="start">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="traveling">Traveling</SelectItem>
                        <SelectItem value="traveled">Traveled</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All dates" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All dates</SelectItem>
                        <SelectItem value="upcoming">Upcoming trips</SelectItem>
                        <SelectItem value="ongoing">Ongoing trips</SelectItem>
                        <SelectItem value="past">Past trips</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {isAdmin && uniqueAgents.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Agent</label>
                      <Select value={agentFilter} onValueChange={setAgentFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All agents" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All agents</SelectItem>
                          {uniqueAgents.map((agent) => (
                            <SelectItem key={agent} value={agent}>
                              {agent}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={clearFilters}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear filters
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          {filteredBookings.length !== bookings.length && (
            <p className="text-sm text-muted-foreground">
              Showing {filteredBookings.length} of {bookings.length} bookings
            </p>
          )}
          
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as "table" | "cards" | "calendar")}
            className="ml-auto"
          >
            <ToggleGroupItem value="table" aria-label="Table view" className="h-8 w-8 p-0">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="cards" aria-label="Card view" className="h-8 w-8 p-0">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="calendar" aria-label="Calendar view" className="h-8 w-8 p-0">
              <CalendarDays className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            {bookings.length === 0 ? (
              <>
                <p>No bookings found</p>
                <p className="text-sm">Import trips or create a new booking to get started</p>
              </>
            ) : (
              <>
                <p>No bookings match your filters</p>
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              </>
            )}
          </div>
        ) : viewMode === "calendar" ? (
          <div className="p-4">
            <BookingsCalendar bookings={filteredBookings} isAdmin={isAdmin} />
          </div>
        ) : viewMode === "cards" ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {paginatedBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  isAdmin={isAdmin}
                  updatingStatusId={updatingStatusId}
                  onStatusChange={updateBookingStatus}
                  onEdit={setEditingBooking}
                  onDelete={setDeletingBooking}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="p-4 border-t border-border">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                      .map((page, idx, arr) => (
                        <PaginationItem key={page}>
                          {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-2 text-muted-foreground">…</span>}
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip Name</TableHead>
                  <TableHead>Client</TableHead>
                  {isAdmin && <TableHead>Agent</TableHead>}
                  <TableHead>Dates</TableHead>
                  <TableHead>Travelers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBookings.map((booking) => (
                  <TableRow 
                    key={booking.id} 
                    className="cursor-pointer"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('button') || target.closest('[role="combobox"]') || target.closest('a')) {
                        return;
                      }
                      navigate(`/bookings/${booking.id}`);
                    }}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {booking.trip_name || booking.destination}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {booking.booking_reference}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{booking.clients?.name || "—"}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {booking.owner_agent || "—"}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span>{formatDate(booking.depart_date)}</span>
                        <span className="text-muted-foreground">
                          to {formatDate(booking.return_date)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{booking.travelers}</TableCell>
                    <TableCell>
                      <Select
                        value={booking.status}
                        onValueChange={(value) => updateBookingStatus(booking.id, value)}
                        disabled={updatingStatusId === booking.id}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue>
                            <Badge
                              variant="secondary"
                              className={getStatusBadgeClass(booking.status)}
                            >
                              {booking.status}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">
                            <Badge variant="secondary" className="bg-accent/10 text-accent">
                              pending
                            </Badge>
                          </SelectItem>
                          <SelectItem value="confirmed">
                            <Badge variant="secondary" className="bg-success/10 text-success">
                              confirmed
                            </Badge>
                          </SelectItem>
                          <SelectItem value="traveling">
                            <Badge variant="secondary" className="bg-info/10 text-info">
                              traveling
                            </Badge>
                          </SelectItem>
                          <SelectItem value="traveled">
                            <Badge variant="secondary" className="bg-primary/10 text-primary">
                              traveled
                            </Badge>
                          </SelectItem>
                          <SelectItem value="cancelled">
                            <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                              cancelled
                            </Badge>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(booking.total_amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {booking.trip_page_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <a
                              href={booking.trip_page_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View in Tern Travel"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/bookings/${booking.id}`)}
                          title="View booking details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingBooking(booking)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeletingBooking(booking)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="p-4 border-t border-border">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                      .map((page, idx, arr) => (
                        <PaginationItem key={page}>
                          {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-2 text-muted-foreground">…</span>}
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      <EditBookingDialog
        booking={editingBooking}
        open={!!editingBooking}
        onOpenChange={(open) => !open && setEditingBooking(null)}
        onSubmit={updateBooking}
      />

      <AlertDialog open={!!deletingBooking} onOpenChange={(open) => !open && setDeletingBooking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the booking for{" "}
              <span className="font-medium">{deletingBooking?.trip_name || deletingBooking?.destination}</span>
              {deletingBooking?.clients?.name && (
                <> ({deletingBooking.clients.name})</>
              )}
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deletingBooking) {
                  await deleteBooking(deletingBooking.id);
                  setDeletingBooking(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Bookings;
