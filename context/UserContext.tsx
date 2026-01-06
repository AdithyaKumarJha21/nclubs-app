import { createContext, ReactNode, useState } from "react";

// ---------- Types ----------
export interface Profile {
  id: string;
  email: string;
  name: string;
  usn: string;
  role: "student" | "faculty" | "admin";
}

export interface UserContextType {
  user: Profile | null;
  setUser: (user: Profile | null) => void;
}

// ---------- Create Context ----------
export const UserContext = createContext<UserContextType | null>(null);

// ---------- Provider Component ----------
interface ProviderProps {
  children: ReactNode;
}

export default function UserProvider({ children }: ProviderProps) {
  const [user, setUser] = useState<Profile | null>(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}
