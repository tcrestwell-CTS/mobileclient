import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CommissionTier } from "@/lib/commissionTiers";

export interface Invitation {
  id: string;
  email: string;
  invited_by: string;
  role: string;
  commission_tier: CommissionTier;
  token: string;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export function useInvitations() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user) {
      fetchInvitations();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchInvitations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        // If user is not admin, they won't have access - that's okay
        if (error.code === "PGRST116" || error.message.includes("permission")) {
          setInvitations([]);
          return;
        }
        throw error;
      }
      setInvitations(data || []);
    } catch (error) {
      console.error("Error fetching invitations:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateToken = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  };

  const sendInvitation = async (
    email: string, 
    role: "user" | "admin" | "office_admin" = "user",
    commissionTier: CommissionTier = "tier_1"
  ) => {
    if (!user) {
      toast.error("You must be logged in to send invitations");
      return false;
    }

    setSending(true);
    try {
      // Check if invitation already exists for this email
      const { data: existing } = await supabase
        .from("invitations")
        .select("id, status")
        .eq("email", email.toLowerCase())
        .eq("status", "pending")
        .maybeSingle();

      if (existing) {
        toast.error("An invitation is already pending for this email");
        return false;
      }

      // Generate invitation token and expiry
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Create invitation record
      const { error: insertError } = await supabase.from("invitations").insert({
        email: email.toLowerCase(),
        invited_by: user.id,
        role,
        commission_tier: commissionTier,
        token,
        expires_at: expiresAt.toISOString(),
      });

      if (insertError) {
        console.error("Error creating invitation:", insertError);
        toast.error("Failed to create invitation");
        return false;
      }

      // Get inviter's profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      // Send invitation email
      const inviteUrl = `https://app.crestwelltravels.com/auth?invite=${token}`;
      
      const { error: emailError } = await supabase.functions.invoke("send-email", {
        body: {
          to: email,
          subject: "You're invited to join Crestwell Travel Services",
          template: "agent_invitation",
          data: {
            inviteUrl,
            inviterName: profile?.full_name || "An administrator",
            expiresIn: "7 days",
          },
        },
      });

      if (emailError) {
        console.error("Error sending invitation email:", emailError);
        toast.warning("Invitation created but email failed to send");
      } else {
        toast.success(`Invitation sent to ${email}`);
      }

      await fetchInvitations();
      return true;
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error("Failed to send invitation");
      return false;
    } finally {
      setSending(false);
    }
  };

  const resendInvitation = async (invitationId: string) => {
    if (!user) return false;

    setSending(true);
    try {
      const invitation = invitations.find((i) => i.id === invitationId);
      if (!invitation) {
        toast.error("Invitation not found");
        return false;
      }

      // Update expiry date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await supabase
        .from("invitations")
        .update({ expires_at: expiresAt.toISOString() })
        .eq("id", invitationId);

      // Get inviter's profile name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      // Resend email
      const inviteUrl = `https://app.crestwelltravels.com/auth?invite=${invitation.token}`;

      await supabase.functions.invoke("send-email", {
        body: {
          to: invitation.email,
          subject: "Reminder: You're invited to join Crestwell Travel Services",
          template: "agent_invitation",
          data: {
            inviteUrl,
            inviterName: profile?.full_name || "An administrator",
            expiresIn: "7 days",
          },
        },
      });

      toast.success("Invitation resent");
      await fetchInvitations();
      return true;
    } catch (error) {
      console.error("Error resending invitation:", error);
      toast.error("Failed to resend invitation");
      return false;
    } finally {
      setSending(false);
    }
  };

  const revokeInvitation = async (invitationId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("invitations")
        .delete()
        .eq("id", invitationId);

      if (error) {
        console.error("Error revoking invitation:", error);
        toast.error("Failed to revoke invitation");
        return false;
      }

      toast.success("Invitation revoked");
      await fetchInvitations();
      return true;
    } catch (error) {
      console.error("Error revoking invitation:", error);
      toast.error("Failed to revoke invitation");
      return false;
    }
  };

  return {
    invitations,
    loading,
    sending,
    sendInvitation,
    resendInvitation,
    revokeInvitation,
    refetch: fetchInvitations,
  };
}
