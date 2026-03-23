import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, CreditCard, GraduationCap, Plane, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NextActionsProps {
  followUps: number;
  paymentsDue: number;
  departuresSoon: number;
  loading?: boolean;
}

interface ActionItem {
  label: string;
  icon: React.ElementType;
  href: string;
  urgent: boolean;
}

export function NextActions({ followUps, paymentsDue, departuresSoon, loading }: NextActionsProps) {
  const navigate = useNavigate();

  if (loading) return null;

  const actions: ActionItem[] = [];

  if (followUps > 0) {
    actions.push({
      label: `Follow up with ${followUps} quote${followUps > 1 ? "s" : ""}`,
      icon: Phone,
      href: "/trips",
      urgent: true,
    });
  }

  if (paymentsDue > 0) {
    actions.push({
      label: `${paymentsDue} client payment${paymentsDue > 1 ? "s" : ""} due`,
      icon: CreditCard,
      href: "/trips",
      urgent: true,
    });
  }

  if (departuresSoon > 0) {
    actions.push({
      label: `${departuresSoon} departure${departuresSoon > 1 ? "s" : ""} this week`,
      icon: Plane,
      href: "/trips",
      urgent: departuresSoon >= 3,
    });
  }

  // Always show at least one action
  if (actions.length === 0) {
    actions.push({
      label: "New supplier training available",
      icon: GraduationCap,
      href: "/training",
      urgent: false,
    });
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Next Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <div className="space-y-2">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => navigate(action.href)}
              className={cn(
                "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left transition-colors group",
                action.urgent
                  ? "bg-destructive/5 hover:bg-destructive/10 border border-destructive/15"
                  : "bg-muted/50 hover:bg-muted border border-border"
              )}
            >
              <action.icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  action.urgent ? "text-destructive" : "text-primary"
                )}
              />
              <span className="text-sm font-medium text-foreground flex-1">
                {action.label}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
