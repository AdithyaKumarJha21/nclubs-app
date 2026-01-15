import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export type Role = "student" | "faculty" | "president" | "admin";

type User = {
  id: string;
  role: Role;
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

  const loadSession = async () => {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setUser(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("roles(name)")
      .eq("id", session.user.id)
      .single();

    if (error || !data?.roles) {
      console.error("Role fetch failed", error);
      setUser(null);
      setLoading(false);
      return;
    }

    const roleRow = Array.isArray(data.roles)
      ? data.roles[0]
      : data.roles;

    setUser({
      id: session.user.id,
      role: roleRow.name as Role,
    });

    setLoading(false);
  };

  useEffect(() => {
    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      () => loadSession()
    );

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
