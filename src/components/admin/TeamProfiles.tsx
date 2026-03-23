import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AgencyCertifications } from "@/components/shared/AgencyCertifications";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, User, Phone, Briefcase, Percent, Shield, Trash2, TrendingUp } from "lucide-react";
import { useTeamProfiles } from "@/hooks/useTeamProfiles";
import { useAllUserRoles, useUpdateUserRole, useDeleteUser } from "@/hooks/useUserRoles";
import { useUpdateCommissionTier } from "@/hooks/useUpdateCommissionTier";
import { useIsAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { getTierConfig, CommissionTier, COMMISSION_TIERS } from "@/lib/commissionTiers";

type AppRole = "admin" | "office_admin" | "user";

const roleLabels: Record<AppRole, string> = {
  admin: "Admin",
  office_admin: "Office Admin",
  user: "Agent",
};

const roleBadgeStyles: Record<AppRole, string> = {
  admin: "bg-primary/10 text-primary",
  office_admin: "bg-accent/10 text-accent",
  user: "bg-muted text-muted-foreground",
};

export function TeamProfiles() {
  const { user: currentUser } = useAuth();
  const { data: profiles, isLoading, error } = useTeamProfiles();
  const { data: userRoles, isLoading: rolesLoading } = useAllUserRoles();
  const { data: isAdmin } = useIsAdmin();
  const updateRole = useUpdateUserRole();
  const updateTier = useUpdateCommissionTier();
  const deleteUser = useDeleteUser();

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
  } | null>(null);

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
  } | null>(null);

  if (isLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>Unable to load team profiles</p>
      </div>
    );
  }

  if (!profiles || profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <User className="h-12 w-12 mb-4 opacity-50" />
        <p>No team members yet</p>
      </div>
    );
  }

  const getUserRole = (userId: string): AppRole => {
    const role = userRoles?.find((r) => r.user_id === userId);
    return role?.role || "user";
  };

  const handleRoleChange = (userId: string, userName: string, newRole: string) => {
    if (newRole === "admin") {
      setConfirmDialog({ open: true, userId, userName });
    } else if (newRole === "none") {
      updateRole.mutate({ userId, role: null });
    } else {
      updateRole.mutate({ userId, role: newRole as AppRole });
    }
  };

  const confirmAdminRole = () => {
    if (confirmDialog) {
      updateRole.mutate({ userId: confirmDialog.userId, role: "admin" });
      setConfirmDialog(null);
    }
  };

  const confirmDeleteUser = () => {
    if (deleteDialog) {
      deleteUser.mutate(deleteDialog.userId);
      setDeleteDialog(null);
    }
  };

  return (
    <>
      <AlertDialog open={confirmDialog?.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grant Admin Access?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to grant admin privileges to <strong>{confirmDialog?.userName}</strong>. 
              Admins have full access to manage team members, view all data, and change system settings.
              This action can be reversed later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAdminRole}>
              Grant Admin Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialog?.open} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to permanently remove <strong>{deleteDialog?.userName}</strong> from the team.
              This will delete their profile, all their data (clients, bookings, commissions), and their account.
              <span className="block mt-2 font-semibold text-destructive">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {profiles.map((profile) => {
        const initials = profile.full_name
          ? profile.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
          : "U";

        const currentRole = getUserRole(profile.user_id);
        const isCurrentUser = currentUser?.id === profile.user_id;

        return (
          <Card key={profile.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || "Agent"} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-card-foreground truncate">
                    {profile.full_name || "Unnamed Agent"}
                    {isCurrentUser && (
                      <span className="text-xs text-muted-foreground ml-2">(You)</span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {profile.job_title || "Travel Agent"}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {profile.agency_name && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{profile.agency_name}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Percent className="h-4 w-4 flex-shrink-0" />
                  <span>{getTierConfig(profile.commission_tier).agentSplit}% agent commission</span>
                </div>
                {/* Commission Tier - editable by admin */}
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  {isAdmin && !isCurrentUser ? (
                    <Select
                      value={profile.commission_tier || "tier_1"}
                      onValueChange={(value: CommissionTier) => 
                        updateTier.mutate({ userId: profile.user_id, tier: value })
                      }
                      disabled={updateTier.isPending}
                    >
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.entries(COMMISSION_TIERS) as [CommissionTier, typeof COMMISSION_TIERS[CommissionTier]][]).map(
                          ([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.label} ({config.description})
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {getTierConfig(profile.commission_tier).description}
                    </span>
                  )}
                </div>
                </div>

                <AgencyCertifications
                  cliaNumber={profile.clia_number}
                  ccraNumber={profile.ccra_number}
                  astaNumber={profile.asta_number}
                  embarcNumber={profile.embarc_number}
                />

              <div className="mt-4 pt-3 border-t border-border space-y-3">
                {/* Role display/edit */}
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  {isAdmin && !isCurrentUser ? (
                    <Select
                      value={currentRole}
                      onValueChange={(value) => handleRoleChange(profile.user_id, profile.full_name || "this user", value)}
                      disabled={updateRole.isPending}
                    >
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Agent</SelectItem>
                        <SelectItem value="office_admin">Office Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={roleBadgeStyles[currentRole]}>
                      {roleLabels[currentRole]}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
                  </Badge>
                  {isAdmin && !isCurrentUser && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteDialog({ 
                        open: true, 
                        userId: profile.user_id, 
                        userName: profile.full_name || "this user" 
                      })}
                      disabled={deleteUser.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      </div>
    </>
  );
}
