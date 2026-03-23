import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, GlobeLock, Search, Loader2, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Filter = "all" | "published" | "unpublished";

interface TripRow {
  id: string;
  trip_name: string;
  destination: string | null;
  depart_date: string | null;
  return_date: string | null;
  trip_type: string | null;
  published_at: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  budget_range: string | null;
}

async function fetchTrips(filter: Filter) {
  let query = supabase
    .from("trips")
    .select("id, trip_name, destination, depart_date, return_date, trip_type, published_at, cover_image_url, tags, budget_range")
    .is("parent_trip_id", null)
    .order("depart_date", { ascending: true });

  if (filter === "published") query = query.not("published_at", "is", null);
  if (filter === "unpublished") query = query.is("published_at", null);

  const { data, error } = await query;
  if (error) throw error;
  return data as TripRow[];
}

async function togglePublish(tripId: string, currentlyPublished: boolean) {
  const { error } = await supabase
    .from("trips")
    .update({
      published_at: currentlyPublished ? null : new Date().toISOString(),
    } as any)
    .eq("id", tripId);
  if (error) throw error;
}

function TripPublishManager() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["publish-manager-trips", filter],
    queryFn: () => fetchTrips(filter),
  });

  const mutation = useMutation({
    mutationFn: ({ tripId, isPublished }: { tripId: string; isPublished: boolean }) =>
      togglePublish(tripId, isPublished),
    onSuccess: (_, { isPublished }) => {
      queryClient.invalidateQueries({ queryKey: ["publish-manager-trips"] });
      toast.success(isPublished ? "Trip unpublished" : "Trip published");
    },
    onError: () => toast.error("Failed to update trip"),
  });

  const filtered = trips.filter((t) =>
    !search ||
    t.trip_name.toLowerCase().includes(search.toLowerCase()) ||
    t.destination?.toLowerCase().includes(search.toLowerCase())
  );

  const publishedCount = trips.filter((t) => t.published_at).length;
  const unpublishedCount = trips.filter((t) => !t.published_at).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trip Publish Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage which trips are publicly visible to clients
          </p>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 flex-wrap">
          <Card className="flex-1 min-w-[140px]">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Trips</p>
              <p className="text-2xl font-bold text-foreground">{trips.length}</p>
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-[140px]">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Published</p>
              <p className="text-2xl font-bold text-primary">{publishedCount}</p>
            </CardContent>
          </Card>
          <Card className="flex-1 min-w-[140px]">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Unpublished</p>
              <p className="text-2xl font-bold text-muted-foreground">{unpublishedCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter + Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="published">Published</TabsTrigger>
              <TabsTrigger value="unpublished">Unpublished</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search trips..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Trip list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading trips...
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              {search ? "No trips match your search" : "No trips found"}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((trip) => {
              const isPublished = !!trip.published_at;
              const isToggling = mutation.isPending && mutation.variables?.tripId === trip.id;
              return (
                <Card
                  key={trip.id}
                  className={cn(
                    "transition-colors",
                    isPublished ? "border-primary/20 bg-primary/5" : ""
                  )}
                >
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Cover thumbnail */}
                      <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
                        {trip.cover_image_url ? (
                          <img src={trip.cover_image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="h-5 w-5 text-primary/40" />
                          </div>
                        )}
                      </div>

                      {/* Trip info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">{trip.trip_name}</p>
                          {isPublished && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0 shrink-0">Live</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {trip.destination && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {trip.destination}
                            </span>
                          )}
                          {trip.depart_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(trip.depart_date), "MMM d, yyyy")}
                            </span>
                          )}
                          {trip.published_at && (
                            <span className="text-primary/70">
                              Published {format(new Date(trip.published_at), "MMM d")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Toggle button */}
                    <Button
                      variant={isPublished ? "outline" : "default"}
                      size="sm"
                      disabled={isToggling}
                      onClick={() => mutation.mutate({ tripId: trip.id, isPublished })}
                    >
                      {isToggling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isPublished ? (
                        <>
                          <GlobeLock className="h-4 w-4 mr-1.5" />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4 mr-1.5" />
                          Publish
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default TripPublishManager;
