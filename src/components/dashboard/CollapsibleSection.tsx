import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  icon: LucideIcon;
  isEmpty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  urgentCount?: number;
  headerAction?: React.ReactNode;
}

export function CollapsibleSection({
  title,
  icon: Icon,
  isEmpty,
  emptyMessage,
  children,
  defaultExpanded = true,
  className,
  urgentCount = 0,
  headerAction,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(isEmpty ? false : defaultExpanded);

  // Collapsed state for empty sections
  if (isEmpty) {
    return (
      <Card className={cn("opacity-60 hover:opacity-80 transition-opacity", className)}>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              <Icon className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">{emptyMessage}</span>
          </div>
        </CardHeader>
        {isExpanded && (
          <CardContent className="pt-0 pb-3 px-4">
            <p className="text-sm text-muted-foreground text-center py-4">
              {emptyMessage}
            </p>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className={cn(urgentCount > 0 && "ring-2 ring-destructive/20", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-medium">{title}</CardTitle>
            {urgentCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-destructive/10 text-destructive rounded-full">
                {urgentCount} urgent
              </span>
            )}
          </div>
          {headerAction}
        </div>
      </CardHeader>
      {isExpanded && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}
