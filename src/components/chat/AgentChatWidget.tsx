import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Users, ArrowLeft, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAgentMessages, useOnlineAgents } from "@/hooks/useAgentMessages";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type View = "closed" | "menu" | "team" | "dm";

export function AgentChatWidget() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("closed");
  const [dmPartnerId, setDmPartnerId] = useState<string | undefined>();
  const [dmPartnerName, setDmPartnerName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const onlineAgents = useOnlineAgents();

  const channel = view === "dm" ? "dm" : "team";
  const { messages, loading, sendMessage } = useAgentMessages(
    channel as "team" | "dm",
    dmPartnerId
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, view]);

  if (!user) return null;

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    await sendMessage(newMessage, view === "dm" ? dmPartnerId : undefined);
    setNewMessage("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openDm = (agentId: string, agentName: string) => {
    setDmPartnerId(agentId);
    setDmPartnerName(agentName);
    setView("dm");
  };

  if (view === "closed") {
    return (
      <button
        onClick={() => setView("menu")}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center transition-all hover:scale-105"
      >
        <MessageCircle className="h-6 w-6" />
        {onlineAgents.length > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-green-500 text-[10px] text-white font-bold flex items-center justify-center">
            {onlineAgents.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/50">
        {(view === "team" || view === "dm") && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setView("menu")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h3 className="text-sm font-semibold flex-1">
          {view === "menu" && "Agent Chat"}
          {view === "team" && "Team Chat"}
          {view === "dm" && dmPartnerName}
        </h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setView("closed")}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Menu View */}
      {view === "menu" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <button
            onClick={() => setView("team")}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Team Chat</p>
              <p className="text-xs text-muted-foreground">Message all agents</p>
            </div>
          </button>

          {onlineAgents.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-medium text-muted-foreground px-1 pb-2">
                Online Now ({onlineAgents.length})
              </p>
              {onlineAgents.map((agent) => (
                <button
                  key={agent.user_id}
                  onClick={() => openDm(agent.user_id, agent.full_name || "Agent")}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={agent.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {(agent.full_name || "A").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <Circle className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 fill-green-500 text-green-500" />
                  </div>
                  <span className="text-sm font-medium text-foreground truncate">
                    {agent.full_name || "Agent"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {onlineAgents.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No other agents online right now
            </p>
          )}
        </div>
      )}

      {/* Chat View (Team or DM) */}
      {(view === "team" || view === "dm") && (
        <>
          <ScrollArea className="flex-1 p-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No messages yet. Start the conversation!
              </p>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isMine = msg.sender_id === user.id;
                  return (
                    <div key={msg.id} className={cn("flex gap-2", isMine && "flex-row-reverse")}>
                      {!isMine && (
                        <Avatar className="h-7 w-7 mt-0.5 shrink-0">
                          <AvatarImage src={msg.sender_avatar} />
                          <AvatarFallback className="text-[10px]">
                            {(msg.sender_name || "A").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "max-w-[75%] rounded-xl px-3 py-2",
                          isMine
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {!isMine && view === "team" && (
                          <p className="text-[10px] font-semibold mb-0.5 opacity-70">
                            {msg.sender_name}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                        <p
                          className={cn(
                            "text-[10px] mt-1",
                            isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                          )}
                        >
                          {format(new Date(msg.created_at), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Textarea
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className="resize-none min-h-[36px] text-sm"
              />
              <Button
                size="icon"
                className="shrink-0 h-9 w-9"
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
