import { Progress } from "@/components/ui/progress";
import { BookOpen, Award, Clock } from "lucide-react";

const courses = [
  {
    id: 1,
    title: "Destination Specialist: Caribbean",
    progress: 75,
    totalLessons: 12,
    completedLessons: 9,
    badge: "Bronze",
  },
  {
    id: 2,
    title: "Luxury Cruise Certification",
    progress: 40,
    totalLessons: 8,
    completedLessons: 3,
    badge: null,
  },
  {
    id: 3,
    title: "Corporate Travel Fundamentals",
    progress: 100,
    totalLessons: 6,
    completedLessons: 6,
    badge: "Gold",
  },
];

export function TrainingProgress() {
  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">
            Training Progress
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Continue your certifications
          </p>
        </div>
        <div className="flex items-center gap-1 text-primary">
          <Award className="h-4 w-4" />
          <span className="text-sm font-medium">2 Badges</span>
        </div>
      </div>

      <div className="space-y-4">
        {courses.map((course) => (
          <div
            key={course.id}
            className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-card-foreground text-sm">
                    {course.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {course.completedLessons}/{course.totalLessons} lessons
                    </span>
                  </div>
                </div>
              </div>
              {course.badge && (
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    course.badge === "Gold"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {course.badge}
                </span>
              )}
            </div>
            <Progress value={course.progress} className="h-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
