import { createContext, useState, ReactNode } from "react";

// ---------- Types ----------
export interface UserProfile {
  id?: string;
  email?: string;
  name?: string;
  usn?: string;
  role?: "student" | "faculty" | "admin";
}

export interface UserContextType {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;   // ✅ REQUIRED
}

// ---------- Create Context ----------
export const UserContext = createContext<UserContextType | null>(null);

// ---------- Provider Component ----------
interface ProviderProps {
  children: ReactNode;
}

export default function UserProvider({ children }: ProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}
