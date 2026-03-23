import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, LayoutGrid, List } from "lucide-react";
import { useClientWithBookings } from "@/hooks/useClients";
import { useIsAdmin } from "@/hooks/useAdmin";
import { AddClientDialog } from "@/components/crm/AddClientDialog";
import { ClientCard } from "@/components/crm/ClientCard";
import { ClientListView } from "@/components/crm/ClientListView";
import { ImportDataDialog } from "@/components/admin/ImportDataDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";


type StatusFilter = "all" | "active" | "lead" | "inactive" | "traveled" | "travelling" | "cancelled";

const TAB_CONFIG: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Clients" },
  { value: "active", label: "Active" },
  { value: "lead", label: "Leads" },
  { value: "traveled", label: "Traveled" },
  { value: "inactive", label: "Inactive" },
  { value: "cancelled", label: "Cancelled" },
];

const CRM = () => {
  const { data: clients, isLoading, error } = useClientWithBookings();
  const { data: isAdmin } = useIsAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const statusCounts = useMemo(() => {
    if (!clients) return { all: 0, active: 0, lead: 0, inactive: 0, traveled: 0, travelling: 0, cancelled: 0 };

    return clients.reduce(
      (acc, client) => {
        acc.all += 1;
        if (client.status === "active") acc.active += 1;
        else if (client.status === "lead") acc.lead += 1;
        else if (client.status === "inactive") acc.inactive += 1;
        else if (client.status === "traveled") acc.traveled += 1;
        else if (client.status === "travelling") acc.travelling += 1;
        else if (client.status === "cancelled") acc.cancelled += 1;
        return acc;
      },
      { all: 0, active: 0, lead: 0, inactive: 0, traveled: 0, travelling: 0, cancelled: 0 }
    );
  }, [clients]);

  const getFilteredClients = (status: StatusFilter) => {
    if (!clients) return [];
    return clients.filter((client) => {
      const matchesSearch =
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.last_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = status === "all" || client.status === status;
      return matchesSearch && matchesStatus;
    });
  };

  const ClientDisplay = ({ status }: { status: StatusFilter }) => {
    const filtered = getFilteredClients(status);

    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card rounded-xl p-5 shadow-card border border-border/50">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center">
          <p className="text-destructive font-medium">Failed to load clients</p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <div className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {clients?.length === 0 ? "No clients yet" : "No matching clients"}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {clients?.length === 0
              ? "Start building your client base by adding your first client."
              : "Try adjusting your search or filter to find what you're looking for."}
          </p>
          {clients?.length === 0 && (
            <div className="flex justify-center gap-2">
              {isAdmin && <ImportDataDialog />}
              <AddClientDialog />
            </div>
          )}
        </div>
      );
    }

    if (viewMode === "list") {
      return <ClientListView clients={filtered} />;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((client) => (
          <ClientCard key={client.id} client={client} />
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Client Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your clients and track their journey</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && <ImportDataDialog />}
          <AddClientDialog />
        </div>
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl p-4 shadow-card border border-border/50 mb-6 flex items-center justify-between gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatusFilter)}>
        <TabsList className="mb-6 h-auto flex-wrap gap-1 bg-muted/50 p-1 rounded-lg">
          {TAB_CONFIG.map(({ value, label }) => {
            const count = value === "all"
              ? statusCounts.all
              : value === "traveled"
              ? statusCounts.traveled
              : value === "lead"
              ? statusCounts.lead
              : value === "active"
              ? statusCounts.active
              : value === "inactive"
              ? statusCounts.inactive
              : statusCounts.cancelled;

            return (
              <TabsTrigger key={value} value={value} className="text-sm">
                {label}
                <span className="ml-1.5 text-xs bg-background/60 text-muted-foreground rounded-full px-1.5 py-0.5">
                  {count}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {TAB_CONFIG.map(({ value }) => (
          <TabsContent key={value} value={value}>
          <ClientDisplay status={value} />
          </TabsContent>
        ))}
      </Tabs>
    </DashboardLayout>
  );
};

export default CRM;
