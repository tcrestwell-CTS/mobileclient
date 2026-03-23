import { usePortalInvoices } from "@/hooks/usePortalData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { FileText, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PortalInvoices() {
  const { data, isLoading } = usePortalInvoices();
  const invoices = data?.invoices || [];
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Invoices</h1>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No invoices found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv: any) => (
            <Card
              key={inv.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/client/invoices/${inv.id}`)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{inv.invoice_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(inv.invoice_date), "MMM d, yyyy")}
                      {inv.trip_name && ` · ${inv.trip_name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Badge variant={inv.status === "paid" ? "default" : inv.status === "partial" ? "secondary" : "outline"}>
                        {inv.status}
                      </Badge>
                      <p className="font-semibold mt-1">${inv.total_amount.toLocaleString()}</p>
                      {inv.amount_remaining > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ${inv.amount_remaining.toLocaleString()} remaining
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
