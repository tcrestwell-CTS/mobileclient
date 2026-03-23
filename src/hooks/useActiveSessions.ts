import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActiveSession {
  id: string;
  user_id: string;
  last_seen_at: string;
  current_route: string | null;
  user_agent: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    job_title: string | null;
  };
}

const ONLINE_THRESHOLD_MS = 60_000; // 60 seconds

export function useActiveSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("active_sessions")
        .select("*")
        .order("last_seen_at", { ascending: false });

      if (error) throw error;

      // Enrich with profile data
      const userIds = (data || []).map((s: any) => s.user_id);
      let profileMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, job_title")
          .in("user_id", userIds);
        if (profiles) {
          profileMap = Object.fromEntries(profiles.map((p) => [p.user_id, p]));
        }
      }

      const enriched: ActiveSession[] = (data || []).map((s: any) => ({
        ...s,
        profile: profileMap[s.user_id] || null,
      }));

      setSessions(enriched);
    } catch (err) {
      console.error("Error fetching active sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSessions();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("active-sessions-monitor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "active_sessions" },
        () => fetchSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSessions]);

  const isOnline = (lastSeen: string) =>
    Date.now() - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS;

  const onlineCount = sessions.filter((s) => isOnline(s.last_seen_at)).length;

  return { sessions, loading, onlineCount, isOnline, refetch: fetchSessions };
}
