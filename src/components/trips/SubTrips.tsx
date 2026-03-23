import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Briefcase, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { AddTripDialog } from "./AddTripDialog";

interface SubTrip {
  id: string;
  trip_name: string;
  destination: string | null;
  status: string;
  depart_date: string | null;
  return_date: string | null;
  total_gross_sales: number;
  clients?: { name: string } | null;
}

interface SubTripsProps {
  parentTripId: string;
  subTrips: SubTrip[];
  onDataChange: () => void;
}

const statusColors: Record<string, string> = {
  planning: "bg-blue-100 text-blue-700 border-blue-200",
  booked: "bg-green-100 text-green-700 border-green-200",
  traveling: "bg-purple-100 text-purple-700 border-purple-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  archived: "bg-slate-100 text-slate-500 border-slate-200",
};

export function SubTrips({ parentTripId, subTrips, onDataChange }: SubTripsProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const filtered = subTrips.filter((st) =>
    st.trip_name.toLowerCase().includes(search.toLowerCase()) ||
    (st.destination || "").toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">Sub-Trips</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-48"
              />
            </div>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground font-medium">No sub-trips added</p>
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                Create Sub-Trip
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/trips/${st.id}`)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{st.trip_name}</span>
                      <Badge variant="outline" className={statusColors[st.status] || ""}>
                        {st.status.charAt(0).toUpperCase() + st.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {st.destination && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {st.destination}
                        </span>
                      )}
                      {st.depart_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(st.depart_date), "MMM d, yyyy")}
                          {st.return_date && <> – {format(new Date(st.return_date), "MMM d, yyyy")}</>}
                        </span>
                      )}
                      {st.clients?.name && <span>{st.clients.name}</span>}
                    </div>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(st.total_gross_sales)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddTripDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        parentTripId={parentTripId}
        onTripCreated={onDataChange}
      />
    </>
  );
}
