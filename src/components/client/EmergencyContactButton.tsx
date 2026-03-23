import { useState } from "react";
import { Phone, Mail, MessageSquare, X, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface EmergencyContactButtonProps {
  agent?: {
    full_name?: string;
    phone?: string;
    email?: string;
  } | null;
}

export function EmergencyContactButton({ agent }: EmergencyContactButtonProps) {
  const [open, setOpen] = useState(false);

  if (!agent) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
        aria-label="Need help?"
      >
        {open ? <X className="h-5 w-5" /> : <LifeBuoy className="h-6 w-6" />}
      </button>

      {/* Contact panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-72 rounded-xl border bg-card shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="p-4 border-b">
            <p className="font-semibold text-foreground">Need Help?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reach out to {agent.full_name || "your advisor"}
            </p>
          </div>
          <div className="p-3 space-y-1">
            {agent.phone && (
              <a
                href={`tel:${agent.phone}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm"
              >
                <Phone className="h-4 w-4 text-primary" />
                <span>{agent.phone}</span>
              </a>
            )}
            {agent.email && (
              <a
                href={`mailto:${agent.email}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm"
              >
                <Mail className="h-4 w-4 text-primary" />
                <span className="truncate">{agent.email}</span>
              </a>
            )}
            <Link
              to="/client/messages"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-sm"
            >
              <MessageSquare className="h-4 w-4 text-primary" />
              <span>Send a message</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
