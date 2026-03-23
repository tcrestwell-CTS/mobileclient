import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Cake } from "lucide-react";
import { Client } from "@/hooks/useClients";
import { format, differenceInYears } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ClientCardProps {
  client: Client & {
    totalBookings: number;
    totalSpent: number;
  };
}

export function ClientCard({ client }: ClientCardProps) {
  const navigate = useNavigate();
  
  const displayName = client.preferred_first_name 
    ? `${client.preferred_first_name} ${client.last_name || ''}`
    : client.name;
  
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatBirthday = (birthday: string | null) => {
    if (!birthday) return null;
    const date = new Date(birthday);
    const age = differenceInYears(new Date(), date);
    return `${format(date, "MMM d")} (${age}y)`;
  };

  const fullName = client.title 
    ? `${client.title} ${client.first_name || ''} ${client.last_name || ''}`.trim()
    : client.name;

  return (
    <div 
      className="bg-card rounded-xl p-5 shadow-card border border-border/50 hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => navigate(`/contacts/${client.id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-semibold text-primary">{initials}</span>
          </div>
          <div>
            <p className="font-semibold text-card-foreground">{fullName}</p>
            <Badge
              variant="secondary"
              className={
                client.status === "active"
                  ? "bg-success/10 text-success"
                  : client.status === "lead"
                  ? "bg-accent/10 text-accent"
                  : "bg-muted text-muted-foreground"
              }
            >
              {client.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        {client.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span className="truncate">{client.email}</span>
          </div>
        )}
        {client.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{client.phone}</span>
          </div>
        )}
        {client.location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{client.location}</span>
          </div>
        )}
        {client.birthday && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Cake className="h-4 w-4" />
            <span>{formatBirthday(client.birthday)}</span>
          </div>
        )}
        {!client.email && !client.phone && !client.location && !client.birthday && (
          <p className="text-muted-foreground italic">No contact info added</p>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground">Bookings</p>
          <p className="font-semibold text-card-foreground">
            {client.totalBookings}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Spent</p>
          <p className="font-semibold text-card-foreground">
            {formatCurrency(client.totalSpent)}
          </p>
        </div>
      </div>
    </div>
  );
}
