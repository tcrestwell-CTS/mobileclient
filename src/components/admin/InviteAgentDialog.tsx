import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { CommissionTier, COMMISSION_TIERS } from "@/lib/commissionTiers";

type InviteRole = "user" | "admin" | "office_admin";

interface InviteAgentDialogProps {
  onSubmit: (email: string, role: InviteRole, commissionTier: CommissionTier) => Promise<boolean>;
  sending: boolean;
}

export function InviteAgentDialog({ onSubmit, sending }: InviteAgentDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("user");
  const [commissionTier, setCommissionTier] = useState<CommissionTier>("tier_1");

  // Auto-update commission tier when role changes
  const handleRoleChange = (newRole: InviteRole) => {
    setRole(newRole);
    if (newRole === "office_admin") {
      setCommissionTier("none");
    } else if (newRole === "admin") {
      setCommissionTier("tier_3");
    } else {
      setCommissionTier("tier_1");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) return;

    const success = await onSubmit(email, role, commissionTier);
    if (success) {
      setOpen(false);
      setEmail("");
      setRole("user");
      setCommissionTier("tier_1");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite New Agent</DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new travel agent to your team
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: InviteRole) => handleRoleChange(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Agent</SelectItem>
                <SelectItem value="office_admin">Office Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Agents manage their own data. Office Admins can view all data (read-only). Admins have full access.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commission-tier">Commission Tier</Label>
            <Select 
              value={commissionTier} 
              onValueChange={(value: CommissionTier) => setCommissionTier(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select commission tier" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(COMMISSION_TIERS) as [CommissionTier, typeof COMMISSION_TIERS[CommissionTier]][]).map(
                  ([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label} - {config.description}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Determines the commission split between agent and agency.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending || !email}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Invitation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
