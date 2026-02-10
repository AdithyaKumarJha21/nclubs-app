import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";

export type Role = "student" | "faculty" | "president" | "admin";

type User = {
  id: string;
  role: Role;
};

type RoleRow = {
  name: string;
};

type ProfileRow = {
  roles: RoleRow | RoleRow[] | null;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const hasResolvedInitialSession = useRef(false);

  const clearInvalidSession = async () => {
    await supabase.auth.signOut({ scope: "local" });
    setUser(null);
  };

  const isInvalidRefreshTokenError = (error: unknown) => {
    if (!(error instanceof Error)) {
      return false;
    }

    const normalizedMessage = error.message.toLowerCase();
    return (
      normalizedMessage.includes("invalid refresh token") ||
      normalizedMessage.includes("refresh token not found")
    );
  };

  const loadSession = async () => {
    if (!hasResolvedInitialSession.current) {
      setLoading(true);
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setUser(null);
        hasResolvedInitialSession.current = true;
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("roles(name)")
        .eq("id", session.user.id)
        .single<ProfileRow>();

      if (error || !data?.roles) {
        console.error("Role fetch failed:", error);
        setUser(null);
        hasResolvedInitialSession.current = true;
        setLoading(false);
        return;
      }

      // ✅ FULLY TYPE-SAFE ROLE EXTRACTION
      let roleName: string | undefined;

      if (Array.isArray(data.roles)) {
        roleName = data.roles[0]?.name;
      } else {
        roleName = data.roles.name;
      }

      if (!roleName) {
        console.error("Invalid role data:", data.roles);
        setUser(null);
        hasResolvedInitialSession.current = true;
        setLoading(false);
        return;
      }

      const normalizedRole = roleName.toLowerCase() as Role;

      console.log("✅ AUTH RESOLVED", {
        userId: session.user.id,
        role: normalizedRole,
      });

      setUser({
        id: session.user.id,
        role: normalizedRole,
      });

      hasResolvedInitialSession.current = true;
      setLoading(false);
    } catch (err) {
      if (isInvalidRefreshTokenError(err)) {
        console.warn("Session refresh token is invalid. Clearing local session.");
        await clearInvalidSession();
        hasResolvedInitialSession.current = true;
        setLoading(false);
        return;
      }

      console.error("Unexpected auth error:", err);
      setUser(null);
      hasResolvedInitialSession.current = true;
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadSession();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
