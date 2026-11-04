import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  auth,
  signInWithGoogle as fbSignInWithGoogle,
  signOutUser as fbSignOutUser,
  testConnection,
} from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { syncUserProfile } from "@/services/firestoreService";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null; cancelled?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Mandatory connection test on boot per Firebase skill guidelines
    testConnection();

    // 2. Initial Session Check & Auto-Demo Authentication
    const initAuth = async () => {
      try {
        const hasExplicitlySignedOut = localStorage.getItem("coinkeeper_signed_out") === "true";
        if (hasExplicitlySignedOut) {
          console.log("[Auth] User explicitly signed out. Halting auto demo authentication.");
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession?.user) {
          console.log("[Auth] Active Supabase session found:", existingSession.user.id);
          setSession(existingSession);
          setUser(existingSession.user);
          setLoading(false);
          return;
        }

        // Auto-sign in demo account for preview environment so RLS policies pass
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: "demo@walletwisely.app",
          password: "demoPassword123!",
        });

        if (signInData?.session) {
          console.log("[Auth] Demo user authenticated:", signInData.session.user.id);
          setSession(signInData.session);
          setUser(signInData.session.user);
        } else if (signInErr) {
          console.warn("[Auth] Demo sign in attempt:", signInErr.message);
        }
      } catch (err) {
        console.warn("[Auth] Session initialization warning:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // 3. Supabase Auth Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        setLoading(false);
      }
    });

    // 4. Firebase Auth Listener (Preserve Google Sign-in across refreshes)
    const unsubFirebaseAuth = onAuthStateChanged(auth, (fbUser) => {
      const hasExplicitlySignedOut = localStorage.getItem("coinkeeper_signed_out") === "true";
      if (fbUser && !hasExplicitlySignedOut) {
        const mappedUser: User = {
          id: fbUser.uid,
          app_metadata: { provider: "google" },
          user_metadata: {
            display_name: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
            avatar_url: fbUser.photoURL,
          },
          aud: "authenticated",
          created_at: fbUser.metadata.creationTime || new Date().toISOString(),
          email: fbUser.email || undefined,
        };

        const mockSession: Session = {
          access_token: "firebase-token",
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "firebase-refresh",
          user: mappedUser,
        };

        setUser(mappedUser);
        setSession(mockSession);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      unsubFirebaseAuth();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    localStorage.removeItem("coinkeeper_signed_out");
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    localStorage.removeItem("coinkeeper_signed_out");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async (): Promise<{ error: Error | null; cancelled?: boolean }> => {
    try {
      localStorage.removeItem("coinkeeper_signed_out");
      const fbUser = await fbSignInWithGoogle();
      if (!fbUser) {
        // User closed or dismissed the popup without signing in
        return { error: null, cancelled: true };
      }

      const mappedUser: User = {
        id: fbUser.uid,
        app_metadata: { provider: "google" },
        user_metadata: {
          display_name: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
          avatar_url: fbUser.photoURL,
        },
        aud: "authenticated",
        created_at: fbUser.metadata.creationTime || new Date().toISOString(),
        email: fbUser.email || undefined,
      };

      const mockSession: Session = {
        access_token: "firebase-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "firebase-refresh",
        user: mappedUser,
      };

      setUser(mappedUser);
      setSession(mockSession);

      syncUserProfile(
        fbUser.uid,
        fbUser.displayName || fbUser.email?.split("@")[0] || "User",
        fbUser.email || undefined
      ).catch((err) => {
        console.warn("Could not sync user profile:", err);
      });

      return { error: null, cancelled: false };
    } catch (err: any) {
      const isCancelled =
        err?.code === "auth/popup-closed-by-user" ||
        err?.code === "auth/cancelled-popup-request" ||
        (err instanceof Error && err.message.includes("popup-closed-by-user"));

      if (isCancelled) {
        return { error: null, cancelled: true };
      }
      return { error: err as Error, cancelled: false };
    }
  };

  const signOut = async () => {
    try {
      localStorage.setItem("coinkeeper_signed_out", "true");
      await Promise.allSettled([supabase.auth.signOut(), fbSignOutUser()]);
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}
    >
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
