import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds

/**
 * Sends periodic heartbeats to `active_sessions` so admins can see
 * who is currently logged in, what route they're on, and when they
 * were last active. Cleans up on unmount / logout.
 */
export function useSessionHeartbeat() {
  const { user } = useAuth();
  const location = useLocation();
  const routeRef = useRef(location.pathname);

  // Keep route ref current without re-running effect
  useEffect(() => {
    routeRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;

    const upsert = async () => {
      await supabase.from("active_sessions").upsert(
        {
          user_id: user.id,
          last_seen_at: new Date().toISOString(),
          current_route: routeRef.current,
          user_agent: navigator.userAgent,
        } as any,
        { onConflict: "user_id" }
      );
    };

    // Fire immediately, then every 30 s
    upsert();
    const interval = setInterval(upsert, HEARTBEAT_INTERVAL);

    // Cleanup on logout / unmount
    return () => {
      clearInterval(interval);
      // Best-effort delete – don't await
      supabase
        .from("active_sessions")
        .delete()
        .eq("user_id", user.id)
        .then(() => {});
    };
  }, [user]);
}

