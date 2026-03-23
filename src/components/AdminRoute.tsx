import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useIsAdmin, useCanViewTeam } from "@/hooks/useAdmin";

interface AdminRouteProps {
  children: ReactNode;
  /** If true, office_admin can also access this route (default: false) */
  allowOfficeAdmin?: boolean;
}

export function AdminRoute({ children, allowOfficeAdmin = false }: AdminRouteProps) {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { canView, isLoading: teamLoading } = useCanViewTeam();

  const isLoading = allowOfficeAdmin ? teamLoading : adminLoading;
  const hasAccess = allowOfficeAdmin ? canView : isAdmin;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/20" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
