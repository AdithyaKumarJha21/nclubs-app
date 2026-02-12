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

      const userId = session.user.id;
      console.log("AUTH_SESSION", { userId });

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("roles(name)")
        .eq("id", userId)
        .maybeSingle<ProfileRow>();

      console.log("PROFILE_FETCH", {
        userId,
        hasProfile: !!profile,
        profileError,
      });

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Role fetch failed:", profileError);
        setUser(null);
        hasResolvedInitialSession.current = true;
        setLoading(false);
        return;
      }

      if (!profile) {
        console.warn("Missing profile, using fallback role.", { userId });
        setUser({
          id: userId,
          role: "student",
        });
        hasResolvedInitialSession.current = true;
        setLoading(false);
        return;
      }

      let roleName: string | undefined;
      const roles = profile.roles;

      if (Array.isArray(roles)) {
        roleName = roles[0]?.name;
      } else if (roles) {
        roleName = roles.name;
      }

      if (!roleName) {
        console.error("Invalid role data:", profile.roles);
        setUser({
          id: userId,
          role: "student",
        });
        hasResolvedInitialSession.current = true;
        setLoading(false);
        return;
      }

      const normalizedRole = roleName.toLowerCase() as Role;

      console.log("✅ AUTH RESOLVED", {
        userId,
        role: normalizedRole,
      });

      setUser({
        id: userId,
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
