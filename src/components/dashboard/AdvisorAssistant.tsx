import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, Phone, CheckCircle2 } from "lucide-react";

interface AdvisorAssistantProps {
  followUps: number;
  paymentsDue: number;
  confirmedTrips: number;
}

export function AdvisorAssistant({ followUps, paymentsDue, confirmedTrips }: AdvisorAssistantProps) {
  const navigate = useNavigate();

  // Pick the most impactful insight to show
  let message = "";
  let actionLabel = "";
  let actionHref = "";
  let ActionIcon = CheckCircle2;

  if (followUps > 0) {
    message = `You have ${followUps} quote${followUps > 1 ? "s" : ""} waiting for follow-up. Sending a reminder today increases conversion by 30%.`;
    actionLabel = "Send Reminder";
    actionHref = "/trips";
    ActionIcon = Send;
  } else if (paymentsDue > 0) {
    message = `${paymentsDue} payment${paymentsDue > 1 ? "s are" : " is"} coming due. Confirming early keeps your pipeline moving.`;
    actionLabel = "Review Payments";
    actionHref = "/trips";
    ActionIcon = Phone;
  } else if (confirmedTrips > 0) {
    message = `${confirmedTrips} trip${confirmedTrips > 1 ? "s" : ""} confirmed — great momentum! Consider reaching out with pre-departure info.`;
    actionLabel = "View Trips";
    actionHref = "/trips";
    ActionIcon = CheckCircle2;
  } else {
    message = "Your pipeline is clear. A great time to reach out to past clients or follow up on new leads.";
    actionLabel = "View Clients";
    actionHref = "/contacts";
    ActionIcon = Phone;
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/15">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-1">Advisor Assistant</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {message}
            </p>
            <Button
              size="sm"
              variant="default"
              className="gap-1.5"
              onClick={() => navigate(actionHref)}
            >
              <ActionIcon className="h-3.5 w-3.5" />
              {actionLabel}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
