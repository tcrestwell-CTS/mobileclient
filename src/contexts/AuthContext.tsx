import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const signingOutRef = useRef(false);

  useEffect(() => {
    // FIX: Previously this called BOTH onAuthStateChange AND getSession(),
    // which caused the entire app tree (including all 15+ dashboard queries)
    // to render TWICE on every page load.
    //
    // onAuthStateChange fires immediately with the current session on mount,
    // so getSession() is completely redundant and was removed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;

    const currentUserId = user?.id;

    // Optimistically clear local app state first to prevent sticky UI/auth loops
    setUser(null);
    setSession(null);

    try {
      await supabase.auth.signOut({ scope: "local" });

      if (currentUserId) {
        await supabase.from("active_sessions").delete().eq("user_id", currentUserId);
      }

      queryClient.clear();

      // Purge lingering auth tokens from browser storage
      const clearAuthKeys = (storage: Storage) => {
        const keysToRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (!key) continue;
          if (key.includes("supabase.auth.token") || key.startsWith("sb-")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => storage.removeItem(key));
      };

      clearAuthKeys(localStorage);
      clearAuthKeys(sessionStorage);
    } catch (error) {
      console.error("Sign out failed, forcing local cleanup:", error);
      queryClient.clear();
    } finally {
      signingOutRef.current = false;
      if (window.location.pathname !== "/auth") {
        window.location.replace("/auth");
      }
    }
  }, [queryClient, user?.id]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
