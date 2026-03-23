import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Clock, Calendar, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays, isWithinInterval, addDays, isPast, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";

interface UpcomingPayment {
  id: string;
  tripId: string;
  tripName: string;
  clientName: string;
  amount: number;
  dueDate: Date;
  daysUntil: number;
  isOverdue: boolean;
  paymentType: string;
}

export function UpcomingPayments() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: payments, isLoading } = useQuery({
    queryKey: ["upcoming-payments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_payments")
        .select(`
          id,
          trip_id,
          amount,
          due_date,
          payment_type,
          status,
          trips (
            trip_name,
            clients (
              name
            )
          )
        `)
        .eq("status", "pending")
        .not("due_date", "is", null)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Process payments to get upcoming ones
  const upcomingPayments: UpcomingPayment[] = (payments || [])
    .map((payment) => {
      const dueDate = parseISO(payment.due_date!);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysUntil = differenceInDays(dueDate, today);
      const isOverdue = isPast(dueDate) && daysUntil < 0;
      
      return {
        id: payment.id,
        tripId: payment.trip_id,
        tripName: (payment.trips as any)?.trip_name || "Trip",
        clientName: (payment.trips as any)?.clients?.name || "Unknown Client",
        amount: payment.amount,
        dueDate,
        daysUntil,
        isOverdue,
        paymentType: payment.payment_type,
      };
    })
    .filter((p) => {
      // Show overdue payments and those due within next 30 days
      const today = new Date();
      const thirtyDaysFromNow = addDays(today, 30);
      return p.isOverdue || isWithinInterval(p.dueDate, { start: today, end: thirtyDaysFromNow });
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  const overduePayments = upcomingPayments.filter((p) => p.isOverdue);
  const totalDueAmount = upcomingPayments.reduce((sum, p) => sum + p.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getUrgencyColor = (daysUntil: number, isOverdue: boolean) => {
    if (isOverdue) return "text-destructive font-semibold";
    if (daysUntil <= 3) return "text-destructive font-semibold";
    if (daysUntil <= 7) return "text-amber-600";
    return "text-muted-foreground";
  };

  const getPaymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: "Deposit",
      final_balance: "Final Balance",
      payment: "Payment",
      installment: "Installment",
    };
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Upcoming Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={overduePayments.length > 0 ? "border-destructive/50" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Upcoming Payments
            {overduePayments.length > 0 && (
              <Badge variant="destructive" className="text-xs ml-2">
                {overduePayments.length} overdue
              </Badge>
            )}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            Next 30 days
          </Badge>
        </div>
        {upcomingPayments.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {formatCurrency(totalDueAmount)} due from {upcomingPayments.length} payment{upcomingPayments.length !== 1 ? "s" : ""}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {upcomingPayments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No payments due in the next 30 days</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingPayments.map((payment) => (
              <div
                key={payment.id}
                className={`flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors ${
                  payment.isOverdue ? "border-destructive/50 bg-destructive/5" : ""
                }`}
                onClick={() => navigate(`/trips/${payment.tripId}`)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {payment.isOverdue && (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                    )}
                    <p className="font-medium text-sm truncate">
                      {payment.tripName}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {payment.clientName} • {getPaymentTypeLabel(payment.paymentType)}
                  </p>
                </div>
                <div className="text-right ml-3">
                  <p className="font-semibold text-sm">
                    {formatCurrency(payment.amount)}
                  </p>
                  <div className="flex items-center gap-1 justify-end">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className={`text-xs ${getUrgencyColor(payment.daysUntil, payment.isOverdue)}`}>
                      {payment.isOverdue
                        ? `${Math.abs(payment.daysUntil)} days overdue`
                        : payment.daysUntil === 0
                        ? "Due today"
                        : payment.daysUntil === 1
                        ? "Due tomorrow"
                        : `${payment.daysUntil} days`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
