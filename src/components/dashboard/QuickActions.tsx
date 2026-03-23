import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Send, UserPlus } from "lucide-react";

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="flex gap-3">
      <Button onClick={() => navigate("/trips?action=new")} className="gap-2">
        <Plus className="h-4 w-4" />
        New Trip
      </Button>
      <Button variant="secondary" onClick={() => navigate("/contacts")} className="gap-2">
        <Send className="h-4 w-4" />
        Send Quote
      </Button>
      <Button variant="secondary" onClick={() => navigate("/contacts?action=new")} className="gap-2">
        <UserPlus className="h-4 w-4" />
        Add Client
      </Button>
    </div>
  );
}
