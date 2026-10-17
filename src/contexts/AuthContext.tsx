import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
  signInWithGoogle: () => Promise<{ error: Error | null }>;
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

    // 2. Firebase Auth Listener
    const unsubscribeFirebase = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
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

        // Sync user profile to Firestore
        syncUserProfile({
          userId: fbUser.uid,
          displayName: fbUser.displayName || "User",
          email: fbUser.email || undefined,
          createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).catch((err) => console.warn("Firestore profile sync warning:", err));
      } else {
        // If not logged in via Firebase, check Supabase session
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        });
      }
    });

    // 3. Supabase Auth Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!auth.currentUser) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeFirebase();
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    try {
      const fbUser = await fbSignInWithGoogle();
      if (fbUser) {
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
      }
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await Promise.allSettled([supabase.auth.signOut(), fbSignOutUser()]);
    setUser(null);
    setSession(null);
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
