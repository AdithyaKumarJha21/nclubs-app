import UserProvider from "../context/UserContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <UserProvider>{children}</UserProvider>;
}