import { Navigate } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";

export function PortalProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = usePortalAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/20" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/client/login" replace />;
  }

  return <>{children}</>;
}
