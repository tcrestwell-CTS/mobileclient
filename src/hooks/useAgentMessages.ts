import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AgentMessage {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  message: string;
  channel: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

export function useAgentMessages(channel: "team" | "dm", dmPartnerId?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!user) return;

    let query = supabase
      .from("agent_messages")
      .select("*")
      .eq("channel", channel)
      .order("created_at", { ascending: true })
      .limit(100);

    if (channel === "dm" && dmPartnerId) {
      query = supabase
        .from("agent_messages")
        .select("*")
        .eq("channel", "dm")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${dmPartnerId}),and(sender_id.eq.${dmPartnerId},recipient_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true })
        .limit(100);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching agent messages:", error);
      setLoading(false);
      return;
    }

    // Enrich with profile data
    const senderIds = [...new Set((data || []).map((m) => m.sender_id))];
    let profileMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", senderIds);
      if (profiles) {
        profileMap = Object.fromEntries(profiles.map((p) => [p.user_id, p]));
      }
    }

    const enriched: AgentMessage[] = (data || []).map((m) => ({
      ...m,
      sender_name: profileMap[m.sender_id]?.full_name || "Agent",
      sender_avatar: profileMap[m.sender_id]?.avatar_url || undefined,
    }));

    setMessages(enriched);
    setLoading(false);
  }, [user, channel, dmPartnerId]);

  useEffect(() => {
    fetchMessages();

    const channelSub = supabase
      .channel(`agent-messages-${channel}-${dmPartnerId || "all"}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_messages" },
        () => fetchMessages()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "agent_messages" },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelSub);
    };
  }, [fetchMessages]);

  const sendMessage = useCallback(
    async (text: string, recipientId?: string) => {
      if (!user || !text.trim()) return;
      const { error } = await supabase.from("agent_messages").insert({
        sender_id: user.id,
        recipient_id: recipientId || null,
        message: text.trim(),
        channel: recipientId ? "dm" : "team",
      });
      if (error) console.error("Error sending message:", error);
    },
    [user]
  );

  return { messages, loading, sendMessage, refetch: fetchMessages };
}

export function useOnlineAgents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<
    { user_id: string; full_name: string | null; avatar_url: string | null; last_seen_at: string }[]
  >([]);

  const fetchOnlineAgents = useCallback(async () => {
    if (!user) return;
    const threshold = new Date(Date.now() - 120_000).toISOString();

    const { data: sessions } = await supabase
      .from("active_sessions")
      .select("user_id, last_seen_at")
      .gte("last_seen_at", threshold);

    if (!sessions || sessions.length === 0) {
      setAgents([]);
      return;
    }

    const userIds = sessions.map((s) => s.user_id).filter((id) => id !== user.id);
    if (userIds.length === 0) {
      setAgents([]);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", userIds);

    const sessionMap = Object.fromEntries(sessions.map((s) => [s.user_id, s.last_seen_at]));

    setAgents(
      (profiles || []).map((p) => ({
        ...p,
        last_seen_at: sessionMap[p.user_id] || "",
      }))
    );
  }, [user]);

  useEffect(() => {
    fetchOnlineAgents();
    const interval = setInterval(fetchOnlineAgents, 30_000);
    return () => clearInterval(interval);
  }, [fetchOnlineAgents]);

  return agents;
}
