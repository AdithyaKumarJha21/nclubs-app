import { createContext, ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";

// ---------- Types ----------
export interface Profile {
  id: string;
  email: string;
  name?: string;
  usn?: string;
  role?: "student" | "faculty" | "admin" | string;
  role_id?: string | null; // optional if your schema uses role_id
}

export interface UserContextType {
  user: Profile | null;
  setUser: (user: Profile | null) => void;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

// ---------- Create Context ----------
export const UserContext = createContext<UserContextType | null>(null);

// ---------- Provider Component ----------
interface ProviderProps {
  children: ReactNode;
}

async function fetchProfileByUserId(userId: string): Promise<Profile | null> {
  // 1) Try profiles table (most common)
  const { data: p, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!pErr && p) {
    return {
      id: p.id,
      email: p.email ?? "",
      name: p.name ?? "",
      usn: p.usn ?? "",
      role: p.role ?? "student",
      role_id: p.role_id ?? null,
    };
  }

  // 2) Fallback: users table (your older setup)
  const { data: u, error: uErr } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!uErr && u) {
    return {
      id: u.id,
      email: u.email ?? "",
      name: u.name ?? "",
      usn: u.usn ?? "",
      role: u.role ?? "student",
      role_id: u.role_id ?? null,
    };
  }

  return null;
}

export default function UserProvider({ children }: ProviderProps) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getUser();
    const authed = data.user;
    if (!authed) {
      setUser(null);
      return;
    }

    const profile = await fetchProfileByUserId(authed.id);
    setUser(
      profile ?? {
        id: authed.id,
        email: authed.email ?? "",
        role: "student",
      }
    );
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        setLoading(true);

        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user;

        if (!mounted) return;

        if (!sessionUser) {
          setUser(null);
          setLoading(false);
          return;
        }

        const profile = await fetchProfileByUserId(sessionUser.id);

        if (!mounted) return;

        setUser(
          profile ?? {
            id: sessionUser.id,
            email: sessionUser.email ?? "",
            role: "student",
          }
        );
      } catch (e) {
        console.log("UserProvider bootstrap error:", e);
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      // When auth changes, update profile
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const profile = await fetchProfileByUserId(session.user.id);
      if (!mounted) return;

      setUser(
        profile ?? {
          id: session.user.id,
          email: session.user.email ?? "",
          role: "student",
        }
      );
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ user, setUser, loading, refreshProfile }),
    [user, loading]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
