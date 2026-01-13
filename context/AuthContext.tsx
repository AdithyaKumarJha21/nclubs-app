import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

type Role = "student" | "faculty" | "president" | "admin";

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

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("roles(name)")
        .eq("id", session.user.id)
        .single();

      if (!error && profile?.roles) {
        // 🔥 Normalize role safely (Supabase join returns array)
        const roleRow = Array.isArray(profile.roles)
          ? profile.roles[0]
          : profile.roles;

        const role = roleRow?.name as Role;

        setUser({
          id: session.user.id,
          role: role ?? "student", // fallback safety
        });
      } else {
        // Safety fallback
        setUser({
          id: session.user.id,
          role: "student",
        });
      }

      setLoading(false);
    };

    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
