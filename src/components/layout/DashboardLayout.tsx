import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { useSessionHeartbeat } from "@/hooks/useSessionHeartbeat";
import { useIsMobile } from "@/hooks/use-mobile";
import { AgentChatWidget } from "@/components/chat/AgentChatWidget";
interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  useSessionHeartbeat();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed} />
      <main
        className={
          isMobile
            ? "pt-14"
            : collapsed
            ? "pl-16 transition-all duration-300"
            : "pl-64 transition-all duration-300"
        }
      >
        <div className={isMobile ? "p-4" : "p-8"}>{children}</div>
      </main>
      <AgentChatWidget />
    </div>
  );
}
