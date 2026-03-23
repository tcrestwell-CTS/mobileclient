import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface PortalSession {
  clientId: string;
  clientName: string;
  /** Present only for legacy magic-link sessions */
  token?: string;
  /** Present only for Supabase Auth sessions */
  authUser?: User;
}

interface PortalAuthContextType {
  session: PortalSession | null;
  loading: boolean;
  /** Legacy magic-link login */
  loginWithToken: (token: string) => Promise<{ success: boolean; error?: string }>;
  /** Supabase Auth email/password login */
  loginWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  /** Register a new client account (email/password) */
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  logout: () => void;
  /** Whether the current session is a persistent (Supabase Auth) session */
  isPersistent: boolean;
}

const PortalAuthContext = createContext<PortalAuthContextType | undefined>(undefined);

// ── Legacy token helpers ─────────────────────────────────────────────────────

async function verifyLegacyToken(token: string): Promise<{ success: boolean; data?: any }> {
  try {
    const { data, error } = await supabase.functions.invoke("portal-auth", {
      body: { action: "verify-token", token },
    });
    return { success: !error && data?.success, data };
  } catch {
    return { success: false };
  }
}

// ── Link Supabase Auth user to client_profiles ───────────────────────────────

async function linkAuthUserToClient(user: User): Promise<{ clientId: string; clientName: string } | null> {
  try {
    const { data, error } = await supabase.functions.invoke("portal-auth", {
      body: { action: "link-client", authUserId: user.id, email: user.email },
    });
    if (error || !data?.success) return null;
    return { clientId: data.client_id, clientName: data.client_name };
  } catch {
    return null;
  }
}

export function PortalAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for Supabase Auth session on mount — but only on client portal routes
  useEffect(() => {
    let cancelled = false;

    // Skip portal auth entirely when not on a /client/ route
    const isClientRoute = window.location.pathname.startsWith("/client");
    if (!isClientRoute) {
      setLoading(false);
      return;
    }

    async function init() {
      try {
        // 1. Check for Supabase Auth session first
        const { data: { session: supaSession } } = await supabase.auth.getSession();
        if (supaSession?.user && !cancelled) {
          const linked = await linkAuthUserToClient(supaSession.user);
          if (linked) {
            setSession({
              clientId: linked.clientId,
              clientName: linked.clientName,
              authUser: supaSession.user,
            });
            // Clear any legacy token
            localStorage.removeItem("portal_session");
            if (!cancelled) setLoading(false);
            return;
          }
        }

        // 2. Fall back to legacy portal token
        const stored = localStorage.getItem("portal_session");
        if (stored && !cancelled) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
              localStorage.removeItem("portal_session");
              if (!cancelled) setLoading(false);
              return;
            }
            const { success } = await verifyLegacyToken(parsed.token);
            if (success) {
              setSession({
                clientId: parsed.clientId,
                clientName: parsed.clientName,
                token: parsed.token,
              });
            } else {
              localStorage.removeItem("portal_session");
            }
          } catch {
            localStorage.removeItem("portal_session");
          }
        }
      } catch (err) {
        console.error("Portal auth init error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Safety timeout — never stay loading forever
    const timeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) console.warn("Portal auth: loading timed out, forcing completion");
        return false;
      });
    }, 8000);

    init();

    // Listen for auth state changes (Google OAuth callback, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (event === "SIGNED_IN" && currentSession?.user) {
          const linked = await linkAuthUserToClient(currentSession.user);
          if (linked) {
            setSession({
              clientId: linked.clientId,
              clientName: linked.clientName,
              authUser: currentSession.user,
            });
            localStorage.removeItem("portal_session");
            setLoading(false);
          }
        } else if (event === "SIGNED_OUT") {
          // Only clear if it was a persistent session
          setSession((prev) => {
            if (prev?.authUser) return null;
            return prev; // keep legacy session
          });
        }
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const loginWithToken = useCallback(async (token: string) => {
    const result = await verifyLegacyToken(token);
    if (!result.success || !result.data) {
      return { success: false, error: result.data?.error || "Invalid or expired link" };
    }
    const { client_id, client_name, token: serverToken, expires_at } = result.data;
    const portalSession = {
      clientId: client_id,
      clientName: client_name,
      token: serverToken,
      expiresAt: expires_at ? new Date(expires_at).getTime() : Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem("portal_session", JSON.stringify(portalSession));
    setSession({ clientId: client_id, clientName: client_name, token: serverToken });
    return { success: true };
  }, []);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    if (error) return { success: false, error: error.message };

    // Link auth user to client
    const linked = await linkAuthUserToClient(data.user);
    if (!linked) {
      await supabase.auth.signOut();
      return { success: false, error: "No client account found for this email. Please contact your travel agent." };
    }

    setSession({ clientId: linked.clientId, clientName: linked.clientName, authUser: data.user });
    return { success: true };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    // First check if a client record exists for this email
    const { data: checkData } = await supabase.functions.invoke("portal-auth", {
      body: { action: "check-client-email", email: email.toLowerCase().trim() },
    });
    if (!checkData?.exists) {
      return { success: false, error: "No client account found for this email. Your travel agent must add you before you can create an account." };
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/client/login`,
        data: { user_type: "client" },
      },
    });
    if (error) return { success: false, error: error.message };

    // If email confirmation is required
    if (data.user && !data.session) {
      return { success: true, needsConfirmation: true };
    }

    // Auto-confirmed: link immediately
    if (data.user && data.session) {
      const linked = await linkAuthUserToClient(data.user);
      if (linked) {
        setSession({ clientId: linked.clientId, clientName: linked.clientName, authUser: data.user });
      }
    }

    return { success: true };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("portal_session");
    if (session?.authUser) {
      supabase.auth.signOut();
    }
    setSession(null);
    try {
      window.location.href = "/client/login";
    } catch {
      // ProtectedRoute will redirect
    }
  }, [session]);

  const isPersistent = !!session?.authUser;

  return (
    <PortalAuthContext.Provider value={{ session, loading, loginWithToken, loginWithPassword, signUp, logout, isPersistent }}>
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error("usePortalAuth must be used within PortalAuthProvider");
  return ctx;
}
