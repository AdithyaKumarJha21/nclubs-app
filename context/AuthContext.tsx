import { usePathname, useRouter } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";

export type Role = "student" | "faculty" | "president" | "admin";

type User = {
  id: string;
  role: Role;
};

type ProfileRoleIdRow = {
  role_id: string | null;
};

type RoleNameRow = {
  name: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

const PROFILE_FETCH_DELAYS_MS = [300, 600, 900] as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const routerRef = useRef(router);
  const pathnameRef = useRef(pathname);
  const userRef = useRef<User | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  routerRef.current = router;
  pathnameRef.current = pathname;
  userRef.current = user;

  const isHydratingRef = useRef(false);
  const lastHandledEventRef = useRef<string | null>(null);
  const lastHandledUserIdRef = useRef<string | null>(null);
  const lastRoutedSessionKeyRef = useRef<string | null>(null);

  const wait = (ms: number) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  const clearInvalidSession = useCallback(async () => {
    await supabase.auth.signOut({ scope: "local" });
    setUser(null);
    lastRoutedSessionKeyRef.current = null;
  }, []);

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

  const normalizeRole = (roleName: string | null | undefined): Role => {
    const normalized = roleName?.toLowerCase();

    if (
      normalized === "student" ||
      normalized === "faculty" ||
      normalized === "president" ||
      normalized === "admin"
    ) {
      return normalized;
    }

    return "student";
  };

  const getRouteForRole = (role: Role) => {
    if (role === "faculty" || role === "admin") {
      return "/faculty-home";
    }

    if (role === "president") {
      return "/president-home";
    }

    return "/student-home";
  };

  const resolveRoleWithRetry = useCallback(async (userId: string): Promise<Role> => {
    for (let attempt = 0; attempt <= PROFILE_FETCH_DELAYS_MS.length; attempt += 1) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role_id")
        .eq("id", userId)
        .maybeSingle<ProfileRoleIdRow>();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Role profile fetch failed:", profileError);
        return "student";
      }

      if (profile?.role_id) {
        const { data: roleRow, error: roleError } = await supabase
          .from("roles")
          .select("name")
          .eq("id", profile.role_id)
          .maybeSingle<RoleNameRow>();

        if (roleError && roleError.code !== "PGRST116") {
          console.error("Role name fetch failed:", roleError);
          return "student";
        }

        return normalizeRole(roleRow?.name);
      }

      if (attempt < PROFILE_FETCH_DELAYS_MS.length) {
        await wait(PROFILE_FETCH_DELAYS_MS[attempt]);
      }
    }

    console.warn("Missing profile after retries, using fallback role.", { userId });
    return "student";
  }, []);

  const hydrateSession = useCallback(
    async (event: string) => {
      if (isHydratingRef.current) {
        return;
      }

      isHydratingRef.current = true;
      if (event === "INITIAL_LOAD" || userRef.current === null) {
        setLoading(true);
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        console.log("[auth] session loaded", { hasSession: Boolean(session) });

        if (!session?.user?.id) {
          setUser(null);
          lastRoutedSessionKeyRef.current = null;
          setLoading(false);
          return;
        }

        const userId = session.user.id;
        const role = await resolveRoleWithRetry(userId);
        const resolvedUser: User = { id: userId, role };

        setUser(resolvedUser);
        console.log("[auth] role resolved", { role, userId });

        const sessionKey = `${userId}:${role}`;
        const path = getRouteForRole(role);
        const isAlreadyAtRoleRoute = pathnameRef.current === path;

        if (!isAlreadyAtRoleRoute && lastRoutedSessionKeyRef.current !== sessionKey) {
          routerRef.current.replace(path);
          console.log("[auth] routed", { role, path });
        }

        lastRoutedSessionKeyRef.current = sessionKey;

        setLoading(false);
      } catch (err) {
        if (isInvalidRefreshTokenError(err)) {
          console.warn("Session refresh token is invalid. Clearing local session.");
          await clearInvalidSession();
        } else {
          console.error("Unexpected auth error:", err);
          setUser(null);
        }

        setLoading(false);
      } finally {
        isHydratingRef.current = false;
        lastHandledEventRef.current = event;
      }
    },
    [clearInvalidSession, resolveRoleWithRetry],
  );

  useEffect(() => {
    hydrateSession("INITIAL_LOAD");

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id ?? null;
      console.log("[auth] event", event, { userId });

      const isDuplicateAuthEvent =
        (event === "INITIAL_SESSION" || event === "SIGNED_IN") &&
        userId !== null &&
        lastHandledUserIdRef.current === userId &&
        (lastHandledEventRef.current === "INITIAL_SESSION" ||
          lastHandledEventRef.current === "SIGNED_IN");

      if (isDuplicateAuthEvent) {
        return;
      }

      if (event === "SIGNED_OUT") {
        setUser(null);
        lastHandledUserIdRef.current = null;
        lastHandledEventRef.current = event;
        lastRoutedSessionKeyRef.current = null;
        setLoading(false);
        return;
      }

      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        lastHandledUserIdRef.current = userId;
        hydrateSession(event);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [hydrateSession]);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
