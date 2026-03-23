import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, MoreHorizontal, RefreshCw, Trash2, Loader2, Clock, CheckCircle, XCircle, UserCircle, TrendingUp, Monitor } from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { useInvitations } from "@/hooks/useInvitations";
import { useCanViewTeam } from "@/hooks/useAdmin";
import { InviteAgentDialog } from "@/components/admin/InviteAgentDialog";
import { TeamProfiles } from "@/components/admin/TeamProfiles";
import { Navigate } from "react-router-dom";
import { getTierConfig } from "@/lib/commissionTiers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ActiveSessionsWidget } from "@/components/admin/ActiveSessionsWidget";


const TeamManagement = () => {
  const { canView, canManage, isLoading: roleLoading } = useCanViewTeam();
  const { invitations, loading, sending, sendInvitation, resendInvitation, revokeInvitation } = useInvitations();
  const [evaluating, setEvaluating] = useState(false);

  const handleEvaluateTiers = async () => {
    setEvaluating(true);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-tiers");
      if (error) throw error;
      const result = data as { message: string; promotions: Array<{ name: string; from: string; to: string }> };
      if (result.promotions?.length > 0) {
        toast.success(`${result.promotions.length} agent(s) promoted!`);
      } else {
        toast.info("No tier promotions needed at this time");
      }
    } catch (err) {
      console.error("Error evaluating tiers:", err);
      toast.error("Failed to evaluate tiers");
    } finally {
      setEvaluating(false);
    }
  };

  // Redirect users without access
  if (!roleLoading && !canView) {
    return <Navigate to="/" replace />;
  }

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = isPast(new Date(expiresAt));
    
    if (status === "accepted") {
      return (
        <Badge variant="secondary" className="bg-success/10 text-success gap-1">
          <CheckCircle className="h-3 w-3" />
          Accepted
        </Badge>
      );
    }
    
    if (isExpired) {
      return (
        <Badge variant="secondary" className="bg-destructive/10 text-destructive gap-1">
          <XCircle className="h-3 w-3" />
          Expired
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className="bg-accent/10 text-accent gap-1">
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  };

  const formatRole = (role: string) => {
    if (role === "admin") return "Admin";
    if (role === "office_admin") return "Office Admin";
    return "Agent";
  };

  const pendingCount = invitations.filter(
    (i) => i.status === "pending" && !isPast(new Date(i.expires_at))
  ).length;

  const acceptedCount = invitations.filter((i) => i.status === "accepted").length;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Team Management</h1>
          <p className="text-muted-foreground text-sm mt-1">{canManage 
            ? "Invite and manage travel agents in your organization"
            : "View team invitations and members"}</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleEvaluateTiers}
                disabled={evaluating}
              >
                {evaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                Re-evaluate Tiers
              </Button>
              <InviteAgentDialog onSubmit={sendInvitation} sending={sending} />
            </>
          )}
        </div>
      </div>

      {/* Tabs for Profiles, Invitations, and Sessions */}
      <Tabs defaultValue="profiles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profiles" className="gap-2">
            <UserCircle className="h-4 w-4" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-2">
            <Users className="h-4 w-4" />
            Invitations
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Monitor className="h-4 w-4" />
            Active Sessions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles">
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-medium text-card-foreground">Agent Profiles</h2>
            </div>
            <div className="p-4">
              <TeamProfiles />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="invitations">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card rounded-lg p-4 shadow-card border border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Invitations</p>
                  <p className="text-2xl font-semibold text-card-foreground">{invitations.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 shadow-card border border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-semibold text-accent">{pendingCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 shadow-card border border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Accepted</p>
                  <p className="text-2xl font-semibold text-success">{acceptedCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Invitations Table */}
          <div className="bg-card rounded-xl shadow-card border border-border/50 overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-medium text-card-foreground">Invitations</h2>
            </div>

            {loading || roleLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p>No invitations sent yet</p>
            {canManage && <p className="text-sm">Click "Invite Agent" to add team members</p>}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Commission Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Expires</TableHead>
                {canManage && <TableHead className="w-[80px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="font-medium">{invitation.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatRole(invitation.role)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {getTierConfig(invitation.commission_tier).description}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(invitation.status, invitation.expires_at)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(invitation.expires_at), "MMM d, yyyy")}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {invitation.status === "pending" && (
                            <DropdownMenuItem
                              onClick={() => resendInvitation(invitation.id)}
                              disabled={sending}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Resend Invitation
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => revokeInvitation(invitation.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Revoke
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
          </div>
        </TabsContent>

        <TabsContent value="sessions">
          <ActiveSessionsWidget />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default TeamManagement;
