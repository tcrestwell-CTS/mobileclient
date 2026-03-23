import { differenceInDays, differenceInHours, isPast, isWithinInterval } from "date-fns";
import { Plane, Clock, PartyPopper } from "lucide-react";

interface DepartureCountdownProps {
  departDate: string | null;
  returnDate?: string | null;
  compact?: boolean;
}

export function DepartureCountdown({ departDate, returnDate, compact = false }: DepartureCountdownProps) {
  if (!departDate) return null;

  const now = new Date();
  const depart = new Date(departDate);
  const ret = returnDate ? new Date(returnDate) : null;

  const isTraveling = ret
    ? isWithinInterval(now, { start: depart, end: ret })
    : isPast(depart) && differenceInDays(now, depart) < 14;

  const isPastTrip = ret ? isPast(ret) : differenceInDays(now, depart) >= 14;

  if (isPastTrip) return null;

  const daysLeft = differenceInDays(depart, now);
  const hoursLeft = differenceInHours(depart, now);

  if (isTraveling) {
    if (compact) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Plane className="h-3 w-3" /> Traveling now!
        </span>
      );
    }
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Plane className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-lg font-bold text-primary">You're traveling!</p>
          <p className="text-sm text-muted-foreground">Have an amazing trip ✨</p>
        </div>
      </div>
    );
  }

  const isUrgent = daysLeft <= 7;
  const urgentColor = isUrgent ? "text-destructive" : "text-primary";
  const urgentBg = isUrgent ? "bg-destructive/5 border-destructive/20" : "bg-primary/5 border-primary/20";
  const urgentIconBg = isUrgent ? "bg-destructive/10" : "bg-primary/10";

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${urgentColor}`}>
        <Clock className="h-3 w-3" />
        {daysLeft <= 0 ? `${hoursLeft}h to go` : `${daysLeft}d to go`}
      </span>
    );
  }

  const Icon = daysLeft <= 3 ? PartyPopper : Clock;

  return (
    <div className={`flex items-center gap-4 rounded-xl border ${urgentBg} px-5 py-4`}>
      <div className={`h-14 w-14 rounded-full ${urgentIconBg} flex items-center justify-center`}>
        <span className={`text-2xl font-bold ${urgentColor}`}>
          {daysLeft <= 0 ? hoursLeft : daysLeft}
        </span>
      </div>
      <div>
        <p className={`text-lg font-bold ${urgentColor}`}>
          {daysLeft <= 0
            ? "Departing today!"
            : daysLeft === 1
            ? "1 day to go!"
            : isUrgent
            ? `${daysLeft} days — departing soon!`
            : `${daysLeft} days to go!`}
        </p>
        <p className="text-sm text-muted-foreground">
          {isUrgent ? "Make sure everything is ready" : "Your adventure awaits"}
        </p>
      </div>
      <Icon className={`h-5 w-5 ml-auto ${urgentColor} opacity-50`} />
    </div>
  );
}
