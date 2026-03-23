import { useOnboarding } from "@/hooks/useOnboarding";
import { useMyMentor } from "@/hooks/useMentorAssignment";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  User,
  Users,
  Compass,
  Calendar,
  Palette,
  GraduationCap,
  ArrowRight,
  Phone,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";

const steps = [
  {
    key: "profile_completed" as const,
    label: "Complete your profile",
    description: "Add your name, certifications, and agency details",
    icon: User,
    href: "/settings",
  },
  {
    key: "first_client_added" as const,
    label: "Add your first client",
    description: "Import or create a client record",
    icon: Users,
    href: "/contacts",
  },
  {
    key: "first_trip_created" as const,
    label: "Create your first trip",
    description: "Set up a trip with dates and destination",
    icon: Compass,
    href: "/trips",
  },
  {
    key: "first_booking_added" as const,
    label: "Add a booking",
    description: "Link a supplier booking to a trip",
    icon: Calendar,
    href: "/bookings",
  },
  {
    key: "branding_configured" as const,
    label: "Set up your branding",
    description: "Upload your logo and customize colors",
    icon: Palette,
    href: "/branding",
  },
  {
    key: "training_started" as const,
    label: "Start training",
    description: "Begin a certification course",
    icon: GraduationCap,
    href: "/training",
  },
];

export function OnboardingWizard() {
  const { progress, isLoading, isComplete, progressPercent, completedSteps, totalSteps } = useOnboarding();
  const { data: mentorData } = useMyMentor();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || isComplete || dismissed) return null;

  const nextStep = steps.find((s) => progress && !progress[s.key]);

  return (
    <div className="bg-card rounded-xl border border-primary/20 shadow-card overflow-hidden mb-6">
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-card-foreground">
            Getting Started
          </h2>
          <p className="text-sm text-muted-foreground">
            {completedSteps}/{totalSteps} steps completed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">
            {progressPercent}%
          </Badge>
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-6 py-2">
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {steps.map((step) => {
          const done = progress?.[step.key] ?? false;
          const isNext = step === nextStep;

          return (
            <button
              key={step.key}
              onClick={() => navigate(step.href)}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                done
                  ? "bg-success/5 border border-success/20"
                  : isNext
                  ? "bg-primary/5 border border-primary/20 hover:bg-primary/10"
                  : "bg-muted/30 border border-border hover:bg-muted/50"
              )}
            >
              <div className="mt-0.5">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Circle
                    className={cn(
                      "h-5 w-5",
                      isNext ? "text-primary" : "text-muted-foreground/40"
                    )}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    done
                      ? "text-success line-through"
                      : "text-card-foreground"
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              </div>
              {isNext && (
                <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Mentor Card */}
      {mentorData?.mentor && (
        <div className="mx-6 mb-4 p-3 bg-accent/5 rounded-lg border border-accent/20 flex items-center gap-3">
          {mentorData.mentor.avatar_url ? (
            <img
              src={mentorData.mentor.avatar_url}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
              <User className="h-5 w-5 text-accent" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-card-foreground">
              Your Mentor: {mentorData.mentor.full_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {mentorData.mentor.job_title || "Senior Advisor"} • Reach out anytime
            </p>
          </div>
          {mentorData.mentor.phone && (
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <a href={`tel:${mentorData.mentor.phone}`}>
                <Phone className="h-3.5 w-3.5" />
                Call
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
